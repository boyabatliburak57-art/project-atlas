import {
  execFileSync,
  spawn,
  type ChildProcessWithoutNullStreams,
} from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { hostname, platform, release, totalmem } from 'node:os';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { createConnection } from 'node:net';

import {
  createDatabase,
  dataProviders,
  instruments,
  portfolioPositions,
  portfolioTransactions,
  portfolios,
  PostgresPortfolioRepository,
  PostgresPortfolioValuationRepository,
  priceBars,
  runMigrations,
} from '@atlas/database';
import {
  calculateTwr,
  calculateXirr,
  PortfolioApplicationService,
  PortfolioRiskApplicationService,
  PortfolioValuationService,
  previewPortfolioCsv,
  type DailyPortfolioValue,
  type Portfolio,
  type PortfolioProjection,
} from '@atlas/domain';
import { and, eq, gt, or } from 'drizzle-orm';

import { summarizeDurations, type DurationSummary } from './statistics';

const ROOT = `${resolve(__dirname, '../../../..')}/`;
const REPORT_DIRECTORY = `${ROOT}reports/performance`;
const DATABASE_URL = requireTestDatabaseUrl();
const REDIS_URL = process.env.REDIS_URL ?? '';
const OWNER_ID = '80000000-0000-4000-8000-000000000001';
const LEDGER_PORTFOLIO_ID = '80000000-0000-4000-8000-000000000002';
const VALUATION_PORTFOLIO_ID = '80000000-0000-4000-8000-000000000003';
const CUTOFF = new Date('2026-07-16T18:00:00.000Z');
const LEDGER_TRANSACTION_COUNT = 10_000;
const LEDGER_INSTRUMENT_COUNT = 100;
const POSITION_COUNT = 1_000;
const SERIES_DAYS = 1_826;
const CSV_ROW_COUNT = 10_000;

interface Thresholds {
  readonly [id: string]: {
    readonly p95Ms: number;
    readonly maximumErrors: number;
    readonly pageSize?: number;
  };
}

interface Result extends DurationSummary {
  readonly id: string;
  readonly name: string;
  readonly environment: string;
  readonly fixtureSize: string;
  readonly repetitions: number;
  readonly cacheState: string;
  readonly errorCount: number;
  readonly threshold: string;
  readonly passed: boolean;
  readonly notes: readonly string[];
}

const thresholds = JSON.parse(
  readFileSync(`${ROOT}performance/thresholds/portfolio-risk.json`, 'utf8'),
) as Thresholds;

