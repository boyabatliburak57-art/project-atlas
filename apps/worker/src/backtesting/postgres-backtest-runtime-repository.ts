import { createHash } from 'node:crypto';

import {
  backtestDataSnapshots,
  backtestFills,
  backtestOrders,
  backtestRuns,
  backtestSeriesChunks,
  backtestSummaries,
  backtestTrades,
  type Database,
} from '@atlas/database';
import {
  Decimal,
  type BacktestRunCreationInput,
  type BacktestRunRecord,
  type BacktestRunRepository,
  type BacktestRunStatus,
} from '@atlas/domain';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';

import type { BacktestWorkerRepository, BacktestWorkerRun } from './contracts';

type RunRow = typeof backtestRuns.$inferSelect;

const statusToDatabase: Record<BacktestRunStatus, string> = {
  queued: 'queued',
  resolvingData: 'resolving_data',
  running: 'running',
  calculatingMetrics: 'calculating_metrics',
  completed: 'completed',
  failed: 'failed',
  cancelRequested: 'cancel_requested',
  cancelled: 'cancelled',
  expired: 'expired',
};

export class PostgresBacktestRuntimeRepository
  implements BacktestRunRepository, BacktestWorkerRepository
{
  constructor(private readonly database: Database) {}

  async findById(id: string): Promise<BacktestRunRecord | null> {
    const row = await this.selectRun(id);
    return row === null ? null : mapApplicationRun(row);
  }

  async findByIdempotency(
    userId: string,
    idempotencyKeyHash: string,
  ): Promise<BacktestRunRecord | null> {
    const rows = await this.database
      .select()
      .from(backtestRuns)
      .where(
        and(
          eq(backtestRuns.requestedBy, userId),
          eq(backtestRuns.idempotencyKeyHash, idempotencyKeyHash),
        ),
      )
      .limit(1);
    return rows[0] === undefined ? null : mapApplicationRun(rows[0]);
  }

  async createIdempotently(input: BacktestRunCreationInput): Promise<{
    readonly run: BacktestRunRecord;
    readonly created: boolean;
  }> {
    const inserted = await this.database
      .insert(backtestRuns)
      .values({
        id: input.id,
        strategyId: input.strategyId,
        strategyRevision: input.strategyRevision,
        requestedBy: input.requestedBy,
        requestHash: input.requestHash,
        idempotencyKeyHash: input.idempotencyKeyHash,
        engineVersion: input.executionPlan.engineVersion,
        executionPolicyVersion: input.executionPlan.executionPolicyVersion,
        costPolicyVersion:
          input.executionPlan.costPolicy?.version ?? 'cost-free-v1',
        metricPolicyVersion: 'backtest-summary-v1',
        eventOrderingPolicyVersion:
          input.executionPlan.eventOrderingPolicyVersion,
        roundingPolicyVersion: input.executionPlan.roundingPolicyVersion,
        dataSnapshotId: input.snapshot.id,
        parameters: {
          complexityScore: input.complexityScore,
          executionPlan: input.executionPlan,
          ...(input.experimentBinding === undefined
            ? {}
            : {
                experimentBindingHash: input.experimentBinding.hash,
                experimentBinding: input.experimentBinding.values,
                experimentSampleRole: input.experimentBinding.sampleRole,
              }),
        },
        universeSnapshot: input.snapshot.universeSnapshot,
        timeframe: input.executionPlan.timeframe,
        adjustmentMode: mapAdjustmentMode(
          input.executionPlan.corporateActionPolicy?.adjustmentMode ?? 'raw',
        ),
        rangeFrom: new Date(input.rangeFrom),
        rangeTo: new Date(input.rangeTo),
        initialCapital: input.executionPlan.initialCash,
        queuedAt: new Date(input.queuedAt),
      })
      .onConflictDoNothing({
        target: [backtestRuns.requestedBy, backtestRuns.idempotencyKeyHash],
      })
      .returning();
    if (inserted[0] !== undefined)
      return { run: mapApplicationRun(inserted[0]), created: true };
    const existing = await this.findByIdempotency(
      input.requestedBy,
      input.idempotencyKeyHash,
    );
    if (existing === null) throw new Error('BACKTEST_RUN_CREATE_RACE');
    return { run: existing, created: false };
  }

  async listDispatchable(limit: number): Promise<readonly BacktestRunRecord[]> {
    const rows = await this.database
      .select()
      .from(backtestRuns)
      .where(eq(backtestRuns.status, 'queued'))
      .orderBy(asc(backtestRuns.queuedAt), asc(backtestRuns.id))
      .limit(limit);
    return rows.map(mapApplicationRun);
  }

  async requestCancellation(input: {
    readonly runId: string;
    readonly userId: string;
    readonly requestedAt: string;
  }): Promise<BacktestRunRecord | null> {
    const rows = await this.database
      .update(backtestRuns)
      .set({
        status: 'cancel_requested',
        cancelRequestedAt: new Date(input.requestedAt),
        updatedAt: new Date(input.requestedAt),
      })
      .where(
        and(
          eq(backtestRuns.id, input.runId),
          eq(backtestRuns.requestedBy, input.userId),
          inArray(backtestRuns.status, [
            'queued',
            'resolving_data',
            'running',
            'calculating_metrics',
          ]),
        ),
      )
      .returning();
    return rows[0] === undefined ? null : mapApplicationRun(rows[0]);
  }

  async loadRun(runId: string): Promise<BacktestWorkerRun | null> {
    const row = await this.selectRun(runId);
    if (row === null) return null;
    const snapshots = await this.database
      .select({ hash: backtestDataSnapshots.snapshotHash })
      .from(backtestDataSnapshots)
      .where(eq(backtestDataSnapshots.id, row.dataSnapshotId))
      .limit(1);
    if (snapshots[0] === undefined) return null;
    return mapWorkerRun(row, snapshots[0].hash);
  }

  async transition(
    input: Parameters<BacktestWorkerRepository['transition']>[0],
  ): Promise<BacktestWorkerRun | null> {
    const status = statusToDatabase[input.to];
    const occurredAt = input.occurredAt;
    const rows = await this.database
      .update(backtestRuns)
      .set({
        status,
        ...(input.progressPercent === undefined
          ? {}
          : { progress: String(input.progressPercent) }),
        ...(input.to === 'resolvingData'
          ? {
              startedAt: sql`coalesce(${backtestRuns.startedAt}, ${occurredAt})`,
            }
          : {}),
        ...(input.to === 'completed' ? { completedAt: occurredAt } : {}),
        ...(input.to === 'cancelled' ? { cancelledAt: occurredAt } : {}),
        ...(input.errorCode === undefined
          ? {}
          : { errorCode: input.errorCode }),
        updatedAt: occurredAt,
      })
      .where(
        and(
          eq(backtestRuns.id, input.runId),
          inArray(
            backtestRuns.status,
            input.from.map((value) => statusToDatabase[value]),
          ),
        ),
      )
      .returning();
    return rows[0] === undefined
      ? this.loadRun(input.runId)
      : this.loadRun(rows[0].id);
  }

  async isCancellationRequested(runId: string): Promise<boolean> {
    const rows = await this.database
      .select({ status: backtestRuns.status })
      .from(backtestRuns)
      .where(eq(backtestRuns.id, runId))
      .limit(1);
    return rows[0]?.status === 'cancel_requested';
  }

  async saveCheckpoint(
    input: Parameters<BacktestWorkerRepository['saveCheckpoint']>[0],
  ): Promise<void> {
    const row = await this.selectRun(input.runId);
    if (row === null) return;
    await this.database
      .update(backtestRuns)
      .set({
        parameters: { ...row.parameters, runtimeCheckpoint: input.checkpoint },
        progress: String(input.progressPercent),
        updatedAt: input.occurredAt,
      })
      .where(eq(backtestRuns.id, input.runId));
  }

  async persistCompletedResult(
    input: Parameters<BacktestWorkerRepository['persistCompletedResult']>[0],
  ): Promise<void> {
    const summary = input.result.summary;
    if (summary === null) throw new Error('BACKTEST_RESULT_NOT_COMPLETED');
    await this.database.transaction(async (transaction) => {
      const orderIds = new Map<string, string>();
      for (const [index, fill] of input.result.fills.entries()) {
        const orderId = stableUuid(input.run.id, 'order', fill.orderIntentId);
        orderIds.set(fill.orderIntentId, orderId);
        await transaction
          .insert(backtestOrders)
          .values({
            id: orderId,
            runId: input.run.id,
            ownerUserId: input.run.requestedBy,
            instrumentId: fill.instrumentId,
            orderSequence: index,
            eventAt: new Date(fill.signalAt),
            side: fill.side.toLowerCase(),
            orderType: 'market',
            status: fill.partial ? 'partially_filled' : 'filled',
            requestedQuantity: fill.requestedQuantity,
            signalPrice: fill.referencePrice,
            reasonCode: fill.reason,
          })
          .onConflictDoNothing({
            target: [backtestOrders.runId, backtestOrders.orderSequence],
          });
      }
      const fillIds = new Map<string, string>();
      for (const [index, fill] of input.result.fills.entries()) {
        const fillId = stableUuid(input.run.id, 'fill', fill.id);
        fillIds.set(fill.id, fillId);
        await transaction
          .insert(backtestFills)
          .values({
            id: fillId,
            runId: input.run.id,
            ownerUserId: input.run.requestedBy,
            orderId: orderIds.get(fill.orderIntentId)!,
            instrumentId: fill.instrumentId,
            fillSequence: index,
            filledAt: new Date(fill.filledAt),
            quantity: fill.quantity,
            rawPrice: fill.referencePrice,
            fillPrice: fill.price,
            commission: fill.commission,
            slippageCost: fill.slippageAmount,
            fee: fill.fixedFee,
            tax: fill.tax,
            deduplicationKey: `${input.run.id}:${fill.deduplicationKey}`,
            metadata: { engineFillId: fill.id, reason: fill.reason },
          })
          .onConflictDoNothing({ target: backtestFills.deduplicationKey });
      }
      for (const [index, trade] of input.result.trades.entries()) {
        await transaction
          .insert(backtestTrades)
          .values({
            id: stableUuid(input.run.id, 'trade', trade.id),
            runId: input.run.id,
            ownerUserId: input.run.requestedBy,
            instrumentId: trade.instrumentId,
            tradeSequence: index,
            entryFillId: fillIds.get(trade.entryFillId)!,
            exitFillId: fillIds.get(trade.exitFillId)!,
            openedAt: new Date(trade.openedAt),
            closedAt: new Date(trade.closedAt),
            quantity: trade.quantity,
            entryPrice: trade.entryPrice,
            exitPrice: trade.exitPrice,
            grossPnl: trade.realizedPnl,
            netPnl: trade.realizedPnl,
            totalCost: '0',
            returnRate: trade.returnPercent,
            holdingBars: 0,
            closeReason: trade.exitReason,
          })
          .onConflictDoNothing({
            target: [backtestTrades.runId, backtestTrades.tradeSequence],
          });
      }
      for (const series of resultSeries(input.result)) {
        for (const [chunkIndex, points] of chunk(
          series.points,
          1_000,
        ).entries()) {
          if (points.length === 0) continue;
          await transaction
            .insert(backtestSeriesChunks)
            .values({
              id: stableUuid(input.run.id, series.type, String(chunkIndex)),
              runId: input.run.id,
              ownerUserId: input.run.requestedBy,
              seriesType: series.type,
              chunkIndex,
              rangeStart: new Date(points[0]!.timestamp),
              rangeEnd: new Date(points.at(-1)!.timestamp),
              pointCount: points.length,
              payload: points,
              checksum: stableHash(points),
            })
            .onConflictDoNothing({
              target: [
                backtestSeriesChunks.runId,
                backtestSeriesChunks.seriesType,
                backtestSeriesChunks.chunkIndex,
              ],
            });
        }
      }
      await transaction
        .insert(backtestSummaries)
        .values({
          runId: input.run.id,
          ownerUserId: input.run.requestedBy,
          endingEquity: summary.endingEquity,
          totalReturn: summary.totalReturnPercent,
          maximumDrawdown: summary.maximumDrawdownPercent,
          winRate: summary.winRatePercent,
          profitFactor: summary.profitFactor,
          turnover: '0',
          exposure: summary.exposurePercent,
          totalFees: summary.totalCosts,
          totalSlippage: sum(
            input.result.fills.map((fill) => fill.slippageAmount),
          ),
          tradeCount: summary.tradeCount,
          methodology: {
            engineVersion: input.run.executionPlan.engineVersion,
            resultHash: input.result.resultHash,
          },
          warnings: input.result.warnings.map((warning) => ({ ...warning })),
          calculatedAt: input.completedAt,
        })
        .onConflictDoNothing({ target: backtestSummaries.runId });
      await transaction
        .update(backtestRuns)
        .set({
          status: 'completed',
          progress: '100',
          completedAt: input.completedAt,
          warnings: input.result.warnings.map((warning) => ({ ...warning })),
          updatedAt: input.completedAt,
        })
        .where(eq(backtestRuns.id, input.run.id));
    });
  }

  async failRun(
    input: Parameters<BacktestWorkerRepository['failRun']>[0],
  ): Promise<void> {
    await this.database
      .update(backtestRuns)
      .set({
        status: input.status,
        errorCode: input.errorCode,
        completedAt: input.occurredAt,
        updatedAt: input.occurredAt,
      })
      .where(eq(backtestRuns.id, input.runId));
  }

  private async selectRun(id: string): Promise<RunRow | null> {
    const rows = await this.database
      .select()
      .from(backtestRuns)
      .where(eq(backtestRuns.id, id))
      .limit(1);
    return rows[0] ?? null;
  }
}

