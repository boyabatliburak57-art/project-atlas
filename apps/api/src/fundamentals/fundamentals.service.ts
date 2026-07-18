import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  buildTtm,
  FUNDAMENTAL_METRIC_CODES,
  VersionedRatioRegistry,
  type NormalizedFundamentalStatement,
} from '@atlas/domain';
import { z } from 'zod';
import {
  MARKET_RATE_LIMITER,
  type MarketRateLimiter,
} from '../market/market-overview.ports';
import {
  FUNDAMENTALS_READER,
  type FundamentalsReader,
} from './fundamentals.ports';

const querySchema = z.object({
  periodType: z.enum(['annual', 'quarterly', 'ttm']).default('annual'),
  limit: z.coerce.number().int().min(1).max(20).default(20),
  metric: z.enum(FUNDAMENTAL_METRIC_CODES).optional(),
});
const symbolSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .regex(/^[A-Za-z0-9._-]+$/u)
  .transform((v) => v.toUpperCase());

@Injectable()
export class FundamentalsService {
  private readonly ratios = new VersionedRatioRegistry();
  constructor(
    @Inject(FUNDAMENTALS_READER) private readonly reader: FundamentalsReader,
    @Inject(MARKET_RATE_LIMITER) private readonly limiter: MarketRateLimiter,
  ) {}

  async financials(clientKey: string, symbol: string, rawQuery: unknown) {
    const { model, query } = await this.context(clientKey, symbol, rawQuery);
    const statements = selectStatements(
      model.statements,
      query.periodType,
    ).slice(0, query.limit);
    this.requireData(statements);
    return response(model, statements.map(publicStatement), {
      periodType: query.periodType,
    });
  }

  async ratioValues(clientKey: string, symbol: string, rawQuery: unknown) {
    const { model, query } = await this.context(clientKey, symbol, rawQuery);
    const statements = selectStatements(model.statements, query.periodType);
    this.requireData(statements);
    const [current, previous] = statements;
    const values = this.ratios.calculate({
      current: current!,
      ...(previous ? { previous } : {}),
      ...(model.latestMarketData ? { market: model.latestMarketData } : {}),
    });
    assertFinite(values);
    return response(model, values, {
      formulaVersion: values[0]?.formulaVersion,
      financialPeriodEnd: current!.periodEnd.toISOString(),
      marketDataCutoffAt:
        model.latestMarketData?.dataCutoffAt.toISOString() ?? null,
      denominatorPolicies: this.ratios.list(),
    });
  }

  async trends(clientKey: string, symbol: string, rawQuery: unknown) {
    const { model, query } = await this.context(clientKey, symbol, rawQuery);
    const metric = query.metric ?? 'revenue';
    const statements = selectStatements(model.statements, query.periodType)
      .slice(0, query.limit)
      .reverse();
    this.requireData(statements);
    return response(
      model,
      statements.map((statement) => ({
        period: periodRef(statement),
        periodEnd: statement.periodEnd.toISOString(),
        value: statement.metrics[metric] ?? null,
        status:
          statement.metrics[metric] === undefined ? 'missing' : 'complete',
        reasonCode:
          statement.metrics[metric] === undefined
            ? 'PROVIDER_METRIC_MISSING'
            : null,
        providerRevision: statement.providerRevision,
      })),
      { metric, periodType: query.periodType },
    );
  }

  private async context(clientKey: string, symbol: string, rawQuery: unknown) {
    this.limiter.consume({
      clientKey,
      operation: 'fundamentals',
      now: new Date(),
    });
    const parsedSymbol = symbolSchema.safeParse(symbol);
    const query = querySchema.safeParse(rawQuery);
    if (!parsedSymbol.success || !query.success)
      throw new BadRequestException({
        code: 'FUNDAMENTAL_PERIOD_INVALID',
        message: 'Fundamental query is invalid',
      });
    const model = await this.reader.read(parsedSymbol.data);
    if (!model)
      throw new NotFoundException({
        code: 'SYMBOL_NOT_FOUND',
        message: 'Symbol was not found',
      });
    return { model, query: query.data };
  }
  private requireData(values: readonly unknown[]) {
    if (values.length === 0)
      throw new NotFoundException({
        code: 'FUNDAMENTAL_DATA_NOT_AVAILABLE',
        message: 'Fundamental data is not available',
      });
  }
}

function selectStatements(
  statements: readonly NormalizedFundamentalStatement[],
  type: 'annual' | 'quarterly' | 'ttm',
) {
  if (type === 'ttm') {
    const ttm = buildTtm(
      statements.filter((item) => item.periodType === 'quarterly'),
    );
    return ttm ? [ttm] : [];
  }
  return statements
    .filter((item) => item.periodType === type)
    .sort((a, b) => b.periodEnd.getTime() - a.periodEnd.getTime());
}
function publicStatement(statement: NormalizedFundamentalStatement) {
  return {
    period: periodRef(statement),
    periodType: statement.periodType,
    periodStart: statement.periodStart.toISOString(),
    periodEnd: statement.periodEnd.toISOString(),
    currencyCode: statement.currencyCode,
    provider: statement.providerCode,
    providerRevision: statement.providerRevision,
    publishedAt: statement.publishedAt.toISOString(),
    sourceTimestamp: statement.sourceTimestamp.toISOString(),
    metrics: FUNDAMENTAL_METRIC_CODES.map((code) => ({
      code,
      value: statement.metrics[code] ?? null,
      status: statement.metrics[code] === undefined ? 'missing' : 'complete',
      reasonCode:
        statement.metrics[code] === undefined
          ? 'PROVIDER_METRIC_MISSING'
          : null,
    })),
  };
}
function periodRef(statement: NormalizedFundamentalStatement) {
  return `${statement.fiscalYear}-${statement.fiscalPeriod}`;
}
function response(
  model: { instrumentId: string; symbol: string },
  data: unknown,
  extra: Record<string, unknown>,
) {
  return {
    data,
    meta: { instrumentId: model.instrumentId, symbol: model.symbol, ...extra },
  };
}
function assertFinite(value: unknown) {
  if (JSON.stringify(value).match(/(?:NaN|Infinity)/u))
    throw new Error('Non-finite public fundamental output');
}
