import { describe, expect, it } from 'vitest';

import type {
  NewStrategyPersistenceInput,
  ReviseStrategyPersistenceInput,
  ReviseStrategyPersistenceResult,
  StrategyRepository,
  StrategyDefinition,
  StrategyRevision,
  StrategyWithRevision,
} from './contracts.js';
import { StrategyApplicationService } from './strategy-application-service.js';
import { createStrategyEntity, createStrategyRevision } from './strategy.js';

const ownerId = '00000000-0000-4000-8000-000000000641';
const otherId = '00000000-0000-4000-8000-000000000642';
const fixedNow = new Date('2026-07-18T12:00:00.000Z');
let sequence = 640;

function nextId(): string {
  sequence += 1;
  return `00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`;
}

function strategyDefinition(): StrategyDefinition {
  const rule = (operator: 'GT' | 'LT', value: number) => ({
    version: 1 as const,
    universe: {
      market: 'BIST' as const,
      statuses: ['active'] as const,
      indexCodes: [],
      sectorIds: [],
    },
    root: {
      type: 'group' as const,
      nodeId: `root-${operator.toLowerCase()}`,
      operator: 'AND' as const,
      children: [
        {
          type: 'condition' as const,
          nodeId: `price-${operator.toLowerCase()}`,
          operator,
          left: {
            type: 'priceField' as const,
            field: 'close' as const,
            timeframe: '1d' as const,
          },
          right: { type: 'constantNumber' as const, value },
        },
      ],
    },
  });
  return {
    schemaVersion: 1,
    baseTimeframe: '1d',
    entryRule: rule('GT', 10),
    exitRule: rule('LT', 9),
    filterRule: null,
    parameters: [],
    positionSizing: { type: 'equalWeight' },
    riskControls: {
      maxPositionWeight: 20,
      maxConcurrentPositions: 5,
      allowShort: false,
      allowLeverage: false,
      allowNegativeCash: false,
    },
    executionPolicy: {
      code: 'closed_bar_next_open',
      version: 'next-open-v1',
      signalBarPolicy: 'closed_only',
      higherTimeframeBarPolicy: 'closed_only',
      missingBarPolicy: 'defer_to_next_available',
    },
    costPolicy: {
      code: 'percentage_commission_fixed_bps_slippage',
      version: 'cost-v1',
      commissionPercent: 0.1,
      minimumCommission: 1,
      slippageBps: 5,
      fixedFee: 0,
      marketTaxPercent: 0,
    },
    dataIntegrityPolicy: {
      universePolicy: 'point_in_time',
      fundamentalAvailabilityPolicy: 'publication_and_revision',
      corporateActionPolicyVersion: 'corporate-action-v1',
      adjustmentMode: 'split_adjusted',
    },
    benchmarkCode: 'XU100',
  };
}

class MemoryStrategyRepository implements StrategyRepository {
  readonly strategies = new Map<string, StrategyWithRevision>();
  readonly history = new Map<string, StrategyRevision[]>();

  findById(id: string) {
    return Promise.resolve(this.strategies.get(id) ?? null);
  }

  listRevisions(id: string) {
    return Promise.resolve([...(this.history.get(id) ?? [])].reverse());
  }

  create(input: NewStrategyPersistenceInput) {
    const id = nextId();
    const entity = createStrategyEntity({
      id,
      ownerUserId: input.ownerUserId,
      name: input.name,
      description: input.description,
      status: input.revisionStatus === 'validated' ? 'validated' : 'draft',
      currentRevision: 1,
      createdAt: input.now,
      updatedAt: input.now,
      deletedAt: null,
    });
    const revision = createStrategyRevision({
      id: nextId(),
      strategyId: id,
      revision: 1,
      definition: input.definition,
      status: input.revisionStatus,
      validation: input.validation,
      createdBy: input.createdBy,
      createdAt: input.now,
    });
    const strategy = Object.freeze({ ...entity, revision });
    this.strategies.set(id, strategy);
    this.history.set(id, [revision]);
    return Promise.resolve(strategy);
  }

  revise(
    input: ReviseStrategyPersistenceInput,
  ): Promise<ReviseStrategyPersistenceResult> {
    const current = this.strategies.get(input.id);
    if (
      current === undefined ||
      current.ownerUserId !== input.ownerUserId ||
      current.currentRevision !== input.expectedRevision
    ) {
      return Promise.resolve({ outcome: 'conflict' });
    }
    const revision = createStrategyRevision({
      id: nextId(),
      strategyId: input.id,
      revision: current.currentRevision + 1,
      definition: input.definition,
      status: input.revisionStatus,
      validation: input.validation,
      createdBy: input.createdBy,
      createdAt: input.now,
    });
    const entity = createStrategyEntity({
      id: current.id,
      ownerUserId: current.ownerUserId,
      name: input.name,
      description: input.description,
      status: input.revisionStatus === 'validated' ? 'validated' : 'draft',
      currentRevision: revision.revision,
      createdAt: current.createdAt,
      updatedAt: input.now,
      deletedAt: null,
    });
    const strategy = Object.freeze({ ...entity, revision });
    this.strategies.set(input.id, strategy);
    this.history.get(input.id)?.push(revision);
    return Promise.resolve({ outcome: 'updated', strategy });
  }
}

