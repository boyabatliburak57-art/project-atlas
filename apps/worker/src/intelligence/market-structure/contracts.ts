import type {
  ExternalIdentityMapping,
  IntelligenceLicensePolicy,
  NormalizedMarketMeasure,
  NormalizedShortSellingActivity,
  ProviderMarketMeasure,
  ProviderShortSellingActivity,
} from '@atlas/domain';

export interface MarketStructureFetchRequest {
  readonly from: Date;
  readonly to: Date;
  readonly cursor: string | null;
  readonly limit: number;
}

export interface MarketStructureProviderAdapter {
  readonly code: string;
  readonly dataset: string;
  readonly deliveryMode: 'LIVE' | 'DELAYED';
  readonly license: IntelligenceLicensePolicy;
  fetchMarketMeasures(request: MarketStructureFetchRequest): Promise<{
    readonly items: readonly ProviderMarketMeasure[];
    readonly nextCursor: string | null;
  }>;
  fetchShortSellingActivity?(request: MarketStructureFetchRequest): Promise<{
    readonly items: readonly ProviderShortSellingActivity[];
    readonly nextCursor: string | null;
  }>;
}

export interface MarketStructureIngestionStore {
  resolveContext(
    providerCode: string,
    at: Date,
  ): Promise<{
    readonly providerId: string;
    readonly providerConnectionId: string;
    readonly mappings: readonly ExternalIdentityMapping[];
  } | null>;
  beginRun(input: {
    readonly providerConnectionId: string;
    readonly capability:
      | 'marketMeasure.restrictions'
      | 'marketMeasure.shortSelling';
    readonly idempotencyKey: string;
    readonly correlationId: string;
    readonly sourceCursor: string | null;
  }): Promise<{ readonly runId: string; readonly completed: boolean }>;
  persistMeasures(
    records: readonly NormalizedMarketMeasure[],
  ): Promise<{ inserted: number; duplicates: number; eventsInserted: number }>;
  persistActivities(
    records: readonly NormalizedShortSellingActivity[],
  ): Promise<{ inserted: number; duplicates: number }>;
  completeRun(input: {
    readonly runId: string;
    readonly sourceCursor: string | null;
    readonly recordsRead: number;
    readonly recordsAccepted: number;
    readonly recordsRejected: number;
  }): Promise<void>;
  failRun(runId: string, errorClass: string): Promise<void>;
}
