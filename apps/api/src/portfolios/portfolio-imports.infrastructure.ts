import {
  instruments,
  portfolioImportJobs,
  portfolioImportRows,
  PostgresPortfolioRepository,
  type Database,
} from '@atlas/database';
import {
  PortfolioApplicationService,
  PortfolioError,
  portfolioCsvPreviewHash,
  type NormalizedPortfolioCsvRow,
  type PortfolioCsvPreviewRow,
} from '@atlas/domain';
import { Injectable, Logger } from '@nestjs/common';
import { and, asc, desc, eq, gt, inArray, ne, sql } from 'drizzle-orm';

import { ApiDatabase } from '../scanner/scanner-runtime.infrastructure';
import type {
  PortfolioImportCommitter,
  PortfolioImportJob,
  PortfolioImportStore,
} from './portfolio-imports.ports';

@Injectable()
export class PostgresPortfolioImportStore implements PortfolioImportStore {
  constructor(private readonly connection: ApiDatabase) {}

  async resolve(symbols: readonly string[]) {
    if (symbols.length === 0) return new Map<string, string>();
    const rows = await this.connection.database
      .select({
        id: instruments.id,
        normalizedSymbol: instruments.normalizedSymbol,
      })
      .from(instruments)
      .where(
        and(
          inArray(instruments.normalizedSymbol, [...symbols]),
          eq(instruments.status, 'active'),
        ),
      );
    return new Map(rows.map((row) => [row.normalizedSymbol, row.id]));
  }

  async symbolsForInstrumentIds(instrumentIds: readonly string[]) {
    if (instrumentIds.length === 0) return new Map<string, string>();
    const rows = await this.connection.database
      .select({ id: instruments.id, symbol: instruments.symbol })
      .from(instruments)
      .where(inArray(instruments.id, [...instrumentIds]));
    return new Map(rows.map((row) => [row.id, row.symbol]));
  }

  async findJob(jobId: string) {
    const row = (
      await this.connection.database
        .select()
        .from(portfolioImportJobs)
        .where(eq(portfolioImportJobs.id, jobId))
        .limit(1)
    )[0];
    return row ? mapJob(row) : null;
  }

  async findByPreviewIdempotency(input: {
    readonly portfolioId: string;
    readonly userId: string;
    readonly idempotencyKeyHash: string;
  }) {
    const row = (
      await this.connection.database
        .select()
        .from(portfolioImportJobs)
        .where(
          and(
            eq(portfolioImportJobs.portfolioId, input.portfolioId),
            eq(portfolioImportJobs.userId, input.userId),
            eq(
              portfolioImportJobs.idempotencyKeyHash,
              input.idempotencyKeyHash,
            ),
          ),
        )
        .limit(1)
    )[0];
    return row ? mapJob(row) : null;
  }

  async findByFileHash(input: {
    readonly portfolioId: string;
    readonly userId: string;
    readonly fileHash: string;
  }) {
    const row = (
      await this.connection.database
        .select()
        .from(portfolioImportJobs)
        .where(
          and(
            eq(portfolioImportJobs.portfolioId, input.portfolioId),
            eq(portfolioImportJobs.userId, input.userId),
            eq(portfolioImportJobs.fileHash, input.fileHash),
            ne(portfolioImportJobs.status, 'cancelled'),
          ),
        )
        .orderBy(desc(portfolioImportJobs.createdAt))
        .limit(1)
    )[0];
    return row ? mapJob(row) : null;
  }