async function main() {
  const requestedScenario = process.argv
    .find((argument) => argument.startsWith('--scenario='))
    ?.slice('--scenario='.length);
  if (requestedScenario && requestedScenario !== 'PERF-PORT-006')
    throw new Error(`Unsupported portfolio scenario: ${requestedScenario}`);
  const { db, pool } = createDatabase(DATABASE_URL);
  try {
    await pool.query('drop schema if exists public cascade');
    await pool.query('drop schema if exists drizzle cascade');
    await pool.query('create schema public');
    await runMigrations(db);
    const redis = await redisServerVersion(REDIS_URL);
    const fixture = await seedFixture(db);
    const valuationResult = await positionValuation(
      db,
      fixture.valuationProjection,
    );
    const paginationResult = await positionsPagination(db);
    const results = requestedScenario
      ? [paginationResult]
      : [
          await ledgerReplay(db),
          valuationResult,
          performanceSeries(),
          await riskAnalytics(fixture.valuationProjection),
          await csvPreview(db, fixture.portfolio, fixture.instrumentIds),
          paginationResult,
        ];
    const report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      commitSha: git(['rev-parse', 'HEAD']),
      status: results.every(({ passed }) => passed) ? 'PASS' : 'FAIL',
      environment: {
        hostname: hostname(),
        platform: platform(),
        release: release(),
        cpu: command(
          'sysctl -n machdep.cpu.brand_string 2>/dev/null || uname -m',
        ),
        memoryBytes: totalmem(),
        node: process.version,
        pnpm: command('pnpm --version'),
        postgres: (await pool.query<{ version: string }>('show server_version'))
          .rows[0]?.version,
        redis,
        databaseUrl: 'test PostgreSQL (credential redacted)',
        externalProvider: false,
      },
      fixture: {
        ledgerTransactions: LEDGER_TRANSACTION_COUNT,
        ledgerInstruments: LEDGER_INSTRUMENT_COUNT,
        positions: POSITION_COUNT,
        seriesDays: SERIES_DAYS,
        csvRows: CSV_ROW_COUNT,
      },
      scenarios: results,
    } as const;
    await writeReports(
      report,
      requestedScenario
        ? 'portfolio-risk-perf-port-006'
        : 'portfolio-risk-baseline',
    );
    results.forEach((result) =>
      process.stdout.write(
        `${result.id} ${result.passed ? 'PASS' : 'FAIL'} p50=${result.p50Ms}ms p95=${result.p95Ms}ms max=${result.maxMs}ms errors=${result.errorCount}\n`,
      ),
    );
    if (report.status === 'FAIL') process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

async function ledgerReplay(
  db: ReturnType<typeof createDatabase>['db'],
): Promise<Result> {
  const service = new PortfolioApplicationService({
    repository: new PostgresPortfolioRepository(db),
    audit: { record: () => Promise.resolve() },
    logger: { info: () => undefined },
    now: () => CUTOFF,
  });
  const durations: number[] = [];
  const hashes = new Set<string>();
  let errors = 0;
  let duplicateRows = 0;
  let positionCount = 0;
  for (let index = 0; index < 6; index += 1) {
    const started = performance.now();
    try {
      const projection = await service.rebuildProjection(
        OWNER_ID,
        LEDGER_PORTFOLIO_ID,
      );
      if (index > 0) durations.push(performance.now() - started);
      const identity = projection.positions.map((position) => ({
        instrumentId: position.instrumentId,
        quantity: position.quantity,
        averageCost: position.averageCost,
        costBasis: position.costBasis,
      }));
      hashes.add(sha256(JSON.stringify(identity)));
      positionCount = projection.positions.length;
      duplicateRows =
        projection.positions.length -
        new Set(projection.positions.map(({ instrumentId }) => instrumentId))
          .size;
    } catch {
      errors += 1;
    }
  }
  return makeResult(
    'PERF-PORT-001',
    'Ledger replay and projection rebuild',
    `${LEDGER_TRANSACTION_COUNT} posted transactions / ${LEDGER_INSTRUMENT_COUNT} instruments`,
    durations,
    errors,
    hashes.size === 1 && duplicateRows === 0 && positionCount === 100,
    [
      `deterministic hashes: ${hashes.size}`,
      `position rows: ${positionCount}`,
      `duplicate projection rows: ${duplicateRows}`,
    ],
  );
}

async function positionValuation(
  db: ReturnType<typeof createDatabase>['db'],
  projection: PortfolioProjection,
): Promise<Result> {
  const adapter = new PostgresPortfolioValuationRepository(db);
  const service = new PortfolioValuationService(adapter, adapter);
  const durations: number[] = [];
  let errors = 0;
  let rows = 0;
  let cutoffCount = 0;
  let status = '';
  for (let index = 0; index < 6; index += 1) {
    const valuationAt = new Date(CUTOFF.getTime() + index * 1_000);
    const started = performance.now();
    try {
      const snapshot = await service.value({
        portfolioId: VALUATION_PORTFOLIO_ID,
        projection,
        transactions: [],
        valuationAt,
        dataCutoffAt: CUTOFF,
      });
      if (index > 0) durations.push(performance.now() - started);
      rows = snapshot.positions.length;
      status = snapshot.status;
      cutoffCount = new Set([
        snapshot.dataCutoffAt.toISOString(),
        ...snapshot.positions.map(() => snapshot.dataCutoffAt.toISOString()),
      ]).size;
    } catch {
      errors += 1;
    }
  }
  return makeResult(
    'PERF-PORT-002',
    'Position valuation, price load and snapshot write',
    `${POSITION_COUNT} positions / ${POSITION_COUNT} closed daily prices`,
    durations,
    errors,
    rows === POSITION_COUNT && status === 'complete' && cutoffCount === 1,
    [`snapshot rows: ${rows}`, `status: ${status}`, `cutoffs: ${cutoffCount}`],
  );
}

function performanceSeries(): Result {
  const series = dailySeries(0);
  const cashFlows = [
    { at: new Date('2021-07-17T00:00:00.000Z'), amount: '-100000' },
    { at: new Date('2023-03-01T00:00:00.000Z'), amount: '-25000' },
    { at: new Date('2026-07-16T00:00:00.000Z'), amount: '180000' },
  ];
  const durations: number[] = [];
  let errors = 0;
  let twrStatus = '';
  let xirrStatus = '';
  let nonFinite = 0;
  for (let index = 0; index < 21; index += 1) {
    const started = performance.now();
    try {
      const twr = calculateTwr(series);
      const xirr = calculateXirr(cashFlows);
      if (index > 0) durations.push(performance.now() - started);
      twrStatus = twr.status;
      xirrStatus = xirr.status;
      nonFinite += countNonFinite({ twr, xirr });
    } catch {
      errors += 1;
    }
  }
  return makeResult(
    'PERF-PORT-003',
    'Five-year TWR and XIRR performance series',
    `${SERIES_DAYS} daily valuations / 3 irregular cash flows`,
    durations,
    errors,
    twrStatus === 'complete' && xirrStatus === 'complete' && nonFinite === 0,
    [
      `TWR status: ${twrStatus}`,
      `XIRR status: ${xirrStatus}`,
      `NaN/Infinity: ${nonFinite}`,
    ],
  );
}

async function riskAnalytics(projection: PortfolioProjection): Promise<Result> {
  const portfolioValues = dailySeries(0);
  const benchmarkValues = dailySeries(0.0003);
  const service = new PortfolioRiskApplicationService({
    logger: { info: () => undefined },
  });
  const durations: number[] = [];
  let errors = 0;
  let status = '';
  let nonFinite = 0;
  let observationCount = 0;
  const positions = projection.positions.map((position, index) => ({
    instrumentId: position.instrumentId,
    marketValue: String(1_000 + index),
    sectorId: index % 11 === 0 ? null : `sector-${index % 20}`,
  }));
  for (let index = 0; index < 21; index += 1) {
    const started = performance.now();
    try {
      const snapshot = await service.calculate({
        portfolioId: VALUATION_PORTFOLIO_ID,
        ledgerVersion: 1_000,
        valuationSeriesVersion: index + 1,
        rangeStartAt: new Date('2021-07-17T00:00:00.000Z'),
        rangeEndAt: CUTOFF,
        dataCutoffAt: CUTOFF,
        benchmarkCode: 'XU100',
        portfolioValues,
        benchmarkValues,
        positions,
        cashValue: '250000',
      });
      if (index > 0) durations.push(performance.now() - started);
      status = snapshot.status;
      observationCount = snapshot.observationCount;
      nonFinite += countNonFinite(snapshot);
    } catch {
      errors += 1;
    }
  }
  return makeResult(
    'PERF-PORT-004',
    'Five-year portfolio risk analytics',
    `${SERIES_DAYS} portfolio + benchmark days / ${POSITION_COUNT} exposures`,
    durations,
    errors,
    status === 'complete' && observationCount >= 1_800 && nonFinite === 0,
    [
      `status: ${status}`,
      `observations: ${observationCount}`,
      `NaN/Infinity: ${nonFinite}`,
    ],
  );
}

async function csvPreview(
  db: ReturnType<typeof createDatabase>['db'],
  portfolio: Portfolio,
  instrumentIds: readonly string[],
): Promise<Result> {
  const symbolMap = new Map(
    instrumentIds.map((instrumentId, index) => [
      `PF${String(index + 1).padStart(4, '0')}`,
      instrumentId,
    ]),
  );
  const lines = [
    'portfolio,transactionType,symbol,tradeDate,quantity,unitPrice,fee,tax,cashAmount,externalReference,note',
  ];
  for (let index = 0; index < CSV_ROW_COUNT; index += 1) {
    const symbol = `PF${String((index % POSITION_COUNT) + 1).padStart(4, '0')}`;
    const date = index % 97 === 0 ? 'invalid-date' : '2026-07-15';
    const reference =
      index % 101 === 0 ? 'duplicate-reference' : `csv-${index}`;
    lines.push(
      `Performance,buy,${symbol},${date},1,${100 + (index % 17)},0,0,,${reference},fixture-${index}`,
    );
  }
  const bytes = Buffer.from(lines.join('\n'), 'utf8');
  const durations: number[] = [];
  let errors = 0;
  let rowCount = 0;
  let issueCount = 0;
  let transactionCountBefore = 0;
  let transactionCountAfter = 0;
  const symbols = {
    resolve(requested: readonly string[]) {
      return Promise.resolve(
        new Map(
          requested.flatMap((symbol) => {
            const id = symbolMap.get(symbol);
            return id ? [[symbol, id] as const] : [];
          }),
        ),
      );
    },
  };
  transactionCountBefore = await countTransactions(db, VALUATION_PORTFOLIO_ID);
  const memoryBefore = process.memoryUsage().heapUsed;
  for (let index = 0; index < 6; index += 1) {
    const started = performance.now();
    try {
      const preview = await previewPortfolioCsv({
        userId: OWNER_ID,
        portfolio,
        file: {
          filename: 'performance.csv',
          contentType: 'text/csv',
          size: bytes.byteLength,
          bytes,
        },
        symbols,
        existingTransactions: [],
      });
      if (index > 0) durations.push(performance.now() - started);
      rowCount = preview.totalRowCount;
      issueCount = preview.invalidRowCount + preview.duplicateRowCount;
    } catch {
      errors += 1;
    }
  }
  transactionCountAfter = await countTransactions(db, VALUATION_PORTFOLIO_ID);
  const heapDelta = Math.max(0, process.memoryUsage().heapUsed - memoryBefore);
  return makeResult(
    'PERF-PORT-005',
    'CSV preview validation and duplicate summary',
    `${CSV_ROW_COUNT} mixed valid/invalid/duplicate rows / ${bytes.byteLength} bytes`,
    durations,
    errors,
    rowCount === CSV_ROW_COUNT &&
      issueCount > 0 &&
      transactionCountBefore === transactionCountAfter,
    [
      `rows: ${rowCount}`,
      `invalid or duplicate: ${issueCount}`,
      `transactions before/after: ${transactionCountBefore}/${transactionCountAfter}`,
      `observed heap delta bytes: ${heapDelta}`,
    ],
  );
}

async function positionsPagination(
  db: ReturnType<typeof createDatabase>['db'],
): Promise<Result> {
  const pageSize = thresholds['PERF-PORT-006']?.pageSize ?? 50;
  const durations: number[] = [];
  const traversalDurations: number[] = [];
  let errors = 0;
  let uniqueRows = 0;
  let duplicateRows = 0;
  let missingRows = 0;
  let invariantFailures = 0;
  const adapterDurationMs = await measurePositionAdapter(db, pageSize);
  const api = await startPortfolioApi();
  try {
    for (let repetition = 0; repetition < 6; repetition += 1) {
      const started = performance.now();
      const seen = new Set<string>();
      let cursor: string | null = null;
      let rowCount = 0;
      try {
        do {
          const pageStarted = performance.now();
          const url = new URL(
            `/api/v1/portfolios/${VALUATION_PORTFOLIO_ID}/positions`,
            api.baseUrl,
          );
          url.searchParams.set('limit', String(pageSize));
          url.searchParams.set('sortField', 'symbol');
          url.searchParams.set('sortDirection', 'asc');
          if (cursor) url.searchParams.set('cursor', cursor);
          const response = await fetch(url, {
            headers: { 'x-performance-user-id': OWNER_ID },
          });
          if (!response.ok)
            throw new Error(`Positions API returned ${response.status}`);
          const body = (await response.json()) as {
            readonly data: {
              readonly items: readonly { readonly instrumentId: string }[];
            };
            readonly meta: {
              readonly nextCursor: string | null;
              readonly projectionLedgerVersion: number;
              readonly requestId: string;
            };
          };
          if (repetition > 0) durations.push(performance.now() - pageStarted);
          if (
            body.meta.projectionLedgerVersion !== POSITION_COUNT ||
            typeof body.meta.requestId !== 'string'
          )
            invariantFailures += 1;
          for (const item of body.data.items) {
            rowCount += 1;
            if (seen.has(item.instrumentId)) duplicateRows += 1;
            seen.add(item.instrumentId);
          }
          cursor = body.meta.nextCursor;
        } while (cursor);
        if (repetition > 0)
          traversalDurations.push(performance.now() - started);
        uniqueRows = seen.size;
        missingRows = POSITION_COUNT - seen.size;
        if (rowCount !== POSITION_COUNT) invariantFailures += 1;
      } catch {
        errors += 1;
      }
    }
  } finally {
    await api.close();
  }
  const traversal = summarizeDurations(traversalDurations);
  return makeResult(
    'PERF-PORT-006',
    'Owned 50-row position page through the real API process',
    `${POSITION_COUNT} positions / page ${pageSize}`,
    durations,
    errors,
    uniqueRows === POSITION_COUNT &&
      duplicateRows === 0 &&
      missingRows === 0 &&
      invariantFailures === 0,
    [
      `unique rows: ${uniqueRows}`,
      `duplicate rows: ${duplicateRows}`,
      `missing rows: ${missingRows}`,
      `cursor invariant failures: ${invariantFailures}`,
      `full traversal p50/p95/max: ${traversal.p50Ms}/${traversal.p95Ms}/${traversal.maxMs} ms`,
      `adapter-only traversal: ${adapterDurationMs.toFixed(2)} ms (diagnostic only)`,
      'path: HTTP → authentication → ownership → validation → application → cursor → PostgreSQL keyset → DTO/meta → serialization',
    ],
  );
}

async function measurePositionAdapter(
  db: ReturnType<typeof createDatabase>['db'],
  pageSize: number,
) {
  const started = performance.now();
  let cursor: { symbol: string; instrumentId: string } | null = null;
  do {
    const rows = await db
      .select({
        symbol: instruments.normalizedSymbol,
        instrumentId: portfolioPositions.instrumentId,
      })
      .from(portfolioPositions)
      .innerJoin(
        instruments,
        eq(instruments.id, portfolioPositions.instrumentId),
      )
      .where(
        and(
          eq(portfolioPositions.portfolioId, VALUATION_PORTFOLIO_ID),
          cursor
            ? or(
                gt(instruments.normalizedSymbol, cursor.symbol),
                and(
                  eq(instruments.normalizedSymbol, cursor.symbol),
                  gt(portfolioPositions.instrumentId, cursor.instrumentId),
                ),
              )
            : undefined,
        ),
      )
      .orderBy(instruments.normalizedSymbol, portfolioPositions.instrumentId)
      .limit(pageSize);
    cursor = rows.length === pageSize ? (rows.at(-1) ?? null) : null;
  } while (cursor);
  return performance.now() - started;
}

async function startPortfolioApi(): Promise<{
  readonly baseUrl: string;
  readonly close: () => Promise<void>;
}> {
  const port = Number(process.env.PORTFOLIO_PERF_API_PORT ?? 43106);
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(
    'pnpm',
    [
      '--filter',
      '@atlas/api',
      'exec',
      'tsx',
      'dist/performance/portfolio-performance-server.js',
    ],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        API_HOST: '127.0.0.1',
        API_PORT: String(port),
        DATABASE_URL,
        REDIS_URL,
        LOG_LEVEL: 'error',
        NODE_ENV: 'test',
      },
    },
  );
  const diagnostics: string[] = [];
  child.stderr.on('data', (chunk: Buffer) =>
    diagnostics.push(chunk.toString()),
  );
  await waitForApi(child, `${baseUrl}/health/live`, diagnostics);
  return {
    baseUrl,
    close: () => stopApi(child),
  };
}

