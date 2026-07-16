/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type { Server } from 'node:http';

import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import {
  PortfolioError,
  type Portfolio,
  type PortfolioCsvPreviewRow,
  type PortfolioPerformanceSnapshot,
  type PortfolioProjection,
  type PortfolioTransaction,
} from '@atlas/domain';
import type { Request } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';

import {
  AUTHENTICATED_USER_RESOLVER,
  type AuthenticatedUserResolver,
} from '../common/auth/authenticated-user';
import { GlobalExceptionFilter } from '../common/http/global-exception.filter';
import { PortfolioImportsController } from './portfolio-imports.controller';
import {
  PORTFOLIO_IMPORT_COMMITTER,
  PORTFOLIO_IMPORT_STORE,
  type PortfolioImportCommitter,
  type PortfolioImportJob,
  type PortfolioImportStore,
} from './portfolio-imports.ports';
import { PortfolioImportsService } from './portfolio-imports.service';
import {
  PORTFOLIO_APPLICATION,
  PORTFOLIO_READ_MODEL,
  type PortfolioCommands,
  type PortfolioReadModel,
} from './portfolios.ports';

const owner = '00000000-0000-4000-8000-000000004901';
const other = '00000000-0000-4000-8000-000000004902';
const portfolioId = '00000000-0000-4000-8000-000000004903';
const instrumentId = '00000000-0000-4000-8000-000000004904';
const now = new Date('2026-07-16T12:00:00.000Z');

class MemoryImportStore implements PortfolioImportStore {
  readonly jobs = new Map<string, PortfolioImportJob>();
  readonly jobRows = new Map<string, PortfolioCsvPreviewRow[]>();
  private sequence = 0;
  resolve(symbols: readonly string[]) {
    return Promise.resolve(
      new Map(
        symbols
          .filter((symbol) => symbol === 'THYAO')
          .map((symbol) => [symbol, instrumentId]),
      ),
    );
  }
  symbolsForInstrumentIds(instrumentIds: readonly string[]) {
    return Promise.resolve(
      new Map(
        instrumentIds
          .filter((id) => id === instrumentId)
          .map((id) => [id, 'THYAO']),
      ),
    );
  }
  findJob(jobId: string) {
    return Promise.resolve(this.jobs.get(jobId) ?? null);
  }
  findByPreviewIdempotency(input: {
    portfolioId: string;
    userId: string;
    idempotencyKeyHash: string;
  }) {
    return Promise.resolve(
      [...this.jobs.values()].find(
        (job) =>
          job.portfolioId === input.portfolioId &&
          job.userId === input.userId &&
          job.idempotencyKeyHash === input.idempotencyKeyHash,
      ) ?? null,
    );
  }
  findByFileHash(input: {
    portfolioId: string;
    userId: string;
    fileHash: string;
  }) {
    return Promise.resolve(
      [...this.jobs.values()].find(
        (job) =>
          job.portfolioId === input.portfolioId &&
          job.userId === input.userId &&
          job.fileHash === input.fileHash &&
          job.status !== 'cancelled',
      ) ?? null,
    );
  }
  savePreview(input: Parameters<PortfolioImportStore['savePreview']>[0]) {
    this.sequence += 1;
    const id = `00000000-0000-4000-8000-${String(4_920 + this.sequence).padStart(12, '0')}`;
    const job: PortfolioImportJob = {
      id,
      portfolioId: input.portfolioId,
      userId: input.userId,
      status: 'preview_ready',
      commitMode: 'atomic',
      sourceFilename: input.preview.filename,
      contentType: input.preview.contentType,
      fileSize: input.preview.fileSize,
      encoding: 'utf-8',
      delimiter: input.preview.delimiter,
      fileHash: input.preview.fileHash,
      previewHash: input.preview.previewHash,
      idempotencyKeyHash: input.idempotencyKeyHash,
      previewRequestHash: input.previewRequestHash,
      commitIdempotencyKeyHash: null,
      commitRequestHash: null,
      totalRowCount: input.preview.totalRowCount,
      validRowCount: input.preview.validRowCount,
      invalidRowCount: input.preview.invalidRowCount,
      duplicateRowCount: input.preview.duplicateRowCount,
      committedRowCount: 0,
      previewExpiresAt: input.previewExpiresAt,
      committedAt: null,
      cancelledAt: null,
      errorCode: null,
      errorSummary: input.preview.errorSummary,
      createdAt: input.now,
      updatedAt: input.now,
    };
    this.jobs.set(id, job);
    this.jobRows.set(id, [...input.preview.rows]);
    return Promise.resolve(job);
  }
  rows(input: Parameters<PortfolioImportStore['rows']>[0]) {
    const all = (this.jobRows.get(input.jobId) ?? []).filter(
      (row) =>
        input.afterRowNumber === null || row.rowNumber > input.afterRowNumber,
    );
    const selected = all.slice(0, input.limit + 1);
    const hasNext = selected.length > input.limit;
    const items = hasNext ? selected.slice(0, input.limit) : selected;
    return Promise.resolve({
      items,
      nextRowNumber: hasNext ? (items.at(-1)?.rowNumber ?? null) : null,
    });
  }
  allRows(jobId: string) {
    return Promise.resolve(this.jobRows.get(jobId) ?? []);
  }
  cancel(input: Parameters<PortfolioImportStore['cancel']>[0]) {
    const current = this.jobs.get(input.jobId);
    if (
      !current ||
      current.portfolioId !== input.portfolioId ||
      current.userId !== input.userId ||
      current.status !== 'preview_ready'
    )
      return Promise.resolve(null);
    const job: PortfolioImportJob = {
      ...current,
      status: 'cancelled',
      cancelledAt: input.now,
      updatedAt: input.now,
    };
    this.jobs.set(job.id, job);
    return Promise.resolve(job);
  }
}

