import type { Server } from 'node:http';

import { UnauthorizedException, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  WatchlistApplicationService,
  type AddWatchlistItemResult,
  type ChangeWatchlistResult,
  type NewWatchlist,
  type NewWatchlistItem,
  type UpdateWatchlistItem,
  type UpdateWatchlistMetadata,
  type WatchlistItem,
  type WatchlistRepository,
  type WatchlistWithItems,
} from '@atlas/domain';
import type { Request } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../app.module';
import { configureApplication } from '../bootstrap/configure-application';
import {
  AUTHENTICATED_USER_RESOLVER,
  type AuthenticatedUserResolver,
} from '../common/auth/authenticated-user';
import {
  WATCHLIST_APPLICATION,
  WATCHLIST_MARKET_SUMMARY_READER,
  type WatchlistMarketSummaryReader,
} from './watchlists.ports';

const ownerId = '00000000-0000-4000-8000-000000001201';
const otherId = '00000000-0000-4000-8000-000000001202';
const instrumentIds = [
  '00000000-0000-4000-8000-000000001301',
  '00000000-0000-4000-8000-000000001302',
  '00000000-0000-4000-8000-000000001303',
] as const;
let sequence = 1_400;

function nextId(): string {
  sequence += 1;
  return `00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`;
}

class MemoryWatchlistRepository implements WatchlistRepository {
  readonly data = new Map<string, WatchlistWithItems>();

  listOwned(ownerUserId: string, includeDeleted: boolean) {
    return Promise.resolve(
      [...this.data.values()].filter(
        (watchlist) =>
          watchlist.ownerUserId === ownerUserId &&
          (includeDeleted || watchlist.status === 'active'),
      ),
    );
  }

  findById(id: string) {
    return Promise.resolve(this.data.get(id) ?? null);
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
    this.data.set(watchlist.id, watchlist);
    return Promise.resolve(watchlist);
  }

  updateMetadata(input: UpdateWatchlistMetadata) {
    return Promise.resolve(
      this.change(input.id, (watchlist) =>
        watchlist.ownerUserId === input.ownerUserId &&
        watchlist.status === 'active'
          ? {
              ...watchlist,
              name: input.name,
              description: input.description,
              updatedAt: input.now,
            }
          : null,
      ),
    );
  }

  softDelete(id: string, ownerUserId: string, now: Date) {
    return Promise.resolve(
      this.change(id, (watchlist) =>
        watchlist.ownerUserId === ownerUserId && watchlist.status === 'active'
          ? {
              ...watchlist,
              status: 'deleted',
              deletedAt: now,
              updatedAt: now,
            }
          : null,
      ),
    );
  }

  restore(id: string, ownerUserId: string, now: Date) {
    return Promise.resolve(
      this.change(id, (watchlist) =>
        watchlist.ownerUserId === ownerUserId && watchlist.status === 'deleted'
          ? {
              ...watchlist,
              status: 'active',
              deletedAt: null,
              updatedAt: now,
            }
          : null,
      ),
    );
  }

  addItem(input: NewWatchlistItem): Promise<AddWatchlistItemResult> {
    const current = this.data.get(input.watchlistId);
    if (current === undefined || current.status !== 'active') {
      return Promise.resolve({ outcome: 'conflict' });
    }
    if (
      current.items.some(
        ({ instrumentId }) => instrumentId === input.instrumentId,
      )
    ) {
      return Promise.resolve({ outcome: 'duplicate' });
    }
    const item: WatchlistItem = {
      id: nextId(),
      watchlistId: current.id,
      instrumentId: input.instrumentId,
      note: input.note,
      tags: [...input.tags],
      sortOrder: current.items.length,
      createdAt: input.now,
      updatedAt: input.now,
    };
    const watchlist = {
      ...current,
      items: [...current.items, item],
      updatedAt: input.now,
    };
    this.data.set(current.id, watchlist);
    return Promise.resolve({ outcome: 'created', watchlist });
  }

