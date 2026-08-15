import {
  createDatabase,
  corporateDisclosureRevisionLinks,
  corporateDisclosureRevisions,
  dataProviders,
  dataQualityIssues,
  instruments,
  intelligenceCompanies,
  intelligenceExternalIdentityMappings,
  intelligenceInstitutions,
  intelligenceMarketEvents,
  institutionalFlowObservations,
  priceBars,
  providerInstrumentMappings,
  providerConnections,
  settlementSnapshots,
  runMigrations,
} from '@atlas/database';
import { count, eq } from 'drizzle-orm';
import type { KapProviderDisclosure } from '@atlas/domain';
import { Queue, QueueEvents } from 'bullmq';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { parseEnvironment } from '../config/environment';
import { createMarketDataComposition } from '../market-data/market-data-composition';
import type {
  FetchBarsRequest,
  RawMarketDataProviderAdapter,
} from '../market-data/providers';
import { ProviderError } from '../market-data/providers';
import { FakeMarketDataProviderAdapter } from '../market-data/providers/testing/fake-market-data-provider';
import {
  StructuredLogger,
  type LogSink,
} from '../observability/structured-logger';
import {
  enqueueBarIngestion,
  enqueueInstitutionalFlowSync,
  enqueueKapDisclosureSync,
  enqueueInstrumentSync,
  enqueueSettlementSync,
} from '../queue/market-data-queue';
import { DEFAULT_JOB_OPTIONS, QUEUE_NAMES } from '../queue/queue-contracts';
import { createRedisConnection } from '../queue/redis-connection';
import { WorkerRuntime } from './worker-runtime';
import type { KapDisclosureProvider } from '../intelligence/kap';
import type {
  InstitutionalFlowProviderAdapter,
  SettlementProviderAdapter,
} from '../intelligence/institutional';

function requireTestDatabaseUrl(): string {
  const value = process.env.TEST_DATABASE_URL;
  if (
    value === undefined ||
    !new URL(value).pathname.slice(1).endsWith('_test')
  ) {
    throw new Error('TEST_DATABASE_URL with an _test database is required');
  }
  return value;
}

