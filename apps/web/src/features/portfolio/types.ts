export interface WatchlistItem {
  readonly id: string;
  readonly instrumentId: string;
  readonly note: string | null;
  readonly tags: readonly string[];
  readonly sortOrder: number;
}

export interface Watchlist {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: 'active' | 'deleted';
  readonly items: readonly WatchlistItem[];
  readonly updatedAt: string;
}

export interface MarketSummaryItem {
  readonly instrumentId: string;
  readonly symbol: string;
  readonly company: string;
  readonly lastPrice: string | null;
  readonly dailyChangePercent: string | null;
  readonly dataTime: string | null;
  readonly stale: boolean;
  readonly activeAlertCount: number;
}

export interface AlertSource {
  readonly type: string;
  readonly instrumentId?: string;
  readonly savedScanId?: string;
  readonly savedScanRevision?: number;
}

export interface Alert {
  readonly id: string;
  readonly name: string;
  readonly status: 'active' | 'paused' | 'invalid' | 'deleted';
  readonly currentRevision: number;
  readonly revision: {
    readonly source: AlertSource;
    readonly triggerPolicy: string;
    readonly repeatPolicy: string;
    readonly timeframe: string | null;
    readonly sourceConfiguration: Readonly<Record<string, unknown>>;
    readonly channels: readonly string[];
  };
  readonly updatedAt: string;
}

export interface Notification {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly body: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly readAt: string | null;
  readonly occurredAt: string;
}

export interface NotificationPreferences {
  readonly timezone: string;
  readonly locale: string;
  readonly emailAlertsEnabled: boolean;
  readonly dailyDigestEnabled: boolean;
  readonly scanCompletionEnabled: boolean;
  readonly quietHoursEnabled: boolean;
  readonly quietHoursStartMinute: number | null;
  readonly quietHoursEndMinute: number | null;
  readonly throttleMinutes: number;
}

