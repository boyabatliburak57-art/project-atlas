import {
  portfolioCashBalances,
  portfolioPerformanceSnapshots,
  portfolioPositions,
  portfolioPositionSnapshots,
  portfolioRiskExposures,
  portfolioRiskSnapshots,
  portfolioValuationSnapshots,
  instruments,
  PostgresPortfolioRepository,
} from '@atlas/database';
import {
  PortfolioApplicationService,
  PortfolioError,
  type MetricResult,
  type PortfolioAuditPort,
  type PortfolioLoggerPort,
  type PortfolioPerformanceSnapshot,
  type PortfolioRiskSnapshot,
  type PortfolioValuationSnapshot,
  type RiskMetric,
} from '@atlas/domain';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  and,
  asc,
  desc,
  eq,
  gt,
  ilike,
  lt,
  ne,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';

import { ApiDatabase } from '../scanner/scanner-runtime.infrastructure';
import type {
  PortfolioCommandGuard,
  PositionPageQuery,
  PositionSortField,
  PortfolioReadModel,
  ValuationCursor,
} from './portfolios.ports';

export function createPortfolioApplication(connection: ApiDatabase) {
  const logger = new Logger('PortfolioApplication');
  const audit: PortfolioAuditPort = {
    record(event) {
      logger.log({ event: event.action, ...event });
      return Promise.resolve();
    },
  };
  const structuredLogger: PortfolioLoggerPort = {
    info(event, fields) {
      logger.log({ event, ...fields });
    },
  };
  return new PortfolioApplicationService({
    repository: new PostgresPortfolioRepository(connection.database),
    audit,
    logger: structuredLogger,
  });
}

@Injectable()
export class InMemoryPortfolioCommandGuard implements PortfolioCommandGuard {
  private readonly completed = new Map<
    string,
    { readonly requestHash: string; readonly value: unknown }
  >();
  private readonly pending = new Map<string, Promise<unknown>>();
  private readonly rateWindows = new Map<string, number[]>();
  private readonly rateLimit: number;
  private readonly rateWindowMs: number;

  constructor(config: ConfigService) {
    this.rateLimit = config.getOrThrow<number>(
      'PORTFOLIO_RECALCULATE_RATE_LIMIT',
    );
    this.rateWindowMs = config.getOrThrow<number>(
      'PORTFOLIO_RECALCULATE_RATE_WINDOW_MS',
    );
  }

  async execute<T>(input: {
    readonly userId: string;
    readonly operation: string;
    readonly idempotencyKey: string;
    readonly requestHash: string;
    readonly operationFactory: () => Promise<T>;
  }): Promise<{ readonly value: T; readonly replayed: boolean }> {
    const key = `${input.userId}:${input.operation}:${input.idempotencyKey}`;
    const existing = this.completed.get(key);
    if (existing) {
      if (existing.requestHash !== input.requestHash)
        throw new PortfolioError('PORTFOLIO_IDEMPOTENCY_CONFLICT');
      return { value: existing.value as T, replayed: true };
    }
    const inFlight = this.pending.get(key);
    if (inFlight) {
      const value = await inFlight;
      const finished = this.completed.get(key);
      if (finished?.requestHash !== input.requestHash)
        throw new PortfolioError('PORTFOLIO_IDEMPOTENCY_CONFLICT');
      return { value: value as T, replayed: true };
    }
    const operation = input.operationFactory();
    this.pending.set(key, operation);
    try {
      const value = await operation;
      this.completed.set(key, { requestHash: input.requestHash, value });
      return { value, replayed: false };
    } finally {
      this.pending.delete(key);
    }
  }

  consumeRateLimit(input: {
    readonly userId: string;
    readonly portfolioId: string;
    readonly now: Date;
  }): void {
    const key = `${input.userId}:${input.portfolioId}`;
    const cutoff = input.now.getTime() - this.rateWindowMs;
    const active = (this.rateWindows.get(key) ?? []).filter(
      (timestamp) => timestamp > cutoff,
    );
    if (active.length >= this.rateLimit)
      throw new PortfolioError('PORTFOLIO_RECALCULATE_RATE_LIMITED', {
        reason: 'RECALCULATE_RATE_LIMITED',
        retryAfterMs: Math.max(
          1,
          (active[0] ?? cutoff) + this.rateWindowMs - input.now.getTime(),
        ),
      });
    active.push(input.now.getTime());
    this.rateWindows.set(key, active);
  }
}

