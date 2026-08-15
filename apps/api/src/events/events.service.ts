import { createHmac, timingSafeEqual } from 'node:crypto';

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { normalizeKapSearch } from '@atlas/domain';
import { z } from 'zod';

import {
  MARKET_RATE_LIMITER,
  type MarketRateLimiter,
} from '../market/market-overview.ports';
import {
  EVENT_READER,
  type EventFeedRow,
  type EventReader,
} from './events.ports';

const CATEGORIES = [
  'FINANCIAL_RESULT',
  'MATERIAL_EVENT',
  'NEW_BUSINESS',
  'BUYBACK',
  'DIVIDEND',
  'CAPITAL_INCREASE',
  'CAPITAL_DECREASE',
  'SPLIT',
  'MERGER',
  'ACQUISITION',
  'SHARE_TRANSACTION',
  'MANAGEMENT_CHANGE',
  'IPO',
  'GUIDANCE',
  'OTHER',
] as const;
const STATES = ['ACTIVE', 'CORRECTED', 'SUPERSEDED', 'WITHDRAWN'] as const;
const feedSchema = z.strictObject({
  category: z.string().max(300).optional(),
  state: z.string().max(100).optional(),
  companyId: z.uuid().optional(),
  symbol: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9.]{1,32}$/u)
    .optional(),
  relevance: z.enum(['WATCHLIST', 'PORTFOLIO', 'ANY']).optional(),
  q: z.string().optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  cursor: z.string().max(1024).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

@Injectable()
export class EventsService {
  private readonly cursorKey: string;
  constructor(
    @Inject(EVENT_READER) private readonly reader: EventReader,
    @Inject(MARKET_RATE_LIMITER)
    private readonly rateLimiter: MarketRateLimiter,
    config: ConfigService,
  ) {
    this.cursorKey = config.getOrThrow<string>('AUTH_SESSION_HMAC_KEY');
  }

  async feed(
    userId: string,
    clientKey: string,
    input: Record<string, unknown>,
    companyOverride?: { companyId?: string; symbol?: string },
  ) {
    this.rateLimiter.consume({
      clientKey,
      operation: input['q'] ? 'kap-search' : 'kap-feed',
      now: new Date(),
    });
    const parsed = feedSchema.safeParse({ ...input, ...companyOverride });
    if (!parsed.success) throw invalidRequest();
    const query = parsed.data;
    const to = query.to ? new Date(query.to) : endOfUtcDay(new Date());
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - 90 * 86_400_000);
    if (to < from || to.getTime() - from.getTime() > 366 * 86_400_000)
      throw invalidRequest('EVENT_DATE_RANGE_TOO_LARGE');
    let search: string | null = null;
    if (query.q !== undefined) {
      try {
        search = normalizeKapSearch(query.q);
      } catch {
        throw invalidRequest('EVENT_SEARCH_INVALID');
      }
    }
    const categories = parseList(query.category, CATEGORIES);
    const states = parseList(query.state, STATES);
    const context = JSON.stringify({
      userId,
      categories,
      states,
      companyId: query.companyId ?? null,
      symbol: query.symbol?.toUpperCase() ?? null,
      relevance: query.relevance ?? null,
      search,
      from: from.toISOString(),
      to: to.toISOString(),
    });
    const cursor = query.cursor ? this.decode(query.cursor, context) : null;
    const rows = await this.reader.feed({
      userId,
      categories,
      states,
      companyId: query.companyId ?? null,
      symbol: query.symbol?.toUpperCase() ?? null,
      relevance: query.relevance ?? null,
      search,
      from,
      to,
      limit: query.limit + 1,
      cursor,
    });
    const hasMore = rows.length > query.limit;
    const selected = rows.slice(0, query.limit);
    const last = selected.at(-1);
    return {
      data: { items: selected.map((item) => publicEvent(item)) },
      meta: {
        ...(await this.metadata()),
        limit: query.limit,
        nextCursor:
          hasMore && last
            ? this.encode(
                {
                  publishedAt: last.publishedAt.toISOString(),
                  revisionId: last.revisionId,
                },
                context,
              )
            : null,
      },
    };
  }

  async detail(userId: string, revisionId: string) {
    if (!z.uuid().safeParse(revisionId).success) throw invalidRequest();
    const row = await this.reader.detail(revisionId, userId);
    if (!row)
      throw new NotFoundException({
        code: 'EVENT_NOT_FOUND',
        message: 'Event was not found',
      });
    return { data: publicEvent(row, true), meta: await this.metadata() };
  }

  async revisions(userId: string, revisionId: string) {
    const row = await this.reader.detail(revisionId, userId);
    if (!row)
      throw new NotFoundException({
        code: 'EVENT_NOT_FOUND',
        message: 'Event was not found',
      });
    const revisions = await this.reader.revisions(row.disclosureId, userId);
    return {
      data: { items: revisions.map((item) => publicEvent(item, true)) },
      meta: await this.metadata(),
    };
  }

  private async metadata() {
    const capability = await this.reader.capability();
    return {
      capability: 'disclosure.kap',
      providerState: capability.availability,
      runtimeHealth: capability.health,
      checkedAt: capability.checkedAt?.toISOString() ?? null,
      freshness:
        capability.health === 'STALE'
          ? 'STALE'
          : capability.availability === 'SUPPORTED_DELAYED'
            ? 'DELAYED'
            : capability.availability.startsWith('SUPPORTED_')
              ? 'CURRENT'
              : 'PROVIDER_REQUIRED',
    };
  }

  private encode(value: object, context: string) {
    const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
    const signature = createHmac('sha256', this.cursorKey)
      .update(`${context}.${payload}`)
      .digest('base64url');
    return `${payload}.${signature}`;
  }
  private decode(
    cursor: string,
    context: string,
  ): { publishedAt: Date; revisionId: string } {
    const [payload, signature, extra] = cursor.split('.');
    if (!payload || !signature || extra)
      throw invalidRequest('EVENT_CURSOR_INVALID');
    const expected = createHmac('sha256', this.cursorKey)
      .update(`${context}.${payload}`)
      .digest();
    const supplied = Buffer.from(signature, 'base64url');
    if (
      expected.length !== supplied.length ||
      !timingSafeEqual(expected, supplied)
    )
      throw invalidRequest('EVENT_CURSOR_INVALID');
    try {
      const value = JSON.parse(
        Buffer.from(payload, 'base64url').toString(),
      ) as { publishedAt: string; revisionId: string };
      if (!z.uuid().safeParse(value.revisionId).success) throw new Error();
      return {
        publishedAt: new Date(value.publishedAt),
        revisionId: value.revisionId,
      };
    } catch {
      throw invalidRequest('EVENT_CURSOR_INVALID');
    }
  }
}

