import { createHash } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  buildCsv,
  PortfolioError,
  portfolioCsvPreviewHash,
  previewPortfolioCsv,
  type PortfolioCsvFile,
} from '@atlas/domain';
import { z } from 'zod';

import type {
  CommitPortfolioImportDto,
  PortfolioImportRowsQueryDto,
} from './portfolio-imports.dto';
import {
  PORTFOLIO_IMPORT_COMMITTER,
  PORTFOLIO_IMPORT_STORE,
  type PortfolioImportCommitter,
  type PortfolioImportJob,
  type PortfolioImportStore,
} from './portfolio-imports.ports';
import {
  PORTFOLIO_APPLICATION,
  PORTFOLIO_READ_MODEL,
  type PortfolioCommands,
  type PortfolioReadModel,
} from './portfolios.ports';

const idSchema = z.uuid();
const keySchema = z.string().trim().min(1).max(200);
const commitSchema = z
  .object({ mode: z.enum(['atomic', 'partial']).default('atomic') })
  .strict();
const rowsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  cursor: z.string().min(1).max(1_024).optional(),
});
const cursorSchema = z.object({ rowNumber: z.number().int().min(1) });
const PREVIEW_TTL_MS = 30 * 60 * 1_000;

@Injectable()
export class PortfolioImportsService {
  constructor(
    @Inject(PORTFOLIO_APPLICATION)
    private readonly portfolios: PortfolioCommands,
    @Inject(PORTFOLIO_READ_MODEL)
    private readonly readModel: PortfolioReadModel,
    @Inject(PORTFOLIO_IMPORT_STORE)
    private readonly store: PortfolioImportStore,
    @Inject(PORTFOLIO_IMPORT_COMMITTER)
    private readonly committer: PortfolioImportCommitter,
  ) {}

  async preview(
    userId: string,
    rawPortfolioId: string,
    rawKey: string | undefined,
    file: PortfolioCsvFile | undefined,
  ) {
    const portfolioId = identifier(rawPortfolioId);
    const key = requiredKey(rawKey);
    if (!file)
      throw invalid('PORTFOLIO_CSV_INVALID', { code: 'CSV_FILE_REQUIRED' });
    const portfolio = await this.execute(() =>
      this.portfolios.get(userId, portfolioId),
    );
    if (portfolio.status === 'deleted')
      throw new ConflictException({
        code: 'PORTFOLIO_DELETED',
        message: 'Deleted portfolio cannot accept imports',
      });
    const fileHash = sha256(file.bytes);
    const previewRequestHash = sha256(
      JSON.stringify({
        portfolioId,
        filename: file.filename,
        contentType: file.contentType,
        size: file.size,
        fileHash,
      }),
    );
    const idempotencyKeyHash = sha256(`${portfolioId}:${userId}:${key}`);
    const replay = await this.store.findByPreviewIdempotency({
      portfolioId,
      userId,
      idempotencyKeyHash,
    });
    if (replay) {
      if (replay.previewRequestHash !== previewRequestHash)
        throw conflict('PORTFOLIO_IDEMPOTENCY_CONFLICT');
      return { job: replay, replayed: true };
    }
    const duplicateFile = await this.store.findByFileHash({
      portfolioId,
      userId,
      fileHash,
    });
    if (duplicateFile)
      throw conflict('PORTFOLIO_CSV_INVALID', {
        code: 'CSV_FILE_DUPLICATE',
        existingJobId: duplicateFile.id,
      });
    const existingTransactions = await this.execute(() =>
      this.portfolios.listTransactions(userId, portfolioId),
    );
    const preview = await this.execute(() =>
      previewPortfolioCsv({
        userId,
        portfolio,
        file,
        symbols: this.store,
        existingTransactions,
      }),
    );
    const now = new Date();
    const job = await this.store.savePreview({
      portfolioId,
      userId,
      preview,
      idempotencyKeyHash,
      previewRequestHash,
      previewExpiresAt: new Date(now.getTime() + PREVIEW_TTL_MS),
      now,
    });
    return { job, replayed: false };
  }

  async get(userId: string, rawPortfolioId: string, rawJobId: string) {
    const portfolioId = identifier(rawPortfolioId);
    await this.owned(userId, portfolioId);
    return this.requireJob(userId, portfolioId, identifier(rawJobId));
  }

  async rows(
    userId: string,
    rawPortfolioId: string,
    rawJobId: string,
    query: PortfolioImportRowsQueryDto,
  ) {
    const portfolioId = identifier(rawPortfolioId);
    const jobId = identifier(rawJobId);
    await this.owned(userId, portfolioId);
    await this.requireJob(userId, portfolioId, jobId);
    const parsed = parse(rowsQuerySchema, query);
    const cursor = parsed.cursor
      ? decodeCursor(parsed.cursor, cursorSchema).rowNumber
      : null;
    const page = await this.store.rows({
      jobId,
      limit: parsed.limit,
      afterRowNumber: cursor,
    });
    return {
      items: page.items,
      nextCursor:
        page.nextRowNumber === null
          ? null
          : encodeCursor({ rowNumber: page.nextRowNumber }),
    };
  }