@Injectable()
export class PostgresPortfolioReadModel implements PortfolioReadModel {
  private readonly positionValuationCache = new Map<
    string,
    {
      readonly expiresAt: number;
      readonly value:
        | {
            readonly id: string;
            readonly dataCutoffAt: Date;
            readonly positionsMarketValue: string;
          }
        | undefined;
    }
  >();

  constructor(private readonly connection: ApiDatabase) {}

  async projection(portfolioId: string) {
    const [positions, cashBalances] = await Promise.all([
      this.connection.database
        .select()
        .from(portfolioPositions)
        .where(eq(portfolioPositions.portfolioId, portfolioId))
        .orderBy(asc(portfolioPositions.instrumentId)),
      this.connection.database
        .select()
        .from(portfolioCashBalances)
        .where(eq(portfolioCashBalances.portfolioId, portfolioId)),
    ]);
    const versions = [
      ...positions.map((row) => row.projectionLedgerVersion),
      ...cashBalances.map((row) => row.projectionLedgerVersion),
    ];
    return {
      ledgerVersion: versions[0] ?? 0,
      positions: positions.map((row) => ({
        portfolioId: row.portfolioId,
        instrumentId: row.instrumentId,
        quantity: row.quantity,
        averageCost: row.averageCost,
        costBasis: row.costBasis,
        realizedPnl: row.realizedPnl,
        dividendIncome: row.dividendIncome,
        ledgerVersion: row.projectionLedgerVersion,
        calculatedAt: row.calculatedAt,
      })),
      cashBalances: cashBalances.map((row) => ({
        portfolioId: row.portfolioId,
        currencyCode: 'TRY' as const,
        balance: row.balance,
        ledgerVersion: row.projectionLedgerVersion,
        calculatedAt: row.calculatedAt,
      })),
    };
  }

  async positionsPage(input: PositionPageQuery) {
    const valuation = await this.positionValuation(input);
    const snapshotId = valuation?.id ?? '00000000-0000-0000-0000-000000000000';
    const weightExpression =
      valuation && valuation.positionsMarketValue !== '0'
        ? sql<string>`(${portfolioPositionSnapshots.marketValue} / ${valuation.positionsMarketValue}::numeric)`
        : sql<string>`null::numeric`;
    const sortExpression = positionSortExpression(
      input.sortField,
      weightExpression,
    );
    const cursorCondition = input.cursor
      ? positionCursorCondition(
          sortExpression,
          input.sortField,
          input.sortDirection,
          input.cursor,
        )
      : undefined;
    const rows = await this.connection.database
      .select({
        portfolioId: portfolioPositions.portfolioId,
        instrumentId: portfolioPositions.instrumentId,
        symbol: instruments.symbol,
        company: instruments.name,
        quantity: portfolioPositions.quantity,
        averageCost: portfolioPositions.averageCost,
        costBasis: portfolioPositions.costBasis,
        realizedPnl: portfolioPositions.realizedPnl,
        dividendIncome: portfolioPositions.dividendIncome,
        marketValue: portfolioPositionSnapshots.marketValue,
        weight: weightExpression,
        unrealizedPnl: portfolioPositionSnapshots.unrealizedPnl,
        sectorId: instruments.sectorId,
        dataTime: portfolioPositionSnapshots.priceAt,
        ledgerVersion: portfolioPositions.projectionLedgerVersion,
        calculatedAt: portfolioPositions.calculatedAt,
        sortValue: sortExpression,
      })
      .from(portfolioPositions)
      .innerJoin(
        instruments,
        eq(instruments.id, portfolioPositions.instrumentId),
      )
      .leftJoin(
        portfolioPositionSnapshots,
        and(
          eq(portfolioPositionSnapshots.valuationSnapshotId, snapshotId),
          eq(
            portfolioPositionSnapshots.instrumentId,
            portfolioPositions.instrumentId,
          ),
        ),
      )
      .where(
        and(
          eq(portfolioPositions.portfolioId, input.portfolioId),
          eq(
            portfolioPositions.projectionLedgerVersion,
            input.projectionLedgerVersion,
          ),
          input.symbol
            ? ilike(instruments.normalizedSymbol, `${input.symbol}%`)
            : undefined,
          cursorCondition,
        ),
      )
      .orderBy(
        input.sortDirection === 'asc'
          ? asc(sortExpression)
          : desc(sortExpression),
        input.sortDirection === 'asc'
          ? asc(portfolioPositions.instrumentId)
          : desc(portfolioPositions.instrumentId),
      )
      .limit(input.limit + 1);
    const hasNext = rows.length > input.limit;
    const page = hasNext ? rows.slice(0, input.limit) : rows;
    const last = page.at(-1);
    return {
      items: page.map((row) => ({
        portfolioId: row.portfolioId,
        instrumentId: row.instrumentId,
        symbol: row.symbol,
        company: row.company,
        quantity: row.quantity,
        averageCost: row.averageCost,
        costBasis: row.costBasis,
        realizedPnl: row.realizedPnl,
        dividendIncome: row.dividendIncome,
        marketValue: row.marketValue,
        weight: row.weight ?? null,
        unrealizedPnl: row.unrealizedPnl,
        dailyChange: null,
        sectorId: row.sectorId,
        dataTime: row.dataTime,
        ledgerVersion: row.ledgerVersion,
        calculatedAt: row.calculatedAt,
      })),
      nextCursor:
        hasNext && last
          ? {
              sortValue: String(last.sortValue),
              instrumentId: last.instrumentId,
            }
          : null,
      projectionLedgerVersion: input.projectionLedgerVersion,
      dataCutoffAt: valuation?.dataCutoffAt ?? null,
    };
  }

