import {
  alertRevisions,
  alerts,
  instruments,
  type Database,
  watchlistItems,
  watchlistItemTags,
  watchlists,
} from '@atlas/database';
import {
  WatchlistApplicationService,
  type AddWatchlistItemResult,
  type ChangeWatchlistResult,
  type NewWatchlist,
  type NewWatchlistItem,
  type UpdateWatchlistItem,
  type UpdateWatchlistMetadata,
  type Watchlist,
  type WatchlistRepository,
  type WatchlistWithItems,
} from '@atlas/domain';
import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';

import { ApiDatabase } from '../scanner/scanner-runtime.infrastructure';
import type {
  WatchlistMarketSummaryReader,
  WatchlistMarketSummaryValue,
} from './watchlists.ports';

type WatchlistRow = typeof watchlists.$inferSelect;
type ItemRow = typeof watchlistItems.$inferSelect;

@Injectable()
export class PostgresWatchlistRepository implements WatchlistRepository {
  constructor(private readonly connection: ApiDatabase) {}

  async listOwned(
    ownerUserId: string,
    includeDeleted: boolean,
  ): Promise<readonly WatchlistWithItems[]> {
    const rows = await this.connection.database
      .select()
      .from(watchlists)
      .where(
        includeDeleted
          ? eq(watchlists.ownerUserId, ownerUserId)
          : and(
              eq(watchlists.ownerUserId, ownerUserId),
              ne(watchlists.status, 'deleted'),
            ),
      )
      .orderBy(desc(watchlists.updatedAt), asc(watchlists.id));
    return this.loadAggregates(rows);
  }

  async findById(id: string): Promise<WatchlistWithItems | null> {
    const rows = await this.connection.database
      .select()
      .from(watchlists)
      .where(eq(watchlists.id, id))
      .limit(1);
    return (await this.loadAggregates(rows))[0] ?? null;
  }

  async create(input: NewWatchlist): Promise<WatchlistWithItems> {
    const row = (
      await this.connection.database
        .insert(watchlists)
        .values({
          ownerUserId: input.ownerUserId,
          name: input.name,
          description: input.description,
          visibility: 'private',
          status: 'active',
          createdAt: input.now,
          updatedAt: input.now,
        })
        .returning()
    )[0];
    if (row === undefined) throw new Error('Watchlist insert invariant failed');
    return aggregate(row, [], []);
  }

  async updateMetadata(
    input: UpdateWatchlistMetadata,
  ): Promise<ChangeWatchlistResult> {
    const row = (
      await this.connection.database
        .update(watchlists)
        .set({
          name: input.name,
          description: input.description,
          updatedAt: input.now,
        })
        .where(
          and(
            eq(watchlists.id, input.id),
            eq(watchlists.ownerUserId, input.ownerUserId),
            eq(watchlists.status, 'active'),
          ),
        )
        .returning({ id: watchlists.id })
    )[0];
    return row === undefined ? { outcome: 'conflict' } : this.updated(row.id);
  }

  async softDelete(
    id: string,
    ownerUserId: string,
    now: Date,
  ): Promise<ChangeWatchlistResult> {
    const row = (
      await this.connection.database
        .update(watchlists)
        .set({ status: 'deleted', deletedAt: now, updatedAt: now })
        .where(
          and(
            eq(watchlists.id, id),
            eq(watchlists.ownerUserId, ownerUserId),
            eq(watchlists.status, 'active'),
          ),
        )
        .returning({ id: watchlists.id })
    )[0];
    return row === undefined ? { outcome: 'conflict' } : this.updated(row.id);
  }

  async restore(
    id: string,
    ownerUserId: string,
    now: Date,
  ): Promise<ChangeWatchlistResult> {
    const row = (
      await this.connection.database
        .update(watchlists)
        .set({ status: 'active', deletedAt: null, updatedAt: now })
        .where(
          and(
            eq(watchlists.id, id),
            eq(watchlists.ownerUserId, ownerUserId),
            eq(watchlists.status, 'deleted'),
          ),
        )
        .returning({ id: watchlists.id })
    )[0];
    return row === undefined ? { outcome: 'conflict' } : this.updated(row.id);
  }

