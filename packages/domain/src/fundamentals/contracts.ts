export const FUNDAMENTAL_METRIC_CODES = [
  'revenue',
  'grossProfit',
  'operatingProfit',
  'ebitda',
  'netIncome',
  'totalAssets',
  'totalLiabilities',
  'equity',
  'cashAndEquivalents',
  'financialDebt',
  'operatingCashFlow',
  'capitalExpenditure',
  'freeCashFlow',
  'sharesOutstanding',
  // Supporting inputs required by currentRatio; providers may omit them.
  'currentAssets',
  'currentLiabilities',
] as const;

export type FundamentalMetricCode = (typeof FUNDAMENTAL_METRIC_CODES)[number];
export type FundamentalPeriodType = 'annual' | 'quarterly' | 'ttm';
export type FundamentalQualityStatus = 'complete' | 'missing' | 'not_evaluable';

export interface FundamentalPeriod {
  readonly fiscalYear: number;
  readonly fiscalPeriod: string;
  readonly periodType: FundamentalPeriodType;
  readonly periodStart: Date;
  readonly periodEnd: Date;
}

export interface NormalizedFundamentalStatement extends FundamentalPeriod {
  readonly instrumentId: string;
  readonly providerCode: string;
  readonly providerRevision: string;
  readonly publishedAt: Date;
  readonly sourceTimestamp: Date;
  readonly currencyCode: string;
  /** Values are already normalized to base currency units. Missing means absent, never zero. */
  readonly metrics: Readonly<Partial<Record<FundamentalMetricCode, string>>>;
  readonly warnings: readonly string[];
}

export interface FundamentalRatioResult {
  readonly code: RatioCode;
  readonly value: string | null;
  readonly status: FundamentalQualityStatus;
  readonly reasonCode: string | null;
  readonly formulaVersion: string;
  readonly financialPeriod: string;
  readonly marketDataCutoffAt: Date | null;
  readonly inputRevisions: readonly string[];
  readonly warnings: readonly string[];
}

export const RATIO_CODES = [
  'pe',
  'pb',
  'evToEbitda',
  'netDebtToEbitda',
  'grossMargin',
  'operatingMargin',
  'netMargin',
  'roa',
  'roe',
  'currentRatio',
  'debtToEquity',
  'freeCashFlowMargin',
  'revenueGrowth',
  'netIncomeGrowth',
] as const;

export type RatioCode = (typeof RATIO_CODES)[number];

export interface RatioCalculationContext {
  readonly current: NormalizedFundamentalStatement;
  readonly previous?: NormalizedFundamentalStatement | undefined;
  readonly market?:
    | {
        readonly price: string;
        readonly dataCutoffAt: Date;
        readonly currencyCode: string;
      }
    | undefined;
}
