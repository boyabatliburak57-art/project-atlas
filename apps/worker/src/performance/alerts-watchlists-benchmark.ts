import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { hostname, platform, release } from 'node:os';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

import {
  alertRevisions,
  alerts,
  createDatabase,
  dataProviders,
  instruments,
  notifications,
  priceBars,
  runMigrations,
  watchlistItems,
  watchlists,
} from '@atlas/database';
import { and, count, desc, eq, isNull, lt, or, sql } from 'drizzle-orm';

import { PostgresAlertEvaluationRepository } from '../alerts/postgres-alert-evaluation-repository';
import { summarizeDurations, type DurationSummary } from './statistics';

const ROOT = `${resolve(__dirname, '../../../..')}/`;
const REPORT_DIRECTORY = `${ROOT}reports/performance`;
const DATABASE_URL = requireTestDatabaseUrl();
const OWNER_ID = '60000000-0000-4000-8000-000000000001';
const CUTOFF = new Date('2026-07-16T18:00:00.000Z');
const ALERT_COUNT = 1_000;
const EVALUATION_BATCH_SIZE = 500;
const INSTRUMENT_COUNT = 500;
const NOTIFICATION_COUNT = 10_000;

interface Thresholds {
  readonly 'PERF-AWN-001': {
    readonly p95Ms: number;
    readonly maximumErrors: number;
    readonly candidateCount: number;
  };
  readonly 'PERF-AWN-002': {
    readonly p95Ms: number;
    readonly maximumErrors: number;
    readonly batchSize: number;
  };
  readonly 'PERF-AWN-003': {
    readonly p95Ms: number;
    readonly maximumErrors: number;
  };
  readonly 'PERF-AWN-004': {
    readonly p95Ms: number;
    readonly maximumErrors: number;
    readonly pageSize: number;
  };
  readonly 'PERF-AWN-005': {
    readonly p95Ms: number;
    readonly maximumErrors: number;
    readonly instrumentCount: number;
  };
}

interface Result extends DurationSummary {
  readonly id: string;
  readonly name: string;
  readonly fixtureSize: string;
  readonly repetitions: number;
  readonly errorCount: number;
  readonly threshold: string;
  readonly passed: boolean;
  readonly notes: readonly string[];
}

const thresholds = JSON.parse(
  readFileSync(`${ROOT}performance/thresholds/alerts-watchlists.json`, 'utf8'),
) as Thresholds;