  async latestValuation(portfolioId: string) {
    const row = (
      await this.connection.database
        .select()
        .from(portfolioValuationSnapshots)
        .where(eq(portfolioValuationSnapshots.portfolioId, portfolioId))
        .orderBy(
          desc(portfolioValuationSnapshots.valuationAt),
          desc(portfolioValuationSnapshots.id),
        )
        .limit(1)
    )[0];
    return row ? this.mapValuation(row) : null;
  }

  async valuationHistory(input: {
    readonly portfolioId: string;
    readonly limit: number;
    readonly cursor: ValuationCursor | null;
  }) {
    const cursorAt = input.cursor ? new Date(input.cursor.valuationAt) : null;
    const rows = await this.connection.database
      .select()
      .from(portfolioValuationSnapshots)
      .where(
        and(
          eq(portfolioValuationSnapshots.portfolioId, input.portfolioId),
          cursorAt && input.cursor
            ? or(
                lt(portfolioValuationSnapshots.valuationAt, cursorAt),
                and(
                  eq(portfolioValuationSnapshots.valuationAt, cursorAt),
                  gt(portfolioValuationSnapshots.id, input.cursor.id),
                ),
              )
            : undefined,
        ),
      )
      .orderBy(
        desc(portfolioValuationSnapshots.valuationAt),
        asc(portfolioValuationSnapshots.id),
      )
      .limit(input.limit + 1);
    const hasNext = rows.length > input.limit;
    const page = hasNext ? rows.slice(0, input.limit) : rows;
    const last = page.at(-1);
    return {
      items: await Promise.all(page.map((row) => this.mapValuation(row))),
      nextCursor:
        hasNext && last
          ? { valuationAt: last.valuationAt.toISOString(), id: last.id }
          : null,
    };
  }

