import { describe, expect, it } from 'vitest';
import { buildTtm } from './ttm.js';
import { VersionedRatioRegistry } from './ratio-engine.js';
import type {
  FundamentalMetricCode,
  NormalizedFundamentalStatement,
} from './contracts.js';

const baseMetrics = {
  revenue: '1000',
  grossProfit: '400',
  operatingProfit: '250',
  ebitda: '300',
  netIncome: '200',
  totalAssets: '2000',
  totalLiabilities: '900',
  equity: '1100',
  cashAndEquivalents: '100',
  financialDebt: '300',
  operatingCashFlow: '240',
  capitalExpenditure: '40',
  freeCashFlow: '200',
  sharesOutstanding: '100',
  currentAssets: '600',
  currentLiabilities: '300',
} as const;
function statement(
  overrides: Partial<NormalizedFundamentalStatement> = {},
): NormalizedFundamentalStatement {
  return {
    instrumentId: 'i1',
    providerCode: 'fake',
    providerRevision: 'r1',
    fiscalYear: 2025,
    fiscalPeriod: 'FY',
    periodType: 'annual',
    periodStart: new Date('2025-01-01Z'),
    periodEnd: new Date('2025-12-31Z'),
    publishedAt: new Date('2026-02-01Z'),
    sourceTimestamp: new Date('2026-02-01Z'),
    currencyCode: 'TRY',
    metrics: baseMetrics,
    warnings: [],
    ...overrides,
  };
}
const registry = new VersionedRatioRegistry();
const missingEbitdaMetrics = Object.fromEntries(
  Object.entries(baseMetrics).filter(([code]) => code !== 'ebitda'),
) as Partial<Record<FundamentalMetricCode, string>>;

describe('versioned fundamentals ratio engine', () => {
  it('calculates the initial ratio set with explicit formula metadata', () => {
    const values = registry.calculate({
      current: statement(),
      previous: statement({
        providerRevision: 'r0',
        metrics: { ...baseMetrics, revenue: '800', netIncome: '100' },
      }),
      market: {
        price: '25',
        currencyCode: 'TRY',
        dataCutoffAt: new Date('2026-03-01Z'),
      },
    });
    expect(values).toHaveLength(14);
    expect(values.find((v) => v.code === 'pe')?.value).toBe('12.5');
    expect(values.find((v) => v.code === 'grossMargin')?.value).toBe('0.4');
    expect(values.find((v) => v.code === 'revenueGrowth')?.value).toBe('0.25');
    expect(
      values.every((v) => v.formulaVersion === 'fundamentals-ratios-v1'),
    ).toBe(true);
  });
  it('does not substitute a missing metric with zero', () => {
    const values = registry.calculate({
      current: statement({ metrics: missingEbitdaMetrics }),
    });
    expect(values.find((v) => v.code === 'netDebtToEbitda')).toMatchObject({
      value: null,
      reasonCode: 'INPUT_MISSING',
    });
  });
  it('marks a zero denominator not evaluable', () => {
    const values = registry.calculate({
      current: statement({ metrics: { ...baseMetrics, equity: '0' } }),
    });
    expect(values.find((v) => v.code === 'roe')).toMatchObject({
      value: null,
      reasonCode: 'DENOMINATOR_ZERO',
    });
  });
  it('applies the ratio-specific negative denominator policy', () => {
    const values = registry.calculate({
      current: statement({ metrics: { ...baseMetrics, netIncome: '-1' } }),
      market: { price: '25', currencyCode: 'TRY', dataCutoffAt: new Date() },
    });
    expect(values.find((v) => v.code === 'pe')).toMatchObject({
      value: null,
      reasonCode: 'NEGATIVE_DENOMINATOR',
    });
  });
  it('keeps financial period and market cutoff separate', () => {
    const cutoff = new Date('2026-03-02Z');
    const pe = registry
      .calculate({
        current: statement(),
        market: { price: '25', currencyCode: 'TRY', dataCutoffAt: cutoff },
      })
      .find((v) => v.code === 'pe');
    expect(pe).toMatchObject({
      financialPeriod: '2025-FY',
      marketDataCutoffAt: cutoff,
    });
  });
  it('rejects market currency mismatch', () => {
    const pe = registry
      .calculate({
        current: statement(),
        market: { price: '25', currencyCode: 'USD', dataCutoffAt: new Date() },
      })
      .find((v) => v.code === 'pe');
    expect(pe?.reasonCode).toBe('CURRENCY_MISMATCH');
  });
  it('reports missing comparison periods for growth', () => {
    const growth = registry
      .calculate({ current: statement() })
      .find((v) => v.code === 'revenueGrowth');
    expect(growth?.reasonCode).toBe('COMPARISON_PERIOD_MISSING');
  });
  it('never emits NaN or Infinity', () => {
    expect(
      JSON.stringify(
        registry.calculate({
          current: statement({ metrics: { ...baseMetrics, revenue: '0' } }),
        }),
      ),
    ).not.toMatch(/NaN|Infinity/u);
  });
});

describe('TTM builder', () => {
  const quarters = Array.from({ length: 4 }, (_, index) =>
    statement({
      fiscalPeriod: `Q${index + 1}`,
      periodType: 'quarterly',
      providerRevision: `q${index + 1}`,
      periodStart: new Date(Date.UTC(2025, index * 3, 1)),
      periodEnd: new Date(Date.UTC(2025, index * 3 + 3, 0)),
      metrics: {
        ...baseMetrics,
        revenue: '250',
        totalAssets: String(1700 + index * 100),
      },
    }),
  );
  it('builds TTM from four compatible quarters', () => {
    expect(buildTtm(quarters)).toMatchObject({
      periodType: 'ttm',
      fiscalPeriod: 'TTM',
      metrics: { revenue: '1000', totalAssets: '2000' },
    });
  });
  it('requires four periods', () =>
    expect(buildTtm(quarters.slice(1))).toBeNull());
  it('rejects currency mismatch', () =>
    expect(
      buildTtm([
        ...quarters.slice(0, 3),
        statement({ ...quarters[3], currencyCode: 'USD' }),
      ]),
    ).toBeNull());
  it('rejects incompatible period spacing', () =>
    expect(
      buildTtm([
        ...quarters.slice(0, 3),
        statement({ ...quarters[3], periodEnd: new Date('2027-01-01Z') }),
      ]),
    ).toBeNull());
});