const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
const capabilities = {
  supportedTimeframes: ['1d'],
  dataMode: 'end-of-day',
  historicalDepthDays: 3650,
  supportsCorporateActions: false,
  supportsFundamentals: false,
  supportsPagination: false,
  rateLimit: null,
};
const instrument = {
  providerSymbol: 'THYAO.IS',
  symbol: 'THYAO',
  name: 'Türk Hava Yolları A.O.',
  marketCode: 'BIST',
  currencyCode: 'TRY',
  isin: 'TRATHYAO91M5',
};
const validBar = {
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

class TransientProvider implements RawMarketDataProviderAdapter {
  readonly code = 'transient-provider';
  fetchAttempts = 0;

  getCapabilities(): unknown {
    return capabilities;
  }

  listInstruments(): Promise<unknown> {
    return Promise.resolve([instrument]);
  }

  fetchBars(_request: FetchBarsRequest): Promise<unknown> {
    void _request;
    this.fetchAttempts += 1;
    if (this.fetchAttempts === 1) {
      return Promise.reject(new ProviderError('PROVIDER_UNAVAILABLE'));
    }
    return Promise.resolve({ bars: [validBar] });
  }
}

class KapContractProvider implements KapDisclosureProvider {
  readonly code = 'kap-contract';
  readonly dataset = 'kap-contract-v1';
  readonly deliveryMode = 'DELAYED' as const;
  readonly license = {
    licenseClass: 'DELAYED_DISPLAY_ONLY' as const,
    redistribution: ['EXPORT_PROHIBITED' as const, 'SHARE_PROHIBITED' as const],
  };
  readonly allowedSourceHosts = new Set(['kap.example.test']);
  fetchDisclosures() {
    // Correction deliberately arrives before its prior revision.
    return Promise.resolve({
      items: [
        kapFixture({
          providerRevision: '2',
          state: 'CORRECTED',
          supersedesProviderRevision: '1',
          title: 'Düzeltilmiş bildirim',
        }),
        kapFixture(),
      ],
      nextCursor: 'checkpoint-2',
    });
  }
}

class InstitutionalContractProvider
  implements InstitutionalFlowProviderAdapter, SettlementProviderAdapter
{
  readonly code = 'institutional-contract';
  readonly dataset = 'institutional-contract-v1';
  readonly deliveryMode = 'DELAYED' as const;
  readonly license = {
    licenseClass: 'DELAYED_DISPLAY_ONLY' as const,
    redistribution: ['EXPORT_PROHIBITED' as const, 'SHARE_PROHIBITED' as const],
  };
  fetchInstitutionalFlows() {
    return Promise.resolve({
      items: [
        {
          instrumentExternalId: 'instrument-thy',
          institutionExternalId: 'institution-test',
          tradeDate: '2026-08-13',
          buyValue: '120.25',
          sellValue: '20.10',
          currency: 'TRY',
          asOf: '2026-08-13T18:00:00Z',
          dataCutoff: '2026-08-13T18:00:00Z',
          sourceTimestamp: '2026-08-13T18:01:00Z',
          availableAt: '2026-08-13T18:02:00Z',
          providerRevision: 'flow-r1',
          coverageRatio: '0.8',
        },
      ],
      nextCursor: 'flow-checkpoint',
    });
  }
  fetchSettlements() {
    return Promise.resolve({
      items: [
        {
          instrumentExternalId: 'instrument-thy',
          institutionExternalId: 'institution-test',
          tradeDate: '2026-08-13',
          settlementDate: '2026-08-15',
          holdingQuantity: '1000',
          holdingRatio: '0.2',
          changeQuantity: '50',
          changeRatio: '0.01',
          residency: 'UNKNOWN' as const,
          dataCutoff: '2026-08-15T18:00:00Z',
          sourceTimestamp: '2026-08-15T18:01:00Z',
          availableAt: '2026-08-13T18:02:00Z',
          providerRevision: 'settlement-r1',
          coverageRatio: '0.7',
        },
      ],
      nextCursor: 'settlement-checkpoint',
    });
  }
}

describe('market-data BullMQ composition root', () => {
  const databaseUrl = requireTestDatabaseUrl();
  const { db, pool } = createDatabase(databaseUrl);
  const connection = createRedisConnection(redisUrl);
  const queue = new Queue(QUEUE_NAMES.marketData, {
    connection,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
  const queueEvents = new QueueEvents(QUEUE_NAMES.marketData, { connection });
  const logLines: string[] = [];
  const sink: LogSink = { write: (line) => logLines.push(line) };
  const logger = new StructuredLogger('debug', sink);
  const transientProvider = new TransientProvider();
  let runtime: WorkerRuntime;

  beforeAll(async () => {
    await pool.query('drop schema if exists public cascade');
    await pool.query('drop schema if exists drizzle cascade');
    await pool.query('create schema public');
    await runMigrations(db);
    await queue.waitUntilReady();
    await queueEvents.waitUntilReady();
    await queue.obliterate({ force: true });

    await db.insert(dataProviders).values([
      { code: 'fake-provider', name: 'Fake Provider', status: 'active' },
      {
        code: 'transient-provider',
        name: 'Transient Provider',
        status: 'active',
      },
      {
        code: 'kap-contract',
        name: 'KAP Contract Test Provider',
        status: 'active',
      },
      {
        code: 'institutional-contract',
        name: 'Institutional Contract Test Provider',
        status: 'active',
      },
    ]);
    await db.insert(providerConnections).values({
      providerKey: 'kap-contract',
      environment: 'test',
      status: 'healthy',
      credentialReference: 'secret://test/kap-contract',
      capabilities: ['disclosure.kap'],
      licenseMetadata: { fixture: true },
    });
    await db.insert(providerConnections).values({
      providerKey: 'institutional-contract',
      environment: 'test',
      status: 'healthy',
      credentialReference: 'secret://test/institutional-contract',
      capabilities: ['institutional.akd', 'settlement.snapshot'],
      licenseMetadata: { fixture: true },
    });

    const fakeProvider = new FakeMarketDataProviderAdapter({
      capabilities,
      instruments: [instrument],
      barBatch: {
        bars: [
          validBar,
          {
            ...validBar,
            timeframe: '1h',
            openTime: '2026-07-02T07:00:00.000Z',
            closeTime: '2026-07-02T08:00:00.000Z',
          },
        ],
      },
    });
    const composition = createMarketDataComposition({
      database: db,
      logger,
      providerAdapters: [fakeProvider, transientProvider],
      kapProviders: [new KapContractProvider()],
      institutionalFlowProviders: [new InstitutionalContractProvider()],
      settlementProviders: [new InstitutionalContractProvider()],
      close: () => pool.end(),
    });
    runtime = await WorkerRuntime.start(
      parseEnvironment({
        DATABASE_URL: databaseUrl,
        REDIS_URL: redisUrl,
        WORKER_CONCURRENCY: 1,
        WORKER_HEARTBEAT_INTERVAL_MS: 60_000,
      }),
      logger,
      composition,
    );
  });

  afterAll(async () => {
    await runtime?.stop('integration-test-cleanup');
    await Promise.allSettled([queueEvents.close(), queue.close(), pool.end()]);
  });

  it('processes handlers, enforces retry/idempotency, logs context and shuts down', async () => {
    const firstImport = await enqueueInstrumentSync(
      queue,
      {
        providerCode: 'fake-provider',
        dryRun: false,
        correlationId: 'correlation-instrument',
      },
      'bist-daily-2026-07-12',
    );
    await firstImport.waitUntilFinished(queueEvents, 10_000);
    const duplicateImport = await enqueueInstrumentSync(
      queue,
      {
        providerCode: 'fake-provider',
        dryRun: false,
        correlationId: 'correlation-instrument',
      },
      'bist-daily-2026-07-12',
    );
    expect(duplicateImport.id).toBe(firstImport.id);
    expect(await db.select({ value: count() }).from(instruments)).toEqual([
      { value: 1 },
    ]);
    const kapProvider = (
      await db
        .select({ id: dataProviders.id })
        .from(dataProviders)
        .where(eq(dataProviders.code, 'kap-contract'))
    )[0]!;
    const canonicalInstrument = (
      await db.select({ id: instruments.id }).from(instruments)
    )[0]!;
    const company = (
      await db
        .insert(intelligenceCompanies)
        .values({
          canonicalName: 'Test Hava Yolları',
          primaryInstrumentId: canonicalInstrument.id,
          active: true,
        })
        .returning({ id: intelligenceCompanies.id })
    )[0]!;
    await db.insert(intelligenceExternalIdentityMappings).values([
      {
        providerId: kapProvider.id,
        entityType: 'COMPANY',
        externalId: 'company-thy',
        canonicalEntityId: company.id,
        validFrom: new Date('2020-01-01'),
        confidence: '1',
        status: 'RESOLVED',
        source: 'contract',
        manualReviewState: 'APPROVED',
      },
      {
        providerId: kapProvider.id,
        entityType: 'INSTRUMENT',
        externalId: 'instrument-thy',
        canonicalEntityId: canonicalInstrument.id,
        validFrom: new Date('2020-01-01'),
        confidence: '1',
        status: 'RESOLVED',
        source: 'contract',
        manualReviewState: 'APPROVED',
      },
    ]);
    const kapJob = await enqueueKapDisclosureSync(queue, {
      providerCode: 'kap-contract',
      from: '2026-08-13T00:00:00.000Z',
      to: '2026-08-13T23:00:00.000Z',
      cursor: null,
      limit: 100,
      correlationId: 'correlation-kap',
    });
    await kapJob.waitUntilFinished(queueEvents, 10_000);
    expect(
      await db.select({ value: count() }).from(corporateDisclosureRevisions),
    ).toEqual([{ value: 2 }]);
    expect(
      await db.select({ value: count() }).from(intelligenceMarketEvents),
    ).toEqual([{ value: 2 }]);
    expect(
      await db
        .select({ value: count() })
        .from(corporateDisclosureRevisionLinks),
    ).toEqual([{ value: 1 }]);
    const link = (await db.select().from(corporateDisclosureRevisionLinks))[0]!;
    expect(link).toMatchObject({ resolutionState: 'COMPLETE' });
    expect(link.parentRevisionId).not.toBeNull();
    const duplicateKap = await enqueueKapDisclosureSync(queue, {
      providerCode: 'kap-contract',
      from: '2026-08-13T00:00:00.000Z',
      to: '2026-08-13T23:00:00.000Z',
      cursor: null,
      limit: 100,
      correlationId: 'correlation-kap',
    });
    expect(duplicateKap.id).toBe(kapJob.id);

    const institutionalProvider = (
      await db
        .select({ id: dataProviders.id })
        .from(dataProviders)
        .where(eq(dataProviders.code, 'institutional-contract'))
    )[0]!;
    const canonicalInstitution = (
      await db
        .insert(intelligenceInstitutions)
        .values({
          type: 'BROKERAGE',
          canonicalName: 'Canonical Test Institution',
          code: 'CTI',
          validFrom: '2020-01-01',
        })
        .returning({ id: intelligenceInstitutions.id })
    )[0]!;
    await db.insert(intelligenceExternalIdentityMappings).values([
      {
        providerId: institutionalProvider.id,
        entityType: 'INSTRUMENT',
        externalId: 'instrument-thy',
        canonicalEntityId: canonicalInstrument.id,
        validFrom: new Date('2020-01-01'),
        confidence: '1',
        status: 'RESOLVED',
        source: 'contract',
        manualReviewState: 'APPROVED',
      },
      {
        providerId: institutionalProvider.id,
        entityType: 'INSTITUTION',
        externalId: 'institution-test',
        canonicalEntityId: canonicalInstitution.id,
        validFrom: new Date('2020-01-01'),
        confidence: '1',
        status: 'RESOLVED',
        source: 'contract',
        manualReviewState: 'APPROVED',
      },
    ]);
    const institutionalJobData = {
      providerCode: 'institutional-contract',
      from: '2026-08-13T00:00:00.000Z',
      to: '2026-08-15T23:00:00.000Z',
      cursor: null,
      limit: 100,
      correlationId: 'correlation-institutional',
    };
    const flowJob = await enqueueInstitutionalFlowSync(
      queue,
      institutionalJobData,
    );
    await flowJob.waitUntilFinished(queueEvents, 10_000);
    const settlementJob = await enqueueSettlementSync(
      queue,
      institutionalJobData,
    );
    await settlementJob.waitUntilFinished(queueEvents, 10_000);
    expect(
      await db.select({ value: count() }).from(institutionalFlowObservations),
    ).toEqual([{ value: 1 }]);
    expect(
      await db.select({ value: count() }).from(settlementSnapshots),
    ).toEqual([{ value: 1 }]);
    expect(
      (await enqueueInstitutionalFlowSync(queue, institutionalJobData)).id,
    ).toBe(flowJob.id);
    expect((await enqueueSettlementSync(queue, institutionalJobData)).id).toBe(
      settlementJob.id,
    );

    const barJob = await enqueueBarIngestion(queue, {
      providerCode: 'fake-provider',
      providerSymbol: 'THYAO.IS',
      timeframe: '1d',
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-10T00:00:00.000Z',
      correlationId: 'correlation-bars',
    });
    await barJob.waitUntilFinished(queueEvents, 10_000);
    expect(await db.select({ value: count() }).from(priceBars)).toEqual([
      { value: 1 },
    ]);
    expect(await db.select({ value: count() }).from(dataQualityIssues)).toEqual(
      [{ value: 1 }],
    );

    const unsupported = await enqueueBarIngestion(
      queue,
      {
        providerCode: 'fake-provider',
        providerSymbol: 'THYAO.IS',
        timeframe: '1h',
        from: '2026-07-03T00:00:00.000Z',
        to: '2026-07-04T00:00:00.000Z',
      },
      { attempts: 3, backoff: { type: 'fixed', delay: 10 } },
    );
    await expect(
      unsupported.waitUntilFinished(queueEvents, 10_000),
    ).rejects.toThrow();
    expect((await queue.getJob(unsupported.id ?? ''))?.attemptsMade).toBe(1);

    const transientProviderRow = await db
      .select({ id: dataProviders.id })
      .from(dataProviders)
      .where(eq(dataProviders.code, 'transient-provider'));
    const instrumentRow = await db
      .select({ id: instruments.id })
      .from(instruments);
    await db.insert(providerInstrumentMappings).values({
      providerId: transientProviderRow[0]?.id ?? '',
      instrumentId: instrumentRow[0]?.id ?? '',
      providerSymbol: 'THYAO.IS',
      providerMarket: 'BIST',
      active: true,
    });
    const transient = await enqueueBarIngestion(
      queue,
      {
        providerCode: 'transient-provider',
        providerSymbol: 'THYAO.IS',
        timeframe: '1d',
        from: '2026-07-01T00:00:00.000Z',
        to: '2026-07-10T00:00:00.000Z',
      },
      { attempts: 2, backoff: { type: 'fixed', delay: 10 } },
    );
    await transient.waitUntilFinished(queueEvents, 10_000);
    expect(transientProvider.fetchAttempts).toBe(2);

    const mismatch = await queue.add(
      'market-data.unknown.v1',
      {},
      { attempts: 3 },
    );
    await expect(
      mismatch.waitUntilFinished(queueEvents, 10_000),
    ).rejects.toThrow();
    expect((await queue.getJob(mismatch.id ?? ''))?.attemptsMade).toBe(1);

    const contextualLog = logLines
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .find((entry) => entry.correlationId === 'correlation-bars');
    expect(contextualLog).toMatchObject({
      correlationId: 'correlation-bars',
      jobId: barJob.id,
    });

    await runtime.stop('integration-test-shutdown');
    const afterShutdown = await enqueueInstrumentSync(
      queue,
      { providerCode: 'fake-provider', dryRun: true },
      'after-shutdown',
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(await afterShutdown.getState()).toBe('waiting');
  }, 30_000);
});

function kapFixture(
  overrides: Partial<KapProviderDisclosure> = {},
): KapProviderDisclosure {
  return {
    externalDisclosureId: 'KAP-THY-1',
    providerRevision: '1',
    supersedesProviderRevision: null,
    state: 'ACTIVE',
    sourceCategory: 'MATERIAL_DISCLOSURE',
    title: 'Özel durum açıklaması',
    sourceSummary: null,
    companyExternalIds: ['company-thy'],
    instrumentExternalIds: ['instrument-thy'],
    publishedAt: '2026-08-13T12:00:00.000Z',
    effectiveAt: null,
    reportingPeriod: null,
    sourceTimestamp: '2026-08-13T12:00:30.000Z',
    availableAt: '2026-08-13T12:01:00.000Z',
    sourceUrl: 'https://kap.example.test/disclosure/thy-1',
    language: 'tr',
    structuredAttributes: {},
    attachments: [],
    ...overrides,
  };
}