  async savePreview(input: Parameters<PortfolioImportStore['savePreview']>[0]) {
    return this.connection.database.transaction(async (transaction) => {
      const job = (
        await transaction
          .insert(portfolioImportJobs)
          .values({
            portfolioId: input.portfolioId,
            userId: input.userId,
            status: 'preview_ready',
            commitMode: 'atomic',
            sourceFilename: input.preview.filename,
            contentType: input.preview.contentType,
            fileSize: input.preview.fileSize,
            encoding: input.preview.encoding,
            delimiter: input.preview.delimiter,
            fileHash: input.preview.fileHash,
            previewHash: input.preview.previewHash,
            idempotencyKeyHash: input.idempotencyKeyHash,
            previewRequestHash: input.previewRequestHash,
            totalRowCount: input.preview.totalRowCount,
            validRowCount: input.preview.validRowCount,
            invalidRowCount: input.preview.invalidRowCount,
            duplicateRowCount: input.preview.duplicateRowCount,
            committedRowCount: 0,
            previewExpiresAt: input.previewExpiresAt,
            errorSummary: { ...input.preview.errorSummary },
            createdAt: input.now,
            updatedAt: input.now,
          })
          .returning()
      )[0];
      if (!job) throw new Error('Portfolio import job insert invariant failed');
      if (input.preview.rows.length > 0)
        await transaction.insert(portfolioImportRows).values(
          input.preview.rows.map((row) => ({
            importJobId: job.id,
            portfolioId: input.portfolioId,
            userId: input.userId,
            rowNumber: row.rowNumber,
            status: row.status,
            duplicateOfTransactionId: row.duplicateOfTransactionId,
            normalizedTransactionHash: row.normalizedTransactionHash,
            rawData: { ...row.rawData },
            normalizedData:
              row.normalizedData === null ? null : { ...row.normalizedData },
            validationErrors: row.validationErrors.map((error) => ({
              ...error,
            })),
            createdAt: input.now,
          })),
        );
      return mapJob(job);
    });
  }

  async rows(input: Parameters<PortfolioImportStore['rows']>[0]) {
    const rows = await this.connection.database
      .select()
      .from(portfolioImportRows)
      .where(
        and(
          eq(portfolioImportRows.importJobId, input.jobId),
          input.afterRowNumber === null
            ? undefined
            : gt(portfolioImportRows.rowNumber, input.afterRowNumber),
        ),
      )
      .orderBy(asc(portfolioImportRows.rowNumber))
      .limit(input.limit + 1);
    const hasNext = rows.length > input.limit;
    const page = hasNext ? rows.slice(0, input.limit) : rows;
    return {
      items: page.map(mapRow),
      nextRowNumber:
        hasNext && page.length > 0 ? (page.at(-1)?.rowNumber ?? null) : null,
    };
  }

  async allRows(jobId: string) {
    return (
      await this.connection.database
        .select()
        .from(portfolioImportRows)
        .where(eq(portfolioImportRows.importJobId, jobId))
        .orderBy(asc(portfolioImportRows.rowNumber))
    ).map(mapRow);
  }

  async cancel(input: Parameters<PortfolioImportStore['cancel']>[0]) {
    const row = (
      await this.connection.database
        .update(portfolioImportJobs)
        .set({
          status: 'cancelled',
          cancelledAt: input.now,
          updatedAt: input.now,
        })
        .where(
          and(
            eq(portfolioImportJobs.id, input.jobId),
            eq(portfolioImportJobs.portfolioId, input.portfolioId),
            eq(portfolioImportJobs.userId, input.userId),
            eq(portfolioImportJobs.status, 'preview_ready'),
          ),
        )
        .returning()
    )[0];
    return row ? mapJob(row) : null;
  }
}

@Injectable()
export class PostgresPortfolioImportCommitter implements PortfolioImportCommitter {
  private readonly logger = new Logger(PostgresPortfolioImportCommitter.name);

  constructor(private readonly connection: ApiDatabase) {}