  async addItem(input: NewWatchlistItem): Promise<AddWatchlistItemResult> {
    try {
      const outcome = await this.connection.database.transaction(
        async (transaction) => {
          const parent = (
            await transaction
              .update(watchlists)
              .set({ updatedAt: input.now })
              .where(
                and(
                  eq(watchlists.id, input.watchlistId),
                  eq(watchlists.status, 'active'),
                ),
              )
              .returning({ id: watchlists.id })
          )[0];
          if (parent === undefined) return 'conflict' as const;
          const maximum = await transaction
            .select({
              value: sql<number>`coalesce(max(${watchlistItems.sortOrder}), -1)`,
            })
            .from(watchlistItems)
            .where(eq(watchlistItems.watchlistId, input.watchlistId));
          const item = (
            await transaction
              .insert(watchlistItems)
              .values({
                watchlistId: input.watchlistId,
                instrumentId: input.instrumentId,
                note: input.note,
                sortOrder: Number(maximum[0]?.value ?? -1) + 1,
                createdAt: input.now,
                updatedAt: input.now,
              })
              .returning({ id: watchlistItems.id })
          )[0];
          if (item === undefined)
            throw new Error('Watchlist item insert invariant failed');
          await insertTags(transaction, item.id, input.tags, input.now);
          return 'created' as const;
        },
      );
      if (outcome === 'conflict') return { outcome };
      const watchlist = await this.findById(input.watchlistId);
      if (watchlist === null)
        throw new Error('Watchlist aggregate invariant failed');
      return { outcome: 'created', watchlist };
    } catch (error: unknown) {
      if (databaseErrorCode(error) === '23505') return { outcome: 'duplicate' };
      throw error;
    }
  }

  async updateItem(input: UpdateWatchlistItem): Promise<ChangeWatchlistResult> {
    const updated = await this.connection.database.transaction(
      async (transaction) => {
        const parent = await lockActiveWatchlist(
          transaction,
          input.watchlistId,
          input.now,
        );
        if (!parent) return false;
        const item = (
          await transaction
            .update(watchlistItems)
            .set({ note: input.note, updatedAt: input.now })
            .where(
              and(
                eq(watchlistItems.id, input.itemId),
                eq(watchlistItems.watchlistId, input.watchlistId),
              ),
            )
            .returning({ id: watchlistItems.id })
        )[0];
        if (item === undefined) return false;
        await transaction
          .delete(watchlistItemTags)
          .where(eq(watchlistItemTags.watchlistItemId, input.itemId));
        await insertTags(transaction, input.itemId, input.tags, input.now);
        return true;
      },
    );
    return updated ? this.updated(input.watchlistId) : { outcome: 'conflict' };
  }

  async removeItem(input: {
    readonly watchlistId: string;
    readonly itemId: string;
    readonly now: Date;
  }): Promise<ChangeWatchlistResult> {
    const updated = await this.connection.database.transaction(
      async (transaction) => {
        const parent = await lockActiveWatchlist(
          transaction,
          input.watchlistId,
          input.now,
        );
        if (!parent) return false;
        const removed = await transaction
          .delete(watchlistItems)
          .where(
            and(
              eq(watchlistItems.id, input.itemId),
              eq(watchlistItems.watchlistId, input.watchlistId),
            ),
          )
          .returning({ id: watchlistItems.id });
        if (removed.length === 0) return false;
        const remaining = await transaction
          .select({ id: watchlistItems.id })
          .from(watchlistItems)
          .where(eq(watchlistItems.watchlistId, input.watchlistId))
          .orderBy(asc(watchlistItems.sortOrder), asc(watchlistItems.id));
        await Promise.all(
          remaining.map(({ id }, sortOrder) =>
            transaction
              .update(watchlistItems)
              .set({ sortOrder, updatedAt: input.now })
              .where(eq(watchlistItems.id, id)),
          ),
        );
        return true;
      },
    );
    return updated ? this.updated(input.watchlistId) : { outcome: 'conflict' };
  }

