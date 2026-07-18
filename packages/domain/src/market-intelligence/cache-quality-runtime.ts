import { createHash } from 'node:crypto';

export type MarketIntelligenceQualityStatus =
  | 'complete'
  | 'partial'
  | 'stale'
  | 'notEvaluable';

export interface MarketCacheContext {
  readonly market: string;
  readonly universeVersion: string;
  readonly generationId: string;
  readonly dataCutoffAt: Date;
  readonly policyVersion: string;
  readonly filters?: Readonly<Record<string, unknown>>;
  readonly sort?: string;
  readonly cursor?: string | null;
}

export interface ChartCacheContext {
  readonly instrumentId: string;
  readonly timeframe: string;
  readonly from: Date;
  readonly to: Date;
  readonly adjustmentMode: string;
  readonly dataCutoffAt: Date;
  readonly indicatorVersions: Readonly<Record<string, string>>;
  readonly parametersHash: string;
  readonly markerOptions: Readonly<Record<string, boolean>>;
  readonly markerUserId?: string | null;
}

export interface FundamentalsCacheContext {
  readonly instrumentId: string;
  readonly fiscalPeriod: string;
  readonly providerRevision: string;
  readonly ratioFormulaVersion: string;
  readonly marketDataCutoffAt?: Date | null;
}

export interface PatternCacheContext {
  readonly instrumentId: string;
  readonly timeframe: string;
  readonly adjustmentMode: string;
  readonly algorithmVersion: string;
  readonly dataCutoffAt: Date;
}

export class MarketIntelligenceCacheKeyFactory {
  market(context: MarketCacheContext): string {
    return key('market', context);
  }

  chart(context: ChartCacheContext): string {
    if (context.markerOptions['includeUserMarkers'] && !context.markerUserId)
      throw new Error('MARKET_CACHE_USER_CONTEXT_REQUIRED');
    return key('chart', context);
  }

  fundamentals(context: FundamentalsCacheContext): string {
    return key('fundamentals', context);
  }

  patterns(context: PatternCacheContext): string {
    return key('patterns', context);
  }

  contextDigest(context: unknown): string {
    return digest(context);
  }
}

export interface FreshnessInput {
  readonly now: Date;
  readonly dataCutoffAt: Date | null;
  readonly sourceTimestamp: Date | null;
  readonly staleAfterMs: number;
  readonly evaluatedCount: number;
  readonly excludedCount: number;
  readonly upstreamStatuses?: readonly MarketIntelligenceQualityStatus[];
}

export interface FreshnessResult {
  readonly status: MarketIntelligenceQualityStatus;
  readonly stale: boolean;
  readonly partial: boolean;
  readonly ageMs: number | null;
  readonly evaluatedCount: number;
  readonly excludedCount: number;
  readonly warnings: readonly string[];
}

export class DataFreshnessEvaluator {
  evaluate(input: FreshnessInput): FreshnessResult {
    if (
      !validDate(input.now) ||
      !Number.isSafeInteger(input.staleAfterMs) ||
      input.staleAfterMs < 0 ||
      !validCount(input.evaluatedCount) ||
      !validCount(input.excludedCount)
    )
      throw new Error('MARKET_FRESHNESS_INPUT_INVALID');
    const reference = input.sourceTimestamp ?? input.dataCutoffAt;
    const ageMs = reference
      ? Math.max(0, input.now.getTime() - reference.getTime())
      : null;
    const upstream = input.upstreamStatuses ?? [];
    const stale =
      reference !== null &&
      (ageMs! > input.staleAfterMs || upstream.includes('stale'));
    const notEvaluable =
      input.evaluatedCount === 0 ||
      reference === null ||
      upstream.includes('notEvaluable');
    const partial =
      !notEvaluable &&
      (input.excludedCount > 0 ||
        upstream.includes('partial') ||
        upstream.includes('stale'));
    const warnings = [
      ...(reference === null ? ['SOURCE_TIMESTAMP_MISSING'] : []),
      ...(stale ? ['STALE_DATA'] : []),
      ...(input.excludedCount > 0 ? ['INPUTS_EXCLUDED'] : []),
      ...(upstream.includes('partial') ? ['UPSTREAM_PARTIAL'] : []),
    ];
    return {
      status: notEvaluable
        ? 'notEvaluable'
        : stale
          ? 'stale'
          : partial
            ? 'partial'
            : 'complete',
      stale,
      partial,
      ageMs,
      evaluatedCount: input.evaluatedCount,
      excludedCount: input.excludedCount,
      warnings: [...new Set(warnings)],
    };
  }
}

export interface SnapshotGenerationIdentity {
  readonly generationId: string;
  readonly policyVersion: string;
  readonly dataCutoffAt: Date;
}

