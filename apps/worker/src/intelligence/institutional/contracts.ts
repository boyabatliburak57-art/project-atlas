import type {
  ExternalIdentityMapping,
  IntelligenceLicensePolicy,
  NormalizedInstitutionalFlow,
  NormalizedSettlement,
  ProviderInstitutionalFlow,
  ProviderSettlementSnapshot,
} from '@atlas/domain';

export interface InstitutionalFetchRequest {
  readonly from: Date;
  readonly to: Date;
  readonly cursor: string | null;
  readonly limit: number;
}
export interface InstitutionalFlowProviderAdapter {
  readonly code: string;
  readonly dataset: string;
  readonly deliveryMode: 'LIVE' | 'DELAYED';
  readonly license: IntelligenceLicensePolicy;
  fetchInstitutionalFlows(request: InstitutionalFetchRequest): Promise<{
    readonly items: readonly ProviderInstitutionalFlow[];
    readonly nextCursor: string | null;
  }>;
}
export interface SettlementProviderAdapter {
  readonly code: string;
  readonly dataset: string;
  readonly deliveryMode: 'LIVE' | 'DELAYED';
  readonly license: IntelligenceLicensePolicy;
  fetchSettlements(request: InstitutionalFetchRequest): Promise<{
    readonly items: readonly ProviderSettlementSnapshot[];
    readonly nextCursor: string | null;
  }>;
}
export interface InstitutionalIngestionContext {
  readonly providerId: string;
  readonly providerConnectionId: string;
  readonly mappings: readonly ExternalIdentityMapping[];
}
export interface InstitutionalIngestionStore {
  resolveContext(
    providerCode: string,
    at: Date,
  ): Promise<InstitutionalIngestionContext | null>;
  beginRun(input: {
    readonly providerConnectionId: string;
    readonly capability: 'institutional.akd' | 'settlement.snapshot';
    readonly idempotencyKey: string;
    readonly correlationId: string;
    readonly sourceCursor: string | null;
  }): Promise<{ readonly runId: string; readonly completed: boolean }>;
  persistFlows(
    runId: string,
    records: readonly NormalizedInstitutionalFlow[],
  ): Promise<{
    readonly inserted: number;
    readonly duplicates: number;
  }>;
  persistSettlements(
    runId: string,
    records: readonly NormalizedSettlement[],
  ): Promise<{
    readonly inserted: number;
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
