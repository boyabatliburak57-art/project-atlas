import {
  createDatabase,
  marketOverviewSnapshots,
  runMigrations,
} from '@atlas/database';
import {
  MarketIntelligenceCacheKeyFactory,
  PostgresBackedCache,
  QualityMetrics,
} from '@atlas/domain';
import Redis from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DatabaseSnapshotReconciliationStore } from './database-snapshot-reconciliation-store';
import { RedisMarketIntelligenceCacheBackend } from './redis-cache-backend';
import { processSnapshotReconciliationJob } from './snapshot-reconciliation-job';
import {
  ReconciliationRefreshCollector,
  SnapshotReconciliationService,
} from './snapshot-reconciliation-service';

function databaseUrl() {
  const value = process.env.TEST_DATABASE_URL;
  if (!value || !new URL(value).pathname.endsWith('_test'))
    throw new Error('TEST_DATABASE_URL must end with _test');
  return value;
}

function redisUrl() {
  const value = process.env.REDIS_URL;
  if (!value) throw new Error('REDIS_URL is required');
  return value;
}

const generationId = '98000000-0000-4000-8000-000000000001';
const cutoff = new Date();

describe('market intelligence reconciliation with PostgreSQL and Redis', () => {
  const { db, pool } = createDatabase(databaseUrl());
  const redis = new Redis(redisUrl(), { maxRetriesPerRequest: 1 });
  const store = new DatabaseSnapshotReconciliationStore(db);
  const backend = new RedisMarketIntelligenceCacheBackend(redis);
  const refresh = new ReconciliationRefreshCollector();
  const service = new SnapshotReconciliationService(store, backend, refresh);
  const keyFactory = new MarketIntelligenceCacheKeyFactory();

  beforeAll(async () => {
    await pool.query('drop schema if exists public cascade');
    await pool.query('drop schema if exists drizzle cascade');
    await pool.query('create schema public');
    await runMigrations(db);
    await deleteRuntimeKeys(redis);
    await db.insert(marketOverviewSnapshots).values({
      generationId,
      marketCode: 'BIST',
      timeframe: '1d',
      universeVersion: 'bist-active-v1',
      policyVersion: 'market-overview-v1',
      dataCutoffAt: cutoff,
      sourceTimestamp: cutoff,
      status: 'partial',
      evaluatedCount: 640,
      excludedCount: 10,
      payload: { breadth: { advancing: 300 } },
      qualityMetadata: {
        partial: true,
        providerRaw: { credential: 'must-not-leak' },
      },
    });
  });

  afterAll(async () => {
    await deleteRuntimeKeys(redis);
    await Promise.all([pool.end(), redis.quit()]);
  });

  it('reconciles one consistent generation with a bounded query count', async () => {
    const result = await processSnapshotReconciliationJob(
      { data: jobData([]) } as never,
      service,
    );
    expect(result.snapshot).toMatchObject({
      generationId,
      queryCount: 1,
      sectorCount: 0,
      rankingCount: 0,
    });
    expect(result.diagnostic).toMatchObject({
      status: 'partial',
      partial: true,
      generationConsistent: true,
    });
    expect(JSON.stringify(result.diagnostic)).not.toMatch(
      /must-not-leak|providerRaw|credential/u,
    );
  });

  it('invalidates Redis on a closed bar and deduplicates queue replay', async () => {
    const key = keyFactory.market({
      market: 'BIST',
      universeVersion: 'bist-active-v1',
      generationId,
      dataCutoffAt: cutoff,
      policyVersion: 'market-overview-v1',
    });
    await backend.set(key, JSON.stringify({ value: 'stale' }), 60);
    const event = {
      eventId: 'closed-bar-1',
      type: 'new_closed_bar' as const,
      market: 'BIST',
      version: 'bar-r1',
      occurredAt: cutoff.toISOString(),
    };
    const first = await service.execute(jobData([event]));
    const replay = await service.execute(jobData([event]));
    expect(first.invalidations[0]).toMatchObject({ duplicate: false });
    expect(replay.invalidations[0]).toMatchObject({ duplicate: true });
    expect(await backend.get(key)).toBeNull();
    expect(refresh.requests.map((item) => item.scope)).toEqual(
      expect.arrayContaining(['market-snapshot', 'indicator', 'pattern']),
    );
  });

  it('falls back to PostgreSQL while a Redis client is restarting', async () => {
    const restartingClient = new Redis(redisUrl(), { maxRetriesPerRequest: 1 });
    await restartingClient.ping();
    restartingClient.disconnect();
    const metrics = new QualityMetrics();
    const cache = new PostgresBackedCache(
      new RedisMarketIntelligenceCacheBackend(restartingClient),
      metrics,
      60,
    );
    const result = await cache.read({
      key: 'atlas:market-intelligence:v1:market:restart-test',
      context: { generationId },
      loadFromPostgres: async () => await store.reconcile('BIST', '1d'),
    });
    expect(result.source).toBe('postgresql');
    expect(result.value?.generationId).toBe(generationId);
    expect(metrics.value('cache.redis_fallback')).toBe(1);

    const restarted = new Redis(redisUrl(), { maxRetriesPerRequest: 1 });
    await expect(restarted.ping()).resolves.toBe('PONG');
    await restarted.quit();
  });
});

function jobData(
  invalidations: readonly {
    eventId: string;
    type: 'new_closed_bar';
    market: string;
    version: string;
    occurredAt: string;
  }[],
) {
  return {
    market: 'BIST',
    timeframe: '1d',
    staleAfterMs: 86_400_000,
    invalidations,
    correlationId: 'quality-integration',
  };
}

async function deleteRuntimeKeys(client: Redis) {
  let cursor = '0';
  do {
    const [next, keys] = await client.scan(
      cursor,
      'MATCH',
      'atlas:market-intelligence:v1:*',
      'COUNT',
      100,
    );
    cursor = next;
    if (keys.length > 0) await client.del(...keys);
  } while (cursor !== '0');
}
