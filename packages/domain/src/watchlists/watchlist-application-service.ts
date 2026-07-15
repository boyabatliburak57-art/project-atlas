import type {
  ChangeWatchlistResult,
  WatchlistApplicationDependencies,
  WatchlistQuotaOperation,
  WatchlistWithItems,
} from './contracts.js';
import { WatchlistError } from './errors.js';
import {
  normalizeWatchlistDescription,
  normalizeWatchlistName,
  normalizeWatchlistNote,
  normalizeWatchlistTags,
} from './normalization.js';

export interface CreateWatchlistRequest {
  readonly userId: string;
  readonly name: string;
  readonly description?: string | null | undefined;
}

export interface UpdateWatchlistRequest {
  readonly userId: string;
  readonly id: string;
  readonly name?: string | undefined;
  readonly description?: string | null | undefined;
}

export interface AddWatchlistItemRequest {
  readonly userId: string;
  readonly watchlistId: string;
  readonly instrumentId: string;
  readonly note?: string | null | undefined;
  readonly tags?: readonly string[] | undefined;
}

export interface UpdateWatchlistItemRequest {
  readonly userId: string;
  readonly watchlistId: string;
  readonly itemId: string;
  readonly note?: string | null | undefined;
  readonly tags?: readonly string[] | undefined;
}

export class WatchlistApplicationService {
  private readonly now: () => Date;

  constructor(private readonly dependencies: WatchlistApplicationDependencies) {
    this.now = dependencies.now ?? (() => new Date());
  }

  list(userId: string, includeDeleted = false) {
    return this.dependencies.repository.listOwned(userId, includeDeleted);
  }

  get(userId: string, id: string): Promise<WatchlistWithItems> {
    return this.requireOwned(userId, id);
  }

  async create(request: CreateWatchlistRequest): Promise<WatchlistWithItems> {
    await this.checkQuota(request.userId, 'create');
    return this.dependencies.repository.create({
      ownerUserId: request.userId,
      name: normalizeWatchlistName(request.name),
      description: normalizeWatchlistDescription(request.description),
      now: this.now(),
    });
  }

  async update(request: UpdateWatchlistRequest): Promise<WatchlistWithItems> {
    const existing = await this.requireActive(request.userId, request.id);
    const result = await this.dependencies.repository.updateMetadata({
      id: existing.id,
      ownerUserId: request.userId,
      name:
        request.name === undefined
          ? existing.name
          : normalizeWatchlistName(request.name),
      description:
        request.description === undefined
          ? existing.description
          : normalizeWatchlistDescription(request.description),
      now: this.now(),
    });
    return changed(result);
  }

  async delete(userId: string, id: string): Promise<WatchlistWithItems> {
    const existing = await this.requireOwned(userId, id);
    if (existing.status === 'deleted') return existing;
    return changed(
      await this.dependencies.repository.softDelete(id, userId, this.now()),
    );
  }

  async restore(userId: string, id: string): Promise<WatchlistWithItems> {
    const existing = await this.requireOwned(userId, id);
    if (existing.status === 'active') return existing;
    await this.checkQuota(userId, 'restore', id);
    return changed(
      await this.dependencies.repository.restore(id, userId, this.now()),
    );
  }

  async addItem(request: AddWatchlistItemRequest): Promise<WatchlistWithItems> {
    const instrumentId = normalizeIdentifier(
      request.instrumentId,
      'instrumentId',
    );
    const note = normalizeWatchlistNote(request.note);
    const tags = normalizeWatchlistTags(request.tags);
    const existing = await this.requireActive(
      request.userId,
      request.watchlistId,
    );
    if (existing.items.some((item) => item.instrumentId === instrumentId)) {
      throw new WatchlistError('WATCHLIST_ITEM_EXISTS');
    }
    await this.checkQuota(
      request.userId,
      'add_item',
      request.watchlistId,
      instrumentId,
    );
    const result = await this.dependencies.repository.addItem({
      watchlistId: request.watchlistId,
      instrumentId,
      note,
      tags,
      now: this.now(),
    });
    if (result.outcome === 'duplicate') {
      throw new WatchlistError('WATCHLIST_ITEM_EXISTS');
    }
    if (result.outcome === 'conflict') {
      throw new WatchlistError('WATCHLIST_CONFLICT');
    }
    return result.watchlist;
  }