class MemoryCommitter implements PortfolioImportCommitter {
  constructor(private readonly store: MemoryImportStore) {}
  commit(input: Parameters<PortfolioImportCommitter['commit']>[0]) {
    const current = this.store.jobs.get(input.job.id);
    if (!current) throw new PortfolioError('PORTFOLIO_IMPORT_NOT_FOUND');
    const committed = input.rows.filter((row) => row.status === 'valid').length;
    const job: PortfolioImportJob = {
      ...current,
      status: 'completed',
      commitMode: input.mode,
      committedRowCount: committed,
      committedAt: input.now,
      commitIdempotencyKeyHash: input.commitIdempotencyKeyHash,
      commitRequestHash: input.commitRequestHash,
      updatedAt: input.now,
    };
    this.store.jobs.set(job.id, job);
    return Promise.resolve({ job, replayed: false });
  }
}

describe('Portfolio import/export API', () => {
  let application: INestApplication;
  let server: Server;
  let store: MemoryImportStore;

  beforeAll(async () => {
    store = new MemoryImportStore();
    const commands = fixtureCommands();
    const resolver: AuthenticatedUserResolver = (req: Request) =>
      String(req.headers['x-user-id'] ?? owner);
    const module = await Test.createTestingModule({
      controllers: [PortfolioImportsController],
      providers: [
        PortfolioImportsService,
        { provide: APP_FILTER, useClass: GlobalExceptionFilter },
        { provide: AUTHENTICATED_USER_RESOLVER, useValue: resolver },
        { provide: PORTFOLIO_APPLICATION, useValue: commands },
        { provide: PORTFOLIO_READ_MODEL, useValue: fixtureReadModel() },
        { provide: PORTFOLIO_IMPORT_STORE, useValue: store },
        {
          provide: PORTFOLIO_IMPORT_COMMITTER,
          useValue: new MemoryCommitter(store),
        },
      ],
    }).compile();
    application = module.createNestApplication();
    application.setGlobalPrefix('api/v1');
    await application.init();
    server = application.getHttpServer() as Server;
  });

  afterAll(() => application.close());

  it('creates a valid preview and exposes persisted rows', async () => {
    const response = await upload('valid-preview', validCsv()).expect(201);
    expect(response.body.data).toMatchObject({
      status: 'preview_ready',
      validRowCount: 1,
      invalidRowCount: 0,
      encoding: 'utf-8',
    });
    const jobId = String(response.body.data.id);
    await api()
      .get(`/api/v1/portfolios/${portfolioId}/imports/${jobId}`)
      .expect(200);
    const rows = await api()
      .get(`/api/v1/portfolios/${portfolioId}/imports/${jobId}/rows?limit=1`)
      .expect(200);
    expect(rows.body.data.items[0]).toMatchObject({
      status: 'valid',
      rowNumber: 2,
    });
  });

  it('replays the same preview request and conflicts on changed content', async () => {
    const first = await upload(
      'preview-replay',
      cashCsv('10', 'replay-a'),
    ).expect(201);
    const replay = await upload(
      'preview-replay',
      cashCsv('10', 'replay-a'),
    ).expect(201);
    expect(replay.body.data.id).toBe(first.body.data.id);
    expect(replay.body.meta.replayed).toBe(true);
    const conflict = await upload(
      'preview-replay',
      cashCsv('11', 'replay-a'),
    ).expect(409);
    expect(conflict.body.error.code).toBe('PORTFOLIO_IDEMPOTENCY_CONFLICT');
  });

  it('detects a duplicate file hash under a different idempotency key', async () => {
    const csv = cashCsv('12', 'duplicate-file');
    await upload('duplicate-file-a', csv).expect(201);
    const response = await upload('duplicate-file-b', csv).expect(409);
    expect(response.body.error.details.code).toBe('CSV_FILE_DUPLICATE');
  });

  it('persists invalid date, decimal, symbol and formula errors', async () => {
    const csv = `${headers()}\nPortfolio,buy,UNKNOWN,not-a-date,1x,10,0,0,,formula-errors,=cmd`;
    const response = await upload('invalid-fields', csv).expect(201);
    expect(response.body.data.invalidRowCount).toBe(1);
    expect(response.body.data.errorSummary).toMatchObject({
      CSV_DATE_INVALID: 1,
      CSV_SYMBOL_UNKNOWN: 1,
      CSV_FORMULA_INJECTION: 1,
    });
  });

  it('blocks atomic commit with invalid rows and allows explicit partial mode', async () => {
    const preview = await upload(
      'partial-preview',
      `${headers()}\nPortfolio,cashDeposit,,2026-01-02,,,,,10,partial-valid,note\nPortfolio,buy,UNKNOWN,2026-01-03,1,10,0,0,,partial-invalid,note`,
    ).expect(201);
    const jobId = String(preview.body.data.id);
    await api()
      .post(`/api/v1/portfolios/${portfolioId}/imports/${jobId}/commit`)
      .set('Idempotency-Key', 'atomic-invalid')
      .send({})
      .expect(422);
    const partial = await api()
      .post(`/api/v1/portfolios/${portfolioId}/imports/${jobId}/commit`)
      .set('Idempotency-Key', 'partial-explicit')
      .send({ mode: 'partial' })
      .expect(200);
    expect(partial.body.data).toMatchObject({
      status: 'completed',
      commitMode: 'partial',
      committedRowCount: 1,
    });
  });

  it('makes commit idempotent and conflicts when the same key changes request', async () => {
    const preview = await upload(
      'commit-replay-preview',
      cashCsv('20', 'commit-replay'),
    ).expect(201);
    const jobId = String(preview.body.data.id);
    const endpoint = `/api/v1/portfolios/${portfolioId}/imports/${jobId}/commit`;
    await api()
      .post(endpoint)
      .set('Idempotency-Key', 'commit-replay')
      .send({})
      .expect(200);
    const replay = await api()
      .post(endpoint)
      .set('Idempotency-Key', 'commit-replay')
      .send({})
      .expect(200);
    expect(replay.body.meta.replayed).toBe(true);
    const conflict = await api()
      .post(endpoint)
      .set('Idempotency-Key', 'commit-replay')
      .send({ mode: 'partial' })
      .expect(409);
    expect(conflict.body.error.code).toBe('PORTFOLIO_IDEMPOTENCY_CONFLICT');
  });

  it('enforces import ownership IDOR', async () => {
    const preview = await upload('import-idor', cashCsv('30', 'idor')).expect(
      201,
    );
    const response = await api()
      .get(
        `/api/v1/portfolios/${portfolioId}/imports/${String(preview.body.data.id)}`,
      )
      .set('x-user-id', other)
      .expect(403);
    expect(response.body.error.code).toBe('PORTFOLIO_ACCESS_DENIED');
  });

  it('cancels an uncommitted preview', async () => {
    const preview = await upload(
      'cancel-preview',
      cashCsv('40', 'cancel'),
    ).expect(201);
    const response = await api()
      .post(
        `/api/v1/portfolios/${portfolioId}/imports/${String(preview.body.data.id)}/cancel`,
      )
      .expect(200);
    expect(response.body.data.status).toBe('cancelled');
  });

  it('exports safe CSV without internal metadata and blocks export IDOR', async () => {
    const exported = await api()
      .get(`/api/v1/portfolios/${portfolioId}/exports/transactions`)
      .expect(200);
    expect(exported.headers['cache-control']).toContain('no-store');
    expect(exported.headers['content-disposition']).toContain('attachment');
    expect(exported.text).toContain("'+external");
    expect(exported.text).toContain("'=note");
    expect(exported.text).not.toContain('idempotencyKeyHash');
    await api()
      .get(`/api/v1/portfolios/${portfolioId}/exports/positions`)
      .set('x-user-id', other)
      .expect(403);
    await api()
      .get(`/api/v1/portfolios/${portfolioId}/exports/performance`)
      .expect(200);
  });

  function api() {
    return request(server);
  }

  function upload(key: string, csv: string) {
    return request(server)
      .post(`/api/v1/portfolios/${portfolioId}/imports`)
      .set('Idempotency-Key', key)
      .attach('file', Buffer.from(csv, 'utf8'), {
        filename: 'transactions.csv',
        contentType: 'text/csv',
      });
  }
});