function setup() {
  const repository = new MemoryStrategyRepository();
  return {
    repository,
    service: new StrategyApplicationService({
      repository,
      now: () => new Date(fixedNow),
    }),
  };
}

describe('StrategyApplicationService integration', () => {
  it('creates a draft strategy and preserves entry/exit AST round-trip', async () => {
    const { service } = setup();
    const definition = strategyDefinition();
    const created = await service.create({
      userId: ownerId,
      name: ' RSI Reversal ',
      definition,
    });
    expect(created).toMatchObject({
      ownerUserId: ownerId,
      name: 'RSI Reversal',
      status: 'draft',
      currentRevision: 1,
      revision: { status: 'draft' },
    });
    expect(created.revision.definition.entryRule).toEqual(definition.entryRule);
    expect(created.revision.definition.exitRule).toEqual(definition.exitRule);
  });

  it('creates a new validated immutable revision', async () => {
    const { service } = setup();
    const created = await service.create({
      userId: ownerId,
      name: 'Revision Fixture',
      definition: strategyDefinition(),
    });
    const oldRevision = created.revision;
    const currentDefinition = strategyDefinition();
    const nextDefinition = {
      ...currentDefinition,
      riskControls: {
        ...currentDefinition.riskControls,
        maxConcurrentPositions: 8,
      },
    };
    const revised = await service.revise({
      userId: ownerId,
      id: created.id,
      expectedRevision: 1,
      definition: nextDefinition,
      status: 'validated',
    });
    expect(revised).toMatchObject({
      currentRevision: 2,
      status: 'validated',
      revision: { revision: 2, status: 'validated' },
    });
    expect(oldRevision.revision).toBe(1);
    expect(oldRevision.definition.riskControls.maxConcurrentPositions).toBe(5);
    expect(Object.isFrozen(oldRevision)).toBe(true);
    expect(Object.isFrozen(oldRevision.definition.riskControls)).toBe(true);
    const revisions = await service.revisions(ownerId, created.id);
    expect(revisions.map(({ revision }) => revision)).toEqual([2, 1]);
  });

  it('rejects concurrent update with a stale expected revision', async () => {
    const { service } = setup();
    const created = await service.create({
      userId: ownerId,
      name: 'Concurrency Fixture',
      definition: strategyDefinition(),
    });
    await service.revise({
      userId: ownerId,
      id: created.id,
      expectedRevision: 1,
      name: 'Revision Two',
    });
    await expect(
      service.revise({
        userId: ownerId,
        id: created.id,
        expectedRevision: 1,
        name: 'Stale Revision',
      }),
    ).rejects.toMatchObject({ code: 'STRATEGY_REVISION_CONFLICT' });
  });

  it('clones into a new owner-bound identity and blocks cross-owner clone', async () => {
    const { service } = setup();
    const created = await service.create({
      userId: ownerId,
      name: 'Clone Fixture',
      definition: strategyDefinition(),
      status: 'validated',
    });
    const cloned = await service.clone(ownerId, created.id);
    expect(cloned).toMatchObject({
      ownerUserId: ownerId,
      name: 'Clone Fixture (Copy)',
      currentRevision: 1,
      status: 'validated',
    });
    expect(cloned.id).not.toBe(created.id);
    expect(cloned.revision.definition).toEqual(created.revision.definition);
    await expect(service.clone(otherId, created.id)).rejects.toMatchObject({
      code: 'STRATEGY_ACCESS_DENIED',
    });
  });

  it('enforces ownership and IDOR on reads, history and revisions', async () => {
    const { service } = setup();
    const created = await service.create({
      userId: ownerId,
      name: 'IDOR Fixture',
      definition: strategyDefinition(),
    });
    await expect(service.get(otherId, created.id)).rejects.toMatchObject({
      code: 'STRATEGY_ACCESS_DENIED',
    });
    await expect(service.revisions(otherId, created.id)).rejects.toMatchObject({
      code: 'STRATEGY_ACCESS_DENIED',
    });
    await expect(
      service.revise({
        userId: otherId,
        id: created.id,
        expectedRevision: 1,
        name: 'Unauthorized',
      }),
    ).rejects.toMatchObject({ code: 'STRATEGY_ACCESS_DENIED' });
  });
});