  async commit(
    userId: string,
    rawPortfolioId: string,
    rawJobId: string,
    rawKey: string | undefined,
    body: CommitPortfolioImportDto,
  ) {
    const portfolioId = identifier(rawPortfolioId);
    const jobId = identifier(rawJobId);
    const key = requiredKey(rawKey);
    const parsed = parse(commitSchema, body);
    await this.owned(userId, portfolioId);
    const job = await this.requireJob(userId, portfolioId, jobId);
    const commitRequestHash = sha256(
      JSON.stringify({ portfolioId, jobId, mode: parsed.mode }),
    );
    const commitIdempotencyKeyHash = sha256(
      `${portfolioId}:${jobId}:${userId}:${key}`,
    );
    if (job.status === 'completed') {
      if (
        job.commitIdempotencyKeyHash === commitIdempotencyKeyHash &&
        job.commitRequestHash === commitRequestHash
      )
        return { job, replayed: true };
      if (job.commitIdempotencyKeyHash === commitIdempotencyKeyHash)
        throw conflict('PORTFOLIO_IDEMPOTENCY_CONFLICT');
      throw conflict('PORTFOLIO_IMPORT_INVALID_STATE');
    }
    if (job.status !== 'preview_ready')
      throw conflict('PORTFOLIO_IMPORT_INVALID_STATE');
    if (
      job.previewExpiresAt === null ||
      job.previewExpiresAt.getTime() <= Date.now()
    )
      throw conflict('PORTFOLIO_IMPORT_EXPIRED');
    const rows = await this.store.allRows(jobId);
    if (portfolioCsvPreviewHash(rows) !== job.previewHash)
      throw conflict('PORTFOLIO_IMPORT_INVALID_STATE', {
        reason: 'PREVIEW_INTEGRITY_MISMATCH',
      });
    if (parsed.mode === 'atomic' && rows.some((row) => row.status !== 'valid'))
      throw new UnprocessableEntityException({
        code: 'PORTFOLIO_IMPORT_ATOMIC_VALIDATION_FAILED',
        message: 'Atomic import contains invalid or duplicate rows',
      });
    return this.execute(() =>
      this.committer.commit({
        job,
        rows,
        mode: parsed.mode,
        commitIdempotencyKeyHash,
        commitRequestHash,
        now: new Date(),
      }),
    );
  }

  async cancel(userId: string, rawPortfolioId: string, rawJobId: string) {
    const portfolioId = identifier(rawPortfolioId);
    const jobId = identifier(rawJobId);
    await this.owned(userId, portfolioId);
    await this.requireJob(userId, portfolioId, jobId);
    const job = await this.store.cancel({
      jobId,
      portfolioId,
      userId,
      now: new Date(),
    });
    if (!job) throw conflict('PORTFOLIO_IMPORT_INVALID_STATE');
    return job;
  }

  async exportTransactions(userId: string, rawPortfolioId: string) {
    const portfolio = await this.owned(userId, identifier(rawPortfolioId));
    const transactions = await this.portfolios.listTransactions(
      userId,
      portfolio.id,
    );
    const symbols = await this.store.symbolsForInstrumentIds(
      transactions
        .map((transaction) => transaction.instrumentId)
        .filter(
          (instrumentId): instrumentId is string => instrumentId !== null,
        ),
    );
    return buildCsv(
      [
        'portfolio',
        'transactionType',
        'symbol',
        'tradeDate',
        'quantity',
        'unitPrice',
        'fee',
        'tax',
        'cashAmount',
        'externalReference',
        'note',
        'status',
      ],
      transactions.map((transaction) => [
        portfolio.name,
        transaction.type,
        transaction.instrumentId === null
          ? null
          : (symbols.get(transaction.instrumentId) ?? null),
        transaction.tradeAt.toISOString().slice(0, 10),
        transaction.quantity,
        transaction.unitPrice,
        transaction.fee,
        transaction.tax,
        transaction.cashAmount,
        transaction.externalReference,
        transaction.note,
        transaction.status,
      ]),
    );
  }

  async exportPositions(userId: string, rawPortfolioId: string) {
    const portfolio = await this.owned(userId, identifier(rawPortfolioId));
    const projection = await this.readModel.projection(portfolio.id);
    return buildCsv(
      [
        'portfolio',
        'instrumentId',
        'quantity',
        'averageCost',
        'costBasis',
        'realizedPnl',
        'dividendIncome',
        'ledgerVersion',
      ],
      projection.positions.map((position) => [
        portfolio.name,
        position.instrumentId,
        position.quantity,
        position.averageCost,
        position.costBasis,
        position.realizedPnl,
        position.dividendIncome,
        position.ledgerVersion,
      ]),
    );
  }

