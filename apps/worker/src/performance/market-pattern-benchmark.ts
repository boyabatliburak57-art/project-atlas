import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { hostname, platform, release } from 'node:os';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import {
  createDatabase,
  dataProviders,
  instruments,
  priceBars,
  runMigrations,
} from '@atlas/database';
import {
  createCorePatternRegistry,
  PatternExecutor,
  type PatternBar,
} from '@atlas/domain';
import { ATLAS_JOB_NAMES } from '@atlas/types';
import { Queue, QueueEvents, Worker } from 'bullmq';
import { sql } from 'drizzle-orm';
import { createRedisConnection } from '../queue/redis-connection';
import { DatabasePatternDetectionStore } from '../market-data/patterns/database-pattern-detection-store';
import { processPatternDetectionJob } from '../market-data/patterns/pattern-detection-job';
import { PatternDetectionService } from '../market-data/patterns/pattern-detection-service';

const ROOT = `${resolve(__dirname, '../../../..')}/`;
const DATABASE_URL = required('TEST_DATABASE_URL');
const REDIS_URL = required('REDIS_URL');
const INSTRUMENT_COUNT = 650;
const BAR_COUNT = 201;
const CUTOFF = new Date('2026-07-17T00:00:00.000Z');
const thresholds = JSON.parse(
  readFileSync(
    `${ROOT}performance/thresholds/market-intelligence.json`,
    'utf8',
  ),
) as {
  readonly 'PERF-MKT-006': {
    readonly p95Ms: number;
    readonly maximumErrors: number;
    readonly instrumentCount: number;
    readonly dailyBarsPerInstrument: number;
  };
};

async function main() {
  assertFixture();
  const { db, pool } = createDatabase(DATABASE_URL);
  const connection = createRedisConnection(REDIS_URL);
  const queueName = `atlas.pattern-performance.${process.pid}`;
  const queue = new Queue(queueName, { connection });
  const events = new QueueEvents(queueName, { connection });
  const service = new PatternDetectionService(
    new DatabasePatternDetectionStore(db),
  );
  const worker = new Worker(
    queueName,
    (job) => processPatternDetectionJob(job, service),
    { connection, concurrency: 1 },
  );
  try {
    await pool.query('drop schema if exists public cascade');
    await pool.query('drop schema if exists drizzle cascade');
    await pool.query('create schema public');
    await runMigrations(db);
    await seed(db);
    await events.waitUntilReady();
    await worker.waitUntilReady();
    const durations: number[] = [];
    let errors = 0;
    for (let repetition = 0; repetition < 3; repetition += 1) {
      const started = performance.now();
      try {
        const job = await queue.add(
          ATLAS_JOB_NAMES.patternsDetect,
          {
            instrumentIds: Array.from(
              { length: INSTRUMENT_COUNT },
              (_, index) => instrumentId(index),
            ),
            timeframe: '1d',
            adjustmentMode: 'raw',
            dataCutoffAt: CUTOFF.toISOString(),
            correlationId: `perf-mkt-006-${repetition}`,
          },
          { jobId: `perf-mkt-006-${repetition}`, removeOnComplete: true },
        );
        await job.waitUntilFinished(events, 30_000);
      } catch {
        errors += 1;
      }
      durations.push(performance.now() - started);
    }
    const summary = summarize(durations);
    const duplicateRows = Number(
      (
        await db.execute<{ count: string }>(
          sql`select count(*)::text as count from (select deduplication_key from pattern_instances group by deduplication_key having count(*) > 1) duplicated`,
        )
      ).rows[0]?.count ?? 0,
    );
    const lookAheadFailures = lookAheadCheck();
    const count = Number(
      (
        await db.execute<{ count: string }>(
          sql`select count(*)::text as count from pattern_instances`,
        )
      ).rows[0]?.count ?? 0,
    );
    const threshold = thresholds['PERF-MKT-006'];
    const scenario = {
      id: 'PERF-MKT-006',
      name: '650-symbol mandatory daily pattern batch over BullMQ worker and PostgreSQL persistence',
      fixtureSize: `${INSTRUMENT_COUNT} symbols × ${BAR_COUNT} daily closed bars × 16 definitions`,
      cacheState: 'cold initial queue run and two idempotent replay runs',
      repetitions: 3,
      ...summary,
      errorCount: errors,
      queryCount:
        '1 bulk bar load + definition seed + chunked persistence per run',
      cacheHits: 0,
      cacheMisses: 0,
      persistedPatternCount: count,
      duplicatePatternCount: duplicateRows,
      lookAheadFailures,
      threshold: `queue-to-terminal p95 <= ${threshold.p95Ms} ms; duplicate pattern = 0; look-ahead failure = 0`,
      passed:
        errors <= threshold.maximumErrors &&
        summary.p95Ms <= threshold.p95Ms &&
        duplicateRows === 0 &&
        lookAheadFailures === 0,
    };
    await appendReport(
      scenario,
      await pool
        .query<{ version: string }>('show server_version')
        .then((value) => value.rows[0]?.version),
    );
    process.stdout.write(
      `${scenario.id} ${scenario.passed ? 'PASS' : 'FAIL'} p50=${scenario.p50Ms}ms p95=${scenario.p95Ms}ms max=${scenario.maxMs}ms errors=${errors} duplicate=${duplicateRows} lookAhead=${lookAheadFailures}\n`,
    );
    if (!scenario.passed) process.exitCode = 1;
  } finally {
    await worker.close();
    await events.close();
    await queue.close();
    await pool.end();
  }
}

