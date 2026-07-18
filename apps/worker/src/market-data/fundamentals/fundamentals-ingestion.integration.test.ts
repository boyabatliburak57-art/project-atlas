import {
  createDatabase,
  dataProviders,
  fundamentalMetricSnapshots,
  fundamentalRatioSnapshots,
  fundamentalStatementSnapshots,
  instruments,
  providerInstrumentMappings,
  runMigrations,
} from '@atlas/database';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DatabaseFundamentalsStore } from './database-fundamentals-store';
import { FakeFundamentalsProvider } from './fake-fundamentals-provider';
import { processFundamentalsIngestionJob } from './fundamentals-ingestion-job';
import { FundamentalsIngestionService } from './fundamentals-ingestion-service';
import { FundamentalsProviderError } from './contracts';

function databaseUrl() {
  const value = process.env.TEST_DATABASE_URL;
  if (!value || !new URL(value).pathname.endsWith('_test'))
    throw new Error('TEST_DATABASE_URL must end with _test');
  return value;
}
const period = {
  fiscalYear: 2025,
  fiscalPeriod: 'FY',
  periodType: 'annual' as const,
  periodStart: new Date('2025-01-01Z'),
  periodEnd: new Date('2025-12-31Z'),
};
const base = {
  providerSymbol: 'THYAO.IS',
  ...period,
  providerRevision: 'r1',
  publishedAt: new Date('2026-02-01Z'),
  sourceTimestamp: new Date('2026-02-01Z'),
  currencyCode: 'TRY',
  unitScale: '1000',
  metrics: {
    revenue: '10',
    netIncome: '2',
    operatingCashFlow: '3',
    capitalExpenditure: '1',
  },
};
const capabilities = {
  supportsAnnual: true,
  supportsQuarterly: true,
  supportedCurrencies: ['TRY'],
  supportedMetrics: ['revenue' as const],
  revisionMode: 'immutable' as const,
};

describe('fundamentals worker ingestion with PostgreSQL', () => {
  const { db, pool } = createDatabase(databaseUrl());
  let store: DatabaseFundamentalsStore;
  beforeAll(async () => {
    await pool.query('drop schema if exists public cascade');
    await pool.query('drop schema if exists drizzle cascade');
    await pool.query('create schema public');
    await runMigrations(db);
    const provider = (
      await db
        .insert(dataProviders)
        .values({
          code: 'fake-fundamentals',
          name: 'Fake Fundamentals',
          status: 'active',
        })
        .returning({ id: dataProviders.id })
    )[0]!;
    const instrument = (
      await db
        .insert(instruments)
        .values({
          symbol: 'THYAO',
          normalizedSymbol: 'THYAO',
          name: 'THY',
          marketCode: 'BIST',
          currencyCode: 'TRY',
          status: 'active',
        })
        .returning({ id: instruments.id })
    )[0]!;
    await db.insert(providerInstrumentMappings).values({
      providerId: provider.id,
      instrumentId: instrument.id,
      providerSymbol: 'THYAO.IS',
    });
    store = new DatabaseFundamentalsStore(db);
  });
  afterAll(() => pool.end());

  it('normalizes units, derives FCF and makes duplicate batches idempotent', async () => {
    const provider = new FakeFundamentalsProvider(
      'fake-fundamentals',
      capabilities,
      [base],
    );
    const service = new FundamentalsIngestionService(provider, store);
    expect(
      await processFundamentalsIngestionJob(
        {
          data: { providerCode: provider.code, providerSymbol: 'THYAO.IS' },
        } as never,
        service,
      ),
    ).toMatchObject({ insertedStatements: 1, duplicateStatements: 0 });
    expect(await service.execute('THYAO.IS')).toMatchObject({
      insertedStatements: 0,
      duplicateStatements: 1,
    });
    const metrics = await db.select().from(fundamentalMetricSnapshots);
    expect(metrics.find((m) => m.metricCode === 'revenue')?.value).toBe(
      '10000.0000000000',
    );
    expect(metrics.find((m) => m.metricCode === 'freeCashFlow')?.value).toBe(
      '2000.0000000000',
    );
    expect(metrics.find((m) => m.metricCode === 'ebitda')).toMatchObject({
      value: null,
      status: 'missing',
      reasonCode: 'PROVIDER_METRIC_MISSING',
    });
    const ratios = await db.select().from(fundamentalRatioSnapshots);
    expect(ratios).toHaveLength(14);
    expect(ratios.find((ratio) => ratio.ratioCode === 'pe')).toMatchObject({
      value: null,
      status: 'not_evaluable',
      reasonCode: 'MARKET_DATA_MISSING',
      formulaVersion: 'fundamentals-ratios-v1',
    });
  });
  it('preserves restatements as immutable revisions', async () => {
    const provider = new FakeFundamentalsProvider(
      'fake-fundamentals',
      capabilities,
      [
        {
          ...base,
          providerRevision: 'r2',
          sourceTimestamp: new Date('2026-02-02Z'),
          metrics: { ...base.metrics, revenue: '11' },
        },
      ],
    );
    await new FundamentalsIngestionService(provider, store).execute('THYAO.IS');
    const rows = await db
      .select()
      .from(fundamentalStatementSnapshots)
      .where(eq(fundamentalStatementSnapshots.fiscalYear, 2025));
    expect(rows.map((r) => r.providerRevision).sort()).toEqual(['r1', 'r2']);
  });
  it('classifies transient and permanent provider errors', () => {
    expect(
      new FundamentalsProviderError('FUNDAMENTALS_TIMEOUT').retryable,
    ).toBe(true);
    expect(
      new FundamentalsProviderError('FUNDAMENTALS_INVALID_SYMBOL').retryable,
    ).toBe(false);
  });
});