async function waitForApi(
  child: ChildProcessWithoutNullStreams,
  healthUrl: string,
  diagnostics: readonly string[],
) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (child.exitCode !== null)
      throw new Error(
        `Portfolio API exited during startup (${child.exitCode}): ${diagnostics.join('')}`,
      );
    try {
      const response = await fetch(healthUrl);
      if (response.ok) return;
    } catch {
      // The dedicated API process is still starting.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  child.kill('SIGTERM');
  throw new Error(`Portfolio API startup timed out: ${diagnostics.join('')}`);
}

function stopApi(child: ChildProcessWithoutNullStreams): Promise<void> {
  if (child.exitCode !== null) return Promise.resolve();
  return new Promise((resolvePromise) => {
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      resolvePromise();
    }, 5_000);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolvePromise();
    });
    child.kill('SIGTERM');
  });
}

async function seedFixture(db: ReturnType<typeof createDatabase>['db']) {
  const instrumentIds = Array.from({ length: POSITION_COUNT }, (_, index) =>
    fixtureId(index + 1),
  );
  for (const chunk of chunks(instrumentIds, 250))
    await db.insert(instruments).values(
      chunk.map((id) => {
        const index = instrumentIds.indexOf(id) + 1;
        const symbol = `PF${String(index).padStart(4, '0')}`;
        return {
          id,
          symbol,
          normalizedSymbol: symbol,
          name: `Portfolio Performance ${index}`,
          marketCode: 'BIST',
          currencyCode: 'TRY',
          status: 'active',
        };
      }),
    );
  const provider = (
    await db
      .insert(dataProviders)
      .values({
        code: 'portfolio-performance',
        name: 'Portfolio Performance Fixture',
        status: 'active',
      })
      .returning({ id: dataProviders.id })
  )[0]!;
  await db.insert(portfolios).values([
    {
      id: LEDGER_PORTFOLIO_ID,
      userId: OWNER_ID,
      name: 'Ledger Performance',
      ledgerVersion: LEDGER_TRANSACTION_COUNT,
    },
    {
      id: VALUATION_PORTFOLIO_ID,
      userId: OWNER_ID,
      name: 'Performance',
      ledgerVersion: POSITION_COUNT,
    },
  ]);
  for (let offset = 0; offset < LEDGER_TRANSACTION_COUNT; offset += 500) {
    await db.insert(portfolioTransactions).values(
      Array.from(
        { length: Math.min(500, LEDGER_TRANSACTION_COUNT - offset) },
        (_, relative) => {
          const index = offset + relative;
          return {
            portfolioId: LEDGER_PORTFOLIO_ID,
            instrumentId: instrumentIds[index % LEDGER_INSTRUMENT_COUNT]!,
            type: 'buy',
            status: 'posted',
            tradeAt: new Date(
              CUTOFF.getTime() - (LEDGER_TRANSACTION_COUNT - index) * 1_000,
            ),
            quantity: '1',
            unitPrice: String(80 + (index % 41)),
            fee: '0.01',
            tax: '0',
            source: 'system',
            idempotencyKeyHash: `ledger-${index}`,
            normalizedTransactionHash: `ledger-hash-${index}`,
            createdBy: OWNER_ID,
            postedAt: CUTOFF,
            createdAt: CUTOFF,
            updatedAt: CUTOFF,
          };
        },
      ),
    );
  }
  const positions = instrumentIds.map((instrumentId, index) => ({
    portfolioId: VALUATION_PORTFOLIO_ID,
    instrumentId,
    quantity: String(10 + (index % 20)),
    averageCost: String(80 + (index % 30)),
    costBasis: String((10 + (index % 20)) * (80 + (index % 30))),
    realizedPnl: '0',
    dividendIncome: '0',
    projectionLedgerVersion: POSITION_COUNT,
    calculatedAt: CUTOFF,
  }));
  for (const chunk of chunks(positions, 250))
    await db.insert(portfolioPositions).values(chunk);
  for (const chunk of chunks(instrumentIds, 500))
    await db.insert(priceBars).values(
      chunk.map((instrumentId) => ({
        instrumentId,
        providerId: provider.id,
        timeframe: '1d',
        openTime: new Date('2026-07-16T09:00:00.000Z'),
        closeTime: CUTOFF,
        open: '100',
        high: '105',
        low: '98',
        close: '103',
        volume: '1000000',
        isClosed: true,
      })),
    );
  const valuationProjection: PortfolioProjection = {
    ledgerVersion: POSITION_COUNT,
    positions: positions.map((position) => ({
      ...position,
      ledgerVersion: position.projectionLedgerVersion,
    })),
    cashBalances: [
      {
        portfolioId: VALUATION_PORTFOLIO_ID,
        currencyCode: 'TRY',
        balance: '250000',
        ledgerVersion: POSITION_COUNT,
        calculatedAt: CUTOFF,
      },
    ],
  };
  const portfolio = (await new PostgresPortfolioRepository(db).findById(
    VALUATION_PORTFOLIO_ID,
  ))!;
  return { instrumentIds, portfolio, valuationProjection };
}

