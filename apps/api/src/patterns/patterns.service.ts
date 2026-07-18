import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { z } from 'zod';
import {
  MARKET_RATE_LIMITER,
  type MarketRateLimiter,
} from '../market/market-overview.ports';
import {
  PATTERN_READ_MODEL,
  type PatternInstanceView,
  type PatternReadModel,
} from './patterns.ports';

const querySchema = z.object({
  timeframe: z
    .enum(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'])
    .default('1d'),
  adjustmentMode: z
    .enum(['raw', 'split-adjusted', 'total-return'])
    .default('raw'),
  state: z.enum(['candidate', 'confirmed', 'invalidated']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
const symbolSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .regex(/^[A-Za-z0-9._-]+$/u)
  .transform((value) => value.toUpperCase());

@Injectable()
export class PatternsService {
  constructor(
    @Inject(PATTERN_READ_MODEL) private readonly reader: PatternReadModel,
    @Inject(MARKET_RATE_LIMITER) private readonly limiter: MarketRateLimiter,
  ) {}
  async catalog(clientKey: string) {
    this.consume(clientKey, 'pattern-catalog');
    const data = await this.reader.catalog();
    return { data, meta: { count: data.length } };
  }
  async symbol(clientKey: string, rawSymbol: string, rawQuery: unknown) {
    this.consume(clientKey, 'symbol-patterns');
    const symbol = symbolSchema.safeParse(rawSymbol);
    if (!symbol.success) throw invalid();
    const instrument = await this.reader.symbolId(symbol.data);
    if (!instrument)
      throw new NotFoundException({
        code: 'SYMBOL_NOT_FOUND',
        message: 'Symbol was not found',
      });
    const query = parseQuery(rawQuery);
    const data = await this.reader.list({
      instrumentId: instrument.id,
      timeframe: query.timeframe,
      adjustmentMode: query.adjustmentMode,
      limit: query.limit,
      ...(query.state ? { state: query.state } : {}),
    });
    return response(data, {
      instrumentId: instrument.id,
      symbol: instrument.symbol,
      ...query,
    });
  }
  async market(clientKey: string, rawQuery: unknown) {
    this.consume(clientKey, 'market-patterns');
    const query = parseQuery(rawQuery);
    const data = await this.reader.list({
      timeframe: query.timeframe,
      adjustmentMode: query.adjustmentMode,
      limit: query.limit,
      ...(query.state ? { state: query.state } : {}),
    });
    return response(data, query);
  }
  private consume(clientKey: string, operation: string) {
    this.limiter.consume({ clientKey, operation, now: new Date() });
  }
}

function parseQuery(raw: unknown) {
  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) throw invalid();
  return parsed.data;
}
function invalid() {
  return new BadRequestException({
    code: 'PATTERN_QUERY_INVALID',
    message: 'Pattern query is invalid',
  });
}
function response(
  data: readonly PatternInstanceView[],
  meta: Record<string, unknown>,
) {
  const mapped = data.map((item) => ({
    ...item,
    startTime: item.startTime.toISOString(),
    endTime: item.endTime.toISOString(),
    detectedAt: item.detectedAt.toISOString(),
    confirmedAt: item.confirmedAt?.toISOString() ?? null,
    invalidatedAt: item.invalidatedAt?.toISOString() ?? null,
    dataCutoffAt: item.dataCutoffAt.toISOString(),
    chartMarkers: evidenceMarkers(item),
  }));
  const result = {
    data: mapped,
    meta: {
      ...meta,
      count: mapped.length,
      disclaimer:
        'Algorithmic candidates are not predictions or investment advice.',
    },
  };
  if (JSON.stringify(result).match(/(?:NaN|Infinity)/u))
    throw new Error('PATTERN_OUTPUT_INVALID');
  return result;
}
function evidenceMarkers(item: PatternInstanceView) {
  const points = item.evidence['points'];
  if (!Array.isArray(points)) return [];
  return points.flatMap((point, index) => {
    if (typeof point !== 'object' || point === null) return [];
    const value = point as Record<string, unknown>;
    return typeof value['time'] === 'string' &&
      typeof value['price'] === 'string' &&
      typeof value['role'] === 'string'
      ? [
          {
            id: `${item.id}:${index}`,
            time: value['time'],
            price: value['price'],
            role: value['role'],
            label: `${item.code}:${item.state}`,
            evidenceVersion: 1,
          },
        ]
      : [];
  });
}
