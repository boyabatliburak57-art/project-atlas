import { describe, expect, it } from 'vitest';
import {
  adminSafeDiagnosticSummary,
  assertSnapshotGenerationConsistency,
  CacheInvalidationDispatcher,
  DataFreshnessEvaluator,
  MarketIntelligenceCacheKeyFactory,
  PostgresBackedCache,
  QualityMetrics,
  type CacheBackend,
  type InvalidationEvent,
} from './cache-quality-runtime.js';

const cutoff = new Date('2026-07-18T15:00:00.000Z');

describe('market intelligence cache and quality runtime', () => {
  const factory = new MarketIntelligenceCacheKeyFactory();

  it('binds market keys to generation, policy, filter, sort and cursor', () => {
    const base = {
      market: 'BIST',
      universeVersion: 'bist-active-v1',
      generationId: 'generation-1',
      dataCutoffAt: cutoff,
      policyVersion: 'overview-v1',
      filters: { sector: 'BANK' },
      sort: 'rank:asc',
      cursor: 'first',
    };
    expect(factory.market(base)).not.toBe(
      factory.market({ ...base, cursor: 'second' }),
    );
    expect(factory.market(base)).not.toBe(
      factory.market({ ...base, generationId: 'generation-2' }),
    );
  });

  it('separates raw, adjusted, indicator and user marker chart contexts', () => {
    const base = chartContext();
    expect(factory.chart(base)).not.toBe(
      factory.chart({ ...base, adjustmentMode: 'split-adjusted' }),
    );
    expect(factory.chart(base)).not.toBe(
      factory.chart({ ...base, indicatorVersions: { RSI: '2' } }),
    );
    const owned = {
      ...base,
      markerOptions: { includeUserMarkers: true },
      markerUserId: 'user-a',
    };
    expect(factory.chart(owned)).not.toBe(
      factory.chart({ ...owned, markerUserId: 'user-b' }),
    );
    expect(() => factory.chart({ ...owned, markerUserId: null })).toThrow(
      'MARKET_CACHE_USER_CONTEXT_REQUIRED',
    );
  });

  it('versions fundamentals and pattern cache identities', () => {
    expect(
      factory.fundamentals({
        instrumentId: 'instrument',
        fiscalPeriod: '2026-Q1',
        providerRevision: 'r1',
        ratioFormulaVersion: 'ratio-v1',
        marketDataCutoffAt: cutoff,
      }),
    ).not.toBe(
      factory.fundamentals({
        instrumentId: 'instrument',
        fiscalPeriod: '2026-Q1',
        providerRevision: 'r2',
        ratioFormulaVersion: 'ratio-v1',
        marketDataCutoffAt: cutoff,
      }),
    );
    expect(factory.patterns(patternContext('doji-v1'))).not.toBe(
      factory.patterns(patternContext('doji-v2')),
    );
  });

  it('propagates partial and stale quality without treating missing as zero', () => {
    const evaluator = new DataFreshnessEvaluator();
    expect(
      evaluator.evaluate({
        now: new Date(cutoff.getTime() + 10_000),
        dataCutoffAt: cutoff,
        sourceTimestamp: cutoff,
        staleAfterMs: 5_000,
        evaluatedCount: 640,
        excludedCount: 10,
        upstreamStatuses: ['partial'],
      }),
    ).toMatchObject({ status: 'stale', stale: true, partial: true });
    expect(
      evaluator.evaluate({
        now: cutoff,
        dataCutoffAt: null,
        sourceTimestamp: null,
        staleAfterMs: 5_000,
        evaluatedCount: 0,
        excludedCount: 650,
      }),
    ).toMatchObject({ status: 'notEvaluable', ageMs: null });
  });

  it('rejects mixed snapshot generations', () => {
    const identity = {
      generationId: 'g1',
      policyVersion: 'p1',
      dataCutoffAt: cutoff,
    };
    expect(() =>
      assertSnapshotGenerationConsistency(identity, [identity]),
    ).not.toThrow();
    expect(() =>
      assertSnapshotGenerationConsistency(identity, [
        { ...identity, generationId: 'g2' },
      ]),
    ).toThrow('MARKET_SNAPSHOT_GENERATION_MISMATCH');
  });

  it('falls back to PostgreSQL after Redis loss', async () => {
    const backend = new MemoryBackend();
    backend.failReads = true;
    const metrics = new QualityMetrics();
    const cache = new PostgresBackedCache(backend, metrics, 60);
    const result = await cache.read({
      key: 'key',
      context: { generation: 'g1' },
      loadFromPostgres: () => Promise.resolve({ generation: 'g1' }),
    });
    expect(result).toEqual({
      value: { generation: 'g1' },
      source: 'postgresql',
    });
    expect(metrics.value('cache.redis_fallback')).toBe(1);
  });

  it('rejects poisoned or cross-context cache entries', async () => {
    const backend = new MemoryBackend();
    const metrics = new QualityMetrics();
    const cache = new PostgresBackedCache(backend, metrics, 60);
    backend.values.set(
      'shared',
      JSON.stringify({
        schemaVersion: 1,
        contextDigest: factory.contextDigest({ user: 'attacker' }),
        value: { markerOwner: 'attacker' },
      }),
    );
    const result = await cache.read({
      key: 'shared',
      context: { user: 'owner' },
      loadFromPostgres: () => Promise.resolve({ markerOwner: 'owner' }),
    });
    expect(result.value).toEqual({ markerOwner: 'owner' });
    expect(result.source).toBe('postgresql');
    expect(metrics.value('cache.context_mismatch')).toBe(1);
  });

  it.each([
    'new_closed_bar',
    'corrected_price_bar',
    'corporate_action_revision',
    'financial_restatement',
    'ratio_formula_version',
    'indicator_version',
    'pattern_algorithm_version',
    'instrument_classification_change',
  ] as const)(
    'dispatches %s invalidation and protects duplicate delivery',
    async (type) => {
      const backend = new MemoryBackend();
      const refreshes: string[] = [];
      const dispatcher = new CacheInvalidationDispatcher(
        backend,
        {
          request(scope) {
            refreshes.push(scope);
            return Promise.resolve();
          },
        },
        new QualityMetrics(),
      );
      const event: InvalidationEvent = {
        eventId: `event-${type}`,
        type,
        instrumentId: 'instrument',
        market: 'BIST',
        version: 'v2',
        occurredAt: cutoff,
      };
      expect((await dispatcher.dispatch(event)).duplicate).toBe(false);
      expect((await dispatcher.dispatch(event)).duplicate).toBe(true);
      expect(backend.invalidatedScopes.length).toBeGreaterThan(0);
      if (type === 'financial_restatement')
        expect(refreshes).toEqual(['fundamentals', 'ratio']);
    },
  );

  it('isolates ownership invalidation to the user marker context', async () => {
    const backend = new MemoryBackend();
    const dispatcher = new CacheInvalidationDispatcher(
      backend,
      { request: () => Promise.resolve() },
      new QualityMetrics(),
    );
    const result = await dispatcher.dispatch({
      eventId: 'ownership-1',
      type: 'user_marker_ownership_change',
      userId: 'owner-user',
      instrumentId: 'instrument',
      version: 'v1',
      occurredAt: cutoff,
    });
    expect(result.scopes).toContain('user:owner-user');
    expect(result.scopes).not.toContain('user:*');
  });

  it('never exposes provider raw payload in diagnostics', () => {
    const diagnostic = adminSafeDiagnosticSummary({
      status: 'partial',
      stale: false,
      partial: true,
      generationConsistent: true,
      metrics: { 'cache.hit': 2 },
      internal: {
        reasonCode: 'EXCLUDED_INPUT',
        providerRaw: { apiKey: 'secret', payload: 'raw' },
      },
      admin: true,
    });
    expect(JSON.stringify(diagnostic)).not.toMatch(
      /secret|providerRaw|apiKey/u,
    );
    expect(
      adminSafeDiagnosticSummary({
        status: 'complete',
        stale: false,
        partial: false,
        generationConsistent: true,
        metrics: { internal: 1 },
        internal: { reasonCode: 'INTERNAL' },
        admin: false,
      }),
    ).not.toHaveProperty('internal');
  });
});

