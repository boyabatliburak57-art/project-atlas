import type { AtlasApiClient, AtlasResponse } from '@atlas/api-client';

export type MeasureType =
  | 'SHORT_SELL_RESTRICTION'
  | 'MARGIN_TRADING_RESTRICTION'
  | 'GROSS_SETTLEMENT'
  | 'SINGLE_PRICE'
  | 'ORDER_PACKAGE_MEASURE'
  | 'OTHER_EXCHANGE_MEASURE';
export type MeasureStatus =
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'CORRECTED'
  | 'SUPERSEDED'
  | 'CANCELLED';

export interface MarketMeasureRow {
  readonly revisionId: string;
  readonly measureId: string;
  readonly marketEventId: string | null;
  readonly instrumentId: string;
  readonly symbol: string;
  readonly instrumentName: string;
  readonly measureType: MeasureType;
  readonly status: MeasureStatus;
  readonly publishedAt: string;
  readonly availableAt: string;
  readonly effectiveFrom: string;
  readonly effectiveUntil: string | null;
  readonly sourceReference: string | null;
  readonly provider: string;
  readonly providerDataset: string;
  readonly deliveryMode: 'LIVE' | 'DELAYED';
  readonly quality: string;
  readonly licenseClass: string;
  readonly redistributionClasses: readonly string[];
  readonly structuredAttributes: Readonly<Record<string, unknown>>;
}

export interface MarketMeasureEvent {
  readonly revisionId: string;
  readonly eventId: string;
  readonly eventType: 'MARKET_MEASURE';
  readonly entityType: 'INSTRUMENT';
  readonly entityId: string;
  readonly symbol: string;
  readonly instrumentName: string;
  readonly occurredAt: string | null;
  readonly publishedAt: string;
  readonly effectiveAt: string | null;
  readonly availableAt: string;
  readonly sourceReference: string;
  readonly methodologyVersion: string | null;
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly provider: string;
  readonly providerDataset: string;
  readonly deliveryMode: 'LIVE' | 'DELAYED';
  readonly quality: string;
  readonly licenseClass: string;
  readonly redistributionClasses: readonly string[];
}

export interface ShortSellingActivityRow {
  readonly revisionId: string;
  readonly instrumentId: string;
  readonly symbol: string;
  readonly tradeDate: string;
  readonly session: string | null;
  readonly quantity: string | null;
  readonly value: string | null;
  readonly shareOfTurnover: string | null;
  readonly dataCutoff: string;
  readonly availableAt: string;
  readonly provider: string;
  readonly deliveryMode: 'LIVE' | 'DELAYED';
  readonly quality: string;
  readonly licenseClass: string;
}

export interface MarketStructureMeta {
  readonly capability: string;
  readonly providerHealth: string;
  readonly checkedAt: string | null;
  readonly methodologyVersion: string;
  readonly asOf?: string;
  readonly nextCursor?: string | null;
}

type Envelope<T> = AtlasResponse<T> & { readonly meta: MarketStructureMeta };

export class MobileMarketStructureApi {
  constructor(private readonly client: AtlasApiClient) {}

  measures(input: {
    readonly type?: MeasureType;
    readonly status?: MeasureStatus;
    readonly symbol?: string;
    readonly cursor?: string;
    readonly signal?: AbortSignal;
  }) {
    return this.client.request<
      Envelope<{ items: readonly MarketMeasureRow[] }>
    >({
      path: '/market-structure/measures',
      query: {
        ...(input.type ? { types: input.type } : {}),
        ...(input.status ? { statuses: input.status } : {}),
        ...(input.symbol ? { symbol: input.symbol } : {}),
        ...(input.cursor ? { cursor: input.cursor } : {}),
        limit: 20,
      },
      ...(input.signal ? { signal: input.signal } : {}),
    });
  }

  active(symbol: string, signal?: AbortSignal) {
    return this.client.request<
      Envelope<{ items: readonly MarketMeasureRow[] }>
    >({
      path: `/market-structure/instruments/${encodeURIComponent(symbol)}/active`,
      ...(signal ? { signal } : {}),
    });
  }

  history(symbol: string, cursor?: string, signal?: AbortSignal) {
    return this.client.request<
      Envelope<{ items: readonly MarketMeasureRow[] }>
    >({
      path: `/market-structure/instruments/${encodeURIComponent(symbol)}/history`,
      query: { limit: 20, ...(cursor ? { cursor } : {}) },
      ...(signal ? { signal } : {}),
    });
  }

  shortSelling(symbol: string, signal?: AbortSignal) {
    return this.client.request<
      Envelope<{ items: readonly ShortSellingActivityRow[] }>
    >({
      path: `/market-structure/instruments/${encodeURIComponent(symbol)}/short-selling`,
      query: { from: '2026-07-01', to: '2026-08-15', limit: 30 },
      ...(signal ? { signal } : {}),
    });
  }

  event(revisionId: string, signal?: AbortSignal) {
    return this.client.request<Envelope<MarketMeasureEvent>>({
      path: `/market-structure/events/${encodeURIComponent(revisionId)}`,
      ...(signal ? { signal } : {}),
    });
  }
}
