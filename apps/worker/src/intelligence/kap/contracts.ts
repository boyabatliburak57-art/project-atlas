import type {
  ExternalIdentityMapping,
  IntelligenceLicensePolicy,
  KapProviderDisclosure,
  NormalizedKapDisclosure,
} from '@atlas/domain';

export interface KapFetchRequest {
  readonly from: Date;
  readonly to: Date;
  readonly cursor: string | null;
  readonly limit: number;
}

export interface KapFetchPage {
  readonly items: readonly KapProviderDisclosure[];
  readonly nextCursor: string | null;
}

export interface KapDisclosureProvider {
  readonly code: string;
  readonly dataset: string;
  readonly deliveryMode: 'LIVE' | 'DELAYED';
  readonly license: IntelligenceLicensePolicy;
  readonly allowedSourceHosts: ReadonlySet<string>;
  fetchDisclosures(request: KapFetchRequest): Promise<KapFetchPage>;
}

export interface KapIngestionContext {
  readonly providerId: string;
  readonly providerConnectionId: string;
  readonly mappings: readonly ExternalIdentityMapping[];
}

export interface KapIngestionStore {
  resolveContext(
    providerCode: string,
    at: Date,
  ): Promise<KapIngestionContext | null>;
  beginRun(input: {
    readonly providerConnectionId: string;
    readonly idempotencyKey: string;
    readonly correlationId: string;
    readonly sourceCursor: string | null;
  }): Promise<{ readonly runId: string; readonly completed: boolean }>;
  persist(
    runId: string,
    records: readonly NormalizedKapDisclosure[],
  ): Promise<{
    readonly disclosuresInserted: number;
    readonly eventsInserted: number;
    readonly duplicates: number;
  }>;
  completeRun(input: {
    readonly runId: string;
    readonly sourceCursor: string | null;
    readonly recordsRead: number;
    readonly recordsAccepted: number;
    readonly recordsRejected: number;
  }): Promise<void>;
  failRun(runId: string, errorClass: string): Promise<void>;
}