function dailySeries(offset: number): readonly DailyPortfolioValue[] {
  const start = Date.UTC(2021, 6, 17);
  let value = 100_000;
  return Array.from({ length: SERIES_DAYS }, (_, index) => {
    const flow = index > 0 && index % 180 === 0 ? 1_000 : 0;
    value =
      (value + flow) * (1 + 0.00035 + offset + Math.sin(index / 17) * 0.0015);
    return {
      date: new Date(start + index * 86_400_000).toISOString().slice(0, 10),
      value: value.toFixed(10),
      externalFlow: String(flow),
    };
  });
}

function makeResult(
  id: string,
  name: string,
  fixtureSize: string,
  durations: readonly number[],
  errorCount: number,
  invariantPassed: boolean,
  notes: readonly string[],
): Result {
  const threshold = thresholds[id];
  if (!threshold) throw new Error(`Missing threshold ${id}`);
  const summary = summarizeDurations(durations);
  return {
    id,
    name,
    environment:
      'deterministic fixture; test PostgreSQL and Redis; no external provider',
    fixtureSize,
    repetitions: durations.length,
    cacheState: '1 cold warm-up excluded; measured repetitions warm',
    ...summary,
    errorCount,
    threshold: `p95 <= ${threshold.p95Ms} ms; errors <= ${threshold.maximumErrors}`,
    passed:
      summary.p95Ms <= threshold.p95Ms &&
      errorCount <= threshold.maximumErrors &&
      invariantPassed,
    notes,
  };
}

