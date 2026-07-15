export type WatchlistErrorCode =
  | 'WATCHLIST_NOT_FOUND'
  | 'WATCHLIST_ACCESS_DENIED'
  | 'WATCHLIST_DELETED'
  | 'WATCHLIST_CONFLICT'
  | 'WATCHLIST_INVALID'
  | 'WATCHLIST_ITEM_NOT_FOUND'
  | 'WATCHLIST_ITEM_EXISTS'
  | 'WATCHLIST_LIMIT_REACHED'
  | 'WATCHLIST_UNIVERSE_EMPTY';

export class WatchlistError extends Error {
  override readonly name = 'WatchlistError';

  constructor(
    readonly code: WatchlistErrorCode,
    readonly details?: unknown,
  ) {
    super(code);
  }
}
