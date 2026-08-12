import type { MobileDataClass } from './data-classification';
import {
  MOBILE_DATA_POLICIES,
  canPersistBulkData,
} from './data-classification';

export const CACHE_SCHEMA_VERSION = 1;
export const OFFLINE_MUTATION_QUEUE = 'DISABLED' as const;

export type OfflineFeature =
  | 'authentication'
  | 'market'
  | 'search'
  | 'symbol'
  | 'scanner'
  | 'watchlists'
  | 'alerts'
  | 'portfolio'
  | 'strategies'
  | 'backtests'
  | 'reports'
  | 'help'
  | 'methodology'
  | 'settings';

export interface OfflinePolicy {
  readonly classification: MobileDataClass;
  readonly persisted: boolean;
  readonly maxAgeMs: number;
  readonly offlineRead: boolean;
  readonly mutation: 'blocked';
}

const minute = 60_000;
export const OFFLINE_POLICIES: Readonly<Record<OfflineFeature, OfflinePolicy>> =
  {
    authentication: policy('AUTH_SECRET', false, 0, false),
    market: policy('INTERNAL', false, 5 * minute, true),
    search: policy('USER_PRIVATE', false, 5 * minute, true),
    symbol: policy('INTERNAL', false, 5 * minute, true),
    scanner: policy('USER_PRIVATE', false, 5 * minute, true),
    watchlists: policy('USER_PRIVATE', false, 5 * minute, true),
    alerts: policy('USER_PRIVATE', false, 5 * minute, true),
    portfolio: policy('FINANCIAL_SENSITIVE', false, 5 * minute, true),
    strategies: policy('FINANCIAL_SENSITIVE', false, 5 * minute, true),
    backtests: policy('FINANCIAL_SENSITIVE', false, 5 * minute, true),
    reports: policy('FINANCIAL_SENSITIVE', false, 5 * minute, true),
    help: policy('PUBLIC', false, 30 * 24 * 60 * minute, true),
    methodology: policy('PUBLIC', false, 30 * 24 * 60 * minute, true),
    settings: policy('USER_PRIVATE', false, 5 * minute, true),
  };

function policy(
  classification: MobileDataClass,
  persisted: boolean,
  maxAgeMs: number,
  offlineRead: boolean,
): OfflinePolicy {
  if (persisted && !canPersistBulkData(classification))
    throw new Error('SENSITIVE_PERSISTENCE_PROHIBITED');
  return {
    classification,
    persisted,
    maxAgeMs,
    offlineRead,
    mutation: 'blocked',
  };
}

export type OfflineReadState =
  | { readonly status: 'AVAILABLE'; readonly value: unknown }
  | { readonly status: 'EXPIRED_OFFLINE_CACHE' }
  | { readonly status: 'UNAVAILABLE' };

interface CacheEntry<T> {
  readonly owner: string;
  readonly feature: OfflineFeature;
  readonly cachedAt: number;
  readonly value: T;
}

export class OwnerScopedMemoryCache {
  private readonly values = new Map<string, CacheEntry<unknown>>();
  constructor(private readonly maxEntries = 250) {
    if (maxEntries < 1) throw new Error('CACHE_BOUND_INVALID');
  }

  set<T>(
    owner: string,
    feature: OfflineFeature,
    key: string,
    value: T,
    now: number,
  ): void {
    this.values.delete(this.key(owner, feature, key));
    this.values.set(this.key(owner, feature, key), {
      owner,
      feature,
      cachedAt: now,
      value,
    });
    while (this.values.size > this.maxEntries) {
      const oldest = this.values.keys().next().value;
      if (oldest === undefined) break;
      this.values.delete(oldest);
    }
  }

  read<T>(
    owner: string,
    feature: OfflineFeature,
    key: string,
    now: number,
  ): OfflineReadState {
    const cacheKey = this.key(owner, feature, key);
    const entry = this.values.get(cacheKey);
    if (!entry) return { status: 'UNAVAILABLE' };
    const maxAgeMs = Math.min(
      OFFLINE_POLICIES[feature].maxAgeMs,
      MOBILE_DATA_POLICIES[
        entry.feature === feature
          ? OFFLINE_POLICIES[feature].classification
          : 'INTERNAL'
      ].maxRetentionMs ?? Number.MAX_SAFE_INTEGER,
    );
    if (now - entry.cachedAt > maxAgeMs) {
      this.values.delete(cacheKey);
      return { status: 'EXPIRED_OFFLINE_CACHE' };
    }
    this.values.delete(cacheKey);
    this.values.set(cacheKey, entry);
    return { status: 'AVAILABLE', value: entry.value as T };
  }

  clearOwner(owner: string): void {
    for (const [key, entry] of this.values)
      if (entry.owner === owner) this.values.delete(key);
  }

  clearPrivate(): void {
    this.values.clear();
  }

  size(): number {
    return this.values.size;
  }
  private key(owner: string, feature: OfflineFeature, key: string): string {
    if (!owner || owner.length > 160 || key.length > 240)
      throw new Error('CACHE_SCOPE_INVALID');
    return `${owner}\u001f${feature}\u001f${key}`;
  }
}

export function migrateCacheEnvelope(value: unknown): {
  readonly action: 'use' | 'purge';
} {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return { action: 'purge' };
  return (value as { schemaVersion?: unknown }).schemaVersion ===
    CACHE_SCHEMA_VERSION
    ? { action: 'use' }
    : { action: 'purge' };
}

export function assertOfflineMutationAllowed(online: boolean): void {
  if (!online) throw new Error('OFFLINE_MUTATION_BLOCKED');
}
