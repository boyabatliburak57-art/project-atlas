import {
  dataProviders,
  dataQualityIssues,
  ingestionRuns,
  priceBars,
  providerInstrumentMappings,
  type Database,
} from '@atlas/database';
import { and, desc, eq, ne, sql } from 'drizzle-orm';

import type { ProviderBarDto } from '../providers';
import type {
  BarIngestionStore,
  BarPersistenceContext,
  BarPersistenceResult,
  FetchBarRangeCommand,
  RejectedBar,
} from './contracts';

type DatabaseTransaction = Parameters<
  Parameters<Database['transaction']>[0]
>[0];

interface PersistedBar {
  readonly id: bigint;
  readonly closeTime: Date;
  readonly open: string;
  readonly high: string;
  readonly low: string;
  readonly close: string;
  readonly volume: string;
  readonly isClosed: boolean;
  readonly revision: number;
}

interface MutablePersistenceResult {
  insertedCount: number;
  updatedOpenCount: number;
  revisedClosedCount: number;
  duplicateCount: number;
  rejectedCount: number;
  qualityIssueCount: number;
}

export class DatabaseBarIngestionStore implements BarIngestionStore {
  constructor(private readonly database: Database) {}

  async findActiveProviderId(code: string): Promise<string | null> {
    const rows = await this.database
      .select({ id: dataProviders.id })
      .from(dataProviders)
      .where(
        and(eq(dataProviders.code, code), ne(dataProviders.status, 'inactive')),
      )
      .limit(1);
    return rows[0]?.id ?? null;
  }

  async findActiveInstrumentId(
    providerId: string,
    providerSymbol: string,
  ): Promise<string | null> {
    const rows = await this.database
      .select({ instrumentId: providerInstrumentMappings.instrumentId })
      .from(providerInstrumentMappings)
      .where(
        and(
          eq(providerInstrumentMappings.providerId, providerId),
          eq(providerInstrumentMappings.providerSymbol, providerSymbol),
          eq(providerInstrumentMappings.active, true),
        ),
      )
      .limit(1);
    return rows[0]?.instrumentId ?? null;
  }

  async createRun(
    providerId: string,
    command: FetchBarRangeCommand,
  ): Promise<string> {
    const rows = await this.database
      .insert(ingestionRuns)
      .values({
        providerId,
        jobType: 'bar_ingestion',
        status: 'running',
        requestedFrom: command.from,
        requestedTo: command.to,
        metadata: {
          providerSymbol: command.providerSymbol,
          timeframe: command.timeframe,
        },
      })
      .returning({ id: ingestionRuns.id });
    const runId = rows[0]?.id;
    if (runId === undefined) {
      throw new Error('Bar ingestion run could not be created');
    }
    return runId;
  }

  async persistBatch(
    runId: string,
    context: BarPersistenceContext,
    fetchedCount: number,
    bars: readonly ProviderBarDto[],
    rejectedBars: readonly RejectedBar[],
  ): Promise<BarPersistenceResult> {
    return this.database.transaction(async (transaction) => {
      const result = this.emptyResult();

      for (const rejected of rejectedBars) {
        await this.insertQualityIssue(transaction, context, runId, rejected);
        result.rejectedCount += 1;
        result.qualityIssueCount += 1;
      }

      for (const bar of bars) {
        await this.persistBar(transaction, context, runId, bar, result);
      }

      const acceptedCount =
        result.insertedCount +
        result.updatedOpenCount +
        result.revisedClosedCount;
      await transaction
        .update(ingestionRuns)
        .set({
          status: 'completed',
          completedAt: new Date(),
          fetchedCount,
          acceptedCount,
          rejectedCount: result.rejectedCount,
          metadata: {
            duplicateCount: result.duplicateCount,
            insertedCount: result.insertedCount,
            providerSymbol: context.command.providerSymbol,
            qualityIssueCount: result.qualityIssueCount,
            revisedClosedCount: result.revisedClosedCount,
            timeframe: context.command.timeframe,
            updatedOpenCount: result.updatedOpenCount,
          },
          updatedAt: new Date(),
        })
        .where(eq(ingestionRuns.id, runId));

      return result;
    });
  }

