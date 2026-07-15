import { describe, expect, it, vi } from 'vitest';

import type {
  AddWatchlistItemResult,
  ChangeWatchlistResult,
  NewWatchlist,
  NewWatchlistItem,
  UpdateWatchlistItem,
  UpdateWatchlistMetadata,
  WatchlistItem,
  WatchlistQuotaOperation,
  WatchlistRepository,
  WatchlistWithItems,
} from './contracts.js';
import { WatchlistApplicationService } from './watchlist-application-service.js';
import { WatchlistUniverseSnapshotService } from './watchlist-universe-snapshot-service.js';

const ownerId = '00000000-0000-4000-8000-000000000201';
const otherId = '00000000-0000-4000-8000-000000000202';
const fixedNow = new Date('2026-07-15T18:00:00.000Z');
let sequence = 800;

function nextId(): string {
  sequence += 1;
  return `00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`;
}

class MemoryWatchlistRepository implements WatchlistRepository {
  readonly watchlists = new Map<string, WatchlistWithItems>();
  forceDuplicateOnNextAdd = false;

  listOwned(ownerUserId: string, includeDeleted: boolean) {
    return Promise.resolve(
      [...this.watchlists.values()].filter(
        (watchlist) =>
          watchlist.ownerUserId === ownerUserId &&
          (includeDeleted || watchlist.status === 'active'),
      ),
    );
  }

  findById(id: string) {
    return Promise.resolve(this.watchlists.get(id) ?? null);
  }

  create(input: NewWatchlist) {
    const watchlist: WatchlistWithItems = {
      id: nextId(),
      ownerUserId: input.ownerUserId,
      name: input.name,
      description: input.description,
      visibility: 'private',
      status: 'active',
      items: [],
      createdAt: input.now,
      updatedAt: input.now,
      deletedAt: null,
    };
    this.watchlists.set(watchlist.id, watchlist);
    return Promise.resolve(watchlist);
  }

  updateMetadata(input: UpdateWatchlistMetadata) {
    return Promise.resolve(
      this.changeActive(input.id, input.ownerUserId, (watchlist) => ({
        ...watchlist,
        name: input.name,
        description: input.description,
        updatedAt: input.now,
      })),
    );
  }

  softDelete(id: string, ownerUserId: string, now: Date) {
    const current = this.watchlists.get(id);
    if (
      current === undefined ||
      current.ownerUserId !== ownerUserId ||
      current.status !== 'active'
    ) {
      return Promise.resolve<ChangeWatchlistResult>({ outcome: 'conflict' });
    }
    return Promise.resolve(
      this.save({
        ...current,
        status: 'deleted',
        deletedAt: now,
        updatedAt: now,
      }),
    );
  }

  restore(id: string, ownerUserId: string, now: Date) {
    const current = this.watchlists.get(id);
    if (
      current === undefined ||
      current.ownerUserId !== ownerUserId ||
      current.status !== 'deleted'
    ) {
      return Promise.resolve<ChangeWatchlistResult>({ outcome: 'conflict' });
    }
    return Promise.resolve(
      this.save({
        ...current,
        status: 'active',
        deletedAt: null,
        updatedAt: now,
      }),
    );
  }

  addItem(input: NewWatchlistItem): Promise<AddWatchlistItemResult> {
    const current = this.watchlists.get(input.watchlistId);
    if (current === undefined || current.status !== 'active') {
      return Promise.resolve({ outcome: 'conflict' });
    }
    if (
      this.forceDuplicateOnNextAdd ||
      current.items.some(
        ({ instrumentId }) => instrumentId === input.instrumentId,
      )
    ) {
      this.forceDuplicateOnNextAdd = false;
      return Promise.resolve({ outcome: 'duplicate' });
    }
    const item: WatchlistItem = {
      id: nextId(),
      watchlistId: input.watchlistId,
      instrumentId: input.instrumentId,
      note: input.note,
      tags: [...input.tags],
      sortOrder: current.items.length,
      createdAt: input.now,
      updatedAt: input.now,
    };
    return Promise.resolve({
      outcome: 'created',
      watchlist: this.save({
        ...current,
        items: [...current.items, item],
        updatedAt: input.now,
      }).watchlist,
    });
  }