async function writeReports(
  report: {
    readonly status: string;
    readonly generatedAt: string;
    readonly environment: Readonly<Record<string, unknown>>;
    readonly fixture: Readonly<Record<string, unknown>>;
    readonly scenarios: readonly Result[];
  },
  basename: string,
) {
  await mkdir(REPORT_DIRECTORY, { recursive: true });
  await writeFile(
    `${REPORT_DIRECTORY}/${basename}.json`,
    `${JSON.stringify(report, null, 2)}\n`,
  );
  const rows = report.scenarios
    .map(
      (item) =>
        `| ${item.id} | ${item.name} | ${item.fixtureSize} | ${item.cacheState} | ${item.repetitions} | ${item.p50Ms} | ${item.p95Ms} | ${item.maxMs} | ${item.errorCount} | ${item.threshold} | ${item.passed ? 'PASS' : 'FAIL'} |`,
    )
    .join('\n');
  await writeFile(
    `${REPORT_DIRECTORY}/${basename}.md`,
    `# Portfolio and Risk Performance Baseline\n\n- **Status:** ${report.status}\n- **Generated:** ${report.generatedAt}\n- **Environment:** ${JSON.stringify(report.environment)}\n- **Fixture:** ${JSON.stringify(report.fixture)}\n\n| ID | Scenario | Fixture | Warm/cold | Repetitions | p50 ms | p95 ms | Max ms | Errors | Threshold | Result |\n| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |\n${rows}\n`,
  );
}

