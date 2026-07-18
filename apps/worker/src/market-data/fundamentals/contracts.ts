import type {
  FundamentalMetricCode,
  FundamentalPeriodType,
} from '@atlas/domain';

export interface FundamentalsProviderCapabilities {
  readonly supportsAnnual: boolean;
  readonly supportsQuarterly: boolean;
  readonly supportedCurrencies: readonly string[];
  readonly supportedMetrics: readonly FundamentalMetricCode[];
  readonly revisionMode: 'immutable';
}

export interface ProviderFundamentalPeriod {
  readonly fiscalYear: number;
  readonly fiscalPeriod: string;
  readonly periodType: Exclude<FundamentalPeriodType, 'ttm'>;
  readonly periodStart: Date;
  readonly periodEnd: Date;
}

export interface ProviderFundamentalStatement extends ProviderFundamentalPeriod {
  readonly providerSymbol: string;
  readonly providerRevision: string;
  readonly publishedAt: Date;
  readonly sourceTimestamp: Date;
  readonly currencyCode: string;
  readonly unitScale: string;
  readonly metrics: Readonly<Partial<Record<FundamentalMetricCode, string>>>;
}

export type FundamentalsProviderErrorCode =
  | 'FUNDAMENTALS_AUTHENTICATION_FAILED'
  | 'FUNDAMENTALS_INVALID_SYMBOL'
  | 'FUNDAMENTALS_MALFORMED_RESPONSE'
  | 'FUNDAMENTALS_RATE_LIMITED'
  | 'FUNDAMENTALS_TIMEOUT'
  | 'FUNDAMENTALS_UNAVAILABLE';

export class FundamentalsProviderError extends Error {
  override readonly name = 'FundamentalsProviderError';
  readonly retryable: boolean;
  constructor(
    readonly code: FundamentalsProviderErrorCode,
    options?: ErrorOptions,
  ) {
    super('Fundamentals provider operation failed', options);
    this.retryable = [
      'FUNDAMENTALS_RATE_LIMITED',
      'FUNDAMENTALS_TIMEOUT',
      'FUNDAMENTALS_UNAVAILABLE',
    ].includes(code);
  }
}

export interface FundamentalsProvider {
  readonly code: string;
  getCapabilities(): FundamentalsProviderCapabilities;
  listPeriods(
    providerSymbol: string,
  ): Promise<readonly ProviderFundamentalPeriod[]>;
  fetchStatements(
    providerSymbol: string,
    periods: readonly ProviderFundamentalPeriod[],
  ): Promise<readonly ProviderFundamentalStatement[]>;
}

export interface FundamentalsIngestionStore {
  resolveContext(
    providerCode: string,
    providerSymbol: string,
  ): Promise<{ providerId: string; instrumentId: string } | null>;
  persist(
    statements: readonly import('@atlas/domain').NormalizedFundamentalStatement[],
    providerId: string,
  ): Promise<{
    insertedStatements: number;
    duplicateStatements: number;
    insertedMetrics: number;
  }>;
}
