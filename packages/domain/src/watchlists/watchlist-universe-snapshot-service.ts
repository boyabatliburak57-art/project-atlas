import type {
  WatchlistUniverseSnapshot,
  WatchlistUniverseSnapshotDependencies,
} from './contracts.js';
import { WatchlistError } from './errors.js';

export class WatchlistUniverseSnapshotService {
  private readonly now: () => Date;

  constructor(
    private readonly dependencies: WatchlistUniverseSnapshotDependencies,
  ) {
    this.now = dependencies.now ?? (() => new Date());
  }

  async resolve(
    userId: string,
    watchlistId: string,
  ): Promise<WatchlistUniverseSnapshot> {
    const watchlist = await this.dependencies.repository.findById(watchlistId);
    if (watchlist === null) throw new WatchlistError('WATCHLIST_NOT_FOUND');
    if (watchlist.ownerUserId !== userId) {
      throw new WatchlistError('WATCHLIST_ACCESS_DENIED');
    }
    if (watchlist.status === 'deleted') {
      throw new WatchlistError('WATCHLIST_DELETED');
    }
    if (watchlist.items.length === 0) {
      throw new WatchlistError('WATCHLIST_UNIVERSE_EMPTY');
    }

    const instrumentIds = Object.freeze(
      [...watchlist.items]
        .sort(
          (left, right) =>
            left.sortOrder - right.sortOrder ||
            (left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
        )
        .map(({ instrumentId }) => instrumentId),
    );
    return Object.freeze({
      type: 'watchlist' as const,
      watchlistId,
      instrumentIds,
      resolvedAt: this.now().toISOString(),
    });
  }
}
