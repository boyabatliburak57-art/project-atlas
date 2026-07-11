import type { ProviderInstrumentDto } from '../providers';

export type InstrumentStatus = 'active' | 'inactive' | 'delisted';

export interface NormalizedInstrument {
  readonly providerSymbol: string;
  readonly symbol: string;
  readonly normalizedSymbol: string;
  readonly name: string;
  readonly isin?: string | undefined;
  readonly marketCode: 'BIST';
  readonly currencyCode: string;
  readonly status: InstrumentStatus;
}

export type InstrumentRejectionCode =
  | 'DUPLICATE_ISIN'
  | 'DUPLICATE_PROVIDER_SYMBOL'
  | 'INVALID_MARKET'
  | 'INVALID_SYMBOL';

export interface InstrumentImportRejection {
  readonly providerSymbol: string;
  readonly code: InstrumentRejectionCode;
}

export interface InstrumentImportPlan {
  readonly instruments: readonly NormalizedInstrument[];
  readonly rejections: readonly InstrumentImportRejection[];
}

export interface InstrumentImportChanges {
  readonly createdCount: number;
  readonly updatedCount: number;
  readonly mappingCreatedCount: number;
  readonly mappingUpdatedCount: number;
  readonly deactivationCandidates: readonly string[];
}

export interface InstrumentImportResult extends InstrumentImportChanges {
  readonly providerCode: string;
  readonly runId: string | null;
  readonly dryRun: boolean;
  readonly fetchedCount: number;
  readonly acceptedCount: number;
  readonly rejectedCount: number;
  readonly rejections: readonly InstrumentImportRejection[];
}

export interface InstrumentImportStore {
  findActiveProviderId(code: string): Promise<string | null>;
  previewImport(
    providerId: string,
    instruments: readonly NormalizedInstrument[],
  ): Promise<InstrumentImportChanges>;
  createRun(providerId: string): Promise<string>;
  applyImport(
    runId: string,
    providerId: string,
    instruments: readonly NormalizedInstrument[],
    fetchedCount: number,
    rejectedCount: number,
  ): Promise<InstrumentImportChanges>;
  failRun(runId: string, errorCode: string): Promise<void>;
}

export interface InstrumentImportLogger {
  info(event: string, fields?: Readonly<Record<string, unknown>>): void;
  error(event: string, fields?: Readonly<Record<string, unknown>>): void;
}

export interface InstrumentImportCommand {
  readonly providerCode: string;
  readonly dryRun: boolean;
}

export interface InstrumentImportDependencies {
  readonly store: InstrumentImportStore;
  readonly logger: InstrumentImportLogger;
  readonly listInstruments: (
    providerCode: string,
  ) => Promise<readonly ProviderInstrumentDto[]>;
}
