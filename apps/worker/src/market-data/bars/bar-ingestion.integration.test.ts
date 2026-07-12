import {
  createDatabase,
  currentPriceBars,
  dataProviders,
  dataQualityIssues,
  ingestionRuns,
  instruments,
  priceBars,
  providerInstrumentMappings,
  runMigrations,
} from '@atlas/database';
import { and, asc, eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ProviderRegistry } from '../providers';
import { FakeMarketDataProviderAdapter } from '../providers/testing/fake-market-data-provider';
import { BarIngestionService } from './bar-ingestion-service';
import { processBarIngestionJob } from './bar-ingestion-job';
import { DatabaseBarIngestionStore } from './database-bar-ingestion-store';

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
  supportedTimeframes: ['1h', '1d'],
  dataMode: 'end-of-day',
  historicalDepthDays: 3650,
  supportsCorporateActions: false,
  supportsFundamentals: false,
  supportsPagination: false,
  rateLimit: null,
};

const closedBar = {
  providerSymbol: 'THYAO.IS',
  timeframe: '1d',
  openTime: '2026-07-01T07:00:00.000Z',
  closeTime: '2026-07-01T15:00:00.000Z',
  open: '100.00',
  high: '105.00',
  low: '99.00',
  close: '103.00',
  volume: '1000000',
  isClosed: true,
};

const openBar = {
  providerSymbol: 'THYAO.IS',
  timeframe: '1d',
  openTime: '2026-07-02T07:00:00.000Z',
  closeTime: '2026-07-02T15:00:00.000Z',
  open: '103.00',
  high: '106.00',
  low: '102.00',
  close: '105.00',
  volume: '800000',
  isClosed: false,
};

const wrongTimeframeBar = {
  ...closedBar,
  timeframe: '1h',
  openTime: '2026-07-03T07:00:00.000Z',
  closeTime: '2026-07-03T08:00:00.000Z',
};

const silentLogger = {
  info: () => undefined,
  error: () => undefined,
};