  updateItem(input: UpdateWatchlistItem) {
    return Promise.resolve(
      this.changeItems(input.watchlistId, input.now, (items) => {
        const item = items.find(({ id }) => id === input.itemId);
        if (item === undefined) return null;
        return items.map((candidate) =>
          candidate.id === input.itemId
            ? {
                ...candidate,
                note: input.note,
                tags: [...input.tags],
                updatedAt: input.now,
              }
            : candidate,
        );
      }),
    );
  }

  removeItem(input: { watchlistId: string; itemId: string; now: Date }) {
    return Promise.resolve(
      this.changeItems(input.watchlistId, input.now, (items) => {
        if (!items.some(({ id }) => id === input.itemId)) return null;
        return items
          .filter(({ id }) => id !== input.itemId)
          .map((item, sortOrder) => ({ ...item, sortOrder }));
      }),
    );
  }

  reorderItems(input: {
    watchlistId: string;
    orderedItemIds: readonly string[];
    now: Date;
  }) {
    return Promise.resolve(
      this.changeItems(input.watchlistId, input.now, (items) => {
        const byId = new Map(items.map((item) => [item.id, item]));
        if (
          input.orderedItemIds.length !== items.length ||
          new Set(input.orderedItemIds).size !== items.length ||
          input.orderedItemIds.some((id) => !byId.has(id))
        ) {
          return null;
        }
        return input.orderedItemIds.map((id, sortOrder) => ({
          ...byId.get(id)!,
          sortOrder,
          updatedAt: input.now,
        }));
      }),
    );
  }

  private changeActive(
    id: string,
    ownerUserId: string,
    update: (watchlist: WatchlistWithItems) => WatchlistWithItems,
  ): ChangeWatchlistResult {
    const current = this.watchlists.get(id);
    if (
      current === undefined ||
      current.ownerUserId !== ownerUserId ||
      current.status !== 'active'
    ) {
      return { outcome: 'conflict' };
    }
    return this.save(update(current));
  }

  private changeItems(
    watchlistId: string,
    now: Date,
    update: (
      items: readonly WatchlistItem[],
    ) => readonly WatchlistItem[] | null,
  ): ChangeWatchlistResult {
    const current = this.watchlists.get(watchlistId);
    if (current === undefined || current.status !== 'active') {
      return { outcome: 'conflict' };
    }
    const items = update(current.items);
    if (items === null) return { outcome: 'conflict' };
    return this.save({ ...current, items, updatedAt: now });
  }

  private save(watchlist: WatchlistWithItems): {
    outcome: 'updated';
    watchlist: WatchlistWithItems;
  } {
    this.watchlists.set(watchlist.id, watchlist);
    return { outcome: 'updated', watchlist };
  }
}

function setup(
  allowed: (operation: WatchlistQuotaOperation) => boolean = () => true,
) {
  const repository = new MemoryWatchlistRepository();
  const check = vi.fn((input: { operation: WatchlistQuotaOperation }) =>
    Promise.resolve({
      allowed: allowed(input.operation),
      ...(!allowed(input.operation) ? { reasonCode: 'TEST_LIMIT' } : {}),
    }),
  );
  const now = () => new Date(fixedNow);
  return {
    repository,
    check,
    service: new WatchlistApplicationService({
      repository,
      quota: { check },
      now,
    }),
    snapshots: new WatchlistUniverseSnapshotService({ repository, now }),
  };
}

async function createWithItems(
  count: number,
  context = setup(),
): Promise<{
  context: ReturnType<typeof setup>;
  watchlist: WatchlistWithItems;
}> {
  let watchlist = await context.service.create({
    userId: ownerId,
    name: 'Portfolio',
  });
  for (let index = 1; index <= count; index += 1) {
    watchlist = await context.service.addItem({
      userId: ownerId,
      watchlistId: watchlist.id,
      instrumentId: `instrument-${index}`,
    });
  }
  return { context, watchlist };
}