class MemoryBackend implements CacheBackend {
  readonly values = new Map<string, string>();
  readonly invalidatedScopes: string[] = [];
  failReads = false;

  get(key: string) {
    if (this.failReads) return Promise.reject(new Error('redis unavailable'));
    return Promise.resolve(this.values.get(key) ?? null);
  }

  set(key: string, value: string) {
    this.values.set(key, value);
    return Promise.resolve();
  }

  delete(key: string) {
    this.values.delete(key);
    return Promise.resolve();
  }

  invalidateScopes(scopes: readonly string[]) {
    this.invalidatedScopes.push(...scopes);
    return Promise.resolve(0);
  }
}

function chartContext() {
  return {
    instrumentId: 'instrument',
    timeframe: '1d',
    from: new Date('2026-01-01T00:00:00.000Z'),
    to: cutoff,
    adjustmentMode: 'raw',
    dataCutoffAt: cutoff,
    indicatorVersions: { RSI: '1' },
    parametersHash: 'parameters',
    markerOptions: { includeUserMarkers: false },
    markerUserId: null,
  };
}

function patternContext(algorithmVersion: string) {
  return {
    instrumentId: 'instrument',
    timeframe: '1d',
    adjustmentMode: 'raw',
    algorithmVersion,
    dataCutoffAt: cutoff,
  };
}
