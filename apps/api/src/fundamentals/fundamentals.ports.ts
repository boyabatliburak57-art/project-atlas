import type { NormalizedFundamentalStatement } from '@atlas/domain';

export const FUNDAMENTALS_READER = Symbol('FUNDAMENTALS_READER');

export interface FundamentalsReadModel {
  readonly instrumentId: string;
  readonly symbol: string;
  readonly currencyCode: string;
  readonly statements: readonly NormalizedFundamentalStatement[];
  readonly latestMarketData: {
    readonly price: string;
    readonly dataCutoffAt: Date;
    readonly currencyCode: string;
  } | null;
}

export interface FundamentalsReader {
  read(normalizedSymbol: string): Promise<FundamentalsReadModel | null>;
}