async function main() {
  const { db, pool } = createDatabase(DATABASE_URL);
  try {
    await pool.query('drop schema if exists public cascade');
    await pool.query('drop schema if exists drizzle cascade');
    await pool.query('create schema public');
    await runMigrations(db);
    const fixture = await seedFixture(db);
    const repository = new PostgresAlertEvaluationRepository(db);
    const results = [
      await candidateFiltering(repository, fixture.instrumentIds[0]!),
      await evaluationBatch(repository, fixture.instrumentIds[0]!),
      await unreadCount(db),
      await notificationPagination(db),
      await marketSummary(db, fixture.watchlistId, fixture.instrumentIds),
    ];
    const report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      status: results.every(({ passed }) => passed) ? 'PASS' : 'FAIL',
      environment: {
        hostname: hostname(),
        platform: platform(),
        release: release(),
        node: process.version,
        postgres: (await pool.query<{ version: string }>('show server_version'))
          .rows[0]?.version,
      },
      fixture: {
        activeAlerts: ALERT_COUNT,
        evaluationBatchSize: EVALUATION_BATCH_SIZE,
        notifications: NOTIFICATION_COUNT,
        watchlistInstruments: INSTRUMENT_COUNT,
        externalProvider: false,
      },
      scenarios: results,
    } as const;
    await writeReports(report);
    for (const result of results) {
      process.stdout.write(
        `${result.id} ${result.passed ? 'PASS' : 'FAIL'} p95=${result.p95Ms}ms max=${result.maxMs}ms errors=${result.errorCount}\n`,
      );
    }
    if (report.status === 'FAIL') process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

async function candidateFiltering(
  repository: PostgresAlertEvaluationRepository,
  instrumentId: string,
): Promise<Result> {
  const durations: number[] = [];
  let errors = 0;
  let candidateCount = 0;
  const event = marketEvent('candidate-filter', instrumentId);
  for (let index = 0; index < 23; index += 1) {
    const started = performance.now();
    try {
      candidateCount = (await repository.findCandidates(event)).length;
    } catch {
      errors += 1;
    }
    if (index >= 3) durations.push(performance.now() - started);
  }
  const threshold = thresholds['PERF-AWN-001'];
  return result(
    'PERF-AWN-001',
    '1000 active alert candidate filtering',
    '1 event × 1000 active alerts',
    durations,
    errors,
    threshold.p95Ms,
    candidateCount === threshold.candidateCount,
    [`candidates: ${candidateCount}`],
  );
}

async function evaluationBatch(
  repository: PostgresAlertEvaluationRepository,
  instrumentId: string,
): Promise<Result> {
  const candidates = (
    await repository.findCandidates(marketEvent('batch-source', instrumentId))
  ).slice(0, EVALUATION_BATCH_SIZE);
  const durations: number[] = [];
  let errors = 0;
  let duplicateCount = 0;
  for (let repetition = 0; repetition < 3; repetition += 1) {
    const event = marketEvent(`batch-${repetition}`, instrumentId, repetition);
    const started = performance.now();
    for (const candidate of candidates) {
      try {
        const persisted = await repository.persistEvaluation({
          candidate,
          event,
          evaluation: {
            status: 'matched',
            reasonCode: null,
            matchedInstrumentIds: [instrumentId],
            result: { fixture: true },
          },
          evaluatedAt: new Date(CUTOFF.getTime() + repetition * 60_000),
          durationMs: 0,
        });
        if (persisted.duplicate) duplicateCount += 1;
      } catch {
        errors += 1;
      }
    }
    durations.push(performance.now() - started);
  }
  const threshold = thresholds['PERF-AWN-002'];
  return result(
    'PERF-AWN-002',
    '500 alert evaluation batch',
    '500 candidates × 3 batches',
    durations,
    errors,
    threshold.p95Ms,
    candidates.length === threshold.batchSize && duplicateCount === 0,
    [`batch size: ${candidates.length}`, `duplicates: ${duplicateCount}`],
  );
}

async function unreadCount(
  db: ReturnType<typeof createDatabase>['db'],
): Promise<Result> {
  const durations: number[] = [];
  let errors = 0;
  let unread = 0;
  for (let index = 0; index < 33; index += 1) {
    const started = performance.now();
    try {
      unread =
        (
          await db
            .select({ value: count() })
            .from(notifications)
            .where(
              and(
                eq(notifications.userId, OWNER_ID),
                isNull(notifications.readAt),
              ),
            )
        )[0]?.value ?? 0;
    } catch {
      errors += 1;
    }
    if (index >= 3) durations.push(performance.now() - started);
  }
  const threshold = thresholds['PERF-AWN-003'];
  return result(
    'PERF-AWN-003',
    'Notification unread count',
    `${NOTIFICATION_COUNT} notifications`,
    durations,
    errors,
    threshold.p95Ms,
    unread === NOTIFICATION_COUNT / 2,
    [`unread: ${unread}`],
  );
}

async function notificationPagination(
  db: ReturnType<typeof createDatabase>['db'],
): Promise<Result> {
  const pageSize = thresholds['PERF-AWN-004'].pageSize;
  const durations: number[] = [];
  let errors = 0;
  let cursor: { occurredAt: Date; id: string } | undefined;
  const seen = new Set<string>();
  while (seen.size < NOTIFICATION_COUNT) {
    const started = performance.now();
    try {
      const rows = await db
        .select({ id: notifications.id, occurredAt: notifications.occurredAt })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, OWNER_ID),
            cursor === undefined
              ? undefined
              : or(
                  lt(notifications.occurredAt, cursor.occurredAt),
                  and(
                    eq(notifications.occurredAt, cursor.occurredAt),
                    lt(notifications.id, cursor.id),
                  ),
                ),
          ),
        )
        .orderBy(desc(notifications.occurredAt), desc(notifications.id))
        .limit(pageSize);
      durations.push(performance.now() - started);
      if (rows.length === 0) break;
      rows.forEach(({ id }) => seen.add(id));
      cursor = rows.at(-1);
    } catch {
      errors += 1;
      break;
    }
  }
  const threshold = thresholds['PERF-AWN-004'];
  return result(
    'PERF-AWN-004',
    'Notification cursor pagination',
    `${NOTIFICATION_COUNT} rows / page ${pageSize}`,
    durations,
    errors,
    threshold.p95Ms,
    seen.size === NOTIFICATION_COUNT,
    [`unique rows: ${seen.size}`],
  );
}