async function countTransactions(
  db: ReturnType<typeof createDatabase>['db'],
  portfolioId: string,
) {
  return (
    await db
      .select({ id: portfolioTransactions.id })
      .from(portfolioTransactions)
      .where(eq(portfolioTransactions.portfolioId, portfolioId))
  ).length;
}

function countNonFinite(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? 0 : 1;
  if (typeof value === 'string')
    return /^(?:NaN|[-+]?Infinity)$/u.test(value) ? 1 : 0;
  if (Array.isArray(value))
    return (value as unknown[]).reduce<number>(
      (total, item) => total + countNonFinite(item),
      0,
    );
  if (value && typeof value === 'object')
    return Object.values(value as Record<string, unknown>).reduce<number>(
      (total, item) => total + countNonFinite(item),
      0,
    );
  return 0;
}

function fixtureId(index: number) {
  return `81000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
}

function chunks<T>(values: readonly T[], size: number): readonly T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size)
    result.push(values.slice(index, index + size));
  return result;
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function requireTestDatabaseUrl() {
  const value = process.env.TEST_DATABASE_URL;
  if (!value || !new URL(value).pathname.slice(1).endsWith('_test'))
    throw new Error('TEST_DATABASE_URL with an _test database is required');
  return value;
}

function git(args: readonly string[]) {
  try {
    return execFileSync('git', [...args], { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function command(value: string) {
  try {
    return execFileSync('/bin/sh', ['-c', value], { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function redisServerVersion(urlValue: string): Promise<string> {
  if (!urlValue) return Promise.reject(new Error('REDIS_URL is required'));
  const url = new URL(urlValue);
  return new Promise((resolveVersion, reject) => {
    const socket = createConnection({
      host: url.hostname,
      port: Number(url.port || 6379),
    });
    let response = '';
    socket.setTimeout(5_000);
    socket.on('connect', () =>
      socket.write('*2\r\n$4\r\nINFO\r\n$6\r\nserver\r\n'),
    );
    socket.on('data', (chunk) => {
      response += chunk.toString('utf8');
      const match = response.match(/redis_version:([^\r\n]+)/u);
      if (match?.[1]) {
        socket.end();
        resolveVersion(match[1]);
      }
    });
    socket.on('timeout', () => socket.destroy(new Error('Redis timeout')));
    socket.on('error', reject);
  });
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack : String(error)}\n`,
  );
  process.exitCode = 1;
});
