import {
  createDatabase,
  PostgresPortfolioRepository,
  runMigrations,
} from '@atlas/database';
import {
  PortfolioApplicationService,
  PortfolioError,
  previewPortfolioCsv,
  type PortfolioCsvPreview,
} from '@atlas/domain';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { ApiDatabase } from '../scanner/scanner-runtime.infrastructure';
import {
  PostgresPortfolioImportCommitter,
  PostgresPortfolioImportStore,
} from './portfolio-imports.infrastructure';

function requireTestDatabaseUrl() {
  const value = process.env.TEST_DATABASE_URL;
  if (!value || !new URL(value).pathname.slice(1).endsWith('_test'))
    throw new Error('TEST_DATABASE_URL with an _test database is required');
  return value;
}

const userId = '00000000-0000-4000-8000-000000004851';
const instrumentId = '00000000-0000-4000-8000-000000004852';
const now = new Date('2026-07-16T12:00:00.000Z');

describe('PostgreSQL portfolio CSV import atomicity', () => {
  const { db, pool } = createDatabase(requireTestDatabaseUrl());
  const connection = { database: db } as unknown as ApiDatabase;
  const store = new PostgresPortfolioImportStore(connection);
  const committer = new PostgresPortfolioImportCommitter(connection);
  const portfolioApplication = new PortfolioApplicationService({
    repository: new PostgresPortfolioRepository(db),
    audit: { record: () => Promise.resolve() },
    logger: { info: () => undefined },
    now: () => now,
  });

  beforeAll(async () => {
    await pool.query('drop schema if exists public cascade');
    await pool.query('drop schema if exists drizzle cascade');
    await pool.query('create schema public');
    await runMigrations(db);
    await db.execute(sql`
      insert into instruments
        (id, symbol, normalized_symbol, name, market_code, currency_code, status)
      values
        (${instrumentId}::uuid, 'THYAO', 'THYAO', 'THY fixture', 'BIST', 'TRY', 'active')
    `);
  });

  afterAll(() => pool.end());

  it('persists preview and atomically commits valid rows through the ledger service', async () => {
    const fixture = await createFixture('valid', [
      cashRow('1000', 'valid-deposit'),
      buyRow('2', '100', 'valid-buy'),
    ]);
    const result = await committer.commit(commitInput(fixture));
    expect(result).toMatchObject({
      replayed: false,
      job: { status: 'completed', committedRowCount: 2 },
    });
    const state = await ledgerState(fixture.job.portfolioId);
    expect(state).toEqual({
      ledgerVersion: 2,
      transactions: 2,
      quantity: '2.0000000000',
    });
    const replay = await committer.commit(commitInput(fixture));
    expect(replay.replayed).toBe(true);
  });

  it('rolls back every transaction and job transition on atomic ledger failure', async () => {
    const fixture = await createFixture('rollback', [
      cashRow('1000', 'rollback-deposit'),
      sellRow('5', '100', 'rollback-sell'),
    ]);
    await expect(committer.commit(commitInput(fixture))).rejects.toMatchObject({
      code: 'PORTFOLIO_INSUFFICIENT_POSITION',
    });
    const state = await ledgerState(fixture.job.portfolioId);
    expect(state).toEqual({
      ledgerVersion: 0,
      transactions: 0,
      quantity: null,
    });
    expect(await store.findJob(fixture.job.id)).toMatchObject({
      status: 'preview_ready',
      committedRowCount: 0,
    });
  });

  it('commits only valid ledger rows when partial mode is explicit', async () => {
    const fixture = await createFixture('partial', [
      cashRow('500', 'partial-deposit'),
      sellRow('3', '100', 'partial-sell'),
    ]);
    const result = await committer.commit({
      ...commitInput(fixture),
      mode: 'partial',
      commitRequestHash: 'partial-request',
    });
    expect(result.job).toMatchObject({
      status: 'completed',
      commitMode: 'partial',
      committedRowCount: 1,
      errorCode: 'PORTFOLIO_IMPORT_PARTIAL',
    });
    const state = await ledgerState(fixture.job.portfolioId);
    expect(state).toEqual({
      ledgerVersion: 1,
      transactions: 1,
      quantity: null,
    });
    const rows = await store.allRows(fixture.job.id);
    expect(rows.map((row) => row.status)).toEqual(['committed', 'skipped']);
  });

  it('rejects a completed job replay with a different commit request', async () => {
    const fixture = await createFixture('conflict', [
      cashRow('10', 'conflict-deposit'),
    ]);
    await committer.commit(commitInput(fixture));
    await expect(
      committer.commit({
        ...commitInput(fixture),
        commitRequestHash: 'different-request',
      }),
    ).rejects.toBeInstanceOf(PortfolioError);
  });

  async function createFixture(name: string, rows: readonly string[]) {
    const portfolio = await portfolioApplication.create({
      userId,
      name: `Portfolio ${name}`,
    });
    const csv = `${headers()}\n${rows
      .map((row) => `${portfolio.name},${row}`)
      .join('\n')}`;
    const bytes = Buffer.from(csv, 'utf8');
    const preview = await previewPortfolioCsv({
      userId,
      portfolio,
      file: {
        filename: `${name}.csv`,
        contentType: 'text/csv',
        size: bytes.byteLength,
        bytes,
      },
      symbols: store,
      existingTransactions: [],
    });
    expect(preview.invalidRowCount).toBe(0);
    const job = await store.savePreview({
      portfolioId: portfolio.id,
      userId,
      preview,
      idempotencyKeyHash: `preview-${name}`,
      previewRequestHash: `request-${name}`,
      previewExpiresAt: new Date(now.getTime() + 60_000),
      now,
    });
    return { job, rows: preview.rows, preview };
  }

  function commitInput(fixture: {
    job: Awaited<ReturnType<typeof store.savePreview>>;
    rows: PortfolioCsvPreview['rows'];
  }) {
    return {
      job: fixture.job,
      rows: fixture.rows,
      mode: 'atomic' as const,
      commitIdempotencyKeyHash: 'commit-key',
      commitRequestHash: 'commit-request',
      now,
    };
  }

  async function ledgerState(portfolioId: string) {
    const result = await db.execute<{
      ledger_version: string;
      transactions: string;
      quantity: string | null;
    }>(sql`
      select p.ledger_version::text,
        (select count(*)::text from portfolio_transactions t where t.portfolio_id = p.id) as transactions,
        (select quantity::text from portfolio_positions x where x.portfolio_id = p.id limit 1) as quantity
      from portfolios p where p.id = ${portfolioId}::uuid
    `);
    const row = result.rows[0];
    if (!row) throw new Error('Portfolio state required');
    return {
      ledgerVersion: Number(row.ledger_version),
      transactions: Number(row.transactions),
      quantity: row.quantity,
    };
  }
});

function headers() {
  return 'portfolio,transactionType,symbol,tradeDate,quantity,unitPrice,fee,tax,cashAmount,externalReference,note';
}

function cashRow(amount: string, reference: string) {
  return `cashDeposit,,2026-01-02,,,,,${amount},${reference},cash`;
}

function buyRow(quantity: string, price: string, reference: string) {
  return `buy,THYAO,2026-01-03,${quantity},${price},0,0,,${reference},buy`;
}

function sellRow(quantity: string, price: string, reference: string) {
  return `sell,THYAO,2026-01-03,${quantity},${price},0,0,,${reference},sell`;
}