export interface Portfolio {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly description: string | null;
  readonly reportingCurrency: 'TRY';
  readonly defaultBenchmarkCode: string | null;
  readonly status: 'active' | 'archived' | 'deleted';
  readonly ledgerVersion: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

export type PortfolioTransactionType =
  | 'buy'
  | 'sell'
  | 'cashDeposit'
  | 'cashWithdrawal'
  | 'dividend'
  | 'fee'
  | 'tax'
  | 'adjustment';

export interface PortfolioTransaction {
  readonly id: string;
  readonly portfolioId: string;
  readonly instrumentId: string | null;
  readonly reversalOfTransactionId: string | null;
  readonly sequence: number;
  readonly type: PortfolioTransactionType;
  readonly status: 'draft' | 'posted' | 'reversed' | 'deleted';
  readonly tradeAt: string;
  readonly settlementAt: string | null;
  readonly quantity: string | null;
  readonly unitPrice: string | null;
  readonly fee: string;
  readonly tax: string;
  readonly cashAmount: string | null;
  readonly source: 'manual' | 'csv_import' | 'corporate_action' | 'system';
  readonly externalReference: string | null;
  readonly adjustmentReason: string | null;
  readonly note: string | null;
  readonly postedAt: string | null;
  readonly reversedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PositionProjection {
  readonly portfolioId: string;
  readonly instrumentId: string;
  readonly symbol?: string;
  readonly company?: string;
  readonly sector?: string | null;
  readonly quantity: string;
  readonly averageCost: string;
  readonly costBasis: string;
  readonly realizedPnl: string;
  readonly dividendIncome: string;
  readonly ledgerVersion: number;
  readonly calculatedAt: string;
}

export interface PositionValuation {
  readonly instrumentId: string;
  readonly status: 'valued' | 'missing_price' | 'stale_price';
  readonly quantity: string;
  readonly averageCost: string;
  readonly costBasis: string;
  readonly marketPrice: string | null;
  readonly marketValue: string | null;
  readonly unrealizedPnl: string | null;
  readonly dailyChangePercent?: string | null;
  readonly priceAt: string | null;
  readonly warningCode: 'MISSING_PRICE' | 'STALE_PRICE' | null;
}

export interface PortfolioValuation {
  readonly portfolioId: string;
  readonly ledgerVersion: number;
  readonly valuationAt: string;
  readonly dataCutoffAt: string;
  readonly pricePolicyVersion: string;
  readonly mode: 'official' | 'intradayPreview';
  readonly persistable: boolean;
  readonly status: 'complete' | 'partial' | 'notEvaluable';
  readonly cashBalance: string;
  readonly positionsMarketValue: string;
  readonly totalValue: string;
  readonly realizedPnl: string;
  readonly unrealizedPnl: string | null;
  readonly netContributions: string;
  readonly missingPriceCount: number;
  readonly warnings: readonly {
    readonly code: 'MISSING_PRICE' | 'STALE_PRICE';
    readonly instrumentId: string;
  }[];
  readonly positions: readonly PositionValuation[];
}

export type PerformanceMetric =
  | { readonly status: 'complete'; readonly value: string }
  | { readonly status: 'notEvaluable'; readonly reason: string };

export interface PortfolioPerformance {
  readonly portfolioId: string;
  readonly ledgerVersion: number;
  readonly rangeStartAt: string;
  readonly rangeEndAt: string;
  readonly dataCutoffAt: string;
  readonly performancePolicyVersion: string;
  readonly benchmarkCode: string;
  readonly status: 'complete' | 'partial' | 'notEvaluable';
  readonly dailyValueSeries: readonly {
    readonly date: string;
    readonly value: string;
    readonly externalFlow: string;
  }[];
  readonly netContributionSeries: readonly {
    readonly date: string;
    readonly value: string;
  }[];
  readonly twr: PerformanceMetric;
  readonly xirr: PerformanceMetric;
  readonly benchmark: {
    readonly status: 'complete' | 'notEvaluable';
    readonly priceReturn: string | null;
    readonly totalReturn: string | null;
    readonly alignedDates: readonly string[];
    readonly warnings: readonly string[];
  };
  readonly periodReturns: Readonly<Record<string, PerformanceMetric>>;
  readonly warnings: readonly string[];
}

export interface RiskMetric<T> {
  readonly value: T | null;
  readonly status: 'complete' | 'notEvaluable';
  readonly reasonCode: string | null;
  readonly observationCount: number;
  readonly methodologyVersion: string;
  readonly warnings: readonly string[];
}

export interface RiskConcentration {
  readonly largestPositionWeight: string;
  readonly top3Weight: string;
  readonly top5Weight: string;
  readonly hhi: string;
  readonly cashWeight: string;
  readonly unknownSectorWeight: string;
  readonly exposures: readonly {
    readonly type: 'instrument' | 'sector' | 'cash';
    readonly key: string;
    readonly weight: string;
    readonly marketValue: string;
    readonly rank: number | null;
  }[];
}

export interface PortfolioRisk {
  readonly portfolioId: string;
  readonly ledgerVersion: number;
  readonly rangeStartAt: string;
  readonly rangeEndAt: string;
  readonly dataCutoffAt: string;
  readonly benchmarkCode: string;
  readonly riskPolicyVersion: string;
  readonly status: 'complete' | 'partial' | 'notEvaluable';
  readonly observationCount: number;
  readonly volatility: RiskMetric<string>;
  readonly beta: RiskMetric<string>;
  readonly correlation: RiskMetric<string>;
  readonly drawdown: RiskMetric<{
    readonly maximumDrawdown: string;
    readonly currentDrawdown: string;
    readonly peakDate: string;
    readonly troughDate: string;
    readonly recoveryDate: string | null;
  }>;
  readonly historicalVar95: RiskMetric<string>;
  readonly historicalVar99: RiskMetric<string>;
  readonly expectedShortfall95: RiskMetric<string>;
  readonly concentration: RiskMetric<RiskConcentration>;
  readonly warnings: readonly string[];
}

export interface PortfolioImportJob {
  readonly id: string;
  readonly portfolioId: string;
  readonly status:
    | 'uploaded'
    | 'validating'
    | 'preview_ready'
    | 'committing'
    | 'completed'
    | 'failed'
    | 'cancelled';
  readonly commitMode: 'atomic' | 'partial';
  readonly sourceFilename: string;
  readonly fileSize: number;
  readonly encoding: string;
  readonly delimiter: ',' | ';';
  readonly totalRowCount: number;
  readonly validRowCount: number;
  readonly invalidRowCount: number;
  readonly duplicateRowCount: number;
  readonly committedRowCount: number;
  readonly errorSummary: Readonly<Record<string, number>>;
  readonly previewExpiresAt: string | null;
  readonly committedAt: string | null;
  readonly errorCode: string | null;
}

export interface PortfolioImportRow {
  readonly rowNumber: number;
  readonly status: 'valid' | 'invalid' | 'duplicate' | 'committed' | 'skipped';
  readonly duplicateOfTransactionId: string | null;
  readonly rawData: Readonly<Record<string, string>>;
  readonly validationErrors: readonly {
    readonly code: string;
    readonly field: string | null;
    readonly message: string;
  }[];
}
