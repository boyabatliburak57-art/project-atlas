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
  INSTITUTIONAL_READER,
  type InstitutionalReader,
} from './institutional.ports';

const symbol = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9.]{1,24}$/u);
const date = z.iso.date();
const rangeSchema = z
  .object({
    from: date.optional(),
    to: date.optional(),
    period: z.enum(['1D', '5D', '20D']).default('1D'),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().max(1024).optional(),
  })
  .passthrough();

@Injectable()
export class InstitutionalService {
  private readonly cursorKey: string;
  constructor(
    @Inject(INSTITUTIONAL_READER) private readonly reader: InstitutionalReader,
    @Inject(MARKET_RATE_LIMITER) private readonly limiter: MarketRateLimiter,
    config: ConfigService,
  ) {
    this.cursorKey = config.getOrThrow<string>('AUTH_SESSION_HMAC_KEY');
  }

  async search(clientKey: string, input: Record<string, unknown>) {
    this.limiter.consume({
      clientKey,
      operation: 'institution-search',
      now: new Date(),
    });
    const parsed = z
      .strictObject({
        q: z.string().trim().min(2).max(64),
        limit: z.coerce.number().int().min(1).max(25).default(20),
      })
      .safeParse(input);
    if (!parsed.success) throw invalid('INSTITUTION_SEARCH_INVALID');
    const items = await this.reader.searchInstitutions(
      parsed.data.q,
      parsed.data.limit,
    );
    return { data: { items }, meta: await this.meta('institutional.akd') };
  }

  async overview(clientKey: string, input: Record<string, unknown>) {
    this.consume(clientKey, 'institutional-overview');
    const query = this.range(input);
    const data = await this.reader.overview({
      from: query.from,
      to: query.to,
      limit: Math.min(query.limit, 10),
      tradingSessionLimit: query.tradingSessionLimit,
    });
    return { data, meta: await this.meta('institutional.akd', query) };
  }

  async instrumentFlow(
    clientKey: string,
    rawSymbol: string,
    input: Record<string, unknown>,
  ) {
    this.consume(clientKey, 'institutional-flow');
    const parsedSymbol = symbol.safeParse(rawSymbol);
    const query = this.range(input);
    const sort = z
      .enum(['NET_BUY', 'NET_SELL', 'BUY_VALUE', 'SELL_VALUE'])
      .safeParse(input['sort'] ?? 'NET_BUY');
    if (!parsedSymbol.success || !sort.success)
      throw invalid('INSTITUTIONAL_FILTER_INVALID');
    const context = JSON.stringify({
      symbol: parsedSymbol.data,
      from: query.from,
      to: query.to,
      sort: sort.data,
    });
    const afterInstitutionId = query.cursor
      ? this.decode(query.cursor, context)
      : null;
    const rows = await this.reader.instrumentFlow({
      symbol: parsedSymbol.data,
      from: query.from,
      to: query.to,
      sort: sort.data,
      limit: query.limit + 1,
      afterInstitutionId,
      tradingSessionLimit: query.tradingSessionLimit,
    });
    const hasMore = rows.length > query.limit;
    const items = rows.slice(0, query.limit);
    const last = items.at(-1);
    return {
      data: { items },
      meta: {
        ...(await this.meta('institutional.akd', query)),
        methodologyVersion: 'institutional-net-flow-v1',
        nextCursor:
          hasMore && typeof last?.['institutionId'] === 'string'
            ? this.encode(last['institutionId'], context)
            : null,
      },
    };
  }

  async institution(
    clientKey: string,
    id: string,
    input: Record<string, unknown>,
  ) {
    this.consume(clientKey, 'institution-detail');
    if (!z.uuid().safeParse(id).success)
      throw invalid('INSTITUTION_ID_INVALID');
    const institution = await this.reader.institution(id);
    if (!institution)
      throw new NotFoundException({
        code: 'INSTITUTION_NOT_FOUND',
        message: 'Institution was not found',
      });
    const query = this.range(input);
    const flows = await this.reader.institutionFlows({
      institutionId: id,
      from: query.from,
      to: query.to,
      limit: query.limit,
      tradingSessionLimit: query.tradingSessionLimit,
    });
    return {
      data: { institution, flows },
      meta: await this.meta('institutional.akd', query),
    };
  }

