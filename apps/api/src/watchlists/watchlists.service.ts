import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  WatchlistError,
  type WatchlistItem,
  type WatchlistWithItems,
} from '@atlas/domain';
import { z } from 'zod';

import type {
  AddWatchlistItemDto,
  CreateWatchlistDto,
  ReorderWatchlistItemsDto,
  UpdateWatchlistDto,
  UpdateWatchlistItemDto,
  WatchlistDto,
  WatchlistMarketSummaryItemDto,
  WatchlistMarketSummaryQueryDto,
  WatchlistsQueryDto,
} from './watchlists.dto';
import {
  WATCHLIST_APPLICATION,
  WATCHLIST_MARKET_SUMMARY_READER,
  type WatchlistCommands,
  type WatchlistItemCursor,
  type WatchlistListCursor,
  type WatchlistMarketSummaryPageItem,
  type WatchlistMarketSummaryReader,
} from './watchlists.ports';

const uuidSchema = z.uuid();
const createSchema = z
  .object({
    name: z.string(),
    description: z.string().nullable().optional(),
  })
  .strict();
const updateSchema = z
  .object({
    name: z.string().optional(),
    description: z.string().nullable().optional(),
  })
  .strict();
const addItemSchema = z
  .object({
    instrumentId: z.uuid(),
    note: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
  })
  .strict();
const updateItemSchema = z
  .object({
    note: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
  })
  .strict();
const reorderSchema = z
  .object({ itemIds: z.array(z.uuid()).max(500) })
  .strict();
const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().min(1).max(1_024).optional(),
  includeDeleted: z.enum(['true', 'false']).default('false'),
});
const summaryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().min(1).max(1_024).optional(),
});
const listCursorSchema = z.object({
  updatedAt: z.iso.datetime({ offset: true }),
  id: z.uuid(),
});
const itemCursorSchema = z.object({
  sortOrder: z.number().int().min(0),
  itemId: z.uuid(),
});

@Injectable()
export class WatchlistsService {
  private readonly staleAfterMs: number;

  constructor(
    @Inject(WATCHLIST_APPLICATION)
    private readonly watchlists: WatchlistCommands,
    @Inject(WATCHLIST_MARKET_SUMMARY_READER)
    private readonly marketSummaryReader: WatchlistMarketSummaryReader,
    config: ConfigService,
  ) {
    this.staleAfterMs = config.getOrThrow<number>(
      'WATCHLIST_MARKET_DATA_STALE_AFTER_MS',
    );
  }

  async list(userId: string, query: WatchlistsQueryDto) {
    const parsed = listQuerySchema.safeParse(query);
    if (!parsed.success) throw invalidRequest(parsed.error);
    const cursor =
      parsed.data.cursor === undefined
        ? undefined
        : decodeCursor(parsed.data.cursor, listCursorSchema);
    const all = [
      ...(await this.watchlists.list(
        userId,
        parsed.data.includeDeleted === 'true',
      )),
    ].sort(compareWatchlists);
    const remaining =
      cursor === undefined
        ? all
        : all.filter((watchlist) => afterListCursor(watchlist, cursor));
    const selected = remaining.slice(0, parsed.data.limit + 1);
    const hasNext = selected.length > parsed.data.limit;
    const page = hasNext ? selected.slice(0, parsed.data.limit) : selected;
    const last = page.at(-1);
    return {
      items: page.map(toDto),
      nextCursor:
        hasNext && last !== undefined
          ? encodeCursor({
              updatedAt: last.updatedAt.toISOString(),
              id: last.id,
            } satisfies WatchlistListCursor)
          : null,
    };
  }

  async get(userId: string, rawId: string): Promise<WatchlistDto> {
    return this.execute(async () =>
      toDto(await this.watchlists.get(userId, id(rawId))),
    );
  }