async function seed(db: ReturnType<typeof createDatabase>['db']) {
  const providerId = '93000000-0000-4000-8000-000000000001';
  await db.insert(dataProviders).values({
    id: providerId,
    code: 'pattern-performance',
    name: 'Pattern performance fixture',
    status: 'active',
  });
  for (let offset = 0; offset < INSTRUMENT_COUNT; offset += 200)
    await db.insert(instruments).values(
      Array.from(
        { length: Math.min(200, INSTRUMENT_COUNT - offset) },
        (_, local) => {
          const index = offset + local;
          return {
            id: instrumentId(index),
            symbol: `P${String(index + 1).padStart(4, '0')}`,
            normalizedSymbol: `P${String(index + 1).padStart(4, '0')}`,
            name: `Pattern Fixture ${index + 1}`,
            marketCode: 'BIST',
            currencyCode: 'TRY',
            status: 'active',
          };
        },
      ),
    );
  const insertBatchInstruments = 20;
  for (
    let instrumentOffset = 0;
    instrumentOffset < INSTRUMENT_COUNT;
    instrumentOffset += insertBatchInstruments
  ) {
    const rows = [];
    for (
      let local = 0;
      local <
      Math.min(insertBatchInstruments, INSTRUMENT_COUNT - instrumentOffset);
      local += 1
    )
      for (let barIndex = 0; barIndex < BAR_COUNT; barIndex += 1) {
        const instrument = instrumentOffset + local;
        const openTime = new Date(
          CUTOFF.getTime() - (BAR_COUNT - 1 - barIndex) * 86400000,
        );
        const last = barIndex === BAR_COUNT - 1;
        const close = last ? 12 : 10;
        rows.push({
          instrumentId: instrumentId(instrument),
          providerId,
          timeframe: '1d',
          openTime,
          closeTime: new Date(openTime.getTime() + 86400000),
          open: String(close),
          high: String(last ? 12.5 : 11),
          low: String(last ? 11 : 9),
          close: String(close),
          volume: String(last ? 200 : 100),
          isClosed: true,
          sourceTimestamp: new Date(openTime.getTime() + 86400000),
          revision: 1,
          qualityStatus: 'accepted',
        });
      }
    await db.insert(priceBars).values(rows);
  }
}