function fixtureCommands(): Partial<PortfolioCommands> {
  const portfolio: Portfolio = {
    id: portfolioId,
    userId: owner,
    name: 'Portfolio',
    description: null,
    reportingCurrency: 'TRY',
    defaultBenchmarkCode: null,
    status: 'active',
    ledgerVersion: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  const transaction: PortfolioTransaction = {
    id: '00000000-0000-4000-8000-000000004999',
    portfolioId,
    instrumentId,
    reversalOfTransactionId: null,
    sequence: 1,
    type: 'buy',
    status: 'posted',
    tradeAt: now,
    settlementAt: null,
    quantity: '1',
    unitPrice: '10',
    fee: '0',
    tax: '0',
    cashAmount: null,
    source: 'manual',
    externalReference: '+external',
    idempotencyKeyHash: 'internal-secret-hash',
    normalizedTransactionHash: 'normalized-internal-hash',
    corporateActionIdentityHash: null,
    adjustmentReason: null,
    note: '=note',
    createdBy: owner,
    postedAt: now,
    reversedAt: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  return {
    get(userId: string, id: string) {
      if (id !== portfolioId) throw new PortfolioError('PORTFOLIO_NOT_FOUND');
      if (userId !== owner) throw new PortfolioError('PORTFOLIO_ACCESS_DENIED');
      return Promise.resolve(portfolio);
    },
    listTransactions(userId: string, id: string) {
      if (id !== portfolioId) throw new PortfolioError('PORTFOLIO_NOT_FOUND');
      if (userId !== owner) throw new PortfolioError('PORTFOLIO_ACCESS_DENIED');
      return Promise.resolve([transaction]);
    },
  };
}

function fixtureReadModel(): Partial<PortfolioReadModel> {
  const projection: PortfolioProjection = {
    ledgerVersion: 1,
    positions: [
      {
        portfolioId,
        instrumentId,
        quantity: '1',
        averageCost: '10',
        costBasis: '10',
        realizedPnl: '0',
        dividendIncome: '0',
        ledgerVersion: 1,
        calculatedAt: now,
      },
    ],
    cashBalances: [],
  };
  const performance: PortfolioPerformanceSnapshot = {
    portfolioId,
    ledgerVersion: 1,
    rangeStartAt: now,
    rangeEndAt: now,
    dataCutoffAt: now,
    performancePolicyVersion: 'twr-xirr-v1',
    benchmarkCode: 'XU100',
    status: 'partial',
    dailyValueSeries: [],
    netContributionSeries: [],
    twr: { status: 'complete', value: '0.1' },
    xirr: { status: 'notEvaluable', reason: 'NO_SOLUTION' },
    benchmark: {
      status: 'notEvaluable',
      priceReturn: null,
      totalReturn: null,
      alignedDates: [],
      warnings: ['MISSING_BENCHMARK_DATA'],
    },
    periodReturns: {},
    cacheKey: 'performance',
    warnings: ['=formula-warning'],
  };
  return {
    projection: () => Promise.resolve(projection),
    latestPerformance: () => Promise.resolve(performance),
  };
}

function headers() {
  return 'portfolio,transactionType,symbol,tradeDate,quantity,unitPrice,fee,tax,cashAmount,externalReference,note';
}

function validCsv() {
  return `${headers()}\nPortfolio,buy,THYAO,2026-01-02,1,10,0,0,,valid-preview,note`;
}

function cashCsv(amount: string, reference: string) {
  return `${headers()}\nPortfolio,cashDeposit,,2026-01-02,,,,,${amount},${reference},note`;
}
