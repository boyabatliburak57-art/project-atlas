import {
  createDatabase,
  dataProviders,
  ingestionRuns,
  instruments,
  instrumentSymbolHistory,
  providerInstrumentMappings,
  runMigrations,
} from '@atlas/database';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ProviderRegistry } from '../providers';
import { FakeMarketDataProviderAdapter } from '../providers/testing/fake-market-data-provider';
import { DatabaseInstrumentImportStore } from './database-instrument-import-store';
import { processInstrumentImportJob } from './instrument-import-job';
import { InstrumentImportService } from './instrument-import-service';

function requireTestDatabaseUrl(): string {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (databaseUrl === undefined) {
    throw new Error('TEST_DATABASE_URL is required for integration tests');
  }
  if (!new URL(databaseUrl).pathname.slice(1).endsWith('_test')) {
    throw new Error('TEST_DATABASE_URL database name must end with _test');
  }
  return databaseUrl;
}

const capabilities = {
  supportedTimeframes: ['1d'],
  dataMode: 'end-of-day',
  historicalDepthDays: 3650,
  supportsCorporateActions: false,
  supportsFundamentals: false,
  supportsPagination: false,
  rateLimit: null,
};

const barBatch = { bars: [] };
const initialProviderInstruments = [
  {
    providerSymbol: 'THYAO.IS',
    symbol: 'thyao',
    name: 'Türk Hava Yolları A.O.',
    marketCode: 'BIST',
    currencyCode: 'try',
    isin: 'TRATHYAO91M5',
  },
  {
    providerSymbol: 'BIMAS.IS',
    symbol: 'BIMAS',
    name: 'BİM Birleşik Mağazalar A.Ş.',
    marketCode: 'BIST',
    currencyCode: 'TRY',
    isin: 'TREBIMM00018',
    status: 'suspended',
  },
];

const silentLogger = {
  info: () => undefined,
  error: () => undefined,
};