function lookAheadCheck() {
  const registry = createCorePatternRegistry();
  const executor = new PatternExecutor(registry);
  const bars = Array.from(
    { length: 21 },
    (_, index): PatternBar => ({
      timestamp: new Date(CUTOFF.getTime() - (20 - index) * 86400000),
      open: 10,
      high: index === 20 ? 12.5 : 11,
      low: 9,
      close: index === 20 ? 12 : 10,
      volume: index === 20 ? 200 : 100,
      isClosed: true,
    }),
  );
  const request = [{ code: 'VOLUME_CONFIRMED_BREAKOUT', version: 1 }];
  const base = executor.execute(
    {
      instrumentId: instrumentId(0),
      timeframe: '1d',
      adjustmentMode: 'raw',
      bars,
      dataCutoffAt: CUTOFF,
    },
    request,
  );
  const future = {
    ...bars.at(-1)!,
    timestamp: new Date(CUTOFF.getTime() + 86400000),
    close: -100,
    high: -99,
    low: -101,
  };
  const withFuture = executor.execute(
    {
      instrumentId: instrumentId(0),
      timeframe: '1d',
      adjustmentMode: 'raw',
      bars: [...bars, future],
      dataCutoffAt: CUTOFF,
    },
    request,
  );
  return JSON.stringify(base) === JSON.stringify(withFuture) ? 0 : 1;
}
function instrumentId(index: number) {
  return `94000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
}
function summarize(values: readonly number[]) {
  const ordered = [...values].sort((a, b) => a - b);
  const at = (p: number) =>
    ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * p) - 1)]!;
  return {
    p50Ms: round(at(0.5)),
    p95Ms: round(at(0.95)),
    maxMs: round(ordered.at(-1)!),
  };
}
function round(value: number) {
  return Math.round(value * 100) / 100;
}
function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
function assertFixture() {
  const value = thresholds['PERF-MKT-006'];
  if (
    value.instrumentCount !== INSTRUMENT_COUNT ||
    value.dailyBarsPerInstrument !== BAR_COUNT
  )
    throw new Error('PERF-MKT-006 fixture must remain 650 × 201');
}
async function appendReport(
  scenario: Record<string, unknown>,
  postgres: string | undefined,
) {
  const jsonPath = `${ROOT}reports/performance/market-intelligence-baseline.json`;
  const report = JSON.parse(readFileSync(jsonPath, 'utf8')) as Record<
    string,
    unknown
  >;
  const scenarios = (report['scenarios'] as Record<string, unknown>[]).filter(
    (item) => item['id'] !== 'PERF-MKT-006',
  );
  scenarios.push(scenario);
  report['scenarios'] = scenarios;
  report['status'] = scenarios.every((item) => item['passed'] === true)
    ? 'PASS'
    : 'FAIL';
  report['environment'] = {
    ...(report['environment'] as Record<string, unknown>),
    patternWorker: {
      hostname: hostname(),
      platform: platform(),
      release: release(),
      node: process.version,
      postgres,
      redis: true,
      route:
        'BullMQ queue -> closed-bar worker -> pure Pattern Executor -> PostgreSQL persistence',
    },
  };
  report['fixture'] = {
    ...(report['fixture'] as Record<string, unknown>),
    patternSymbols: INSTRUMENT_COUNT,
    patternBarsPerSymbol: BAR_COUNT,
    patternDefinitions: 16,
  };
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  const rows = scenarios.map(
    (item) =>
      `| ${String(item['id'])} | ${String(item['fixtureSize'])} | ${String(item['p50Ms'])} | ${String(item['p95Ms'])} | ${String(item['maxMs'])} | ${String(item['errorCount'])} | ${String(item['threshold'])} | ${item['passed'] ? 'PASS' : 'FAIL'} |`,
  );
  await writeFile(
    `${ROOT}reports/performance/market-intelligence-baseline.md`,
    [
      `# Market Intelligence Performance Baseline`,
      '',
      `Status: **${String(report['status'])}**`,
      '',
      '| Scenario | Fixture | p50 (ms) | p95 (ms) | max (ms) | Errors | Threshold | Result |',
      '| --- | --- | ---: | ---: | ---: | ---: | --- | --- |',
      ...rows,
      '',
      `PERF-MKT-006 uses the real BullMQ worker and PostgreSQL persistence path. Duplicate pattern rows: ${String(scenario['duplicatePatternCount'])}; look-ahead failures: ${String(scenario['lookAheadFailures'])}.`,
      '',
    ].join('\n'),
    'utf8',
  );
}
void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