  async failRun(
    runId: string,
    providerId: string,
    errorCode: string,
  ): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await transaction
        .update(ingestionRuns)
        .set({
          status: 'failed',
          completedAt: new Date(),
          errorCode,
          metadata: { errorCode },
          updatedAt: new Date(),
        })
        .where(eq(ingestionRuns.id, runId));
      await transaction.insert(dataQualityIssues).values({
        providerId,
        issueType:
          errorCode === 'PROVIDER_MALFORMED_RESPONSE'
            ? 'provider_response_invalid'
            : 'provider_ingestion_failed',
        severity: 'error',
        details: { errorCode, runId },
      });
    });
  }

  private async persistBar(
    transaction: DatabaseTransaction,
    context: BarPersistenceContext,
    runId: string,
    bar: ProviderBarDto,
    result: MutablePersistenceResult,
  ): Promise<void> {
    if (context.instrumentId === null) {
      throw new Error('Validated bar is missing an instrument mapping');
    }

    const lockKey = [
      context.providerId,
      context.instrumentId,
      bar.timeframe,
      bar.openTime.toISOString(),
    ].join('|');
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
    );

    const existingRows = await transaction
      .select({
        id: priceBars.id,
        closeTime: priceBars.closeTime,
        open: priceBars.open,
        high: priceBars.high,
        low: priceBars.low,
        close: priceBars.close,
        volume: priceBars.volume,
        isClosed: priceBars.isClosed,
        revision: priceBars.revision,
      })
      .from(priceBars)
      .where(
        and(
          eq(priceBars.providerId, context.providerId),
          eq(priceBars.instrumentId, context.instrumentId),
          eq(priceBars.timeframe, bar.timeframe),
          eq(priceBars.openTime, bar.openTime),
        ),
      )
      .orderBy(desc(priceBars.revision))
      .limit(1);
    const existing = existingRows[0];

    if (existing === undefined) {
      await transaction.insert(priceBars).values({
        instrumentId: context.instrumentId,
        providerId: context.providerId,
        timeframe: bar.timeframe,
        openTime: bar.openTime,
        closeTime: bar.closeTime,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
        isClosed: bar.isClosed,
        ...(bar.sourceTimestamp === undefined
          ? {}
          : { sourceTimestamp: bar.sourceTimestamp }),
        revision: 1,
        qualityStatus: bar.isClosed ? 'accepted' : 'provisional',
      });
      result.insertedCount += 1;
      return;
    }

    if (this.sameContent(existing, bar)) {
      result.duplicateCount += 1;
      return;
    }

    if (!existing.isClosed) {
      await transaction
        .update(priceBars)
        .set({
          closeTime: bar.closeTime,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume,
          isClosed: bar.isClosed,
          sourceTimestamp: bar.sourceTimestamp ?? null,
          qualityStatus: bar.isClosed ? 'accepted' : 'provisional',
          ingestedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(priceBars.id, existing.id));
      result.updatedOpenCount += 1;
      return;
    }

    if (!bar.isClosed) {
      await this.insertQualityIssue(transaction, context, runId, {
        providerSymbol: bar.providerSymbol,
        timeframe: bar.timeframe,
        openTime: bar.openTime,
        codes: ['CLOSED_BAR_REOPENED'],
      });
      result.rejectedCount += 1;
      result.qualityIssueCount += 1;
      return;
    }

    await transaction.insert(priceBars).values({
      instrumentId: context.instrumentId,
      providerId: context.providerId,
      timeframe: bar.timeframe,
      openTime: bar.openTime,
      closeTime: bar.closeTime,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
      isClosed: true,
      ...(bar.sourceTimestamp === undefined
        ? {}
        : { sourceTimestamp: bar.sourceTimestamp }),
      revision: existing.revision + 1,
      qualityStatus: 'corrected',
    });
    result.revisedClosedCount += 1;
  }

  private insertQualityIssue(
    transaction: DatabaseTransaction,
    context: BarPersistenceContext,
    runId: string,
    rejected:
      | RejectedBar
      | (Omit<RejectedBar, 'codes'> & { codes: readonly string[] }),
  ) {
    return transaction.insert(dataQualityIssues).values({
      providerId: context.providerId,
      ...(context.instrumentId === null
        ? {}
        : { instrumentId: context.instrumentId }),
      timeframe: rejected.timeframe,
      openTime: rejected.openTime,
      issueType: 'bar_validation_failed',
      severity: 'error',
      details: {
        codes: [...rejected.codes],
        providerSymbol: rejected.providerSymbol,
        runId,
      },
    });
  }

  private sameContent(
    existing: PersistedBar,
    incoming: ProviderBarDto,
  ): boolean {
    return (
      existing.closeTime.getTime() === incoming.closeTime.getTime() &&
      existing.open === incoming.open &&
      existing.high === incoming.high &&
      existing.low === incoming.low &&
      existing.close === incoming.close &&
      existing.volume === incoming.volume &&
      existing.isClosed === incoming.isClosed
    );
  }

  private emptyResult(): MutablePersistenceResult {
    return {
      insertedCount: 0,
      updatedOpenCount: 0,
      revisedClosedCount: 0,
      duplicateCount: 0,
      rejectedCount: 0,
      qualityIssueCount: 0,
    };
  }
}