describe('BIST instrument import pipeline', () => {
  const { db, pool } = createDatabase(requireTestDatabaseUrl());

  beforeAll(async () => {
    await pool.query('drop schema if exists public cascade');
    await pool.query('drop schema if exists drizzle cascade');
    await pool.query('create schema public');
    await runMigrations(db);

    const providerRows = await db
      .insert(dataProviders)
      .values({
        code: 'fake-provider',
        name: 'Fake Provider',
        status: 'active',
      })
      .returning({ id: dataProviders.id });
    const providerId = providerRows[0]?.id;
    if (providerId === undefined) {
      throw new Error('Test provider was not created');
    }
    const instrumentRows = await db
      .insert(instruments)
      .values({
        symbol: 'OLD',
        normalizedSymbol: 'OLD',
        name: 'Old Instrument',
        marketCode: 'BIST',
        currencyCode: 'TRY',
        status: 'active',
      })
      .returning({ id: instruments.id });
    await db.insert(providerInstrumentMappings).values({
      providerId,
      instrumentId: instrumentRows[0]?.id ?? '',
      providerSymbol: 'OLD.IS',
      providerMarket: 'BIST',
      active: true,
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  function createService(providerInstruments: readonly unknown[]) {
    const registry = new ProviderRegistry();
    registry.register(
      new FakeMarketDataProviderAdapter({
        capabilities,
        instruments: providerInstruments,
        barBatch,
      }),
    );
    return new InstrumentImportService({
      store: new DatabaseInstrumentImportStore(db),
      logger: silentLogger,
      listInstruments: (providerCode) =>
        registry.resolve(providerCode).listInstruments(),
    });
  }

  it('imports idempotently, preserves missing mappings and records each run', async () => {
    const service = createService(initialProviderInstruments);

    const first = await processInstrumentImportJob(
      { data: { providerCode: 'fake-provider', dryRun: false } },
      service,
    );
    const second = await processInstrumentImportJob(
      { data: { providerCode: 'fake-provider', dryRun: false } },
      service,
    );

    expect(first).toMatchObject({
      acceptedCount: 2,
      createdCount: 2,
      mappingCreatedCount: 2,
      rejectedCount: 0,
    });
    expect(first.deactivationCandidates).toEqual(['OLD.IS']);
    expect(second).toMatchObject({
      createdCount: 0,
      mappingCreatedCount: 0,
      updatedCount: 0,
    });

    const counts = await db.execute<{
      instruments: string;
      mappings: string;
      runs: string;
    }>(sql`
      select
        (select count(*)::text from instruments) as instruments,
        (select count(*)::text from provider_instrument_mappings) as mappings,
        (select count(*)::text from ingestion_runs) as runs
    `);
    expect(counts.rows[0]).toEqual({
      instruments: '3',
      mappings: '3',
      runs: '2',
    });

    const oldMapping = await db
      .select({ active: providerInstrumentMappings.active })
      .from(providerInstrumentMappings)
      .where(eq(providerInstrumentMappings.providerSymbol, 'OLD.IS'));
    expect(oldMapping[0]?.active).toBe(true);
  });

  it('reports a dry-run without changing any database table', async () => {
    const before = await databaseCounts();
    const service = createService([
      ...initialProviderInstruments,
      {
        providerSymbol: 'ASELS.IS',
        symbol: 'ASELS',
        name: 'ASELSAN Elektronik Sanayi ve Ticaret A.Ş.',
        marketCode: 'BIST',
        currencyCode: 'TRY',
        isin: 'TRAASELS91H2',
      },
    ]);

    const result = await processInstrumentImportJob(
      { data: { providerCode: 'fake-provider', dryRun: true } },
      service,
    );

    expect(result).toMatchObject({
      createdCount: 1,
      dryRun: true,
      runId: null,
    });
    expect(await databaseCounts()).toEqual(before);
  });

  it('uses ISIN to update a changed symbol without duplicating the instrument', async () => {
    const service = createService([
      {
        ...initialProviderInstruments[0],
        providerSymbol: 'THYAO.NEW',
        symbol: 'THYAX',
      },
      initialProviderInstruments[1],
    ]);

    const result = await processInstrumentImportJob(
      { data: { providerCode: 'fake-provider', dryRun: false } },
      service,
    );

    expect(result).toMatchObject({
      createdCount: 0,
      mappingCreatedCount: 1,
      updatedCount: 1,
    });
    const matching = await db
      .select({ symbol: instruments.symbol })
      .from(instruments)
      .where(eq(instruments.isin, 'TRATHYAO91M5'));
    expect(matching).toEqual([{ symbol: 'THYAX' }]);

    const history = await db
      .select({ symbol: instrumentSymbolHistory.symbol })
      .from(instrumentSymbolHistory);
    expect(history).toContainEqual({ symbol: 'THYAO' });
  });

  it('records a safe failed ingestion run when provider data is malformed', async () => {
    const service = createService([{ raw: 'unexpected-provider-shape' }]);

    await expect(
      processInstrumentImportJob(
        { data: { providerCode: 'fake-provider', dryRun: false } },
        service,
      ),
    ).rejects.toMatchObject({ code: 'PROVIDER_MALFORMED_RESPONSE' });

    const failedRuns = await db
      .select({
        errorCode: ingestionRuns.errorCode,
        status: ingestionRuns.status,
      })
      .from(ingestionRuns)
      .where(eq(ingestionRuns.status, 'failed'));
    expect(failedRuns).toContainEqual({
      errorCode: 'PROVIDER_MALFORMED_RESPONSE',
      status: 'failed',
    });
  });

  async function databaseCounts() {
    const result = await db.execute<{
      instruments: string;
      mappings: string;
      runs: string;
    }>(sql`
      select
        (select count(*)::text from instruments) as instruments,
        (select count(*)::text from provider_instrument_mappings) as mappings,
        (select count(*)::text from ingestion_runs) as runs
    `);
    return result.rows[0];
  }
});
