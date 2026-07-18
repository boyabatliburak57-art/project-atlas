export interface MarketMeta {
  readonly generationId: string;
  readonly dataCutoffAt: string;
  readonly sourceTimestamp?: string | null;
  readonly status: 'complete' | 'partial' | 'stale' | 'notEvaluable';
  readonly partial: boolean;
  readonly stale: boolean;
  readonly evaluatedCount?: number;
  readonly excludedCount?: number;
  readonly nextCursor?: string | null;
}

export interface IndexSummary {
  readonly code: string;
  readonly name: string;
  readonly value: string | null;
  readonly change: string | null;
  readonly changePercent: string | null;
}

export interface MarketOverview {
  readonly indices?: readonly IndexSummary[];
  readonly marketState?: string;
  readonly breadth?: Readonly<Record<string, unknown>>;
}

export interface BreadthSummary {
  readonly advancing?: number;
  readonly declining?: number;
  readonly unchanged?: number;
  readonly aboveSma20Percent?: string | null;
  readonly aboveSma50Percent?: string | null;
  readonly aboveSma200Percent?: string | null;
  readonly evaluatedCount: number;
  readonly excludedCount: number;
  readonly universeCount: number;
}

export interface RankingItem {
  readonly instrumentId: string;
  readonly symbol: string;
  readonly company: string;
  readonly rank: number;
  readonly sortValue: string | null;
  readonly status: string;
  readonly changePercent?: string | null;
  readonly volume?: string | null;
}

export interface SectorSummary {
  readonly sectorId: string;
  readonly sectorCode: string;
  readonly sectorName: string;
  readonly status: string;
  readonly partial: boolean;
  readonly stale: boolean;
  readonly evaluatedCount: number;
  readonly excludedCount: number;
  readonly returnPercent?: string | null;
  readonly advancing?: number;
  readonly declining?: number;
  readonly volume?: string | null;
  readonly breadthPercent?: string | null;
}

export interface SymbolProfile {
  readonly id: string;
  readonly symbol: string;
  readonly name: string;
  readonly isin: string | null;
  readonly marketCode: string;
  readonly currencyCode: string;
  readonly status: string;
  readonly sector: { readonly name: string; readonly code: string } | null;
}

export interface Quote {
  readonly price: string | null;
  readonly change: string | null;
  readonly changePercent: string | null;
  readonly high: string | null;
  readonly low: string | null;
  readonly volume: string | null;
}

export interface QuoteMeta {
  readonly dataCutoffAt: string | null;
  readonly stale?: boolean;
  readonly partial?: boolean;
  readonly quality?: { readonly status?: string; readonly warnings?: string[] };
}

export interface ChartBar {
  readonly time: number;
  readonly open: string;
  readonly high: string;
  readonly low: string;
  readonly close: string;
  readonly volume: string;
  readonly isClosed: boolean;
}

export interface ChartSeries {
  readonly id: string;
  readonly indicatorCode: string;
  readonly indicatorVersion: number;
  readonly outputName: string;
  readonly panel: string;
  readonly points: readonly { readonly time: number; readonly value: string }[];
}

export interface ChartMarker {
  readonly time: number;
  readonly type: string;
  readonly label: string;
  readonly sourceType: string;
  readonly sourceId?: string;
}

export interface ChartResponse {
  readonly instrument: SymbolProfile;
  readonly timeframe: string;
  readonly adjustmentMode: string;
  readonly bars: readonly ChartBar[];
  readonly overlays: readonly ChartSeries[];
  readonly panels: readonly ChartSeries[];
  readonly markers: readonly ChartMarker[];
  readonly warnings: readonly string[];
}

export interface ChartMeta {
  readonly dataCutoffAt: string;
  readonly adjustmentMode: string;
  readonly indicatorVersions: Readonly<Record<string, number>>;
  readonly openBarIncluded: boolean;
}

export interface FinancialMetric {
  readonly code: string;
  readonly value: string | null;
  readonly status: 'complete' | 'missing' | 'not_evaluable';
  readonly reasonCode: string | null;
}

export interface FinancialStatement {
  readonly period: string;
  readonly periodType: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly currencyCode: string;
  readonly providerRevision: string;
  readonly publishedAt: string;
  readonly sourceTimestamp: string;
  readonly metrics: readonly FinancialMetric[];
}

export interface RatioValue {
  readonly code: string;
  readonly value: string | null;
  readonly status: 'complete' | 'missing' | 'not_evaluable';
  readonly reasonCode: string | null;
  readonly formulaVersion: string;
  readonly warnings?: readonly string[];
}

export interface FinancialTrend {
  readonly period: string;
  readonly periodEnd: string;
  readonly value: string | null;
  readonly status: string;
  readonly reasonCode: string | null;
  readonly providerRevision: string;
}

export interface PatternEvidencePoint {
  readonly time: string;
  readonly price: string;
  readonly role: string;
}

export interface PatternInstance {
  readonly id: string;
  readonly instrumentId: string;
  readonly symbol: string;
  readonly code: string;
  readonly algorithmVersion: string;
  readonly state: 'candidate' | 'confirmed' | 'invalidated';
  readonly direction: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly detectedAt: string;
  readonly dataCutoffAt: string;
  readonly confidence: string | null;
  readonly evidence: {
    readonly points?: readonly PatternEvidencePoint[];
    readonly breakoutLevel?: string | number | null;
    readonly invalidationLevel?: string | number | null;
  };
  readonly warnings: readonly unknown[];
}