  async updateItem(
    request: UpdateWatchlistItemRequest,
  ): Promise<WatchlistWithItems> {
    const existing = await this.requireActive(
      request.userId,
      request.watchlistId,
    );
    const item = existing.items.find(({ id }) => id === request.itemId);
    if (item === undefined)
      throw new WatchlistError('WATCHLIST_ITEM_NOT_FOUND');
    const result = await this.dependencies.repository.updateItem({
      watchlistId: request.watchlistId,
      itemId: request.itemId,
      note:
        request.note === undefined
          ? item.note
          : normalizeWatchlistNote(request.note),
      tags:
        request.tags === undefined
          ? item.tags
          : normalizeWatchlistTags(request.tags),
      now: this.now(),
    });
    return changed(result);
  }

  async removeItem(
    userId: string,
    watchlistId: string,
    itemId: string,
  ): Promise<WatchlistWithItems> {
    const existing = await this.requireActive(userId, watchlistId);
    if (!existing.items.some(({ id }) => id === itemId)) {
      throw new WatchlistError('WATCHLIST_ITEM_NOT_FOUND');
    }
    return changed(
      await this.dependencies.repository.removeItem({
        watchlistId,
        itemId,
        now: this.now(),
      }),
    );
  }

  async reorder(
    userId: string,
    watchlistId: string,
    orderedItemIds: readonly string[],
  ): Promise<WatchlistWithItems> {
    const existing = await this.requireActive(userId, watchlistId);
    assertExactItemSet(existing, orderedItemIds);
    return changed(
      await this.dependencies.repository.reorderItems({
        watchlistId,
        orderedItemIds: [...orderedItemIds],
        now: this.now(),
      }),
    );
  }

  private async requireOwned(
    userId: string,
    id: string,
  ): Promise<WatchlistWithItems> {
    const watchlist = await this.dependencies.repository.findById(id);
    if (watchlist === null) throw new WatchlistError('WATCHLIST_NOT_FOUND');
    if (watchlist.ownerUserId !== userId) {
      throw new WatchlistError('WATCHLIST_ACCESS_DENIED');
    }
    return watchlist;
  }

  private async requireActive(
    userId: string,
    id: string,
  ): Promise<WatchlistWithItems> {
    const watchlist = await this.requireOwned(userId, id);
    if (watchlist.status === 'deleted') {
      throw new WatchlistError('WATCHLIST_DELETED');
    }
    return watchlist;
  }

  private async checkQuota(
    userId: string,
    operation: WatchlistQuotaOperation,
    watchlistId?: string,
    instrumentId?: string,
  ): Promise<void> {
    const result = await this.dependencies.quota.check({
      userId,
      operation,
      ...(watchlistId === undefined ? {} : { watchlistId }),
      ...(instrumentId === undefined ? {} : { instrumentId }),
    });
    if (!result.allowed) {
      throw new WatchlistError('WATCHLIST_LIMIT_REACHED', {
        reasonCode: result.reasonCode ?? 'LIMIT_EXCEEDED',
      });
    }
  }
}

function changed(result: ChangeWatchlistResult): WatchlistWithItems {
  if (result.outcome === 'conflict') {
    throw new WatchlistError('WATCHLIST_CONFLICT');
  }
  return result.watchlist;
}

function assertExactItemSet(
  watchlist: WatchlistWithItems,
  orderedItemIds: readonly string[],
): void {
  const uniqueIds = new Set(orderedItemIds);
  const currentIds = new Set(watchlist.items.map(({ id }) => id));
  if (
    uniqueIds.size !== orderedItemIds.length ||
    uniqueIds.size !== currentIds.size ||
    [...uniqueIds].some((id) => !currentIds.has(id))
  ) {
    throw new WatchlistError('WATCHLIST_INVALID', { field: 'orderedItemIds' });
  }
}

function normalizeIdentifier(value: string, field: string): string {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > 160) {
    throw new WatchlistError('WATCHLIST_INVALID', { field });
  }
  return normalized;
}
