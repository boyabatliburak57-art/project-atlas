export type WatchlistStatus = 'active' | 'deleted';

export interface WatchlistItem {
  readonly id: string;
  readonly watchlistId: string;
  readonly instrumentId: string;
  readonly note: string | null;
  readonly tags: readonly string[];
  readonly sortOrder: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface Watchlist {
  readonly id: string;
  readonly ownerUserId: string;
  readonly name: string;
  readonly description: string | null;
  readonly visibility: 'private';
  readonly status: WatchlistStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
}

export interface WatchlistWithItems extends Watchlist {
  readonly items: readonly WatchlistItem[];
}

export interface NewWatchlist {
  readonly ownerUserId: string;
  readonly name: string;
  readonly description: string | null;
  readonly now: Date;
}

export interface UpdateWatchlistMetadata {
  readonly id: string;
  readonly ownerUserId: string;
  readonly name: string;
  readonly description: string | null;
  readonly now: Date;
}

export interface NewWatchlistItem {
  readonly watchlistId: string;
  readonly instrumentId: string;
  readonly note: string | null;
  readonly tags: readonly string[];
  readonly now: Date;
}

export interface UpdateWatchlistItem {
  readonly watchlistId: string;
  readonly itemId: string;
  readonly note: string | null;
  readonly tags: readonly string[];
  readonly now: Date;
}

export type AddWatchlistItemResult =
  | {
      readonly outcome: 'created';
      readonly watchlist: WatchlistWithItems;
    }
  | { readonly outcome: 'duplicate' }
  | { readonly outcome: 'conflict' };

export type ChangeWatchlistResult =
  | {
      readonly outcome: 'updated';
      readonly watchlist: WatchlistWithItems;
    }
  | { readonly outcome: 'conflict' };

export interface WatchlistRepository {
  listOwned(
    ownerUserId: string,
    includeDeleted: boolean,
  ): Promise<readonly WatchlistWithItems[]>;
  findById(id: string): Promise<WatchlistWithItems | null>;
  create(input: NewWatchlist): Promise<WatchlistWithItems>;
  updateMetadata(
    input: UpdateWatchlistMetadata,
  ): Promise<ChangeWatchlistResult>;
  softDelete(
    id: string,
    ownerUserId: string,
    now: Date,
  ): Promise<ChangeWatchlistResult>;
  restore(
    id: string,
    ownerUserId: string,
    now: Date,
  ): Promise<ChangeWatchlistResult>;
  addItem(input: NewWatchlistItem): Promise<AddWatchlistItemResult>;
  updateItem(input: UpdateWatchlistItem): Promise<ChangeWatchlistResult>;
  removeItem(input: {
    readonly watchlistId: string;
    readonly itemId: string;
    readonly now: Date;
  }): Promise<ChangeWatchlistResult>;
  reorderItems(input: {
    readonly watchlistId: string;
    readonly orderedItemIds: readonly string[];
    readonly now: Date;
  }): Promise<ChangeWatchlistResult>;
}

export type WatchlistQuotaOperation = 'create' | 'add_item' | 'restore';

export interface WatchlistQuotaPort {
  check(input: {
    readonly userId: string;
    readonly operation: WatchlistQuotaOperation;
    readonly watchlistId?: string | undefined;
    readonly instrumentId?: string | undefined;
  }): Promise<{
    readonly allowed: boolean;
    readonly reasonCode?: string | undefined;
  }>;
}

export interface WatchlistApplicationDependencies {
  readonly repository: WatchlistRepository;
  readonly quota: WatchlistQuotaPort;
  readonly now?: (() => Date) | undefined;
}

export interface WatchlistUniverseSnapshot {
  readonly type: 'watchlist';
  readonly watchlistId: string;
  readonly instrumentIds: readonly string[];
  readonly resolvedAt: string;
}

export interface WatchlistUniverseSnapshotDependencies {
  readonly repository: WatchlistRepository;
  readonly now?: (() => Date) | undefined;
}
