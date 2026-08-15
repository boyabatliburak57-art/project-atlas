import type { AtlasApiClient, AtlasResponse } from '@atlas/api-client';

export interface InstitutionSummary {
  readonly id: string;
  readonly canonicalName: string;
  readonly shortName: string | null;
  readonly code: string | null;
  readonly type: string;
  readonly active: boolean;
}
export interface InstitutionalFlowRow {
  readonly institutionId: string;
  readonly institutionName: string;
  readonly code: string | null;
  readonly buyValue: string | null;
  readonly sellValue: string | null;
  readonly netValue: string | null;
  readonly tradeDate: string;
  readonly availableAt: string;
}
export interface SettlementRow {
  readonly institutionId: string;
  readonly institutionName: string;
  readonly code: string | null;
  readonly settlementDate: string;
  readonly tradeDate: string | null;
  readonly holdingQuantity: string | null;
  readonly holdingRatio: string | null;
  readonly changeQuantity: string | null;
  readonly changeRatio: string | null;
  readonly residency: 'FOREIGN' | 'DOMESTIC' | 'UNKNOWN';
  readonly availableAt: string;
}
export interface InstitutionalMeta {
  readonly capability: string;
  readonly providerState: string;
  readonly runtimeHealth: string;
  readonly freshness: 'CURRENT' | 'DELAYED' | 'STALE' | 'PROVIDER_REQUIRED';
  readonly coverage: 'FULL' | 'PARTIAL' | 'NOT_EVALUATED' | 'NONE';
  readonly nextCursor?: string | null;
}
type Envelope<T> = AtlasResponse<T> & { readonly meta: InstitutionalMeta };

export class MobileInstitutionalApi {
  constructor(private readonly client: AtlasApiClient) {}
  overview(period: '1D' | '5D' | '20D', signal?: AbortSignal) {
    return this.client.request<
      Envelope<{
        topBuyers: readonly InstitutionalFlowRow[];
        topSellers: readonly InstitutionalFlowRow[];
      }>
    >({
      path: '/institutional/overview',
      query: { period, limit: 5 },
      ...(signal ? { signal } : {}),
    });
  }
  flow(
    symbol: string,
    period: '1D' | '5D' | '20D',
    sort = 'NET_BUY',
    signal?: AbortSignal,
  ) {
    return this.client.request<
      Envelope<{ items: readonly InstitutionalFlowRow[] }>
    >({
      path: `/institutional/instruments/${encodeURIComponent(symbol)}/flow`,
      query: { period, sort, limit: 20 },
      ...(signal ? { signal } : {}),
    });
  }
  institutions(q: string, signal?: AbortSignal) {
    return this.client.request<
      Envelope<{ items: readonly InstitutionSummary[] }>
    >({
      path: '/institutions',
      query: { q, limit: 20 },
      ...(signal ? { signal } : {}),
    });
  }
  institution(id: string, period: '1D' | '5D' | '20D', signal?: AbortSignal) {
    return this.client.request<
      Envelope<{
        institution: InstitutionSummary;
        flows: readonly InstitutionalFlowRow[];
      }>
    >({
      path: `/institutions/${encodeURIComponent(id)}`,
      query: { period, limit: 20 },
      ...(signal ? { signal } : {}),
    });
  }
  settlement(symbol: string, sort = 'HOLDING', signal?: AbortSignal) {
    return this.client.request<Envelope<{ items: readonly SettlementRow[] }>>({
      path: `/settlement/instruments/${encodeURIComponent(symbol)}`,
      query: { sort, limit: 20 },
      ...(signal ? { signal } : {}),
    });
  }
  settlementHistory(
    symbol: string,
    period: '1D' | '5D' | '20D',
    signal?: AbortSignal,
  ) {
    return this.client.request<Envelope<{ items: readonly SettlementRow[] }>>({
      path: `/settlement/instruments/${encodeURIComponent(symbol)}/history`,
      query: { period, limit: 50 },
      ...(signal ? { signal } : {}),
    });
  }
}