  async exportPerformance(userId: string, rawPortfolioId: string) {
    const portfolio = await this.owned(userId, identifier(rawPortfolioId));
    const performance = await this.readModel.latestPerformance(portfolio.id);
    if (!performance)
      throw new NotFoundException({
        code: 'PORTFOLIO_PERFORMANCE_NOT_FOUND',
        message: 'Portfolio performance is not available',
      });
    return buildCsv(
      [
        'portfolio',
        'status',
        'rangeStartAt',
        'rangeEndAt',
        'dataCutoffAt',
        'methodologyVersion',
        'benchmarkCode',
        'twrStatus',
        'twrValue',
        'xirrStatus',
        'xirrValue',
        'xirrReason',
        'warnings',
      ],
      [
        [
          portfolio.name,
          performance.status,
          performance.rangeStartAt.toISOString(),
          performance.rangeEndAt.toISOString(),
          performance.dataCutoffAt.toISOString(),
          performance.performancePolicyVersion,
          performance.benchmarkCode,
          performance.twr.status,
          performance.twr.status === 'complete' ? performance.twr.value : null,
          performance.xirr.status,
          performance.xirr.status === 'complete'
            ? performance.xirr.value
            : null,
          performance.xirr.status === 'notEvaluable'
            ? performance.xirr.reason
            : null,
          performance.warnings.join('|'),
        ],
      ],
    );
  }

  private owned(userId: string, portfolioId: string) {
    return this.execute(() => this.portfolios.get(userId, portfolioId));
  }

  private async requireJob(
    userId: string,
    portfolioId: string,
    jobId: string,
  ): Promise<PortfolioImportJob> {
    const job = await this.store.findJob(jobId);
    if (!job)
      throw new NotFoundException({ code: 'PORTFOLIO_IMPORT_NOT_FOUND' });
    if (job.userId !== userId || job.portfolioId !== portfolioId)
      throw new ForbiddenException({
        code: 'PORTFOLIO_IMPORT_ACCESS_DENIED',
        message: 'Access to portfolio import was denied',
      });
    return job;
  }

  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof PortfolioError) throw mapError(error);
      throw error;
    }
  }
}

export function importJobDto(job: PortfolioImportJob) {
  return {
    id: job.id,
    portfolioId: job.portfolioId,
    status: job.status,
    commitMode: job.commitMode,
    sourceFilename: job.sourceFilename,
    contentType: job.contentType,
    fileSize: job.fileSize,
    encoding: job.encoding,
    delimiter: job.delimiter,
    totalRowCount: job.totalRowCount,
    validRowCount: job.validRowCount,
    invalidRowCount: job.invalidRowCount,
    duplicateRowCount: job.duplicateRowCount,
    committedRowCount: job.committedRowCount,
    previewExpiresAt: job.previewExpiresAt?.toISOString() ?? null,
    committedAt: job.committedAt?.toISOString() ?? null,
    cancelledAt: job.cancelledAt?.toISOString() ?? null,
    errorCode: job.errorCode,
    errorSummary: job.errorSummary,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw invalid('PORTFOLIO_CSV_INVALID', {
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        reason: issue.message,
      })),
    });
  return result.data;
}

function identifier(value: string): string {
  return parse(idSchema, value);
}

function requiredKey(value: string | undefined): string {
  const result = keySchema.safeParse(value);
  if (!result.success) throw invalid('PORTFOLIO_IDEMPOTENCY_KEY_REQUIRED');
  return result.data;
}

function encodeCursor(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function decodeCursor<T>(value: string, schema: z.ZodType<T>): T {
  try {
    return schema.parse(
      JSON.parse(Buffer.from(value, 'base64url').toString('utf8')),
    );
  } catch {
    throw invalid('PORTFOLIO_CSV_INVALID', { code: 'CSV_CURSOR_INVALID' });
  }
}

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function invalid(code: string, details?: unknown) {
  return new BadRequestException({
    code,
    message: 'Invalid portfolio CSV request',
    ...(details === undefined ? {} : { details }),
  });
}

function conflict(code: string, details?: unknown) {
  return new ConflictException({
    code,
    message: 'Portfolio import conflict',
    ...(details === undefined ? {} : { details }),
  });
}

function mapError(error: PortfolioError) {
  if (error.code === 'PORTFOLIO_ACCESS_DENIED')
    return new ForbiddenException({
      code: error.code,
      message: 'Access to portfolio was denied',
    });
  if (error.code === 'PORTFOLIO_NOT_FOUND')
    return new NotFoundException({ code: error.code });
  if (
    [
      'PORTFOLIO_DELETED',
      'PORTFOLIO_IDEMPOTENCY_CONFLICT',
      'PORTFOLIO_IMPORT_INVALID_STATE',
      'PORTFOLIO_IMPORT_EXPIRED',
    ].includes(error.code)
  )
    return conflict(error.code, error.details);
  if (
    [
      'PORTFOLIO_INSUFFICIENT_POSITION',
      'PORTFOLIO_TRANSACTION_INVALID',
      'PORTFOLIO_DECIMAL_INVALID',
      'PORTFOLIO_DECIMAL_OVERFLOW',
      'PORTFOLIO_IMPORT_ATOMIC_VALIDATION_FAILED',
    ].includes(error.code)
  )
    return new UnprocessableEntityException({
      code: error.code,
      message: 'Ledger validation failed during import',
    });
  return invalid(error.code, error.details);
}
