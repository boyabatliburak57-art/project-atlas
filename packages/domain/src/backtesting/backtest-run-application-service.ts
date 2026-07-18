import { createHash, randomUUID } from 'node:crypto';

import { createStableParameterHash } from '../indicators/parameter-hash.js';
import type {
  BacktestRunApplicationDependencies,
  BacktestRunRecord,
  CreateBacktestRunRequest,
} from './runtime-contracts.js';
import { BacktestRuntimeApplicationError } from './runtime-errors.js';

const terminalStatuses = new Set([
  'completed',
  'failed',
  'cancelled',
  'expired',
]);

export class BacktestRunApplicationService {
  private readonly now: () => Date;

  constructor(
    private readonly dependencies: BacktestRunApplicationDependencies,
  ) {
    this.now = dependencies.now ?? (() => new Date());
  }

  async create(request: CreateBacktestRunRequest): Promise<{
    readonly run: BacktestRunRecord;
    readonly replayed: boolean;
    readonly dispatched: boolean;
  }> {
    if (request.idempotencyKey.trim().length === 0)
      throw new BacktestRuntimeApplicationError(
        'BACKTEST_IDEMPOTENCY_KEY_REQUIRED',
      );
    const requestHash = hashBacktestRunRequest(request);
    const idempotencyKeyHash = hashIdempotencyKey(request.idempotencyKey);
    const existing = await this.dependencies.repository.findByIdempotency(
      request.userId,
      idempotencyKeyHash,
    );
    if (existing !== null) return replay(existing, requestHash);

    const entitlement = await this.dependencies.entitlement.authorize({
      userId: request.userId,
      complexityScore: request.complexityScore,
    });
    if (!entitlement.allowed)
      throw new BacktestRuntimeApplicationError('BACKTEST_ENTITLEMENT_DENIED');
    if (request.complexityScore > entitlement.maximumComplexityScore)
      throw new BacktestRuntimeApplicationError(
        'BACKTEST_COMPLEXITY_LIMIT_EXCEEDED',
      );
    const snapshot = await this.dependencies.snapshotResolver.resolve({
      userId: request.userId,
      strategyId: request.strategyId,
      strategyRevision: request.strategyRevision,
      snapshotHash: request.dataSnapshotHash,
      rangeFrom: request.rangeFrom,
      rangeTo: request.rangeTo,
    });
    if (snapshot.coverageStatus === 'notEvaluable')
      throw new BacktestRuntimeApplicationError(
        'BACKTEST_SNAPSHOT_NOT_EVALUABLE',
      );
    if (snapshot.hash !== request.executionPlan.dataSnapshotHash)
      throw new BacktestRuntimeApplicationError(
        'BACKTEST_SNAPSHOT_NOT_EVALUABLE',
        { reason: 'execution_plan_snapshot_mismatch' },
      );
    const runId = this.dependencies.idGenerator();
    const creation = await this.dependencies.repository.createIdempotently({
      id: runId,
      requestedBy: request.userId,
      strategyId: request.strategyId,
      strategyRevision: request.strategyRevision,
      requestHash,
      idempotencyKeyHash,
      executionPlan: { ...request.executionPlan, runId },
      snapshot,
      rangeFrom: request.rangeFrom,
      rangeTo: request.rangeTo,
      complexityScore: request.complexityScore,
      experimentBinding: request.experimentBinding,
      queuedAt: this.now().toISOString(),
    });
    if (!creation.created) return replay(creation.run, requestHash);
    const dispatched = await this.tryDispatch(creation.run);
    return { run: creation.run, replayed: false, dispatched };
  }

  async reconcileDispatch(limit = 100): Promise<number> {
    const runs = await this.dependencies.repository.listDispatchable(limit);
    let dispatched = 0;
    for (const run of runs) {
      if (await this.tryDispatch(run)) dispatched += 1;
    }
    return dispatched;
  }

  async getOwned(runId: string, userId: string): Promise<BacktestRunRecord> {
    const run = await this.dependencies.repository.findById(runId);
    if (run === null)
      throw new BacktestRuntimeApplicationError('BACKTEST_RUN_NOT_FOUND');
    if (run.requestedBy !== userId)
      throw new BacktestRuntimeApplicationError('BACKTEST_RUN_ACCESS_DENIED');
    return run;
  }

  async requestCancellation(
    runId: string,
    userId: string,
  ): Promise<BacktestRunRecord> {
    const run = await this.getOwned(runId, userId);
    if (run.status === 'cancelRequested') return run;
    if (terminalStatuses.has(run.status))
      throw new BacktestRuntimeApplicationError('BACKTEST_RUN_NOT_CANCELLABLE');
    const updated = await this.dependencies.repository.requestCancellation({
      runId,
      userId,
      requestedAt: this.now().toISOString(),
    });
    if (updated === null)
      throw new BacktestRuntimeApplicationError('BACKTEST_RUN_NOT_CANCELLABLE');
    return updated;
  }

  private async tryDispatch(run: BacktestRunRecord): Promise<boolean> {
    try {
      await this.dependencies.dispatcher.dispatch({
        runId: run.id,
        correlationId: randomUUID(),
      });
      return true;
    } catch {
      return false;
    }
  }
}

export function hashBacktestRunRequest(
  request: CreateBacktestRunRequest,
): string {
  return createStableParameterHash({
    userId: request.userId,
    strategyId: request.strategyId,
    strategyRevision: request.strategyRevision,
    executionPlan: { ...request.executionPlan, runId: 'runtime-assigned' },
    dataSnapshotHash: request.dataSnapshotHash,
    rangeFrom: request.rangeFrom,
    rangeTo: request.rangeTo,
    complexityScore: request.complexityScore,
    ...(request.experimentBinding === undefined
      ? {}
      : { experimentBinding: request.experimentBinding }),
  });
}

function hashIdempotencyKey(value: string): string {
  return createHash('sha256').update(value.trim(), 'utf8').digest('hex');
}

function replay(
  run: BacktestRunRecord,
  requestHash: string,
): {
  readonly run: BacktestRunRecord;
  readonly replayed: true;
  readonly dispatched: false;
} {
  if (run.requestHash !== requestHash)
    throw new BacktestRuntimeApplicationError('BACKTEST_IDEMPOTENCY_CONFLICT');
  return { run, replayed: true, dispatched: false };
}