function publicEvent(row: EventFeedRow, detail = false) {
  const attributes = safeAttributes(row.normalizedAttributes);
  return {
    id: row.revisionId,
    disclosureId: row.disclosureId,
    marketEventId: row.marketEventRevisionId,
    title: row.title,
    ...(detail ? { summary: row.summary } : {}),
    category: row.disclosureType,
    sourceCategory: attributes['sourceCategory'] ?? null,
    state: row.state,
    corrected: row.state === 'CORRECTED' || row.supersedesRevisionId !== null,
    supersedesRevisionId: row.supersedesRevisionId,
    providerRevision: row.providerRevision,
    companies: row.companyIds.map((id, index) => ({
      id,
      name: row.companyNames[index] ?? null,
    })),
    instruments: row.instrumentIds.map((id, index) => ({
      id,
      symbol: row.symbols[index] ?? null,
    })),
    publishedAt: row.publishedAt.toISOString(),
    effectiveAt: row.effectiveAt?.toISOString() ?? null,
    availableAt: row.availableAt.toISOString(),
    reportingPeriod: row.reportingPeriod,
    relevance:
      row.watchlistRelevant && row.portfolioRelevant
        ? 'BOTH'
        : row.watchlistRelevant
          ? 'WATCHLIST_RELEVANT'
          : row.portfolioRelevant
            ? 'PORTFOLIO_RELEVANT'
            : 'NONE',
    ...(detail
      ? {
          attributes,
          attachments: Array.isArray(attributes['attachments'])
            ? attributes['attachments']
            : [],
          source: {
            reference: row.sourceReference,
            provider: row.providerCode,
            dataset: row.providerDataset,
            sourceTimestamp: row.sourceTimestamp.toISOString(),
            ingestedAt: row.ingestedAt.toISOString(),
            deliveryMode: row.deliveryMode,
            quality: row.qualityState,
            licenseClass: row.licenseClass,
            restrictions: row.redistributionClasses,
          },
          methodology: attributes['classification'] ?? null,
        }
      : {}),
  };
}

function safeAttributes(value: Record<string, unknown>) {
  const allowed = new Set([
    'sourceCategory',
    'classification',
    'attachments',
    'companyIds',
    'instrumentIds',
    'supersedesProviderRevision',
    'chainStatus',
    'fiscalYear',
    'fiscalPeriod',
    'counterparty',
    'contractAmount',
    'currency',
    'duration',
    'materialitySource',
    'buybackStage',
    'decisionState',
    'grossAmount',
    'netAmount',
    'recordDate',
    'exDate',
    'paymentDate',
    'effectiveDate',
  ]);
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => allowed.has(key)),
  );
}
function endOfUtcDay(value: Date) {
  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}
function parseList<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): readonly T[] {
  if (!value) return [];
  const items = [...new Set(value.split(',').map((item) => item.trim()))];
  if (items.some((item) => !allowed.includes(item as T)))
    throw invalidRequest();
  return items.map((item) => item as T);
}
function invalidRequest(code = 'EVENT_REQUEST_INVALID') {
  return new BadRequestException({ code, message: 'Event request is invalid' });
}