  async latestPerformance(
    portfolioId: string,
  ): Promise<PortfolioPerformanceSnapshot | null> {
    const row = (
      await this.connection.database
        .select()
        .from(portfolioPerformanceSnapshots)
        .where(eq(portfolioPerformanceSnapshots.portfolioId, portfolioId))
        .orderBy(
          desc(portfolioPerformanceSnapshots.rangeEndAt),
          desc(portfolioPerformanceSnapshots.id),
        )
        .limit(1)
    )[0];
    if (!row) return null;
    const warnings = warningStrings(row.warnings);
    return {
      portfolioId: row.portfolioId,
      ledgerVersion: row.ledgerVersion,
      rangeStartAt: row.rangeStartAt,
      rangeEndAt: row.rangeEndAt,
      dataCutoffAt: row.dataCutoffAt,
      performancePolicyVersion: row.performancePolicyVersion,
      benchmarkCode: row.benchmarkCode,
      status: apiStatus(row.status),
      dailyValueSeries: [],
      netContributionSeries: [],
      twr: metric(row.twr, metricReason(warnings, 'TWR')),
      xirr: metric(row.xirr, metricReason(warnings, 'XIRR')),
      benchmark:
        row.benchmarkReturn === null
          ? {
              status: 'notEvaluable',
              priceReturn: null,
              totalReturn: null,
              alignedDates: [],
              warnings: ['MISSING_BENCHMARK_DATA'],
            }
          : {
              status: 'complete',
              priceReturn: row.benchmarkReturn,
              totalReturn: null,
              alignedDates: [],
              warnings: [],
            },
      periodReturns: {},
      cacheKey: `${row.portfolioId}:${row.id}`,
      warnings,
    };
  }

  async latestRisk(portfolioId: string): Promise<PortfolioRiskSnapshot | null> {
    const row = (
      await this.connection.database
        .select()
        .from(portfolioRiskSnapshots)
        .where(eq(portfolioRiskSnapshots.portfolioId, portfolioId))
        .orderBy(
          desc(portfolioRiskSnapshots.rangeEndAt),
          desc(portfolioRiskSnapshots.id),
        )
        .limit(1)
    )[0];
    if (!row) return null;
    const persisted = persistedRiskSnapshot(row.methodology.snapshot);
    if (persisted) return persisted;
    const exposures = await this.connection.database
      .select()
      .from(portfolioRiskExposures)
      .where(eq(portfolioRiskExposures.riskSnapshotId, row.id));
    const metricFor = (value: string | null): RiskMetric<string> => ({
      value,
      status: value === null ? 'notEvaluable' : 'complete',
      reasonCode: value === null ? 'INSUFFICIENT_OBSERVATIONS' : null,
      observationCount: row.observationCount,
      methodologyVersion: row.riskPolicyVersion,
      warnings: warningStrings(row.warnings),
    });
    const methodology = row.methodology;
    const correlationValue = stringValue(methodology.correlation);
    const drawdownValue = methodology.drawdown as
      | PortfolioRiskSnapshot['drawdown']['value']
      | undefined;
    const concentrationValue = methodology.concentration as
      | PortfolioRiskSnapshot['concentration']['value']
      | undefined;
    return {
      portfolioId: row.portfolioId,
      ledgerVersion: row.ledgerVersion,
      valuationSeriesVersion: row.valuationSeriesVersion,
      rangeStartAt: row.rangeStartAt,
      rangeEndAt: row.rangeEndAt,
      dataCutoffAt: row.dataCutoffAt,
      benchmarkCode: row.benchmarkCode,
      riskPolicyVersion: row.riskPolicyVersion,
      status: apiStatus(row.status),
      observationCount: row.observationCount,
      volatility: metricFor(row.volatility),
      beta: metricFor(row.beta),
      correlation: metricFor(correlationValue),
      drawdown: typedMetric(
        drawdownValue ?? undefined,
        row,
        warningStrings(row.warnings),
      ),
      historicalVar95: metricFor(row.historicalVar95),
      historicalVar99: metricFor(row.historicalVar99),
      expectedShortfall95: metricFor(row.expectedShortfall),
      concentration: typedMetric(
        concentrationValue ?? concentrationFrom(exposures),
        row,
        warningStrings(row.warnings),
      ),
      cacheKey:
        stringValue(methodology.cacheKey) ?? `${row.portfolioId}:${row.id}`,
      warnings: warningStrings(row.warnings),
    };
  }

