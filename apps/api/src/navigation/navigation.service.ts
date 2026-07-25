import { createHmac, timingSafeEqual } from 'node:crypto';

import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

import { NavigationRepository } from './navigation.repository';

const SEARCH_TYPES = [
  'instrument',
  'watchlist',
  'saved_scan',
  'portfolio',
  'strategy',
  'backtest',
  'experiment',
] as const;
const searchSchema = z
  .object({
    q: z.string().trim().min(2).max(80),
    types: z.string().max(160).optional(),
    cursor: z.string().max(512).optional(),
    limit: z.coerce.number().int().min(1).max(25).default(10),
  })
  .strict();
const activitySchema = z
  .object({
    cursor: z.string().max(512).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

@Injectable()
export class NavigationService {
  private readonly cursorKey: string;

  constructor(
    private readonly repository: NavigationRepository,
    config: ConfigService,
  ) {
    this.cursorKey = config.getOrThrow<string>('AUTH_SESSION_HMAC_KEY');
  }

  async search(userId: string, input: Record<string, unknown>) {
    const query = parse(searchSchema, input);
    const types = parseTypes(query.types);
    const context = `search:${userId}:${query.q}:${types.join(',')}`;
    const offset =
      query.cursor === undefined
        ? 0
        : this.decode<{ offset: number }>(query.cursor, context).offset;
    const rows = await this.repository.search(
      userId,
      query.q,
      types,
      offset,
      query.limit + 1,
    );
    const hasMore = rows.length > query.limit;
    return {
      items: rows.slice(0, query.limit).map((row) => ({
        ...row,
        highlight: highlight(row.title, query.q),
      })),
      nextCursor: hasMore
        ? this.encode({ offset: offset + query.limit }, context)
        : null,
    };
  }

  async activity(userId: string, input: Record<string, unknown>) {
    const query = parse(activitySchema, input);
    const context = `activity:${userId}`;
    const cursor =
      query.cursor === undefined
        ? null
        : this.decode<{ occurredAt: string; id: string }>(
            query.cursor,
            context,
          );
    const rows = await this.repository.activity(
      userId,
      cursor === null
        ? null
        : { occurredAt: new Date(cursor.occurredAt), id: cursor.id },
      query.limit + 1,
    );
    const hasMore = rows.length > query.limit;
    const items = rows.slice(0, query.limit);
    const last = items.at(-1);
    return {
      items: items.map(({ metadata, ...row }) => ({
        ...row,
        metadata: sanitizeMetadata(metadata),
      })),
      nextCursor:
        hasMore && last !== undefined
          ? this.encode(
              { occurredAt: last.occurredAt.toISOString(), id: last.id },
              context,
            )
          : null,
    };
  }

  private encode(value: object, context: string): string {
    const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
    const signature = createHmac('sha256', this.cursorKey)
      .update(`${context}.${payload}`)
      .digest('base64url');
    return `${payload}.${signature}`;
  }

  private decode<T>(cursor: string, context: string): T {
    const [payload, signature, extra] = cursor.split('.');
    if (payload === undefined || signature === undefined || extra !== undefined)
      throw invalidCursor();
    const expected = createHmac('sha256', this.cursorKey)
      .update(`${context}.${payload}`)
      .digest();
    const supplied = Buffer.from(signature, 'base64url');
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    )
      throw invalidCursor();
    try {
      return JSON.parse(Buffer.from(payload, 'base64url').toString()) as T;
    } catch {
      throw invalidCursor();
    }
  }
}

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new BadRequestException({
      code: 'INVALID_NAVIGATION_QUERY',
      message: 'Search or activity query is invalid',
    });
  return result.data;
}

function parseTypes(value: string | undefined): readonly string[] {
  if (value === undefined || value.trim() === '') return SEARCH_TYPES;
  const types = [...new Set(value.split(',').map((item) => item.trim()))];
  if (
    types.length === 0 ||
    types.some((type) => !SEARCH_TYPES.includes(type as never))
  )
    throw new BadRequestException({
      code: 'INVALID_SEARCH_TYPE',
      message: 'Search type is invalid',
    });
  return types;
}

function highlight(title: string, query: string) {
  const index = title
    .toLocaleLowerCase('tr-TR')
    .indexOf(query.toLocaleLowerCase('tr-TR'));
  if (index < 0) return [{ text: title, matched: false }];
  return [
    { text: title.slice(0, index), matched: false },
    { text: title.slice(index, index + query.length), matched: true },
    { text: title.slice(index + query.length), matched: false },
  ].filter(({ text }) => text.length > 0);
}

function sanitizeMetadata(value: Record<string, unknown>) {
  const forbidden = /token|secret|password|authorization|cookie|connection/iu;
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !forbidden.test(key)),
  );
}

function invalidCursor() {
  return new BadRequestException({
    code: 'INVALID_CURSOR',
    message: 'Cursor is invalid for this request',
  });
}
