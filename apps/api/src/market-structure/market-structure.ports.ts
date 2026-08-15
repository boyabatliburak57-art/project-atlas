export const MARKET_STRUCTURE_READER = Symbol('MARKET_STRUCTURE_READER');

export type MeasureType =
  | 'SHORT_SELL_RESTRICTION'
  | 'MARGIN_TRADING_RESTRICTION'
  | 'GROSS_SETTLEMENT'
  | 'SINGLE_PRICE'
  | 'ORDER_PACKAGE_MEASURE'
  | 'OTHER_EXCHANGE_MEASURE';
export type MeasureStatus =
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'CORRECTED'
  | 'SUPERSEDED'
  | 'CANCELLED';

export interface MeasureQuery {
  readonly symbol: string | null;
  readonly types: readonly MeasureType[];
  readonly statuses: readonly MeasureStatus[];
  readonly from: Date;
  readonly to: Date;
  readonly availableAt: Date;
  readonly limit: number;
  readonly cursor: {
    readonly publishedAt: Date;
    readonly revisionId: string;
  } | null;
  readonly mode: 'ACTIVE' | 'HISTORY' | 'MARKET_WIDE';
}

export interface MarketStructureReader {
  measures(query: MeasureQuery): Promise<readonly Record<string, unknown>[]>;
  shortSelling(input: {
    readonly symbol: string;
    readonly from: string;
    readonly to: string;
    readonly limit: number;
  }): Promise<readonly Record<string, unknown>[]>;
  capability(
    capability:
      | 'marketMeasure.restrictions'
      | 'marketMeasure.shortSelling'
      | 'marketMeasure.history',
  ): Promise<{
    readonly availability: string;
    readonly health: string;
    readonly checkedAt: Date | null;
  }>;
}
