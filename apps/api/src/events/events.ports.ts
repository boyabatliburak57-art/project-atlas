export const EVENT_READER = Symbol('EVENT_READER');

export interface EventFeedQuery {
  readonly userId: string;
  readonly categories: readonly string[];
  readonly states: readonly string[];
  readonly companyId: string | null;
  readonly symbol: string | null;
  readonly relevance: 'WATCHLIST' | 'PORTFOLIO' | 'ANY' | null;
  readonly search: string | null;
  readonly from: Date;
  readonly to: Date;
  readonly limit: number;
  readonly cursor: {
    readonly publishedAt: Date;
    readonly revisionId: string;
  } | null;
}

export interface EventFeedRow {
  readonly revisionId: string;
  readonly disclosureId: string;
  readonly supersedesRevisionId: string | null;
  readonly externalDisclosureId: string;
  readonly providerRevision: string | null;
  readonly title: string;
  readonly summary: string | null;
  readonly disclosureType: string;
  readonly state: string;
  readonly publishedAt: Date;
  readonly effectiveAt: Date | null;
  readonly availableAt: Date;
  readonly reportingPeriod: string | null;
  readonly sourceReference: string;
  readonly providerId: string;
  readonly providerCode: string;
  readonly providerDataset: string;
  readonly sourceTimestamp: Date;
  readonly ingestedAt: Date;
  readonly deliveryMode: string;
  readonly licenseClass: string;
  readonly redistributionClasses: readonly string[];
  readonly qualityState: string;
  readonly normalizedAttributes: Record<string, unknown>;
  readonly companyIds: readonly string[];
  readonly companyNames: readonly string[];
  readonly instrumentIds: readonly string[];
  readonly symbols: readonly string[];
  readonly watchlistRelevant: boolean;
  readonly portfolioRelevant: boolean;
  readonly marketEventRevisionId: string | null;
}

export interface EventReader {
  capability(): Promise<{
    readonly availability: string;
    readonly health: string;
    readonly checkedAt: Date | null;
  }>;
  feed(query: EventFeedQuery): Promise<readonly EventFeedRow[]>;
  detail(revisionId: string, userId: string): Promise<EventFeedRow | null>;
  revisions(
    disclosureId: string,
    userId: string,
  ): Promise<readonly EventFeedRow[]>;
}