  async reorderItems(input: {
    readonly watchlistId: string;
    readonly orderedItemIds: readonly string[];
    readonly now: Date;
  }): Promise<ChangeWatchlistResult> {
    const updated = await this.connection.database.transaction(
      async (transaction) => {
        const parent = await lockActiveWatchlist(
          transaction,
          input.watchlistId,
          input.now,
        );
        if (!parent) return false;
        const current = await transaction
          .select({ id: watchlistItems.id })
          .from(watchlistItems)
          .where(eq(watchlistItems.watchlistId, input.watchlistId));
        const currentIds = new Set(current.map(({ id }) => id));
        if (
          currentIds.size !== input.orderedItemIds.length ||
          new Set(input.orderedItemIds).size !== currentIds.size ||
          input.orderedItemIds.some((id) => !currentIds.has(id))
        ) {
          return false;
        }
        await Promise.all(
          input.orderedItemIds.map((id, sortOrder) =>
            transaction
              .update(watchlistItems)
              .set({ sortOrder, updatedAt: input.now })
              .where(eq(watchlistItems.id, id)),
          ),
        );
        return true;
      },
    );
    return updated ? this.updated(input.watchlistId) : { outcome: 'conflict' };
  }

  private async updated(id: string): Promise<ChangeWatchlistResult> {
    const watchlist = await this.findById(id);
    if (watchlist === null)
      throw new Error('Watchlist aggregate invariant failed');
    return { outcome: 'updated', watchlist };
  }

  private async loadAggregates(
    rows: readonly WatchlistRow[],
  ): Promise<readonly WatchlistWithItems[]> {
    if (rows.length === 0) return [];
    const watchlistIds = rows.map(({ id }) => id);
    const items = await this.connection.database
      .select()
      .from(watchlistItems)
      .where(inArray(watchlistItems.watchlistId, watchlistIds))
      .orderBy(asc(watchlistItems.sortOrder), asc(watchlistItems.id));
    const itemIds = items.map(({ id }) => id);
    const tags =
      itemIds.length === 0
        ? []
        : await this.connection.database
            .select()
            .from(watchlistItemTags)
            .where(inArray(watchlistItemTags.watchlistItemId, itemIds))
            .orderBy(asc(watchlistItemTags.tag));
    return rows.map((row) =>
      aggregate(
        row,
        items.filter(({ watchlistId }) => watchlistId === row.id),
        tags,
      ),
    );
  }
}

@Injectable()
export class PostgresWatchlistMarketSummaryReader implements WatchlistMarketSummaryReader {
  constructor(private readonly connection: ApiDatabase) {}