describe('WatchlistApplicationService', () => {
  it('supports owned CRUD with private visibility and same-name lists', async () => {
    const { service } = setup();
    const first = await service.create({
      userId: ownerId,
      name: '  Core BIST  ',
      description: '  Primary list  ',
    });
    const second = await service.create({
      userId: ownerId,
      name: 'Core BIST',
    });
    const updated = await service.update({
      userId: ownerId,
      id: first.id,
      description: 'Updated',
    });

    expect(updated).toMatchObject({
      name: 'Core BIST',
      description: 'Updated',
      visibility: 'private',
      status: 'active',
    });
    expect(second.id).not.toBe(first.id);
    expect(await service.list(ownerId)).toHaveLength(2);
  });

  it('enforces ownership for CRUD, items and universe resolution', async () => {
    const { service, snapshots } = setup();
    const watchlist = await service.create({
      userId: ownerId,
      name: 'Owned',
    });

    await expect(service.get(otherId, watchlist.id)).rejects.toMatchObject({
      code: 'WATCHLIST_ACCESS_DENIED',
    });
    await expect(
      service.addItem({
        userId: otherId,
        watchlistId: watchlist.id,
        instrumentId: 'instrument-1',
      }),
    ).rejects.toMatchObject({ code: 'WATCHLIST_ACCESS_DENIED' });
    await expect(
      snapshots.resolve(otherId, watchlist.id),
    ).rejects.toMatchObject({ code: 'WATCHLIST_ACCESS_DENIED' });
  });

  it('blocks duplicate instruments before and during repository races', async () => {
    const { service, repository } = setup();
    const watchlist = await service.create({
      userId: ownerId,
      name: 'Duplicates',
    });
    await service.addItem({
      userId: ownerId,
      watchlistId: watchlist.id,
      instrumentId: 'instrument-1',
    });
    await expect(
      service.addItem({
        userId: ownerId,
        watchlistId: watchlist.id,
        instrumentId: 'instrument-1',
      }),
    ).rejects.toMatchObject({ code: 'WATCHLIST_ITEM_EXISTS' });

    repository.forceDuplicateOnNextAdd = true;
    await expect(
      service.addItem({
        userId: ownerId,
        watchlistId: watchlist.id,
        instrumentId: 'instrument-2',
      }),
    ).rejects.toMatchObject({ code: 'WATCHLIST_ITEM_EXISTS' });
  });

  it('normalizes tags and rejects executable markup in notes', async () => {
    const { service } = setup();
    const watchlist = await service.create({
      userId: ownerId,
      name: 'Notes',
    });
    const withItem = await service.addItem({
      userId: ownerId,
      watchlistId: watchlist.id,
      instrumentId: 'instrument-1',
      note: '  Long-term candidate  ',
      tags: [' Momentum ', 'BIST', 'momentum'],
    });
    expect(withItem.items[0]).toMatchObject({
      note: 'Long-term candidate',
      tags: ['bist', 'momentum'],
    });

    await expect(
      service.updateItem({
        userId: ownerId,
        watchlistId: watchlist.id,
        itemId: withItem.items[0]!.id,
        note: '<img src=x onerror=alert(1)>',
      }),
    ).rejects.toMatchObject({
      code: 'WATCHLIST_INVALID',
      details: { field: 'note' },
    });
  });

  it('reorders the exact item set deterministically and rejects malformed orders', async () => {
    const { context, watchlist } = await createWithItems(3);
    const ids = watchlist.items.map(({ id }) => id);
    const reordered = await context.service.reorder(ownerId, watchlist.id, [
      ids[2]!,
      ids[0]!,
      ids[1]!,
    ]);
    expect(reordered.items.map(({ id }) => id)).toEqual([
      ids[2],
      ids[0],
      ids[1],
    ]);
    expect(reordered.items.map(({ sortOrder }) => sortOrder)).toEqual([
      0, 1, 2,
    ]);

    await expect(
      context.service.reorder(ownerId, watchlist.id, [ids[0]!, ids[0]!]),
    ).rejects.toMatchObject({ code: 'WATCHLIST_INVALID' });
    await expect(
      context.service.reorder(ownerId, watchlist.id, [
        ids[0]!,
        ids[1]!,
        'unknown',
      ]),
    ).rejects.toMatchObject({ code: 'WATCHLIST_INVALID' });
  });

  it('soft deletes, restores and blocks deleted list mutations and universes', async () => {
    const { context, watchlist } = await createWithItems(1);
    const deleted = await context.service.delete(ownerId, watchlist.id);
    expect(deleted).toMatchObject({ status: 'deleted', deletedAt: fixedNow });
    expect(await context.service.list(ownerId)).toEqual([]);
    expect(await context.service.list(ownerId, true)).toHaveLength(1);
    await expect(
      context.service.addItem({
        userId: ownerId,
        watchlistId: watchlist.id,
        instrumentId: 'instrument-2',
      }),
    ).rejects.toMatchObject({ code: 'WATCHLIST_DELETED' });
    await expect(
      context.snapshots.resolve(ownerId, watchlist.id),
    ).rejects.toMatchObject({ code: 'WATCHLIST_DELETED' });

    expect(await context.service.restore(ownerId, watchlist.id)).toMatchObject({
      status: 'active',
      deletedAt: null,
    });
  });

  it('uses the quota port for create, add-item and restore', async () => {
    const createDenied = setup((operation) => operation !== 'create');
    await expect(
      createDenied.service.create({ userId: ownerId, name: 'Denied' }),
    ).rejects.toMatchObject({
      code: 'WATCHLIST_LIMIT_REACHED',
      details: { reasonCode: 'TEST_LIMIT' },
    });

    const addDenied = setup((operation) => operation !== 'add_item');
    const watchlist = await addDenied.service.create({
      userId: ownerId,
      name: 'Item quota',
    });
    await expect(
      addDenied.service.addItem({
        userId: ownerId,
        watchlistId: watchlist.id,
        instrumentId: 'instrument-1',
      }),
    ).rejects.toMatchObject({ code: 'WATCHLIST_LIMIT_REACHED' });
    expect(addDenied.check).toHaveBeenCalledWith({
      userId: ownerId,
      operation: 'add_item',
      watchlistId: watchlist.id,
      instrumentId: 'instrument-1',
    });

    const restoreDenied = setup((operation) => operation !== 'restore');
    const deleted = await restoreDenied.service.create({
      userId: ownerId,
      name: 'Restore quota',
    });
    await restoreDenied.service.delete(ownerId, deleted.id);
    await expect(
      restoreDenied.service.restore(ownerId, deleted.id),
    ).rejects.toMatchObject({ code: 'WATCHLIST_LIMIT_REACHED' });
  });

  it('creates ordered snapshots that remain immutable after list changes', async () => {
    const { context, watchlist } = await createWithItems(3);
    const ids = watchlist.items.map(({ id }) => id);
    await context.service.reorder(ownerId, watchlist.id, [
      ids[2]!,
      ids[0]!,
      ids[1]!,
    ]);
    const snapshot = await context.snapshots.resolve(ownerId, watchlist.id);
    const snapshotIds = [...snapshot.instrumentIds];

    await context.service.removeItem(ownerId, watchlist.id, ids[2]!);

    expect(snapshot).toEqual({
      type: 'watchlist',
      watchlistId: watchlist.id,
      instrumentIds: snapshotIds,
      resolvedAt: fixedNow.toISOString(),
    });
    expect(snapshotIds).toEqual([
      'instrument-3',
      'instrument-1',
      'instrument-2',
    ]);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.instrumentIds)).toBe(true);
  });
});
