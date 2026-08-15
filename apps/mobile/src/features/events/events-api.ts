import type { AtlasApiClient, AtlasResponse } from '@atlas/api-client';

export type EventCategory =
  | 'FINANCIAL_RESULT'
  | 'MATERIAL_EVENT'
  | 'NEW_BUSINESS'
  | 'BUYBACK'
  | 'DIVIDEND'
  | 'CAPITAL_INCREASE'
  | 'CAPITAL_DECREASE'
  | 'SPLIT'
  | 'MERGER'
  | 'ACQUISITION'
  | 'SHARE_TRANSACTION'
  | 'MANAGEMENT_CHANGE'
  | 'IPO'
  | 'GUIDANCE'
  | 'OTHER';

export interface KapEventSummary {
  readonly id: string;
  readonly disclosureId: string;
  readonly marketEventId: string | null;
  readonly title: string;
  readonly category: EventCategory;
  readonly sourceCategory: unknown;
  readonly state: 'ACTIVE' | 'CORRECTED' | 'SUPERSEDED' | 'WITHDRAWN';
  readonly corrected: boolean;
  readonly supersedesRevisionId: string | null;
  readonly providerRevision: string | null;
  readonly companies: readonly {
    readonly id: string;
    readonly name: string | null;
  }[];
  readonly instruments: readonly {
    readonly id: string;
    readonly symbol: string | null;
  }[];
  readonly publishedAt: string;
  readonly availableAt: string;
  readonly effectiveAt: string | null;
  readonly reportingPeriod: string | null;
  readonly relevance:
    | 'WATCHLIST_RELEVANT'
    | 'PORTFOLIO_RELEVANT'
    | 'BOTH'
    | 'NONE';
}

export interface KapEventDetail extends KapEventSummary {
  readonly summary: string | null;
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly attachments: readonly {
    readonly title?: string;
    readonly mimeType?: string;
    readonly sizeBytes?: number | null;
    readonly sourceUrl?: string;
  }[];
  readonly source: {
    readonly reference: string;
    readonly provider: string;
    readonly dataset: string;
    readonly sourceTimestamp: string;
    readonly ingestedAt: string;
    readonly deliveryMode: string;
    readonly quality: string;
    readonly licenseClass: string;
    readonly restrictions: readonly string[];
  };
}

export interface EventsMeta {
  readonly capability: 'disclosure.kap';
  readonly providerState: string;
  readonly runtimeHealth: string;
  readonly freshness: 'CURRENT' | 'DELAYED' | 'STALE' | 'PROVIDER_REQUIRED';
  readonly nextCursor?: string | null;
  readonly limit?: number;
}

type Envelope<T> = AtlasResponse<T> & { readonly meta: EventsMeta };

export class MobileEventsApi {
  constructor(private readonly client: AtlasApiClient) {}

  feed(input: {
    category?: EventCategory;
    relevance?: 'WATCHLIST' | 'PORTFOLIO' | 'ANY';
    symbol?: string;
    q?: string;
    cursor?: string;
    signal?: AbortSignal;
  }) {
    const { signal, ...query } = input;
    return this.client.request<
      Envelope<{ readonly items: readonly KapEventSummary[] }>
    >({
      path: '/events',
      query: { ...query, limit: 20 },
      ...(signal ? { signal } : {}),
    });
  }

  detail(id: string, signal?: AbortSignal) {
    return this.client.request<Envelope<KapEventDetail>>({
      path: `/events/${encodeURIComponent(id)}`,
      ...(signal ? { signal } : {}),
    });
  }

  revisions(id: string, signal?: AbortSignal) {
    return this.client.request<
      Envelope<{ readonly items: readonly KapEventDetail[] }>
    >({
      path: `/events/${encodeURIComponent(id)}/revisions`,
      ...(signal ? { signal } : {}),
    });
  }

  company(symbol: string, cursor?: string, signal?: AbortSignal) {
    return this.client.request<
      Envelope<{ readonly items: readonly KapEventSummary[] }>
    >({
      path: `/symbols/${encodeURIComponent(symbol)}/events`,
      query: { cursor, limit: 20 },
      ...(signal ? { signal } : {}),
    });
  }
}
