import type {
  AdjustmentMode,
  IndicatorTimeframe,
} from '../indicators/contracts.js';

export type PatternCategory = 'candlestick' | 'trend_breakout' | 'geometric';
export type PatternState = 'candidate' | 'confirmed' | 'invalidated';
export type PatternDirection = 'bullish' | 'bearish' | 'neutral';
export type PatternRequiredField = 'open' | 'high' | 'low' | 'close' | 'volume';

export interface PatternBar {
  readonly timestamp: Date;
  readonly open: number | null;
  readonly high: number | null;
  readonly low: number | null;
  readonly close: number | null;
  readonly volume: number | null;
  readonly isClosed: boolean;
}

export interface PatternInput {
  readonly instrumentId: string;
  readonly timeframe: IndicatorTimeframe;
  readonly adjustmentMode: AdjustmentMode;
  readonly bars: readonly PatternBar[];
  readonly dataCutoffAt: Date;
}

export interface PatternEvidencePoint {
  readonly time: Date;
  readonly price: number;
  readonly role: string;
}

export interface PatternDetection {
  readonly patternCode: string;
  readonly patternVersion: number;
  readonly algorithmVersion: string;
  readonly instrumentId: string;
  readonly timeframe: IndicatorTimeframe;
  readonly adjustmentMode: AdjustmentMode;
  readonly state: PatternState;
  readonly direction: PatternDirection;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly detectedAt: Date;
  readonly evidencePoints: readonly PatternEvidencePoint[];
  readonly breakoutLevel: number | null;
  readonly invalidationLevel: number | null;
  readonly volumeConfirmation: boolean | null;
  readonly confidence: number | null;
  readonly dataCutoffAt: Date;
  readonly warnings: readonly string[];
  readonly deduplicationKey: string;
}

export type PatternDetectionCore = Omit<
  PatternDetection,
  | 'patternCode'
  | 'patternVersion'
  | 'algorithmVersion'
  | 'instrumentId'
  | 'timeframe'
  | 'adjustmentMode'
  | 'dataCutoffAt'
  | 'deduplicationKey'
>;

export interface PatternNotEvaluable {
  readonly patternCode: string;
  readonly patternVersion: number;
  readonly status: 'not_evaluable';
  readonly reasonCode:
    | 'INPUT_TOO_SHORT'
    | 'INPUT_INVALID'
    | 'MISSING_VOLUME'
    | 'NO_MATCH';
  readonly warnings: readonly string[];
}

export interface PatternSchema<T> {
  readonly metadata: Readonly<Record<string, unknown>>;
  parse(value: unknown): T;
}

export interface PatternDefinition<P> {
  readonly code: string;
  readonly version: number;
  readonly algorithmVersion: string;
  readonly category: PatternCategory;
  readonly parameterSchema: PatternSchema<P>;
  readonly minimumInput: number;
  readonly requiredFields: readonly PatternRequiredField[];
  readonly evidenceSchema: Readonly<Record<string, unknown>>;
  readonly confirmationPolicy: Readonly<Record<string, unknown>>;
  readonly invalidationPolicy: Readonly<Record<string, unknown>>;
  detect(input: PatternInput, parameters: P): PatternDetectionCore | null;
}

export interface PatternExecutionRequest {
  readonly code: string;
  readonly version: number;
  readonly parameters?: unknown;
}

export type PatternExecutionResult =
  | { readonly status: 'detected'; readonly detection: PatternDetection }
  | PatternNotEvaluable;
