import type {
  WatchlistApplicationService,
  WatchlistWithItems,
} from '@atlas/domain';

export const WATCHLIST_APPLICATION = Symbol('WATCHLIST_APPLICATION');
export const WATCHLIST_MARKET_SUMMARY_READER = Symbol(
  'WATCHLIST_MARKET_SUMMARY_READER',
);

export type WatchlistCommands = Pick<
  WatchlistApplicationService,
  | 'list'
  | 'get'
  | 'create'
  | 'update'
  | 'delete'
  | 'restore'
  | 'addItem'
  | 'updateItem'
  | 'removeItem'
  | 'reorder'
>;

export interface WatchlistMarketSummaryValue {
  readonly instrumentId: string;
  readonly symbol: string;
  readonly company: string;
  readonly lastPrice: string | null;
  readonly dailyChangePercent: string | null;
  readonly volume: string | null;
  readonly relativeVolume: string | null;
  readonly dataTime: Date | null;
  readonly activeAlertCount: number;
}

export interface WatchlistMarketSummaryReader {
  read(input: {
    readonly userId: string;
    readonly watchlistId: string;
    readonly instrumentIds: readonly string[];
    readonly dataCutoffAt: Date;
  }): Promise<readonly WatchlistMarketSummaryValue[]>;
}

export interface WatchlistListCursor {
  readonly updatedAt: string;
  readonly id: string;
}

export interface WatchlistItemCursor {
  readonly sortOrder: number;
  readonly itemId: string;
}

export interface WatchlistPage {
  readonly items: readonly WatchlistWithItems[];
  readonly nextCursor: WatchlistListCursor | null;
}
