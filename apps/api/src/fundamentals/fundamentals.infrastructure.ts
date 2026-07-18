import { Inject, Injectable } from '@nestjs/common';
import {
  dataProviders,
  fundamentalMetricSnapshots,
  fundamentalStatementSnapshots,
  instruments,
  priceBars,
} from '@atlas/database';
import {
  FUNDAMENTAL_METRIC_CODES,
  type FundamentalMetricCode,
  type NormalizedFundamentalStatement,
} from '@atlas/domain';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { ApiDatabase } from '../scanner/scanner-runtime.infrastructure';
import type { FundamentalsReader } from './fundamentals.ports';

@Injectable()
export class PostgresFundamentalsReader implements FundamentalsReader {
  constructor(@Inject(ApiDatabase) private readonly connection: ApiDatabase) {}

  async read(normalizedSymbol: string) {
    const instrument = (
      await this.connection.database
        .select({
          id: instruments.id,
          symbol: instruments.symbol,
          currencyCode: instruments.currencyCode,
        })
        .from(instruments)
        .where(eq(instruments.normalizedSymbol, normalizedSymbol))
        .limit(1)
    )[0];
    if (!instrument) return null;
    const snapshots = await this.connection.database
      .select({
        id: fundamentalStatementSnapshots.id,
        providerCode: dataProviders.code,
        fiscalYear: fundamentalStatementSnapshots.fiscalYear,
        fiscalPeriod: fundamentalStatementSnapshots.fiscalPeriod,
        periodStart: fundamentalStatementSnapshots.periodStart,
        periodEnd: fundamentalStatementSnapshots.periodEnd,
        currencyCode: fundamentalStatementSnapshots.currencyCode,
        providerRevision: fundamentalStatementSnapshots.providerRevision,
        publishedAt: fundamentalStatementSnapshots.publishedAt,
        sourceTimestamp: fundamentalStatementSnapshots.sourceTimestamp,
        payload: fundamentalStatementSnapshots.normalizedPayload,
        warnings: fundamentalStatementSnapshots.qualityMetadata,
      })
      .from(fundamentalStatementSnapshots)
      .innerJoin(
        dataProviders,
        eq(dataProviders.id, fundamentalStatementSnapshots.providerId),
      )
      .where(eq(fundamentalStatementSnapshots.instrumentId, instrument.id))
      .orderBy(
        desc(fundamentalStatementSnapshots.periodEnd),
        desc(fundamentalStatementSnapshots.sourceTimestamp),
      );
    const metricRows =
      snapshots.length === 0
        ? []
        : await this.connection.database
            .select({
              statementId: fundamentalMetricSnapshots.statementSnapshotId,
              code: fundamentalMetricSnapshots.metricCode,
              value: fundamentalMetricSnapshots.value,
              status: fundamentalMetricSnapshots.status,
            })
            .from(fundamentalMetricSnapshots)
            .where(
              inArray(
                fundamentalMetricSnapshots.statementSnapshotId,
                snapshots.map(({ id }) => id),
              ),
            );
    const byStatement = new Map<
      string,
      Partial<Record<FundamentalMetricCode, string>>
    >();
    for (const row of metricRows) {
      if (
        row.status !== 'complete' ||
        row.value === null ||
        !FUNDAMENTAL_METRIC_CODES.includes(row.code as FundamentalMetricCode)
      )
        continue;
      const values = byStatement.get(row.statementId) ?? {};
      values[row.code as FundamentalMetricCode] = row.value;
      byStatement.set(row.statementId, values);
    }
    const latest = new Map<string, NormalizedFundamentalStatement>();
    for (const row of snapshots) {
      const periodType = readPeriodType(row.payload);
      const identity = `${periodType}:${row.fiscalYear}:${row.fiscalPeriod}`;
      if (latest.has(identity)) continue;
      latest.set(identity, {
        instrumentId: instrument.id,
        providerCode: row.providerCode,
        providerRevision: row.providerRevision,
        fiscalYear: row.fiscalYear,
        fiscalPeriod: row.fiscalPeriod,
        periodType,
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        currencyCode: row.currencyCode,
        publishedAt: row.publishedAt,
        sourceTimestamp: row.sourceTimestamp,
        metrics: byStatement.get(row.id) ?? {},
        warnings: readWarnings(row.warnings),
      });
    }
    const quote = (
      await this.connection.database
        .select({
          price: priceBars.close,
          cutoff: priceBars.sourceTimestamp,
          closeTime: priceBars.closeTime,
        })
        .from(priceBars)
        .where(
          and(
            eq(priceBars.instrumentId, instrument.id),
            eq(priceBars.timeframe, '1d'),
            eq(priceBars.isClosed, true),
          ),
        )
        .orderBy(desc(priceBars.openTime), desc(priceBars.revision))
        .limit(1)
    )[0];
    return {
      instrumentId: instrument.id,
      symbol: instrument.symbol,
      currencyCode: instrument.currencyCode,
      statements: [...latest.values()].sort(
        (a, b) => b.periodEnd.getTime() - a.periodEnd.getTime(),
      ),
      latestMarketData: quote
        ? {
            price: quote.price,
            dataCutoffAt: quote.cutoff ?? quote.closeTime,
            currencyCode: instrument.currencyCode,
          }
        : null,
    };
  }
}

function readPeriodType(payload: Record<string, unknown>) {
  return payload['periodType'] === 'quarterly'
    ? ('quarterly' as const)
    : ('annual' as const);
}
function readWarnings(value: Record<string, unknown>) {
  const warnings = value['warnings'];
  return Array.isArray(warnings)
    ? warnings.filter((item): item is string => typeof item === 'string')
    : [];
}