export function assertSnapshotGenerationConsistency(
  overview: SnapshotGenerationIdentity,
  blocks: readonly SnapshotGenerationIdentity[],
): void {
  const expected = identity(overview);
  if (blocks.some((block) => identity(block) !== expected))
    throw new Error('MARKET_SNAPSHOT_GENERATION_MISMATCH');
}

export interface CacheBackend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
  invalidateScopes(scopes: readonly string[]): Promise<number>;
}

export class QualityMetrics {
  private readonly counters = new Map<string, number>();

  increment(metric: string, amount = 1): void {
    this.counters.set(metric, (this.counters.get(metric) ?? 0) + amount);
  }

  value(metric: string): number {
    return this.counters.get(metric) ?? 0;
  }

  snapshot(): Readonly<Record<string, number>> {
    return Object.fromEntries([...this.counters.entries()].sort());
  }
}

interface CacheEnvelope<T> {
  readonly schemaVersion: 1;
  readonly contextDigest: string;
  readonly value: T;
}

export class PostgresBackedCache {
  constructor(
    private readonly backend: CacheBackend,
    private readonly metrics: QualityMetrics,
    private readonly ttlSeconds: number,
  ) {}

  async read<T>(input: {
    readonly key: string;
    readonly context: unknown;
    readonly loadFromPostgres: () => Promise<T>;
  }): Promise<{ readonly value: T; readonly source: 'redis' | 'postgresql' }> {
    const contextDigest = digest(input.context);
    try {
      const raw = await this.backend.get(input.key);
      if (raw !== null) {
        const cached = decodeEnvelope<T>(raw);
        if (cached?.contextDigest === contextDigest) {
          this.metrics.increment('cache.hit');
          return { value: cached.value, source: 'redis' };
        }
        this.metrics.increment('cache.context_mismatch');
        await this.safeDelete(input.key);
      } else this.metrics.increment('cache.miss');
    } catch {
      this.metrics.increment('cache.redis_fallback');
    }
    const value = await input.loadFromPostgres();
    const envelope: CacheEnvelope<T> = {
      schemaVersion: 1,
      contextDigest,
      value,
    };
    try {
      await this.backend.set(
        input.key,
        JSON.stringify(envelope),
        this.ttlSeconds,
      );
    } catch {
      this.metrics.increment('cache.write_failed');
    }
    this.metrics.increment('cache.postgresql_load');
    return { value, source: 'postgresql' };
  }

  private async safeDelete(keyValue: string): Promise<void> {
    try {
      await this.backend.delete(keyValue);
    } catch {
      this.metrics.increment('cache.delete_failed');
    }
  }
}

export type InvalidationEvent =
  | VersionedInvalidationEvent<'new_closed_bar'>
  | VersionedInvalidationEvent<'corrected_price_bar'>
  | VersionedInvalidationEvent<'corporate_action_revision'>
  | VersionedInvalidationEvent<'financial_restatement'>
  | VersionedInvalidationEvent<'ratio_formula_version'>
  | VersionedInvalidationEvent<'indicator_version'>
  | VersionedInvalidationEvent<'pattern_algorithm_version'>
  | VersionedInvalidationEvent<'instrument_classification_change'>
  | (VersionedInvalidationEvent<'user_marker_ownership_change'> & {
      readonly userId: string;
    });

interface VersionedInvalidationEvent<T extends string> {
  readonly eventId: string;
  readonly type: T;
  readonly instrumentId?: string;
  readonly market?: string;
  readonly version: string;
  readonly occurredAt: Date;
}

export interface InvalidationRefreshPort {
  request(scope: string, event: InvalidationEvent): Promise<void>;
}

export class CacheInvalidationDispatcher {
  private readonly processed = new Set<string>();

  constructor(
    private readonly cache: CacheBackend,
    private readonly refresh: InvalidationRefreshPort,
    private readonly metrics: QualityMetrics,
  ) {}

  async dispatch(event: InvalidationEvent): Promise<{
    readonly duplicate: boolean;
    readonly invalidatedKeys: number;
    readonly scopes: readonly string[];
  }> {
    validateInvalidationEvent(event);
    const deduplicationKey = `${event.type}:${event.eventId}:${event.version}`;
    if (this.processed.has(deduplicationKey)) {
      this.metrics.increment('invalidation.duplicate');
      return { duplicate: true, invalidatedKeys: 0, scopes: [] };
    }
    const scopes = invalidationScopes(event);
    const invalidatedKeys = await this.cache.invalidateScopes(scopes);
    for (const scope of refreshScopes(event))
      await this.refresh.request(scope, event);
    this.processed.add(deduplicationKey);
    this.metrics.increment('invalidation.processed');
    this.metrics.increment('invalidation.keys', invalidatedKeys);
    return { duplicate: false, invalidatedKeys, scopes };
  }
}

