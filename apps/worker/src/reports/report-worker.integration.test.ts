import { createHash } from 'node:crypto';

import {
  createDatabase,
  generatedReports,
  runMigrations,
  securityUsers,
} from '@atlas/database';
import {
  ATLAS_JOB_NAMES,
  type ReportGenerationQueuePayload,
} from '@atlas/types';
import { eq } from 'drizzle-orm';
import { Queue, QueueEvents } from 'bullmq';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { parseEnvironment } from '../config/environment';
import { StructuredLogger } from '../observability/structured-logger';
import {
  createReportGenerationJobId,
  DEFAULT_JOB_OPTIONS,
  QUEUE_NAMES,
} from '../queue/queue-contracts';
import { createRedisConnection } from '../queue/redis-connection';
import { WorkerRuntime } from '../runtime/worker-runtime';
import { createDefaultReportComposition } from './report-composition';

function requireTestDatabaseUrl(): string {
  const value = process.env.TEST_DATABASE_URL;
  if (
    value === undefined ||
    !new URL(value).pathname.slice(1).endsWith('_test')
  )
    throw new Error('TEST_DATABASE_URL with an _test database is required');
  return value;
}

const databaseUrl = requireTestDatabaseUrl();
const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
const ownerUserId = '00000000-0000-4000-8000-000000001901';
const foreignUserId = '00000000-0000-4000-8000-000000001902';
const reportId = '00000000-0000-4000-8000-000000001911';
const pdfReportId = '00000000-0000-4000-8000-000000001912';

describe('production report PostgreSQL and BullMQ wiring', () => {
  const { db, pool } = createDatabase(databaseUrl);
  const connection = createRedisConnection(redisUrl);
  const queue = new Queue<ReportGenerationQueuePayload>(QUEUE_NAMES.reports, {
    connection,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
  const events = new QueueEvents(QUEUE_NAMES.reports, { connection });
  const logger = new StructuredLogger('error', { write: () => undefined });
  const noOp = {
    process: () => Promise.resolve(),
    close: () => Promise.resolve(),
  };
  const noOpAlert = { ...noOp, catchUp: () => Promise.resolve(0) };
  const noOpNotification = {
    ...noOp,
    catchUp: () => Promise.resolve(0),
    handleTriggerIds: () => Promise.resolve(),
  };
  const noOpExperiment = {
    ...noOp,
    reconcile: () => Promise.resolve(0),
  };
  let runtime: WorkerRuntime;

  beforeAll(async () => {
    await pool.query('drop schema if exists public cascade');
    await pool.query('drop schema if exists drizzle cascade');
    await pool.query('create schema public');
    await runMigrations(db);
    await Promise.all([queue.waitUntilReady(), events.waitUntilReady()]);
    await queue.obliterate({ force: true });
    await db.insert(securityUsers).values([
      {
        id: ownerUserId,
        email: 'report-owner@example.test',
        normalizedEmail: 'report-owner@example.test',
        passwordHash: 'not-a-real-password-hash',
      },
      {
        id: foreignUserId,
        email: 'report-foreign@example.test',
        normalizedEmail: 'report-foreign@example.test',
        passwordHash: 'not-a-real-password-hash',
      },
    ]);
    await db.insert(generatedReports).values({
      id: reportId,
      ownerUserId,
      reportType: 'portfolio',
      sourceType: 'portfolio',
      status: 'queued',
      requestHash: createHash('sha256').update(reportId).digest('hex'),
      sourceRevisions: { format: 'csv', schema: 'report-v1' },
      dataCutoffAt: new Date('2026-08-08T09:00:00Z'),
      expiresAt: new Date('2026-08-09T09:00:00Z'),
    });
    runtime = await WorkerRuntime.start(
      parseEnvironment({
        DATABASE_URL: databaseUrl,
        REDIS_URL: redisUrl,
        WORKER_CONCURRENCY: 1,
        WORKER_ROLE: 'report',
      }),
      logger,
      noOp,
      noOp,
      noOpAlert,
      noOpNotification,
      noOp,
      noOpExperiment,
      createDefaultReportComposition(
        parseEnvironment({
          DATABASE_URL: databaseUrl,
          REDIS_URL: redisUrl,
          WORKER_CONCURRENCY: 1,
          WORKER_ROLE: 'report',
        }),
        logger,
      ),
    );
  }, 30_000);

  afterAll(async () => {
    await runtime?.stop('report-integration-complete');
    await Promise.allSettled([events.close(), queue.close(), pool.end()]);
  });

  it('persists an owner-scoped checksum through the production queue and worker', async () => {
    const job = await queue.add(
      ATLAS_JOB_NAMES.reportGenerate,
      { reportId, ownerUserId, correlationId: 'report-integration-owner' },
      { jobId: createReportGenerationJobId(reportId) },
    );
    await job.waitUntilFinished(events, 10_000);

    const [report] = await db
      .select()
      .from(generatedReports)
      .where(eq(generatedReports.id, reportId));
    expect(report?.sourceRevisions).toMatchObject({
      artifactChecksumSha256: createHash('sha256')
        .update(report!.artifactPayload!)
        .digest('hex'),
      workerContract: 'report-worker-v1',
    });
    expect(report).toMatchObject({
      status: 'ready',
      contentType: 'text/csv; charset=utf-8',
    });
    expect(report?.storageKey).not.toContain(ownerUserId);
  });

  it('rejects a foreign owner without mutating the report', async () => {
    const job = await queue.add(
      ATLAS_JOB_NAMES.reportGenerate,
      {
        reportId,
        ownerUserId: foreignUserId,
        correlationId: 'report-integration-foreign',
      },
      { jobId: `${createReportGenerationJobId(reportId)}-foreign` },
    );
    await expect(job.waitUntilFinished(events, 10_000)).rejects.toThrow(
      'REPORT_NOT_FOUND',
    );
    const [report] = await db
      .select()
      .from(generatedReports)
      .where(eq(generatedReports.id, reportId));
    expect(report?.sourceRevisions).toMatchObject({
      workerContract: 'report-worker-v1',
    });
  });

  it('generates a human-readable PDF artifact in the worker', async () => {
    await db.insert(generatedReports).values({
      id: pdfReportId,
      ownerUserId,
      reportType: 'backtest',
      sourceType: 'backtest',
      status: 'queued',
      requestHash: createHash('sha256').update(pdfReportId).digest('hex'),
      sourceRevisions: { format: 'pdf', schema: 'report-v1' },
      dataCutoffAt: new Date('2026-08-08T09:00:00Z'),
      expiresAt: new Date('2026-08-09T09:00:00Z'),
    });
    const job = await queue.add(
      ATLAS_JOB_NAMES.reportGenerate,
      {
        reportId: pdfReportId,
        ownerUserId,
        correlationId: 'report-integration-pdf',
      },
      { jobId: createReportGenerationJobId(pdfReportId) },
    );
    await job.waitUntilFinished(events, 10_000);
    const [report] = await db
      .select()
      .from(generatedReports)
      .where(eq(generatedReports.id, pdfReportId));
    expect(report?.contentType).toBe('application/pdf');
    expect(report?.artifactPayload?.subarray(0, 8).toString()).toBe('%PDF-1.4');
    expect(report?.artifactPayload?.toString()).toContain('Methodology');
  });
});