  async settlement(
    clientKey: string,
    rawSymbol: string,
    input: Record<string, unknown>,
  ) {
    this.consume(clientKey, 'settlement-snapshot');
    const parsedSymbol = symbol.safeParse(rawSymbol);
    const parsed = z
      .strictObject({
        settlementDate: date.optional(),
        sort: z.enum(['HOLDING', 'INCREASE', 'DECREASE']).default('HOLDING'),
        limit: z.coerce.number().int().min(1).max(50).default(20),
      })
      .safeParse(input);
    if (!parsedSymbol.success || !parsed.success)
      throw invalid('SETTLEMENT_FILTER_INVALID');
    const items = await this.reader.settlement({
      symbol: parsedSymbol.data,
      settlementDate: parsed.data.settlementDate ?? null,
      sort: parsed.data.sort,
      limit: parsed.data.limit,
      residency: null,
    });
    return { data: { items }, meta: await this.meta('settlement.snapshot') };
  }

  async foreignSettlement(
    clientKey: string,
    rawSymbol: string,
    input: Record<string, unknown>,
  ) {
    this.consume(clientKey, 'foreign-settlement');
    const parsedSymbol = symbol.safeParse(rawSymbol);
    const parsed = z
      .strictObject({
        settlementDate: date.optional(),
        limit: z.coerce.number().int().min(1).max(50).default(20),
      })
      .safeParse(input);
    if (!parsedSymbol.success || !parsed.success)
      throw invalid('SETTLEMENT_FILTER_INVALID');
    const items = await this.reader.settlement({
      symbol: parsedSymbol.data,
      settlementDate: parsed.data.settlementDate ?? null,
      sort: 'HOLDING',
      limit: parsed.data.limit,
      residency: 'FOREIGN',
    });
    return { data: { items }, meta: await this.meta('settlement.foreign') };
  }

  async institutionHoldings(
    clientKey: string,
    id: string,
    input: Record<string, unknown>,
  ) {
    this.consume(clientKey, 'institution-holdings');
    if (!z.uuid().safeParse(id).success)
      throw invalid('INSTITUTION_ID_INVALID');
    const parsed = z
      .strictObject({
        settlementDate: date.optional(),
        limit: z.coerce.number().int().min(1).max(50).default(20),
      })
      .safeParse(input);
    if (!parsed.success) throw invalid('SETTLEMENT_FILTER_INVALID');
    const items = await this.reader.institutionHoldings({
      institutionId: id,
      settlementDate: parsed.data.settlementDate ?? null,
      limit: parsed.data.limit,
    });
    return { data: { items }, meta: await this.meta('settlement.snapshot') };
  }

  async settlementHistory(
    clientKey: string,
    rawSymbol: string,
    input: Record<string, unknown>,
  ) {
    this.consume(clientKey, 'settlement-history');
    const parsedSymbol = symbol.safeParse(rawSymbol);
    const query = this.range(input);
    const institutionId =
      input['institutionId'] === undefined
        ? null
        : z.uuid().safeParse(input['institutionId']);
    if (
      !parsedSymbol.success ||
      (institutionId !== null && !institutionId.success)
    )
      throw invalid('SETTLEMENT_FILTER_INVALID');
    const items = await this.reader.settlementHistory({
      symbol: parsedSymbol.data,
      from: query.from,
      to: query.to,
      institutionId: institutionId === null ? null : institutionId.data,
      limit: query.limit,
    });
    return {
      data: { items },
      meta: await this.meta('settlement.snapshot', query),
    };
  }