describe('OHLCV ingestion core', () => {
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
    const instrumentRows = await db
      .insert(instruments)
      .values({
        symbol: 'THYAO',
        normalizedSymbol: 'THYAO',
        name: 'Türk Hava Yolları A.O.',
        isin: 'TRATHYAO91M5',
        marketCode: 'BIST',
        currencyCode: 'TRY',
        status: 'active',
      })
      .returning({ id: instruments.id });
    const providerId = providerRows[0]?.id;
    const instrumentId = instrumentRows[0]?.id;
    if (providerId === undefined || instrumentId === undefined) {
      throw new Error('Bar ingestion fixtures could not be created');
    }
    await db.insert(providerInstrumentMappings).values({
      providerId,
      instrumentId,
      providerSymbol: 'THYAO.IS',
      providerMarket: 'BIST',
      active: true,
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  function createService(barBatch: unknown) {
    const registry = new ProviderRegistry();
    registry.register(
      new FakeMarketDataProviderAdapter({
        capabilities,
        instruments: [],
        barBatch,
      }),
    );
    return new BarIngestionService({
      store: new DatabaseBarIngestionStore(db),
      logger: silentLogger,
      fetchBars: (providerCode, request) =>
        registry.resolve(providerCode).fetchBars(request),
      now: () => new Date('2026-07-12T00:00:00.000Z'),
    });
  }

  function ingest(service: BarIngestionService, providerSymbol = 'THYAO.IS') {
    return processBarIngestionJob(
      {
        data: {
          providerCode: 'fake-provider',
          providerSymbol,
          timeframe: '1d',
          from: '2026-07-01T00:00:00.000Z',
          to: '2026-07-10T00:00:00.000Z',
        },
      },
      service,
    );
  }

  it('stores valid bars, records invalid bars and remains idempotent', async () => {
    const service = createService({
      bars: [closedBar, openBar, wrongTimeframeBar],
    });

    const first = await ingest(service);
    const second = await ingest(service);

    expect(first).toMatchObject({
      acceptedCount: 2,
      duplicateCount: 0,
      fetchedCount: 3,
      insertedCount: 2,
      qualityIssueCount: 1,
      rejectedCount: 1,
    });
    expect(second).toMatchObject({
      acceptedCount: 0,
      duplicateCount: 2,
      insertedCount: 0,
      rejectedCount: 1,
    });

    const counts = await db.execute<{ bars: string; issues: string }>(sql`
      select
        (select count(*)::text from price_bars) as bars,
        (select count(*)::text from data_quality_issues) as issues
    `);
    expect(counts.rows[0]).toEqual({ bars: '2', issues: '2' });

    const firstRun = await db
      .select({
        acceptedCount: ingestionRuns.acceptedCount,
        fetchedCount: ingestionRuns.fetchedCount,
        rejectedCount: ingestionRuns.rejectedCount,
        status: ingestionRuns.status,
      })
      .from(ingestionRuns)
      .where(eq(ingestionRuns.id, first.runId));
    expect(firstRun[0]).toEqual({
      acceptedCount: 2,
      fetchedCount: 3,
      rejectedCount: 1,
      status: 'completed',
    });
  });

  it('updates and closes an open bar without creating another revision', async () => {
    const updated = await ingest(
      createService({
        bars: [{ ...openBar, close: '105.50', high: '106.50' }],
      }),
    );
    const closed = await ingest(
      createService({
        bars: [
          {
            ...openBar,
            close: '106.00',
            high: '107.00',
            volume: '900000',
            isClosed: true,
          },
        ],
      }),
    );

    expect(updated.updatedOpenCount).toBe(1);
    expect(closed.updatedOpenCount).toBe(1);
    const rows = await db
      .select({ isClosed: priceBars.isClosed, revision: priceBars.revision })
      .from(priceBars)
      .where(eq(priceBars.openTime, new Date(openBar.openTime)));
    expect(rows).toEqual([{ isClosed: true, revision: 1 }]);
  });

  it('creates a new revision for a corrected closed bar and rejects reopening', async () => {
    const correction = {
      ...closedBar,
      high: '106.00',
      close: '104.00',
      volume: '1100000',
    };
    const corrected = await ingest(createService({ bars: [correction] }));
    const repeated = await ingest(createService({ bars: [correction] }));
    const reopened = await ingest(
      createService({ bars: [{ ...correction, isClosed: false }] }),
    );

    expect(corrected.revisedClosedCount).toBe(1);
    expect(repeated.duplicateCount).toBe(1);
    expect(reopened).toMatchObject({
      qualityIssueCount: 1,
      rejectedCount: 1,
    });

    const revisions = await db
      .select({ revision: priceBars.revision })
      .from(priceBars)
      .where(eq(priceBars.openTime, new Date(closedBar.openTime)))
      .orderBy(asc(priceBars.revision));
    expect(revisions).toEqual([{ revision: 1 }, { revision: 2 }]);

    const current = await db
      .select({
        close: currentPriceBars.close,
        revision: currentPriceBars.revision,
      })
      .from(currentPriceBars)
      .where(eq(currentPriceBars.openTime, new Date(closedBar.openTime)));
    expect(current).toEqual([{ close: '104.00', revision: 2 }]);
  });

  it('creates a quality issue when the provider mapping is missing', async () => {
    const result = await ingest(
      createService({
        bars: [{ ...closedBar, providerSymbol: 'UNKNOWN.IS' }],
      }),
      'UNKNOWN.IS',
    );

    expect(result).toMatchObject({
      acceptedCount: 0,
      qualityIssueCount: 1,
      rejectedCount: 1,
    });
    const issues = await db
      .select({ details: dataQualityIssues.details })
      .from(dataQualityIssues)
      .where(eq(dataQualityIssues.openTime, new Date(closedBar.openTime)));
    expect(
      issues.some(
        (issue) =>
          Array.isArray(issue.details.codes) &&
          issue.details.codes.includes('MAPPING_NOT_FOUND'),
      ),
    ).toBe(true);
  });

  it('fails safely and records malformed provider responses', async () => {
    const service = createService({
      bars: [{ ...closedBar, volume: '-1' }],
    });

    await expect(ingest(service)).rejects.toMatchObject({
      code: 'PROVIDER_MALFORMED_RESPONSE',
    });
    const failed = await db
      .select({
        errorCode: ingestionRuns.errorCode,
        status: ingestionRuns.status,
      })
      .from(ingestionRuns)
      .where(
        and(
          eq(ingestionRuns.status, 'failed'),
          eq(ingestionRuns.errorCode, 'PROVIDER_MALFORMED_RESPONSE'),
        ),
      );
    expect(failed.length).toBeGreaterThan(0);
    const providerIssues = await db
      .select({ issueType: dataQualityIssues.issueType })
      .from(dataQualityIssues)
      .where(eq(dataQualityIssues.issueType, 'provider_response_invalid'));
    expect(providerIssues.length).toBeGreaterThan(0);
  });
});