function mapApplicationRun(row: RunRow): BacktestRunRecord {
  const parameters = row.parameters as {
    complexityScore?: number;
    executionPlan: BacktestRunRecord['executionPlan'];
  };
  return {
    id: row.id,
    requestedBy: row.requestedBy,
    strategyId: row.strategyId,
    strategyRevision: row.strategyRevision,
    status: mapStatus(row.status),
    requestHash: row.requestHash,
    idempotencyKeyHash: row.idempotencyKeyHash,
    executionPlan: parameters.executionPlan,
    dataSnapshotId: row.dataSnapshotId,
    dataSnapshotHash: parameters.executionPlan.dataSnapshotHash,
    rangeFrom: row.rangeFrom.toISOString(),
    rangeTo: row.rangeTo.toISOString(),
    complexityScore: parameters.complexityScore ?? 0,
    progressPercent: Number(row.progress),
    queuedAt: row.queuedAt.toISOString(),
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    cancelRequestedAt: row.cancelRequestedAt?.toISOString() ?? null,
    errorCode: row.errorCode,
  };
}

function mapWorkerRun(row: RunRow, snapshotHash: string): BacktestWorkerRun {
  const parameters = row.parameters as {
    executionPlan: BacktestWorkerRun['executionPlan'];
    runtimeCheckpoint?: BacktestWorkerRun['checkpoint'];
  };
  return {
    id: row.id,
    requestedBy: row.requestedBy,
    status: mapStatus(row.status),
    executionPlan: parameters.executionPlan,
    dataSnapshotId: row.dataSnapshotId,
    dataSnapshotHash: snapshotHash,
    queuedAt: row.queuedAt,
    startedAt: row.startedAt,
    progressPercent: Number(row.progress),
    checkpoint: parameters.runtimeCheckpoint ?? null,
  };
}