  async companySummary(clientKey: string, rawSymbol: string) {
    const flow = await this.instrumentFlow(clientKey, rawSymbol, {
      period: '5D',
      limit: 3,
      sort: 'NET_BUY',
    });
    const settlement = await this.settlement(clientKey, rawSymbol, {
      limit: 3,
      sort: 'HOLDING',
    });
    return {
      data: { flow: flow.data, settlement: settlement.data },
      meta: { flow: flow.meta, settlement: settlement.meta },
    };
  }

  private range(input: Record<string, unknown>) {
    const parsed = rangeSchema.safeParse(input);
    if (!parsed.success) throw invalid('INSTITUTIONAL_RANGE_INVALID');
    const to = parsed.data.to ?? new Date().toISOString().slice(0, 10);
    const windowDays =
      parsed.data.period === '20D' ? 45 : parsed.data.period === '5D' ? 14 : 1;
    const from =
      parsed.data.from ??
      new Date(`${to}T00:00:00Z`).toISOString().slice(0, 10);
    const defaultFrom = new Date(
      new Date(`${to}T00:00:00Z`).getTime() - windowDays * 86_400_000,
    )
      .toISOString()
      .slice(0, 10);
    const effectiveFrom = parsed.data.from ? from : defaultFrom;
    if (
      Date.parse(`${to}T00:00:00Z`) <
        Date.parse(`${effectiveFrom}T00:00:00Z`) ||
      Date.parse(`${to}T00:00:00Z`) - Date.parse(`${effectiveFrom}T00:00:00Z`) >
        366 * 86_400_000
    )
      throw invalid('DATE_RANGE_TOO_LARGE');
    const tradingSessionLimit =
      parsed.data.from || parsed.data.to
        ? null
        : ({ '1D': 1, '5D': 5, '20D': 20 } as const)[parsed.data.period];
    return { ...parsed.data, from: effectiveFrom, to, tradingSessionLimit };
  }
  private async meta(
    capability:
      | 'institutional.akd'
      | 'settlement.snapshot'
      | 'settlement.foreign',
    range?: { from: string; to: string },
  ) {
    const state = await this.reader.capability(capability);
    return {
      capability,
      providerState: state.availability,
      runtimeHealth: state.health,
      checkedAt: state.checkedAt?.toISOString() ?? null,
      freshness:
        state.health === 'STALE'
          ? 'STALE'
          : state.availability === 'SUPPORTED_DELAYED'
            ? 'DELAYED'
            : state.availability.startsWith('SUPPORTED_')
              ? 'CURRENT'
              : 'PROVIDER_REQUIRED',
      coverage: state.availability.startsWith('SUPPORTED_')
        ? 'NOT_EVALUATED'
        : 'NONE',
      license: { exportAllowed: false, shareAllowed: false },
      ...(range ? { from: range.from, to: range.to } : {}),
    };
  }
  private consume(clientKey: string, operation: string) {
    this.limiter.consume({ clientKey, operation, now: new Date() });
  }
  private encode(id: string, context: string) {
    const payload = Buffer.from(id).toString('base64url');
    const signature = createHmac('sha256', this.cursorKey)
      .update(`${context}.${payload}`)
      .digest('base64url');
    return `${payload}.${signature}`;
  }
  private decode(cursor: string, context: string) {
    const [payload, signature, extra] = cursor.split('.');
    if (!payload || !signature || extra)
      throw invalid('INSTITUTIONAL_CURSOR_INVALID');
    const expected = createHmac('sha256', this.cursorKey)
      .update(`${context}.${payload}`)
      .digest();
    const actual = Buffer.from(signature, 'base64url');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
      throw invalid('INSTITUTIONAL_CURSOR_INVALID');
    const id = Buffer.from(payload, 'base64url').toString();
    if (!z.uuid().safeParse(id).success)
      throw invalid('INSTITUTIONAL_CURSOR_INVALID');
    return id;
  }
}
function invalid(code: string) {
  return new BadRequestException({
    code,
    message: 'Institutional intelligence request is invalid',
  });
}