  commit(input: Parameters<PortfolioImportCommitter['commit']>[0]) {
    return this.connection.database.transaction(async (transaction) => {
      await transaction.execute(
        sql`select id from portfolio_import_jobs where id = ${input.job.id} for update`,
      );
      const currentRow = (
        await transaction
          .select()
          .from(portfolioImportJobs)
          .where(eq(portfolioImportJobs.id, input.job.id))
          .limit(1)
      )[0];
      if (!currentRow) throw new PortfolioError('PORTFOLIO_IMPORT_NOT_FOUND');
      const current = mapJob(currentRow);
      if (current.status === 'completed') {
        if (
          current.commitIdempotencyKeyHash === input.commitIdempotencyKeyHash &&
          current.commitRequestHash === input.commitRequestHash
        )
          return { job: current, replayed: true };
        if (current.commitIdempotencyKeyHash === input.commitIdempotencyKeyHash)
          throw new PortfolioError('PORTFOLIO_IDEMPOTENCY_CONFLICT');
        throw new PortfolioError('PORTFOLIO_IMPORT_INVALID_STATE');
      }
      if (
        current.status !== 'preview_ready' ||
        current.previewHash !== input.job.previewHash ||
        current.fileHash !== input.job.fileHash
      )
        throw new PortfolioError('PORTFOLIO_IMPORT_INVALID_STATE');
      const durableRows = (
        await transaction
          .select()
          .from(portfolioImportRows)
          .where(eq(portfolioImportRows.importJobId, current.id))
          .orderBy(asc(portfolioImportRows.rowNumber))
      ).map(mapRow);
      if (
        portfolioCsvPreviewHash(durableRows) !== current.previewHash ||
        portfolioCsvPreviewHash(input.rows) !== current.previewHash
      )
        throw new PortfolioError('PORTFOLIO_IMPORT_INVALID_STATE', {
          reason: 'PREVIEW_INTEGRITY_MISMATCH',
        });
      if (
        input.mode === 'atomic' &&
        durableRows.some((row) => row.status !== 'valid')
      )
        throw new PortfolioError('PORTFOLIO_IMPORT_ATOMIC_VALIDATION_FAILED');
      await transaction
        .update(portfolioImportJobs)
        .set({
          status: 'committing',
          commitMode: input.mode,
          commitIdempotencyKeyHash: input.commitIdempotencyKeyHash,
          commitRequestHash: input.commitRequestHash,
          updatedAt: input.now,
        })
        .where(eq(portfolioImportJobs.id, current.id));
      let committed = 0;
      const validRows = durableRows.filter((row) => row.status === 'valid');
      for (const batch of batches(validRows, 250)) {
        for (const row of batch) {
          if (!row.normalizedData) continue;
          if (input.mode === 'atomic') {
            await commitLedgerRow(
              transaction as unknown as Database,
              current,
              row.normalizedData,
              input.now,
            );
            await markRow(
              transaction as unknown as Database,
              current.id,
              row,
              'committed',
            );
            committed += 1;
          } else {
            try {
              await transaction.transaction(async (savepoint) => {
                await commitLedgerRow(
                  savepoint as unknown as Database,
                  current,
                  row.normalizedData!,
                  input.now,
                );
              });
              await markRow(
                transaction as unknown as Database,
                current.id,
                row,
                'committed',
              );
              committed += 1;
            } catch (error) {
              await markRow(
                transaction as unknown as Database,
                current.id,
                row,
                'skipped',
                ledgerError(error),
              );
            }
          }
        }
      }
      if (input.mode === 'partial') {
        await transaction
          .update(portfolioImportRows)
          .set({ status: 'skipped' })
          .where(
            and(
              eq(portfolioImportRows.importJobId, current.id),
              eq(portfolioImportRows.status, 'invalid'),
            ),
          );
      }
      const completedRow = (
        await transaction
          .update(portfolioImportJobs)
          .set({
            status: 'completed',
            commitMode: input.mode,
            committedRowCount: committed,
            committedAt: input.now,
            updatedAt: input.now,
            errorCode:
              input.mode === 'partial' && committed < validRows.length
                ? 'PORTFOLIO_IMPORT_PARTIAL'
                : null,
          })
          .where(eq(portfolioImportJobs.id, current.id))
          .returning()
      )[0];
      if (!completedRow)
        throw new Error('Portfolio import completion invariant failed');
      this.logger.log({
        event: 'portfolio.import.committed',
        portfolioId: current.portfolioId,
        importJobId: current.id,
        mode: input.mode,
        committedRowCount: committed,
      });
      return { job: mapJob(completedRow), replayed: false };
    });
  }
}