  updateItem(input: UpdateWatchlistItem) {
    return Promise.resolve(
      this.change(input.watchlistId, (watchlist) => {
        if (watchlist.status !== 'active') return null;
        const item = watchlist.items.find(({ id }) => id === input.itemId);
        if (item === undefined) return null;
        return {
          ...watchlist,
          items: watchlist.items.map((candidate) =>
            candidate.id === input.itemId
              ? {
                  ...candidate,
                  note: input.note,
                  tags: [...input.tags],
                  updatedAt: input.now,
                }
              : candidate,
          ),
          updatedAt: input.now,
        };
      }),
    );
  }

  removeItem(input: { watchlistId: string; itemId: string; now: Date }) {
    return Promise.resolve(
      this.change(input.watchlistId, (watchlist) => {
        if (
          watchlist.status !== 'active' ||
          !watchlist.items.some(({ id }) => id === input.itemId)
        ) {
          return null;
        }
        return {
          ...watchlist,
          items: watchlist.items
            .filter(({ id }) => id !== input.itemId)
            .map((item, sortOrder) => ({ ...item, sortOrder })),
          updatedAt: input.now,
        };
      }),
    );
  }

  reorderItems(input: {
    watchlistId: string;
    orderedItemIds: readonly string[];
    now: Date;
  }) {
    return Promise.resolve(
      this.change(input.watchlistId, (watchlist) => {
        const byId = new Map(watchlist.items.map((item) => [item.id, item]));
        if (
          watchlist.status !== 'active' ||
          input.orderedItemIds.length !== watchlist.items.length ||
          new Set(input.orderedItemIds).size !== watchlist.items.length ||
          input.orderedItemIds.some((id) => !byId.has(id))
        ) {
          return null;
        }
        return {
          ...watchlist,
          items: input.orderedItemIds.map((id, sortOrder) => ({
            ...byId.get(id)!,
            sortOrder,
            updatedAt: input.now,
          })),
          updatedAt: input.now,
        };
      }),
    );
  }

  private change(
    id: string,
    update: (watchlist: WatchlistWithItems) => WatchlistWithItems | null,
  ): ChangeWatchlistResult {
    const current = this.data.get(id);
    if (current === undefined) return { outcome: 'conflict' };
    const updated = update(current);
    if (updated === null) return { outcome: 'conflict' };
    this.data.set(id, updated);
    return { outcome: 'updated', watchlist: updated };
  }
}

class FixtureMarketSummaryReader implements WatchlistMarketSummaryReader {
  readonly calls: Array<Parameters<WatchlistMarketSummaryReader['read']>[0]> =
    [];

  read(input: Parameters<WatchlistMarketSummaryReader['read']>[0]) {
    this.calls.push(input);
    return Promise.resolve(
      input.instrumentIds.map((instrumentId) => {
        const index = instrumentIds.indexOf(
          instrumentId as (typeof instrumentIds)[number],
        );
        return {
          instrumentId,
          symbol: `SYM${index + 1}`,
          company: `Company ${index + 1}`,
          lastPrice: `${100 + index}.000000`,
          dailyChangePercent: `${index + 1}.250000`,
          volume: `${1_000_000 + index}`,
          relativeVolume: `${1 + index / 10}`,
          dataTime: new Date(
            input.dataCutoffAt.getTime() - (index === 1 ? 129_600_001 : 1_000),
          ),
          activeAlertCount: index + 1,
        };
      }),
    );
  }
}

function server(application: INestApplication): Server {
  return application.getHttpServer() as Server;
}

