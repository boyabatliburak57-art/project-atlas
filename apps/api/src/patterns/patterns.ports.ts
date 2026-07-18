export const PATTERN_READ_MODEL = Symbol('PATTERN_READ_MODEL');

export interface PatternInstanceView {
  readonly id: string;
  readonly instrumentId: string;
  readonly symbol: string;
  readonly timeframe: string;
  readonly adjustmentMode: string;
  readonly code: string;
  readonly version: number;
  readonly algorithmVersion: string;
  readonly state: string;
  readonly direction: string;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly detectedAt: Date;
  readonly confirmedAt: Date | null;
  readonly invalidatedAt: Date | null;
  readonly dataCutoffAt: Date;
  readonly confidence: string | null;
  readonly evidence: Readonly<Record<string, unknown>>;
  readonly warnings: readonly Readonly<Record<string, unknown>>[];
}

export interface PatternReadModel {
  catalog(): Promise<readonly Readonly<Record<string, unknown>>[]>;
  symbolId(
    normalizedSymbol: string,
  ): Promise<{ id: string; symbol: string } | null>;
  list(input: {
    instrumentId?: string;
    timeframe: string;
    adjustmentMode: string;
    state?: string;
    limit: number;
  }): Promise<readonly PatternInstanceView[]>;
}
