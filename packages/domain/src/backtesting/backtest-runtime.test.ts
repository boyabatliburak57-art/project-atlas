import { describe, expect, it, vi } from 'vitest';

import type { StrategyParameterDefinition } from '../strategies/contracts.js';
import type { ScanRuleAst } from '../scanner/ast/contracts.js';
import type { BacktestExecutionPlan } from './contracts.js';
import { BacktestRunApplicationService } from './backtest-run-application-service.js';
import {
  ApplicationExperimentChildRunPort,
  createExperimentChildBindings,
  generateExperimentCombinations,
  ResearchExperimentRuntimeService,
} from './experiment-runtime.js';
import type {
  BacktestRunRecord,
  BacktestRunRepository,
  ExperimentRuntimeRepository,
} from './runtime-contracts.js';
import { BacktestRuntimeApplicationError } from './runtime-errors.js';

const userId = '00000000-0000-4000-8000-000000000101';
const snapshot = {
  id: '00000000-0000-4000-8000-000000000102',
  hash: 'snapshot-067',
  dataCutoffAt: '2025-12-31T15:00:00.000Z',
  universeSnapshot: { version: 'bist-history-v1' },
  events: [],
  coverageStatus: 'complete' as const,
};

describe('backtest run application runtime', () => {
  it('creates, dispatches and idempotently replays the same request', async () => {
    const repository = new MemoryRunRepository();
    const dispatch = vi.fn(() => Promise.resolve());
    const service = serviceWith(repository, dispatch);
    const first = await service.create(request('key-1'));
    const second = await service.create(request('key-1'));
    expect(first).toMatchObject({ replayed: false, dispatched: true });
    expect(second).toMatchObject({ replayed: true, dispatched: false });
    expect(second.run.id).toBe(first.run.id);
    expect(first.run.executionPlan.runId).toBe(first.run.id);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('rejects the same idempotency key with a different request hash', async () => {
    const service = serviceWith(new MemoryRunRepository(), vi.fn());
    await service.create(request('key-2'));
    await expect(
      service.create({ ...request('key-2'), complexityScore: 11 }),
    ).rejects.toMatchObject({ code: 'BACKTEST_IDEMPOTENCY_CONFLICT' });
  });

  it('reconciles a reliable PostgreSQL queued run after dispatch failure', async () => {
    const repository = new MemoryRunRepository();
    let unavailable = true;
    const dispatch = vi.fn(() =>
      unavailable
        ? Promise.reject(new Error('redis unavailable'))
        : Promise.resolve(),
    );
    const service = serviceWith(repository, dispatch);
    expect((await service.create(request('key-3'))).dispatched).toBe(false);
    unavailable = false;
    expect(await service.reconcileDispatch()).toBe(1);
  });
});

describe('research experiment runtime', () => {
  const parameters: readonly StrategyParameterDefinition[] = [
    {
      name: 'period',
      type: 'integer',
      defaultValue: 10,
      minimum: 5,
      maximum: 20,
    },
    {
      name: 'threshold',
      type: 'number',
      defaultValue: 1,
      minimum: 0.5,
      maximum: 2,
    },
  ];
  const definition = {
    parameterDefinitions: parameters,
    grid: {
      axes: [
        { parameter: 'threshold', values: [2, 1] },
        { parameter: 'period', range: { from: 5, to: 15, step: 5 } },
      ],
      samples: [
        {
          role: 'train' as const,
          from: '2020-01-01T00:00:00.000Z',
          to: '2022-12-31T23:59:59.999Z',
        },
        {
          role: 'holdout' as const,
          from: '2023-01-01T00:00:00.000Z',
          to: '2024-12-31T23:59:59.999Z',
        },
      ],
      maximumCombinations: 10,
    },
  };

  it('generates a validated deterministic grid and separated holdout bindings', () => {
    const combinations = generateExperimentCombinations(definition);
    expect(combinations).toHaveLength(6);
    expect(combinations[0]?.values).toEqual({ period: 5, threshold: 1 });
    const children = createExperimentChildBindings(
      combinations,
      definition.grid.samples,
    );
    expect(children).toHaveLength(12);
    expect(
      children.filter((child) => child.sampleRole === 'holdout'),
    ).toHaveLength(6);
    expect(new Set(children.map((child) => child.bindingHash)).size).toBe(12);
  });

  it('rejects duplicate bindings and a grid beyond the combination limit', () => {
    expect(() =>
      generateExperimentCombinations({
        parameterDefinitions: parameters,
        grid: {
          ...definition.grid,
          axes: [{ parameter: 'period', values: [5, 5] }],
        },
      }),
    ).toThrowError(BacktestRuntimeApplicationError);
    expect(() =>
      generateExperimentCombinations({
        ...definition,
        grid: { ...definition.grid, maximumCombinations: 5 },
      }),
    ).toThrowError(BacktestRuntimeApplicationError);
  });

  it('reuses only compatible completed runs and protects duplicate child bindings', async () => {
    const repository = new MemoryExperimentRepository();
    repository.reuse = true;
    const create = vi.fn(() => Promise.resolve({ runId: 'new-run' }));
    const runtime = new ResearchExperimentRuntimeService(repository, {
      create,
      requestCancellation: vi.fn(),
    });
    const result = await runtime.orchestrate(orchestration(definition));
    expect(result).toMatchObject({
      status: 'completed',
      reusedCount: 12,
      createdCount: 0,
    });
    expect(create).not.toHaveBeenCalled();
    expect(
      repository.compatibilityKeys.every(
        (key) => key.dataSnapshotHash === 'snapshot-067',
      ),
    ).toBe(true);
  });

  it('records partial child failure without discarding completed children', async () => {
    const repository = new MemoryExperimentRepository();
    let calls = 0;
    const runtime = new ResearchExperimentRuntimeService(repository, {
      create() {
        calls += 1;
        return calls === 2
          ? Promise.reject(new Error('transient child failure'))
          : Promise.resolve({ runId: `run-${calls}` });
      },
      requestCancellation: vi.fn(),
    });
    const result = await runtime.orchestrate(orchestration(definition));
    expect(result.status).toBe('partial');
    expect(result.failedCount).toBe(1);
    expect(repository.completedStatus).toBe('partial');
  });

  it('cooperatively cancels an experiment and its running child runs', async () => {
    const repository = new MemoryExperimentRepository();
    repository.cancelled = true;
    repository.running = ['run-b', 'run-a'];
    const cancel = vi.fn<(runId: string, userId: string) => Promise<void>>(() =>
      Promise.resolve(),
    );
    const runtime = new ResearchExperimentRuntimeService(repository, {
      create: vi.fn(),
      requestCancellation: cancel,
    });
    const result = await runtime.orchestrate(orchestration(definition));
    expect(result.status).toBe('cancelled');
    expect(cancel.mock.calls.map(([runId]) => runId)).toEqual([
      'run-a',
      'run-b',
    ]);
  });

  it('creates child runs with a binding-scoped idempotency key and sample range', async () => {
    const repository = new MemoryRunRepository();
    const runs = serviceWith(
      repository,
      vi.fn(() => Promise.resolve()),
    );
    const adapter = new ApplicationExperimentChildRunPort(runs, {
      create: () => ({
        executionPlan: plan(),
        dataSnapshotHash: snapshot.hash,
        complexityScore: 10,
      }),
    });
    const child = createExperimentChildBindings(
      generateExperimentCombinations(definition),
      definition.grid.samples,
    )[0]!;
    const created = await adapter.create({
      experiment: orchestration(definition).experiment,
      child,
    });
    const run = await repository.findById(created.runId);
    expect(run).toMatchObject({
      rangeFrom: child.rangeFrom,
      rangeTo: child.rangeTo,
    });
  });
});

function serviceWith(
  repository: BacktestRunRepository,
  dispatch: (input: { runId: string; correlationId: string }) => Promise<void>,
) {
  return new BacktestRunApplicationService({
    repository,
    snapshotResolver: { resolve: () => Promise.resolve(snapshot) },
    entitlement: {
      authorize: () =>
        Promise.resolve({ allowed: true, maximumComplexityScore: 100 }),
    },
    dispatcher: { dispatch },
    idGenerator: () => '00000000-0000-4000-8000-000000000103',
    now: () => new Date('2026-07-18T12:00:00.000Z'),
  });
}

function request(idempotencyKey: string) {
  return {
    userId,
    idempotencyKey,
    strategyId: '00000000-0000-4000-8000-000000000104',
    strategyRevision: 1,
    executionPlan: plan(),
    dataSnapshotHash: snapshot.hash,
    rangeFrom: '2025-01-01T00:00:00.000Z',
    rangeTo: '2025-12-31T23:59:59.000Z',
    complexityScore: 10,
  };
}

function plan(): BacktestExecutionPlan {
  const rule: ScanRuleAst = {
    version: 1 as const,
    universe: {
      market: 'BIST',
      statuses: ['active' as const],
      indexCodes: [],
      sectorIds: [],
    },
    root: {
      type: 'group' as const,
      nodeId: 'root',
      operator: 'AND' as const,
      children: [],
    },
  };
  return {
    runId: 'client-placeholder',
    strategyRevisionId: 'revision-1',
    dataSnapshotHash: snapshot.hash,
    engineVersion: 'engine-v1',
    executionPolicyVersion: 'next-open-v1',
    eventOrderingPolicyVersion: 'ordering-v1',
    roundingPolicyVersion: 'round-v1',
    timeframe: '1d',
    initialCash: '1000',
    entryRule: rule,
    exitRule: rule,
    positionSizing: { type: 'fixedCash', amount: '100' },
    maxConcurrentPositions: 5,
    fractionalShares: false,
    allowShort: false,
    allowLeverage: false,
    liquidateAtEnd: true,
  };
}

class MemoryRunRepository implements BacktestRunRepository {
  private run: BacktestRunRecord | null = null;
  findById = (id: string) => {
    void id;
    return Promise.resolve(this.run);
  };
  findByIdempotency = (user: string, key: string) =>
    Promise.resolve(
      this.run?.requestedBy === user && this.run.idempotencyKeyHash === key
        ? this.run
        : null,
    );
  createIdempotently(
    input: Parameters<BacktestRunRepository['createIdempotently']>[0],
  ) {
    if (this.run !== null)
      return Promise.resolve({ run: this.run, created: false });
    this.run = {
      id: input.id,
      requestedBy: input.requestedBy,
      strategyId: input.strategyId,
      strategyRevision: input.strategyRevision,
      status: 'queued',
      requestHash: input.requestHash,
      idempotencyKeyHash: input.idempotencyKeyHash,
      executionPlan: input.executionPlan,
      dataSnapshotId: input.snapshot.id,
      dataSnapshotHash: input.snapshot.hash,
      rangeFrom: input.rangeFrom,
      rangeTo: input.rangeTo,
      complexityScore: input.complexityScore,
      progressPercent: 0,
      queuedAt: input.queuedAt,
      startedAt: null,
      completedAt: null,
      cancelRequestedAt: null,
      errorCode: null,
    };
    return Promise.resolve({ run: this.run, created: true });
  }
  listDispatchable = () => Promise.resolve(this.run === null ? [] : [this.run]);
  requestCancellation = () => Promise.resolve(null);
}

class MemoryExperimentRepository implements ExperimentRuntimeRepository {
  cancelled = false;
  reuse = false;
  running: string[] = [];
  completedStatus: string | null = null;
  compatibilityKeys: Parameters<
    ExperimentRuntimeRepository['findReusableCompletedRun']
  >[0][] = [];
  private bindings = new Set<string>();
  isCancellationRequested = () => Promise.resolve(this.cancelled);
  findReusableCompletedRun = (
    key: Parameters<ExperimentRuntimeRepository['findReusableCompletedRun']>[0],
  ) => {
    this.compatibilityKeys.push(key);
    return Promise.resolve(
      this.reuse ? { runId: `reuse-${key.bindingHash}` } : null,
    );
  };
  attachChild(
    input: Parameters<ExperimentRuntimeRepository['attachChild']>[0],
  ) {
    if (this.bindings.has(input.child.bindingHash))
      return Promise.resolve('duplicate' as const);
    this.bindings.add(input.child.bindingHash);
    return Promise.resolve('created' as const);
  }
  markChildFailed = () => Promise.resolve();
  listRunningChildRunIds = () => Promise.resolve(this.running);
  completeExperiment = (
    input: Parameters<ExperimentRuntimeRepository['completeExperiment']>[0],
  ) => {
    this.completedStatus = input.status;
    return Promise.resolve();
  };
}

function orchestration(
  definition: Parameters<typeof generateExperimentCombinations>[0],
) {
  return {
    experiment: {
      id: 'experiment-1',
      ownerUserId: userId,
      status: 'running' as const,
      strategyId: 'strategy-1',
      strategyRevision: 1,
      dataSnapshotHash: snapshot.hash,
    },
    definition,
    engineVersion: 'engine-v1',
    executionPolicyVersion: 'next-open-v1',
    costPolicyVersion: 'cost-v1',
    eventOrderingPolicyVersion: 'ordering-v1',
  };
}