describe('Watchlist API', () => {
  const repository = new MemoryWatchlistRepository();
  const reader = new FixtureMarketSummaryReader();
  let tick = 0;
  const applicationService = new WatchlistApplicationService({
    repository,
    quota: { check: () => Promise.resolve({ allowed: true }) },
    now: () => new Date(Date.UTC(2026, 6, 15, 18, 0, 0, tick++)),
  });
  const testUserResolver: AuthenticatedUserResolver = (
    httpRequest: Request,
  ) => {
    const userId = httpRequest.get('x-test-user-id');
    if (userId === undefined) {
      throw new UnauthorizedException({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication is required',
      });
    }
    return userId;
  };
  let application: INestApplication;
  let watchlistId: string;
  let itemIds: string[];

  beforeAll(async () => {
    const moduleReference = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AUTHENTICATED_USER_RESOLVER)
      .useValue(testUserResolver)
      .overrideProvider(WATCHLIST_APPLICATION)
      .useValue(applicationService)
      .overrideProvider(WATCHLIST_MARKET_SUMMARY_READER)
      .useValue(reader)
      .compile();
    application = moduleReference.createNestApplication();
    configureApplication(application);
    await application.init();
  });

  afterAll(async () => application.close());

  it('creates, updates and cursor-paginates owned watchlists', async () => {
    const created: string[] = [];
    for (const name of ['Primary', 'Secondary', 'Tertiary']) {
      const response = await request(server(application))
        .post('/api/v1/watchlists')
        .set('x-test-user-id', ownerId)
        .send({ name })
        .expect(201);
      created.push((response.body as { data: { id: string } }).data.id);
    }
    watchlistId = created[0]!;

    const first = await request(server(application))
      .get('/api/v1/watchlists?limit=2')
      .set('x-test-user-id', ownerId)
      .expect(200);
    const firstBody = first.body as {
      data: { items: Array<{ id: string }> };
      meta: { nextCursor: string | null };
    };
    expect(firstBody.data.items).toHaveLength(2);
    expect(firstBody.meta.nextCursor).toEqual(expect.any(String));

    const second = await request(server(application))
      .get(
        `/api/v1/watchlists?limit=2&cursor=${String(firstBody.meta.nextCursor)}`,
      )
      .set('x-test-user-id', ownerId)
      .expect(200);
    expect(second.body).toMatchObject({
      data: { items: [{ id: created[0] }] },
      meta: { nextCursor: null },
    });

    const updated = await request(server(application))
      .patch(`/api/v1/watchlists/${watchlistId}`)
      .set('x-test-user-id', ownerId)
      .send({ description: 'Long-term portfolio' })
      .expect(200);
    expect(updated.body).toMatchObject({
      data: { id: watchlistId, description: 'Long-term portfolio' },
    });

    const invalidCursor = await request(server(application))
      .get('/api/v1/watchlists?cursor=invalid')
      .set('x-test-user-id', ownerId)
      .expect(400);
    expect(invalidCursor.body).toMatchObject({
      error: { code: 'WATCHLIST_CURSOR_INVALID' },
    });
  });

  it('manages items, rejects duplicate instruments and blocks note XSS', async () => {
    itemIds = [];
    for (const instrumentId of instrumentIds) {
      const response = await request(server(application))
        .post(`/api/v1/watchlists/${watchlistId}/items`)
        .set('x-test-user-id', ownerId)
        .send({ instrumentId })
        .expect(201);
      const items = (
        response.body as { data: { items: Array<{ id: string }> } }
      ).data.items;
      itemIds = items.map(({ id }) => id);
    }

    const duplicate = await request(server(application))
      .post(`/api/v1/watchlists/${watchlistId}/items`)
      .set('x-test-user-id', ownerId)
      .send({ instrumentId: instrumentIds[0] })
      .expect(409);
    expect(duplicate.body).toMatchObject({
      error: { code: 'WATCHLIST_ITEM_EXISTS' },
    });

    const xss = await request(server(application))
      .patch(`/api/v1/watchlists/${watchlistId}/items/${itemIds[0]}`)
      .set('x-test-user-id', ownerId)
      .send({ note: '<script>alert(1)</script>' })
      .expect(400);
    expect(xss.body).toMatchObject({
      error: { code: 'WATCHLIST_INVALID', details: { field: 'note' } },
    });

    const reordered = await request(server(application))
      .post(`/api/v1/watchlists/${watchlistId}/reorder`)
      .set('x-test-user-id', ownerId)
      .send({ itemIds: [...itemIds].reverse() })
      .expect(200);
    expect(
      (
        reordered.body as { data: { items: Array<{ id: string }> } }
      ).data.items.map(({ id }) => id),
    ).toEqual([...itemIds].reverse());
    itemIds.reverse();
  });

  it('enforces ownership and prevents IDOR before market-data access', async () => {
    await request(server(application))
      .get(`/api/v1/watchlists/${watchlistId}`)
      .set('x-test-user-id', otherId)
      .expect(403);
    await request(server(application))
      .post(`/api/v1/watchlists/${watchlistId}/items`)
      .set('x-test-user-id', otherId)
      .send({ instrumentId: '00000000-0000-4000-8000-000000001399' })
      .expect(403);
    const readsBefore = reader.calls.length;
    const denied = await request(server(application))
      .get(`/api/v1/watchlists/${watchlistId}/market-summary`)
      .set('x-test-user-id', otherId)
      .expect(403);
    expect(denied.body).toMatchObject({
      error: { code: 'WATCHLIST_ACCESS_DENIED' },
    });
    expect(reader.calls).toHaveLength(readsBefore);
  });

  it('paginates market summary with cutoff and fresh/stale metadata', async () => {
    const first = await request(server(application))
      .get(`/api/v1/watchlists/${watchlistId}/market-summary?limit=2`)
      .set('x-test-user-id', ownerId)
      .expect(200);
    const body = first.body as {
      data: {
        items: Array<{
          instrumentId: string;
          stale: boolean;
          activeAlertCount: number;
          lastPrice: string;
        }>;
      };
      meta: {
        nextCursor: string | null;
        dataCutoffAt: string;
        staleAfterMs: number;
      };
    };
    expect(body.data.items).toHaveLength(2);
    expect(body.data.items.map(({ stale }) => stale)).toEqual([false, true]);
    expect(body.data.items[0]).toMatchObject({
      instrumentId: instrumentIds[2],
      lastPrice: '102.000000',
      activeAlertCount: 3,
    });
    expect(typeof body.meta.nextCursor).toBe('string');
    expect(Number.isNaN(Date.parse(body.meta.dataCutoffAt))).toBe(false);
    expect(body.meta.staleAfterMs).toBe(129_600_000);

    const second = await request(server(application))
      .get(
        `/api/v1/watchlists/${watchlistId}/market-summary?limit=2&cursor=${String(body.meta.nextCursor)}`,
      )
      .set('x-test-user-id', ownerId)
      .expect(200);
    expect(second.body).toMatchObject({
      data: {
        items: [{ instrumentId: instrumentIds[0], stale: false }],
      },
      meta: { nextCursor: null },
    });
    const lastReaderCall = reader.calls.at(-1);
    expect(lastReaderCall).toMatchObject({
      userId: ownerId,
      watchlistId,
      instrumentIds: [instrumentIds[0]],
    });
    expect(lastReaderCall?.dataCutoffAt).toBeInstanceOf(Date);
  });

  it('applies deleted watchlist policy and restores the resource', async () => {
    await request(server(application))
      .delete(`/api/v1/watchlists/${watchlistId}`)
      .set('x-test-user-id', ownerId)
      .expect(200);
    const deletedSummary = await request(server(application))
      .get(`/api/v1/watchlists/${watchlistId}/market-summary`)
      .set('x-test-user-id', ownerId)
      .expect(409);
    expect(deletedSummary.body).toMatchObject({
      error: { code: 'WATCHLIST_DELETED' },
    });
    await request(server(application))
      .post(`/api/v1/watchlists/${watchlistId}/items`)
      .set('x-test-user-id', ownerId)
      .send({ instrumentId: '00000000-0000-4000-8000-000000001399' })
      .expect(409);

    const activeList = await request(server(application))
      .get('/api/v1/watchlists?limit=100')
      .set('x-test-user-id', ownerId)
      .expect(200);
    expect(
      (activeList.body as { data: { items: Array<{ id: string }> } }).data
        .items,
    ).not.toContainEqual(expect.objectContaining({ id: watchlistId }));
    const deletedList = await request(server(application))
      .get('/api/v1/watchlists?limit=100&includeDeleted=true')
      .set('x-test-user-id', ownerId)
      .expect(200);
    expect(
      (deletedList.body as { data: { items: Array<{ id: string }> } }).data
        .items,
    ).toContainEqual(
      expect.objectContaining({ id: watchlistId, status: 'deleted' }),
    );

    const restored = await request(server(application))
      .post(`/api/v1/watchlists/${watchlistId}/restore`)
      .set('x-test-user-id', ownerId)
      .expect(200);
    expect(restored.body).toMatchObject({
      data: { id: watchlistId, status: 'active', deletedAt: null },
    });
  });
});