export function adminSafeDiagnosticSummary(input: {
  readonly status: MarketIntelligenceQualityStatus;
  readonly stale: boolean;
  readonly partial: boolean;
  readonly generationConsistent: boolean;
  readonly metrics: Readonly<Record<string, number>>;
  readonly internal?: Readonly<Record<string, unknown>>;
  readonly admin: boolean;
}): Readonly<Record<string, unknown>> {
  return {
    status: input.status,
    stale: input.stale,
    partial: input.partial,
    generationConsistent: input.generationConsistent,
    ...(input.admin
      ? {
          metrics: { ...input.metrics },
          internal: sanitizeDiagnostic(input.internal ?? {}),
        }
      : {}),
  };
}

function key(namespace: string, context: unknown): string {
  return `atlas:market-intelligence:v1:${namespace}:${digest(context)}`;
}

function digest(value: unknown): string {
  return createHash('sha256').update(canonical(value)).digest('hex');
}

function canonical(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object')
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, item]) => `${JSON.stringify(name)}:${canonical(item)}`)
      .join(',')}}`;
  return JSON.stringify(value);
}

function identity(value: SnapshotGenerationIdentity): string {
  if (!validDate(value.dataCutoffAt))
    throw new Error('MARKET_SNAPSHOT_GENERATION_INVALID');
  return `${value.generationId}:${value.policyVersion}:${value.dataCutoffAt.toISOString()}`;
}

function validDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}

function validCount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function decodeEnvelope<T>(raw: string): CacheEnvelope<T> | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (
      value !== null &&
      typeof value === 'object' &&
      (value as Record<string, unknown>)['schemaVersion'] === 1 &&
      typeof (value as Record<string, unknown>)['contextDigest'] === 'string' &&
      'value' in value
    )
      return value as CacheEnvelope<T>;
  } catch {
    return null;
  }
  return null;
}

function validateInvalidationEvent(event: InvalidationEvent): void {
  if (
    !event.eventId.trim() ||
    !event.version.trim() ||
    !validDate(event.occurredAt) ||
    (event.type === 'user_marker_ownership_change' && !event.userId.trim())
  )
    throw new Error('MARKET_INVALIDATION_EVENT_INVALID');
}

function invalidationScopes(event: InvalidationEvent): readonly string[] {
  const instrument = event.instrumentId
    ? `instrument:${event.instrumentId}`
    : 'instrument:*';
  const market = event.market ? `market:${event.market}` : 'market:*';
  switch (event.type) {
    case 'new_closed_bar':
    case 'corrected_price_bar':
      return [market, instrument, 'chart:*', 'patterns:*', 'indicators:*'];
    case 'corporate_action_revision':
      return [instrument, 'chart:*', 'valuation-adjustment:*'];
    case 'financial_restatement':
      return [instrument, 'fundamentals:*', 'ratios:*'];
    case 'ratio_formula_version':
      return [instrument, 'ratios:*'];
    case 'indicator_version':
      return [market, instrument, 'indicators:*', 'chart:*'];
    case 'pattern_algorithm_version':
      return [market, instrument, 'patterns:*', 'chart:*'];
    case 'instrument_classification_change':
      return [market, instrument, 'sectors:*', 'rankings:*'];
    case 'user_marker_ownership_change':
      return [instrument, `user:${event.userId}`, 'chart:user-markers'];
  }
}

function refreshScopes(event: InvalidationEvent): readonly string[] {
  switch (event.type) {
    case 'new_closed_bar':
    case 'corrected_price_bar':
      return ['market-snapshot', 'indicator', 'pattern'];
    case 'corporate_action_revision':
      return ['adjusted-chart'];
    case 'financial_restatement':
      return ['fundamentals', 'ratio'];
    case 'ratio_formula_version':
      return ['ratio'];
    case 'indicator_version':
      return ['indicator'];
    case 'pattern_algorithm_version':
      return ['pattern'];
    case 'instrument_classification_change':
      return ['market-snapshot'];
    case 'user_marker_ownership_change':
      return [];
  }
}

function sanitizeDiagnostic(
  value: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([name]) =>
          !/(?:providerRaw|rawPayload|providerError|credential|secret|apiKey)/iu.test(
            name,
          ),
      )
      .map(([name, item]) => [name, sanitizeValue(item)]),
  );
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value !== null && typeof value === 'object')
    return sanitizeDiagnostic(value as Readonly<Record<string, unknown>>);
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  return value;
}