  async invalidate(portfolioId: string, ledgerVersion: number): Promise<void> {
    for (const key of this.positionValuationCache.keys())
      if (key.startsWith(`${portfolioId}:`))
        this.positionValuationCache.delete(key);
    await Promise.all([
      this.connection.database
        .delete(portfolioValuationSnapshots)
        .where(
          and(
            eq(portfolioValuationSnapshots.portfolioId, portfolioId),
            ne(portfolioValuationSnapshots.ledgerVersion, ledgerVersion),
          ),
        ),
      this.connection.database
        .delete(portfolioPerformanceSnapshots)
        .where(
          and(
            eq(portfolioPerformanceSnapshots.portfolioId, portfolioId),
            ne(portfolioPerformanceSnapshots.ledgerVersion, ledgerVersion),
          ),
        ),
      this.connection.database
        .delete(portfolioRiskSnapshots)
        .where(
          and(
            eq(portfolioRiskSnapshots.portfolioId, portfolioId),
            ne(portfolioRiskSnapshots.ledgerVersion, ledgerVersion),
          ),
        ),
    ]);
  }

  private async positionValuation(input: PositionPageQuery) {
    const key = `${input.portfolioId}:${input.projectionLedgerVersion}`;
    const cached = this.positionValuationCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const value = (
      await this.connection.database
        .select({
          id: portfolioValuationSnapshots.id,
          dataCutoffAt: portfolioValuationSnapshots.dataCutoffAt,
          positionsMarketValue:
            portfolioValuationSnapshots.positionsMarketValue,
        })
        .from(portfolioValuationSnapshots)
        .where(
          and(
            eq(portfolioValuationSnapshots.portfolioId, input.portfolioId),
            eq(
              portfolioValuationSnapshots.ledgerVersion,
              input.projectionLedgerVersion,
            ),
          ),
        )
        .orderBy(
          desc(portfolioValuationSnapshots.valuationAt),
          desc(portfolioValuationSnapshots.id),
        )
        .limit(1)
    )[0];
    this.positionValuationCache.set(key, {
      expiresAt: Date.now() + 1_000,
      value,
    });
    return value;
  }

  private async mapValuation(
    row: typeof portfolioValuationSnapshots.$inferSelect,
  ): Promise<PortfolioValuationSnapshot> {
    const positions = await this.connection.database
      .select()
      .from(portfolioPositionSnapshots)
      .where(eq(portfolioPositionSnapshots.valuationSnapshotId, row.id));
    return {
      portfolioId: row.portfolioId,
      ledgerVersion: row.ledgerVersion,
      valuationAt: row.valuationAt,
      dataCutoffAt: row.dataCutoffAt,
      pricePolicyVersion: row.pricePolicyVersion,
      mode: 'official',
      persistable: true,
      status: apiStatus(row.status),
      cashBalance: row.cashBalance,
      positionsMarketValue: row.positionsMarketValue,
      totalValue: row.totalValue,
      realizedPnl: row.realizedPnl,
      unrealizedPnl: row.unrealizedPnl,
      netContributions: row.netContributions,
      missingPriceCount: row.missingPriceCount,
      warnings: row.warnings as PortfolioValuationSnapshot['warnings'],
      positions: positions.map((position) => ({
        instrumentId: position.instrumentId,
        status:
          position.status as PortfolioValuationSnapshot['positions'][number]['status'],
        quantity: position.quantity,
        averageCost: position.averageCost,
        costBasis: position.costBasis,
        marketPrice: position.marketPrice,
        marketValue: position.marketValue,
        unrealizedPnl: position.unrealizedPnl,
        priceAt: position.priceAt,
        warningCode:
          position.warningCode as PortfolioValuationSnapshot['positions'][number]['warningCode'],
      })),
      cacheKey: `${row.portfolioId}:${row.ledgerVersion}:${row.valuationAt.toISOString()}:${row.dataCutoffAt.toISOString()}:${row.pricePolicyVersion}:official`,
    };
  }
}

const NULL_NUMERIC_SORT_VALUE = '-999999999999999999.9999999999';

function positionSortExpression(
  field: PositionSortField,
  weightExpression: SQL<string>,
): SQL<string> {
  if (field === 'symbol') return sql<string>`${instruments.normalizedSymbol}`;
  if (field === 'marketValue')
    return sql<string>`coalesce(${portfolioPositionSnapshots.marketValue}, ${NULL_NUMERIC_SORT_VALUE}::numeric)`;
  if (field === 'weight')
    return sql<string>`coalesce(${weightExpression}, ${NULL_NUMERIC_SORT_VALUE}::numeric)`;
  if (field === 'unrealizedPnl')
    return sql<string>`coalesce(${portfolioPositionSnapshots.unrealizedPnl}, ${NULL_NUMERIC_SORT_VALUE}::numeric)`;
  return sql<string>`0::numeric`;
}