  async create(
    userId: string,
    body: CreateWatchlistDto,
  ): Promise<WatchlistDto> {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) throw invalidRequest(parsed.error);
    return this.execute(async () =>
      toDto(await this.watchlists.create({ userId, ...parsed.data })),
    );
  }

  async update(
    userId: string,
    rawId: string,
    body: UpdateWatchlistDto,
  ): Promise<WatchlistDto> {
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) throw invalidRequest(parsed.error);
    return this.execute(async () =>
      toDto(
        await this.watchlists.update({
          userId,
          id: id(rawId),
          ...parsed.data,
        }),
      ),
    );
  }

  async delete(userId: string, rawId: string): Promise<WatchlistDto> {
    return this.execute(async () =>
      toDto(await this.watchlists.delete(userId, id(rawId))),
    );
  }

  async restore(userId: string, rawId: string): Promise<WatchlistDto> {
    return this.execute(async () =>
      toDto(await this.watchlists.restore(userId, id(rawId))),
    );
  }

  async addItem(
    userId: string,
    rawId: string,
    body: AddWatchlistItemDto,
  ): Promise<WatchlistDto> {
    const parsed = addItemSchema.safeParse(body);
    if (!parsed.success) throw invalidRequest(parsed.error);
    return this.execute(async () =>
      toDto(
        await this.watchlists.addItem({
          userId,
          watchlistId: id(rawId),
          ...parsed.data,
        }),
      ),
    );
  }

  async updateItem(
    userId: string,
    rawId: string,
    rawItemId: string,
    body: UpdateWatchlistItemDto,
  ): Promise<WatchlistDto> {
    const parsed = updateItemSchema.safeParse(body);
    if (!parsed.success) throw invalidRequest(parsed.error);
    return this.execute(async () =>
      toDto(
        await this.watchlists.updateItem({
          userId,
          watchlistId: id(rawId),
          itemId: id(rawItemId),
          ...parsed.data,
        }),
      ),
    );
  }

  async removeItem(
    userId: string,
    rawId: string,
    rawItemId: string,
  ): Promise<WatchlistDto> {
    return this.execute(async () =>
      toDto(await this.watchlists.removeItem(userId, id(rawId), id(rawItemId))),
    );
  }

  async reorder(
    userId: string,
    rawId: string,
    body: ReorderWatchlistItemsDto,
  ): Promise<WatchlistDto> {
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) throw invalidRequest(parsed.error);
    return this.execute(async () =>
      toDto(
        await this.watchlists.reorder(userId, id(rawId), parsed.data.itemIds),
      ),
    );
  }

  async marketSummary(
    userId: string,
    rawId: string,
    query: WatchlistMarketSummaryQueryDto,
  ) {
    const parsed = summaryQuerySchema.safeParse(query);
    if (!parsed.success) throw invalidRequest(parsed.error);
    const watchlistId = id(rawId);
    const cursor =
      parsed.data.cursor === undefined
        ? undefined
        : decodeCursor(parsed.data.cursor, itemCursorSchema);
    const optimizedPage = await this.execute(
      () =>
        this.marketSummaryReader.readPage?.({
          userId,
          watchlistId,
          cursor,
          limit: parsed.data.limit,
        }) ?? Promise.resolve(undefined),
    );
    let page: readonly WatchlistMarketSummaryPageItem[];
    let hasNext: boolean;
    if (optimizedPage === undefined) {
      const watchlist = await this.execute(() =>
        this.watchlists.get(userId, watchlistId),
      );
      if (watchlist.status === 'deleted') {
        throw mapError(new WatchlistError('WATCHLIST_DELETED'));
      }
      const ordered = [...watchlist.items].sort(compareItems);
      const remaining =
        cursor === undefined
          ? ordered
          : ordered.filter((item) => afterItemCursor(item, cursor));
      const selected = remaining.slice(0, parsed.data.limit + 1);
      hasNext = selected.length > parsed.data.limit;
      page = hasNext ? selected.slice(0, parsed.data.limit) : selected;
    } else {
      page = optimizedPage.items;
      hasNext = optimizedPage.hasNext;
    }
    const dataCutoffAt = new Date();
    const values =
      page.length === 0
        ? []
        : await this.marketSummaryReader.read({
            userId,
            watchlistId,
            instrumentIds: page.map(({ instrumentId }) => instrumentId),
            dataCutoffAt,
          });
    const byInstrument = new Map(
      values.map((value) => [value.instrumentId, value]),
    );
    const items = page.map((item): WatchlistMarketSummaryItemDto => {
      const value = byInstrument.get(item.instrumentId);
      if (value === undefined) {
        throw new Error('Watchlist market summary invariant failed');
      }
      return {
        instrumentId: value.instrumentId,
        symbol: value.symbol,
        company: value.company,
        lastPrice: value.lastPrice,
        dailyChangePercent: value.dailyChangePercent,
        volume: value.volume,
        relativeVolume: value.relativeVolume,
        dataTime: value.dataTime?.toISOString() ?? null,
        stale:
          value.dataTime === null ||
          dataCutoffAt.getTime() - value.dataTime.getTime() > this.staleAfterMs,
        activeAlertCount: value.activeAlertCount,
      };
    });
    const last = page.at(-1);
    return {
      items,
      nextCursor:
        hasNext && last !== undefined
          ? encodeCursor({
              sortOrder: last.sortOrder,
              itemId: last.id,
            } satisfies WatchlistItemCursor)
          : null,
      dataCutoffAt: dataCutoffAt.toISOString(),
      staleAfterMs: this.staleAfterMs,
    };
  }

  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error: unknown) {
      if (error instanceof WatchlistError) throw mapError(error);
      throw error;
    }
  }
}