async function marketSummary(
  db: ReturnType<typeof createDatabase>['db'],
  watchlistId: string,
  instrumentIds: readonly string[],
): Promise<Result> {
  const durations: number[] = [];
  let errors = 0;
  let rowCount = 0;
  let lastError: string | null = null;
  const instrumentIdArray = sql`array[${sql.join(
    instrumentIds.map((instrumentId) => sql`${instrumentId}`),
    sql`, `,
  )}]::uuid[]`;
  for (let index = 0; index < 13; index += 1) {
    const started = performance.now();
    try {
      const response = await db.execute<{ instrument_id: string }>(sql`
        with ranked as (
          select pb.instrument_id, pb.close, pb.volume, pb.close_time,
            row_number() over (partition by pb.instrument_id order by pb.close_time desc, pb.id desc) as rn
          from price_bars pb
          where pb.instrument_id = any(${instrumentIdArray}) and pb.timeframe = '1d'
            and pb.is_closed = true and pb.close_time <= ${CUTOFF}
        )
        select i.id as instrument_id,
          max(r.close) filter (where r.rn = 1) as last_price,
          (select count(*) from alerts a join alert_revisions ar on ar.alert_id = a.id and ar.revision = a.current_revision
            where a.owner_user_id = ${OWNER_ID} and a.status = 'active'
              and (ar.instrument_id = i.id or ar.watchlist_id = ${watchlistId})) as active_alert_count
        from instruments i left join ranked r on r.instrument_id = i.id and r.rn <= 21
        where i.id = any(${instrumentIdArray})
        group by i.id
      `);
      rowCount = response.rows.length;
    } catch (error: unknown) {
      errors += 1;
      lastError = error instanceof Error ? error.message : String(error);
    }
    if (index >= 3) durations.push(performance.now() - started);
  }
  const threshold = thresholds['PERF-AWN-005'];
  return result(
    'PERF-AWN-005',
    'Watchlist market summary',
    `${INSTRUMENT_COUNT} instruments / 2 bars`,
    durations,
    errors,
    threshold.p95Ms,
    rowCount === threshold.instrumentCount,
    [
      `rows: ${rowCount}`,
      ...(lastError === null ? [] : [`last error: ${lastError}`]),
    ],
  );
}

async function seedFixture(db: ReturnType<typeof createDatabase>['db']) {
  const instrumentIds = Array.from({ length: INSTRUMENT_COUNT }, (_, index) =>
    fixtureId('61', index + 1),
  );
  await db.insert(instruments).values(
    instrumentIds.map((id, index) => ({
      id,
      symbol: `PF${String(index + 1).padStart(4, '0')}`,
      normalizedSymbol: `PF${String(index + 1).padStart(4, '0')}`,
      name: `Performance ${index + 1}`,
      marketCode: 'BIST',
      currencyCode: 'TRY',
      status: 'active',
    })),
  );
  const provider = (
    await db
      .insert(dataProviders)
      .values({
        code: 'alerts-performance',
        name: 'Alerts Performance Fixture',
        status: 'active',
      })
      .returning({ id: dataProviders.id })
  )[0]!;
  const watchlistId = fixtureId('62', 1);
  await db.insert(watchlists).values({
    id: watchlistId,
    ownerUserId: OWNER_ID,
    name: 'Performance Watchlist',
  });
  for (const chunk of chunks(instrumentIds, 250)) {
    await db.insert(watchlistItems).values(
      chunk.map((instrumentId, index) => ({
        watchlistId,
        instrumentId,
        sortOrder: instrumentIds.indexOf(instrumentId) + index * 0,
      })),
    );
  }
  const alertIds = Array.from({ length: ALERT_COUNT }, (_, index) =>
    fixtureId('63', index + 1),
  );
  for (const chunk of chunks(alertIds, 250)) {
    await db.insert(alerts).values(
      chunk.map((id, index) => ({
        id,
        ownerUserId: OWNER_ID,
        name: `Performance Alert ${index}`,
        status: 'active',
        currentRevision: 1,
      })),
    );
    await db.insert(alertRevisions).values(
      chunk.map((alertId) => ({
        alertId,
        revision: 1,
        sourceType: 'instrument_price',
        instrumentId: instrumentIds[0]!,
        triggerPolicy: 'thresholdCrossed',
        repeatPolicy: 'everyNewMatch',
        timeframe: '1d',
        evaluationMode: 'closed_bar',
        sourceConfiguration: { operator: 'GT', threshold: 100 },
        channels: ['in_app'],
        createdBy: OWNER_ID,
        createdAt: new Date('2026-07-15T00:00:00.000Z'),
      })),
    );
  }
  for (const chunk of chunks(
    instrumentIds.flatMap((instrumentId, index) => [
      {
        instrumentId,
        providerId: provider.id,
        timeframe: '1d',
        openTime: new Date('2026-07-14T00:00:00.000Z'),
        closeTime: new Date('2026-07-14T18:00:00.000Z'),
        open: '99',
        high: '102',
        low: '98',
        close: '100',
        volume: String(1_000_000 + index),
        isClosed: true,
      },
      {
        instrumentId,
        providerId: provider.id,
        timeframe: '1d',
        openTime: new Date('2026-07-15T00:00:00.000Z'),
        closeTime: new Date('2026-07-15T18:00:00.000Z'),
        open: '100',
        high: '104',
        low: '99',
        close: '103',
        volume: String(1_100_000 + index),
        isClosed: true,
      },
    ]),
    500,
  ))
    await db.insert(priceBars).values(chunk);
  for (let offset = 0; offset < NOTIFICATION_COUNT; offset += 500) {
    await db.insert(notifications).values(
      Array.from(
        { length: Math.min(500, NOTIFICATION_COUNT - offset) },
        (_, index) => {
          const ordinal = offset + index;
          return {
            userId: OWNER_ID,
            type: 'systemAnnouncement',
            title: `Fixture ${ordinal}`,
            body: 'Performance fixture',
            metadata: {},
            readAt: ordinal % 2 === 0 ? null : CUTOFF,
            occurredAt: new Date(CUTOFF.getTime() - ordinal * 1_000),
            createdAt: CUTOFF,
          };
        },
      ),
    );
  }
  return { instrumentIds, watchlistId };
}