function positionCursorCondition(
  sortExpression: SQL<string>,
  field: PositionSortField,
  direction: 'asc' | 'desc',
  cursor: { readonly sortValue: string; readonly instrumentId: string },
) {
  const cursorValue =
    field === 'symbol'
      ? sql`${cursor.sortValue}`
      : sql`${cursor.sortValue}::numeric`;
  return direction === 'asc'
    ? sql`(${sortExpression} > ${cursorValue} or (${sortExpression} = ${cursorValue} and ${portfolioPositions.instrumentId} > ${cursor.instrumentId}::uuid))`
    : sql`(${sortExpression} < ${cursorValue} or (${sortExpression} = ${cursorValue} and ${portfolioPositions.instrumentId} < ${cursor.instrumentId}::uuid))`;
}

function metric(value: string | null, reason: string): MetricResult {
  return value === null
    ? { status: 'notEvaluable', reason }
    : { status: 'complete', value };
}

function metricReason(warnings: readonly string[], prefix: 'TWR' | 'XIRR') {
  const warning = warnings.find((value) => value.startsWith(`${prefix}_`));
  return warning?.slice(prefix.length + 1) ?? 'INSUFFICIENT_OBSERVATIONS';
}

function persistedRiskSnapshot(value: unknown): PortfolioRiskSnapshot | null {
  if (typeof value !== 'object' || value === null) return null;
  const snapshot = value as PortfolioRiskSnapshot & {
    readonly rangeStartAt: string | Date;
    readonly rangeEndAt: string | Date;
    readonly dataCutoffAt: string | Date;
  };
  if (
    typeof snapshot.portfolioId !== 'string' ||
    typeof snapshot.riskPolicyVersion !== 'string'
  )
    return null;
  return {
    ...snapshot,
    rangeStartAt: new Date(snapshot.rangeStartAt),
    rangeEndAt: new Date(snapshot.rangeEndAt),
    dataCutoffAt: new Date(snapshot.dataCutoffAt),
  };
}

function apiStatus(value: string): 'complete' | 'partial' | 'notEvaluable' {
  return value === 'not_evaluable'
    ? 'notEvaluable'
    : (value as 'complete' | 'partial');
}

function warningStrings(value: readonly Record<string, unknown>[]): string[] {
  return value.map((warning) => {
    const candidate = warning.code ?? warning.reason;
    return typeof candidate === 'string' ? candidate : 'ANALYTICS_WARNING';
  });
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function typedMetric<T>(
  value: T | undefined,
  row: typeof portfolioRiskSnapshots.$inferSelect,
  warnings: readonly string[],
): RiskMetric<T> {
  return {
    value: value ?? null,
    status: value === undefined ? 'notEvaluable' : 'complete',
    reasonCode: value === undefined ? 'INSUFFICIENT_OBSERVATIONS' : null,
    observationCount: row.observationCount,
    methodologyVersion: row.riskPolicyVersion,
    warnings,
  };
}

function concentrationFrom(
  rows: readonly (typeof portfolioRiskExposures.$inferSelect)[],
) {
  const positions = rows
    .filter((row) => row.exposureType === 'instrument')
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  const weight = (count: number) =>
    positions
      .slice(0, count)
      .reduce((sum, row) => sum + Number(row.weight), 0)
      .toFixed(12)
      .replace(/\.?0+$/, '') || '0';
  return {
    largestPositionWeight: positions[0]?.weight ?? '0',
    top3Weight: weight(3),
    top5Weight: weight(5),
    hhi: '0',
    cashWeight: rows.find((row) => row.exposureType === 'cash')?.weight ?? '0',
    unknownSectorWeight:
      rows.find(
        (row) => row.exposureType === 'sector' && row.exposureKey === 'UNKNOWN',
      )?.weight ?? '0',
    exposures: rows.map((row) => ({
      type: row.exposureType as 'instrument' | 'sector' | 'cash',
      key: row.exposureKey,
      weight: row.weight,
      marketValue: row.marketValue,
      rank: row.rank,
    })),
  };
}