  async read(input: {
    readonly userId: string;
    readonly watchlistId: string;
    readonly instrumentIds: readonly string[];
    readonly dataCutoffAt: Date;
  }): Promise<readonly WatchlistMarketSummaryValue[]> {
    if (input.instrumentIds.length === 0) return [];
    const result = await this.connection.database.execute<{
      instrument_id: string;
      symbol: string;
      company: string;
      last_price: string | null;
      daily_change_percent: string | null;
      volume: string | null;
      relative_volume: string | null;
      data_time: Date | null;
      active_alert_count: string;
    }>(sql`
      with canonical_bars as (
        select distinct on (pb.instrument_id, pb.open_time)
          pb.id,
          pb.instrument_id,
          pb.open_time,
          pb.close_time,
          pb.close,
          pb.volume,
          pb.revision,
          pb.ingested_at
        from price_bars pb
        where pb.instrument_id = any(${input.instrumentIds}::uuid[])
          and pb.timeframe = '1d'
          and pb.is_closed = true
          and pb.quality_status in ('accepted', 'corrected')
          and pb.close_time <= ${input.dataCutoffAt}
        order by pb.instrument_id, pb.open_time,
          pb.revision desc, pb.ingested_at desc, pb.id desc
      ), ranked_bars as (
        select *, row_number() over (
          partition by instrument_id
          order by close_time desc, open_time desc, id desc
        ) as row_number
        from canonical_bars
      ), market_values as (
        select
          instrument_id,
          max(close) filter (where row_number = 1) as last_price,
          max(close) filter (where row_number = 2) as previous_close,
          max(volume) filter (where row_number = 1) as volume,
          avg(volume) filter (where row_number between 2 and 21) as average_volume,
          max(close_time) filter (where row_number = 1) as data_time
        from ranked_bars
        where row_number <= 21
        group by instrument_id
      )
      select
        i.id as instrument_id,
        i.symbol,
        i.name as company,
        mv.last_price::text as last_price,
        case
          when mv.previous_close is null or mv.previous_close = 0 then null
          else round(((mv.last_price - mv.previous_close) / mv.previous_close) * 100, 6)::text
        end as daily_change_percent,
        mv.volume::text as volume,
        case
          when mv.average_volume is null or mv.average_volume = 0 then null
          else round(mv.volume / mv.average_volume, 6)::text
        end as relative_volume,
        mv.data_time,
        (
          select count(distinct a.id)::text
          from ${alerts} a
          join ${alertRevisions} ar
            on ar.alert_id = a.id and ar.revision = a.current_revision
          where a.owner_user_id = ${input.userId}
            and a.status = 'active'
            and (ar.instrument_id = i.id or ar.watchlist_id = ${input.watchlistId})
        ) as active_alert_count
      from ${instruments} i
      left join market_values mv on mv.instrument_id = i.id
      where i.id = any(${input.instrumentIds}::uuid[])
    `);
    return result.rows.map((row) => ({
      instrumentId: row.instrument_id,
      symbol: row.symbol,
      company: row.company,
      lastPrice: row.last_price,
      dailyChangePercent: row.daily_change_percent,
      volume: row.volume,
      relativeVolume: row.relative_volume,
      dataTime: row.data_time === null ? null : new Date(row.data_time),
      activeAlertCount: Number(row.active_alert_count),
    }));
  }
}

export function createWatchlistApplication(
  repository: PostgresWatchlistRepository,
): WatchlistApplicationService {
  return new WatchlistApplicationService({
    repository,
    quota: { check: () => Promise.resolve({ allowed: true }) },
  });
}

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

async function lockActiveWatchlist(
  transaction: Transaction,
  watchlistId: string,
  now: Date,
): Promise<boolean> {
  const rows = await transaction
    .update(watchlists)
    .set({ updatedAt: now })
    .where(and(eq(watchlists.id, watchlistId), eq(watchlists.status, 'active')))
    .returning({ id: watchlists.id });
  return rows.length > 0;
}

async function insertTags(
  transaction: Transaction,
  watchlistItemId: string,
  tags: readonly string[],
  now: Date,
): Promise<void> {
  if (tags.length === 0) return;
  await transaction.insert(watchlistItemTags).values(
    tags.map((tag) => ({
      watchlistItemId,
      tag,
      createdAt: now,
    })),
  );
}

function aggregate(
  row: WatchlistRow,
  items: readonly ItemRow[],
  tags: readonly (typeof watchlistItemTags.$inferSelect)[],
): WatchlistWithItems {
  return {
    ...mapWatchlist(row),
    items: items.map((item) => ({
      id: item.id,
      watchlistId: item.watchlistId,
      instrumentId: item.instrumentId,
      note: item.note,
      tags: tags
        .filter(({ watchlistItemId }) => watchlistItemId === item.id)
        .map(({ tag }) => tag),
      sortOrder: item.sortOrder,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
  };
}

function mapWatchlist(row: WatchlistRow): Watchlist {
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    name: row.name,
    description: row.description,
    visibility: 'private',
    status: row.status as Watchlist['status'],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

function databaseErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  return typeof error.code === 'string' ? error.code : undefined;
}