function marketEvent(id: string, instrumentId: string, minute = 0) {
  const cutoff = new Date(CUTOFF.getTime() + minute * 60_000);
  return {
    type: 'market_data_updated' as const,
    eventId: id,
    instrumentId,
    timeframe: '1d',
    barOpenTime: new Date(cutoff.getTime() - 86_400_000).toISOString(),
    dataCutoffAt: cutoff.toISOString(),
    isClosed: true,
  };
}

function result(
  id: string,
  name: string,
  fixtureSize: string,
  durations: readonly number[],
  errorCount: number,
  p95Limit: number,
  invariant: boolean,
  notes: readonly string[],
): Result {
  const summary = summarizeDurations(durations);
  return {
    id,
    name,
    fixtureSize,
    repetitions: durations.length,
    errorCount,
    ...summary,
    threshold: `p95 ≤ ${p95Limit} ms; errors = 0; invariant = true`,
    passed: summary.p95Ms <= p95Limit && errorCount === 0 && invariant,
    notes,
  };
}

async function writeReports(report: {
  readonly status: string;
  readonly generatedAt: string;
  readonly environment: object;
  readonly fixture: object;
  readonly scenarios: readonly Result[];
}) {
  await mkdir(REPORT_DIRECTORY, { recursive: true });
  const jsonPath = `${REPORT_DIRECTORY}/alerts-watchlists-baseline.json`;
  const markdownPath = `${REPORT_DIRECTORY}/alerts-watchlists-baseline.md`;
  const markdown = [
    `# ${report.status} — Alerts and Watchlists Performance Baseline`,
    '',
    `Generated: ${report.generatedAt}`,
    '',
    '| ID | Scenario | Fixture | p50 ms | p95 ms | Max ms | Errors | Threshold | Result |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- |',
    ...report.scenarios.map(
      (item) =>
        `| ${item.id} | ${item.name} | ${item.fixtureSize} | ${item.p50Ms} | ${item.p95Ms} | ${item.maxMs} | ${item.errorCount} | ${item.threshold} | ${item.passed ? 'PASS' : 'FAIL'} |`,
    ),
    '',
    '## Environment',
    '',
    '```json',
    JSON.stringify(report.environment, null, 2),
    '```',
    '',
    '## Fixture',
    '',
    '```json',
    JSON.stringify(report.fixture, null, 2),
    '```',
  ].join('\n');
  await Promise.all([
    writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8'),
    writeFile(markdownPath, `${markdown}\n`, 'utf8'),
  ]);
  execFileSync(
    'pnpm',
    ['exec', 'prettier', '--write', jsonPath, markdownPath],
    { cwd: ROOT, stdio: 'ignore' },
  );
}

function fixtureId(prefix: string, ordinal: number) {
  return `${prefix}000000-0000-4000-8000-${String(ordinal).padStart(12, '0')}`;
}
function chunks<T>(values: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size)
    result.push(values.slice(index, index + size));
  return result;
}
function requireTestDatabaseUrl() {
  const value = process.env.TEST_DATABASE_URL;
  if (
    value === undefined ||
    !new URL(value).pathname.slice(1).endsWith('_test')
  )
    throw new Error('TEST_DATABASE_URL with an _test database is required');
  return value;
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
