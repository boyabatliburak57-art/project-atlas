import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import {
  MARKET_RATE_LIMITER,
  type MarketRateLimiter,
} from '../market/market-overview.ports';
import {
  MARKET_STRUCTURE_READER,
  type MarketStructureReader,
  type MeasureStatus,
  type MeasureType,
} from './market-structure.ports';

const TYPES = [
  'SHORT_SELL_RESTRICTION',
  'MARGIN_TRADING_RESTRICTION',
  'GROSS_SETTLEMENT',
  'SINGLE_PRICE',
  'ORDER_PACKAGE_MEASURE',
  'OTHER_EXCHANGE_MEASURE',
] as const;
const STATUSES = [
  'SCHEDULED',
  'ACTIVE',
  'EXPIRED',
  'CORRECTED',
  'SUPERSEDED',
  'CANCELLED',
] as const;
const symbolSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9.]{1,24}$/u);

@Injectable()
export class MarketStructureService {
  private readonly cursorKey: string;
  constructor(
    @Inject(MARKET_STRUCTURE_READER)
    private readonly reader: MarketStructureReader,
    @Inject(MARKET_RATE_LIMITER) private readonly limiter: MarketRateLimiter,
    config: ConfigService,
  ) {
    this.cursorKey = config.getOrThrow<string>('AUTH_SESSION_HMAC_KEY');
  }
  active(clientKey: string, rawSymbol: string) {
    return this.query(clientKey, { symbol: rawSymbol }, 'ACTIVE');
  }
  history(
    clientKey: string,
    rawSymbol: string,
    input: Record<string, unknown>,
  ) {
    return this.query(clientKey, { ...input, symbol: rawSymbol }, 'HISTORY');
  }
  marketWide(clientKey: string, input: Record<string, unknown>) {
    return this.query(clientKey, input, 'MARKET_WIDE');
  }
  summary(clientKey: string, rawSymbol: string) {
    return this.query(clientKey, { symbol: rawSymbol, limit: 20 }, 'ACTIVE');
  }

  async event(clientKey: string, rawRevisionId: string) {
    this.consume(clientKey, 'market-structure-event');
    const revisionId = z.uuid().safeParse(rawRevisionId);
    if (!revisionId.success) throw invalid('MARKET_EVENT_ID_INVALID');
    const event = await this.reader.event(revisionId.data);
    if (!event)
      throw new NotFoundException({
        code: 'MARKET_EVENT_NOT_FOUND',
        message: 'Market event is not available',
      });
    const capability = await this.reader.capability(
      'marketMeasure.restrictions',
    );
    return {
      data: event,
      meta: this.meta(capability, 'market-measure-event-v1'),
    };
  }

  async shortSelling(
    clientKey: string,
    rawSymbol: string,
    input: Record<string, unknown>,
  ) {
    this.consume(clientKey, 'market-structure-short-selling');
    const parsed = z
      .strictObject({
        from: z.iso.date(),
        to: z.iso.date(),
        limit: z.coerce.number().int().min(1).max(100).default(50),
      })
      .safeParse(input);
    const symbol = symbolSchema.safeParse(rawSymbol);
    if (
      !parsed.success ||
      !symbol.success ||
      parsed.data.to < parsed.data.from ||
      days(parsed.data.from, parsed.data.to) > 366
    )
      throw invalid('MARKET_STRUCTURE_QUERY_INVALID');
    const capability = await this.reader.capability(
      'marketMeasure.shortSelling',
    );
    const items = capability.availability.startsWith('SUPPORTED')
      ? await this.reader.shortSelling({ symbol: symbol.data, ...parsed.data })
      : [];
    return {
      data: { items },
      meta: this.meta(capability, 'short-selling-activity-v1'),
    };
  }

