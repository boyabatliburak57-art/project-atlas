import type { AtlasApiClient, AtlasResponse } from '@atlas/api-client';
import { normalizeSearchQuery, type Timeframe } from './market-model';

export interface MarketApiEnvelope<T> extends AtlasResponse<T> {
  readonly meta: Readonly<Record<string, unknown>> & {
    readonly dataCutoffAt?: string;
    readonly partial?: boolean;
    readonly stale?: boolean;
  };
}

export class MobileMarketApi {
  constructor(private readonly client: AtlasApiClient) {}
  overview(signal?: AbortSignal) {
    return this.client.request<MarketApiEnvelope<Record<string, unknown>>>({
      path: '/market/overview',
      query: { market: 'BIST', timeframe: '1d' },
      ...(signal ? { signal } : {}),
    });
  }
  breadth(signal?: AbortSignal) {
    return this.client.request<MarketApiEnvelope<Record<string, unknown>>>({
      path: '/market/breadth',
      query: { market: 'BIST', timeframe: '1d' },
      ...(signal ? { signal } : {}),
    });
  }
  sectors(signal?: AbortSignal) {
    return this.client.request<
      MarketApiEnvelope<{ readonly items: readonly unknown[] }>
    >({
      path: '/market/sectors',
      query: { market: 'BIST', timeframe: '1d' },
      ...(signal ? { signal } : {}),
    });
  }
  rankings(
    type: 'gainers' | 'losers' | 'volume',
    cursor?: string,
    signal?: AbortSignal,
  ) {
    return this.client.request<
      MarketApiEnvelope<{ readonly items: readonly unknown[] }>
    >({
      path: `/market/rankings/${type}`,
      query: { market: 'BIST', timeframe: '1d', limit: 20, cursor },
      ...(signal ? { signal } : {}),
    });
  }
  search(query: string, cursor?: string, signal?: AbortSignal) {
    return this.client.request<
      AtlasResponse<{
        readonly items: readonly unknown[];
        readonly nextCursor: string | null;
      }>
    >({
      path: '/search',
      query: {
        q: normalizeSearchQuery(query),
        types: 'instrument',
        limit: 20,
        cursor,
      },
      ...(signal ? { signal } : {}),
    });
  }
  profile(symbol: string, signal?: AbortSignal) {
    return this.client.request<MarketApiEnvelope<Record<string, unknown>>>({
      path: `/symbols/${encodeURIComponent(symbol)}`,
      ...(signal ? { signal } : {}),
    });
  }
  chart(
    symbol: string,
    timeframe: Timeframe,
    overlays: string,
    signal?: AbortSignal,
  ) {
    const backendTimeframe =
      timeframe === '1D' ? '5m' : timeframe === '1W' ? '1h' : '1d';
    return this.client.request<MarketApiEnvelope<Record<string, unknown>>>({
      path: `/symbols/${encodeURIComponent(symbol)}/chart`,
      query: {
        timeframe: backendTimeframe,
        limit: 500,
        adjustmentMode: 'raw',
        overlays,
      },
      ...(signal ? { signal } : {}),
    });
  }
  fundamentals(symbol: string, signal?: AbortSignal) {
    return this.client.request<MarketApiEnvelope<Record<string, unknown>>>({
      path: `/symbols/${encodeURIComponent(symbol)}/fundamentals`,
      ...(signal ? { signal } : {}),
    });
  }
  patterns(symbol: string, signal?: AbortSignal) {
    return this.client.request<MarketApiEnvelope<Record<string, unknown>>>({
      path: `/symbols/${encodeURIComponent(symbol)}/patterns`,
      ...(signal ? { signal } : {}),
    });
  }
}
