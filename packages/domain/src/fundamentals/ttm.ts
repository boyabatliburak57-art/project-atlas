import { Decimal } from '../portfolio/decimal.js';
import {
  FUNDAMENTAL_METRIC_CODES,
  type FundamentalMetricCode,
  type NormalizedFundamentalStatement,
} from './contracts.js';

const FLOW_METRICS = new Set<FundamentalMetricCode>([
  'revenue',
  'grossProfit',
  'operatingProfit',
  'ebitda',
  'netIncome',
  'operatingCashFlow',
  'capitalExpenditure',
  'freeCashFlow',
]);

export function buildTtm(
  statements: readonly NormalizedFundamentalStatement[],
): NormalizedFundamentalStatement | null {
  const ordered = [...statements].sort(
    (a, b) => a.periodEnd.getTime() - b.periodEnd.getTime(),
  );
  const quarters = ordered.slice(-4);
  if (
    quarters.length !== 4 ||
    quarters.some((item) => item.periodType !== 'quarterly')
  )
    return null;
  if (new Set(quarters.map((item) => item.currencyCode)).size !== 1)
    return null;
  for (let index = 1; index < quarters.length; index += 1) {
    const days =
      (quarters[index]!.periodEnd.getTime() -
        quarters[index - 1]!.periodEnd.getTime()) /
      86_400_000;
    if (days < 70 || days > 110) return null;
  }
  const latest = quarters.at(-1)!;
  const metrics: Partial<Record<FundamentalMetricCode, string>> = {};
  for (const code of FUNDAMENTAL_METRIC_CODES) {
    if (FLOW_METRICS.has(code)) {
      const values = quarters.map((statement) => statement.metrics[code]);
      if (values.every((value): value is string => value !== undefined))
        metrics[code] = values
          .reduce((sum, value) => sum.plus(Decimal.parse(value)), Decimal.ZERO)
          .toString();
    } else if (latest.metrics[code] !== undefined)
      metrics[code] = latest.metrics[code];
  }
  return {
    ...latest,
    fiscalPeriod: 'TTM',
    periodType: 'ttm',
    periodStart: quarters[0]!.periodStart,
    providerRevision: `ttm:${quarters.map((item) => item.providerRevision).join('+')}`,
    metrics,
    warnings: [],
  };
}