function mapStatus(status: string): BacktestRunStatus {
  const found = Object.entries(statusToDatabase).find(
    ([, value]) => value === status,
  );
  if (found === undefined)
    throw new Error(`Unsupported backtest status: ${status}`);
  return found[0] as BacktestRunStatus;
}

function mapAdjustmentMode(
  value: string,
): 'raw' | 'split_adjusted' | 'total_return_adjusted' {
  if (value === 'raw') return 'raw';
  if (value === 'splitAdjusted') return 'split_adjusted';
  return 'total_return_adjusted';
}

function stableUuid(...parts: readonly string[]): string {
  const hash = createHash('sha256').update(parts.join('\u001f')).digest('hex');
  const bytes = hash.slice(0, 32).split('');
  bytes[12] = '5';
  bytes[16] = ['8', '9', 'a', 'b'][Number.parseInt(bytes[16]!, 16) % 4]!;
  const value = bytes.join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function stableHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function chunk<T>(
  values: readonly T[],
  size: number,
): readonly (readonly T[])[] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size)
    chunks.push(values.slice(index, index + size));
  return chunks;
}

function resultSeries(
  result: Parameters<
    BacktestWorkerRepository['persistCompletedResult']
  >[0]['result'],
) {
  return [
    { type: 'equity' as const, points: result.equityCurve },
    { type: 'cash' as const, points: result.cashCurve },
    { type: 'exposure' as const, points: result.exposureCurve },
    { type: 'drawdown' as const, points: result.drawdownCurve },
  ];
}

function sum(values: readonly string[]): string {
  return values
    .reduce((total, value) => total.plus(Decimal.parse(value)), Decimal.ZERO)
    .toString();
}