async function commitLedgerRow(
  database: Database,
  job: PortfolioImportJob,
  row: NormalizedPortfolioCsvRow,
  now: Date,
) {
  const application = new PortfolioApplicationService({
    repository: new PostgresPortfolioRepository(database),
    audit: { record: () => Promise.resolve() },
    logger: { info: () => undefined },
    now: () => now,
  });
  const draft = await application.createDraft({
    userId: job.userId,
    portfolioId: job.portfolioId,
    idempotencyKey: row.idempotencyKey,
    source: 'csv_import',
    type: row.type,
    instrumentId: row.instrumentId,
    tradeAt: new Date(row.tradeAt),
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    fee: row.fee,
    tax: row.tax,
    cashAmount: row.cashAmount,
    externalReference: row.externalReference,
    adjustmentReason: row.adjustmentReason,
    note: row.note,
  });
  if (draft.transaction.status === 'draft')
    await application.post(job.userId, job.portfolioId, draft.transaction.id);
}

function markRow(
  database: Database,
  jobId: string,
  row: PortfolioCsvPreviewRow,
  status: 'committed' | 'skipped',
  error?: Readonly<Record<string, unknown>>,
) {
  return database
    .update(portfolioImportRows)
    .set({
      status,
      ...(error === undefined
        ? {}
        : {
            validationErrors: [
              ...row.validationErrors.map((item) => ({ ...item })),
              { ...error },
            ],
          }),
    })
    .where(
      and(
        eq(portfolioImportRows.importJobId, jobId),
        eq(portfolioImportRows.rowNumber, row.rowNumber),
      ),
    );
}

function ledgerError(error: unknown): Readonly<Record<string, unknown>> {
  return {
    code:
      error instanceof PortfolioError
        ? error.code
        : 'PORTFOLIO_IMPORT_LEDGER_FAILURE',
    field: null,
    message: 'Ledger validation failed',
  };
}

function batches<T>(values: readonly T[], size: number): readonly T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size)
    result.push(values.slice(index, index + size));
  return result;
}

function mapJob(
  row: typeof portfolioImportJobs.$inferSelect,
): PortfolioImportJob {
  return {
    id: row.id,
    portfolioId: row.portfolioId,
    userId: row.userId,
    status: row.status as PortfolioImportJob['status'],
    commitMode: row.commitMode as PortfolioImportJob['commitMode'],
    sourceFilename: row.sourceFilename,
    contentType: row.contentType,
    fileSize: row.fileSize,
    encoding: 'utf-8',
    delimiter: row.delimiter as ',' | ';',
    fileHash: row.fileHash,
    previewHash: row.previewHash,
    idempotencyKeyHash: row.idempotencyKeyHash,
    previewRequestHash: row.previewRequestHash,
    commitIdempotencyKeyHash: row.commitIdempotencyKeyHash,
    commitRequestHash: row.commitRequestHash,
    totalRowCount: row.totalRowCount,
    validRowCount: row.validRowCount,
    invalidRowCount: row.invalidRowCount,
    duplicateRowCount: row.duplicateRowCount,
    committedRowCount: row.committedRowCount,
    previewExpiresAt: row.previewExpiresAt,
    committedAt: row.committedAt,
    cancelledAt: row.cancelledAt,
    errorCode: row.errorCode,
    errorSummary: row.errorSummary,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapRow(
  row: typeof portfolioImportRows.$inferSelect,
): PortfolioCsvPreviewRow {
  return {
    rowNumber: row.rowNumber,
    status: row.status as PortfolioCsvPreviewRow['status'],
    duplicateOfTransactionId: row.duplicateOfTransactionId,
    normalizedTransactionHash: row.normalizedTransactionHash,
    rawData: row.rawData as Record<string, string>,
    normalizedData: row.normalizedData as NormalizedPortfolioCsvRow | null,
    validationErrors:
      row.validationErrors as unknown as PortfolioCsvPreviewRow['validationErrors'],
  };
}