  private async query(
    clientKey: string,
    input: Record<string, unknown>,
    mode: 'ACTIVE' | 'HISTORY' | 'MARKET_WIDE',
  ) {
    this.consume(clientKey, 'market-structure-query');
    const parsed = z
      .strictObject({
        symbol: symbolSchema.optional(),
        from: z.coerce.date().default(new Date(Date.now() - 366 * 86_400_000)),
        to: z.coerce.date().default(new Date()),
        types: z
          .union([z.enum(TYPES), z.array(z.enum(TYPES)).max(6)])
          .optional(),
        statuses: z
          .union([z.enum(STATUSES), z.array(z.enum(STATUSES)).max(6)])
          .optional(),
        limit: z.coerce.number().int().min(1).max(100).default(50),
        cursor: z.string().max(1024).optional(),
      })
      .safeParse(input);
    if (
      !parsed.success ||
      parsed.data.to < parsed.data.from ||
      parsed.data.to.getTime() - parsed.data.from.getTime() > 366 * 86_400_000
    )
      throw invalid('MARKET_STRUCTURE_QUERY_INVALID');
    const types = (
      parsed.data.types === undefined
        ? []
        : Array.isArray(parsed.data.types)
          ? parsed.data.types
          : [parsed.data.types]
    ) as MeasureType[];
    const statuses = (
      parsed.data.statuses === undefined
        ? []
        : Array.isArray(parsed.data.statuses)
          ? parsed.data.statuses
          : [parsed.data.statuses]
    ) as MeasureStatus[];
    const context = JSON.stringify({
      symbol: parsed.data.symbol ?? null,
      types,
      statuses,
      from: parsed.data.from.toISOString(),
      to: parsed.data.to.toISOString(),
      mode,
    });
    const cursor = parsed.data.cursor
      ? this.decode(parsed.data.cursor, context)
      : null;
    const now = new Date();
    const rows = await this.reader.measures({
      symbol: parsed.data.symbol ?? null,
      types,
      statuses,
      from: parsed.data.from,
      to: parsed.data.to,
      availableAt: now,
      limit: parsed.data.limit + 1,
      cursor,
      mode,
    });
    const items = rows.slice(0, parsed.data.limit);
    const last = items.at(-1);
    const hasMore = rows.length > parsed.data.limit;
    const capability = await this.reader.capability(
      mode === 'HISTORY'
        ? 'marketMeasure.history'
        : 'marketMeasure.restrictions',
    );
    return {
      data: { items },
      meta: {
        ...this.meta(capability, 'market-measure-v1'),
        asOf: now.toISOString(),
        nextCursor:
          hasMore && last
            ? this.encode(
                {
                  publishedAt: new Date(String(last['publishedAt'])),
                  revisionId: String(last['revisionId']),
                },
                context,
              )
            : null,
      },
    };
  }
  private meta(
    capability: Awaited<ReturnType<MarketStructureReader['capability']>>,
    methodologyVersion: string,
  ) {
    return {
      capability: capability.availability,
      providerHealth: capability.health,
      checkedAt: capability.checkedAt?.toISOString() ?? null,
      methodologyVersion,
    };
  }
  private consume(clientKey: string, operation: string) {
    this.limiter.consume({ clientKey, operation, now: new Date() });
  }
  private encode(
    value: { publishedAt: Date; revisionId: string },
    context: string,
  ) {
    const payload = Buffer.from(
      JSON.stringify({
        p: value.publishedAt.toISOString(),
        r: value.revisionId,
        c: context,
      }),
    ).toString('base64url');
    return `${payload}.${createHmac('sha256', this.cursorKey).update(payload).digest('base64url')}`;
  }
  private decode(cursor: string, context: string) {
    const [payload, signature] = cursor.split('.');
    if (!payload || !signature) throw invalid('CURSOR_INVALID');
    const expected = createHmac('sha256', this.cursorKey)
      .update(payload)
      .digest();
    let actual: Buffer;
    try {
      actual = Buffer.from(signature, 'base64url');
    } catch {
      throw invalid('CURSOR_INVALID');
    }
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      throw invalid('CURSOR_INVALID');
    try {
      const value = JSON.parse(
        Buffer.from(payload, 'base64url').toString(),
      ) as { p: string; r: string; c: string };
      if (value.c !== context || !z.uuid().safeParse(value.r).success)
        throw new Error();
      const publishedAt = new Date(value.p);
      if (Number.isNaN(publishedAt.getTime())) throw new Error();
      return { publishedAt, revisionId: value.r };
    } catch {
      throw invalid('CURSOR_INVALID');
    }
  }
}
function days(from: string, to: string) {
  return (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000;
}
function invalid(code: string) {
  return new BadRequestException({
    code,
    message: 'Market structure query is invalid',
  });
}