function id(value: string): string {
  const parsed = uuidSchema.safeParse(value);
  if (!parsed.success) throw invalidRequest(parsed.error);
  return parsed.data;
}

function toDto(watchlist: WatchlistWithItems): WatchlistDto {
  return {
    id: watchlist.id,
    ownerUserId: watchlist.ownerUserId,
    name: watchlist.name,
    description: watchlist.description,
    visibility: 'private',
    status: watchlist.status,
    items: [...watchlist.items].sort(compareItems).map((item) => ({
      id: item.id,
      instrumentId: item.instrumentId,
      note: item.note,
      tags: item.tags,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    createdAt: watchlist.createdAt.toISOString(),
    updatedAt: watchlist.updatedAt.toISOString(),
    deletedAt: watchlist.deletedAt?.toISOString() ?? null,
  };
}

function compareWatchlists(
  left: WatchlistWithItems,
  right: WatchlistWithItems,
): number {
  return (
    right.updatedAt.getTime() - left.updatedAt.getTime() ||
    compareIds(left.id, right.id)
  );
}

function afterListCursor(
  watchlist: WatchlistWithItems,
  cursor: WatchlistListCursor,
): boolean {
  const updatedAt = watchlist.updatedAt.toISOString();
  return (
    updatedAt < cursor.updatedAt ||
    (updatedAt === cursor.updatedAt && watchlist.id > cursor.id)
  );
}

function compareItems(left: WatchlistItem, right: WatchlistItem): number {
  return left.sortOrder - right.sortOrder || compareIds(left.id, right.id);
}

function afterItemCursor(
  item: WatchlistItem,
  cursor: WatchlistItemCursor,
): boolean {
  return (
    item.sortOrder > cursor.sortOrder ||
    (item.sortOrder === cursor.sortOrder && item.id > cursor.itemId)
  );
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function encodeCursor(cursor: unknown): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

function decodeCursor<T>(value: string, schema: z.ZodType<T>): T {
  try {
    return schema.parse(
      JSON.parse(Buffer.from(value, 'base64url').toString('utf8')),
    );
  } catch {
    throw new BadRequestException({
      code: 'WATCHLIST_CURSOR_INVALID',
      message: 'Invalid watchlist cursor',
    });
  }
}

function invalidRequest(error?: z.ZodError) {
  return new BadRequestException({
    code: 'WATCHLIST_INVALID',
    message: 'Invalid watchlist request',
    ...(error === undefined
      ? {}
      : {
          details: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            reason: issue.message,
          })),
        }),
  });
}

function mapError(error: WatchlistError) {
  const payload = {
    code: error.code,
    message: message(error.code),
    ...(error.details === undefined ? {} : { details: error.details }),
  };
  if (
    error.code === 'WATCHLIST_NOT_FOUND' ||
    error.code === 'WATCHLIST_ITEM_NOT_FOUND'
  ) {
    return new NotFoundException(payload);
  }
  if (error.code === 'WATCHLIST_ACCESS_DENIED') {
    return new ForbiddenException(payload);
  }
  if (
    error.code === 'WATCHLIST_ITEM_EXISTS' ||
    error.code === 'WATCHLIST_CONFLICT' ||
    error.code === 'WATCHLIST_DELETED'
  ) {
    return new ConflictException(payload);
  }
  if (error.code === 'WATCHLIST_LIMIT_REACHED') {
    return new HttpException(payload, HttpStatus.TOO_MANY_REQUESTS);
  }
  return new BadRequestException(payload);
}

function message(code: string): string {
  return (
    {
      WATCHLIST_NOT_FOUND: 'Watchlist was not found',
      WATCHLIST_ACCESS_DENIED: 'Access to watchlist was denied',
      WATCHLIST_DELETED: 'Watchlist is deleted',
      WATCHLIST_CONFLICT: 'Watchlist update conflict',
      WATCHLIST_INVALID: 'Invalid watchlist request',
      WATCHLIST_ITEM_NOT_FOUND: 'Watchlist item was not found',
      WATCHLIST_ITEM_EXISTS: 'Instrument already exists in watchlist',
      WATCHLIST_LIMIT_REACHED: 'Watchlist quota was exceeded',
      WATCHLIST_UNIVERSE_EMPTY: 'Watchlist universe is empty',
    }[code] ?? 'Watchlist request could not be processed'
  );
}
