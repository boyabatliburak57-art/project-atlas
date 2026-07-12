import type {
  FetchBarsRequest,
  MarketDataTimeframe,
  ProviderBarDto,
  ProviderBarBatch,
} from '../providers';

export interface FetchBarRangeCommand {
  readonly providerCode: string;
  readonly providerSymbol: string;
  readonly timeframe: MarketDataTimeframe;
  readonly from: Date;
  readonly to: Date;
  readonly limit?: number | undefined;
}

export type BarValidationIssueCode =
  | 'BAR_OUTSIDE_REQUEST_RANGE'
  | 'CLOSE_TIME_NOT_AFTER_OPEN_TIME'
  | 'DUPLICATE_BAR_IN_BATCH'
  | 'FUTURE_TIMESTAMP'
  | 'HIGH_PRICE_INVALID'
  | 'LOW_PRICE_INVALID'
  | 'MAPPING_NOT_FOUND'
  | 'NUMBER_FORMAT_INVALID'
  | 'PROVIDER_SYMBOL_MISMATCH'
  | 'TIMEFRAME_MISMATCH'
  | 'VOLUME_NEGATIVE';

export interface RejectedBar {
  readonly providerSymbol: string;
  readonly timeframe: MarketDataTimeframe;
  readonly openTime: Date;
  readonly codes: readonly BarValidationIssueCode[];
}

export interface BarPersistenceContext {
  readonly providerId: string;
  readonly instrumentId: string | null;
  readonly command: FetchBarRangeCommand;
}

export interface BarPersistenceResult {
  readonly insertedCount: number;
  readonly updatedOpenCount: number;
  readonly revisedClosedCount: number;
  readonly duplicateCount: number;
  readonly rejectedCount: number;
  readonly qualityIssueCount: number;
}

export interface BarIngestionResult extends BarPersistenceResult {
  readonly runId: string;
  readonly providerCode: string;
  readonly providerSymbol: string;
  readonly timeframe: MarketDataTimeframe;
  readonly fetchedCount: number;
  readonly acceptedCount: number;
  readonly durationMs: number;
}

export interface BarIngestionStore {
  findActiveProviderId(code: string): Promise<string | null>;
  findActiveInstrumentId(
    providerId: string,
    providerSymbol: string,
  ): Promise<string | null>;
  createRun(providerId: string, command: FetchBarRangeCommand): Promise<string>;
  persistBatch(
    runId: string,
    context: BarPersistenceContext,
    fetchedCount: number,
    bars: readonly ProviderBarDto[],
    rejectedBars: readonly RejectedBar[],
  ): Promise<BarPersistenceResult>;
  failRun(runId: string, providerId: string, errorCode: string): Promise<void>;
}

export interface BarIngestionLogger {
  info(event: string, fields?: Readonly<Record<string, unknown>>): void;
  error(event: string, fields?: Readonly<Record<string, unknown>>): void;
}

export interface BarIngestionDependencies {
  readonly store: BarIngestionStore;
  readonly logger: BarIngestionLogger;
  readonly fetchBars: (
    providerCode: string,
    request: FetchBarsRequest,
  ) => Promise<ProviderBarBatch>;
  readonly now?: (() => Date) | undefined;
}
