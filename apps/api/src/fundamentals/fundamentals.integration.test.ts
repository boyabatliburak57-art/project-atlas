/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import type { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { NormalizedFundamentalStatement } from '@atlas/domain';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GlobalExceptionFilter } from '../common/http/global-exception.filter';
import { MARKET_RATE_LIMITER } from '../market/market-overview.ports';
import { FundamentalsController } from './fundamentals.controller';
import {
  FUNDAMENTALS_READER,
  type FundamentalsReader,
} from './fundamentals.ports';
import { FundamentalsService } from './fundamentals.service';

const metric: Record<string, string> = {
  revenue: '1000',
  grossProfit: '400',
  operatingProfit: '250',
  ebitda: '300',
  netIncome: '200',
  totalAssets: '2000',
  totalLiabilities: '900',
  equity: '1100',
  cashAndEquivalents: '100',
  financialDebt: '300',
  operatingCashFlow: '240',
  capitalExpenditure: '40',
  freeCashFlow: '200',
  sharesOutstanding: '100',
  currentAssets: '600',
  currentLiabilities: '300',
} as const;
function row(
  fiscalPeriod: string,
  periodType: 'annual' | 'quarterly',
  end: string,
  revision: string,
  metrics = metric,
): NormalizedFundamentalStatement {
  const periodEnd = new Date(end);
  return {
    instrumentId: 'f1000000-0000-4000-8000-000000000001',
    providerCode: 'licensed-fake',
    providerRevision: revision,
    fiscalYear: periodEnd.getUTCFullYear(),
    fiscalPeriod,
    periodType,
    periodStart: new Date(
      Date.UTC(
        periodEnd.getUTCFullYear(),
        Math.max(0, periodEnd.getUTCMonth() - 2),
        1,
      ),
    ),
    periodEnd,
    publishedAt: new Date(periodEnd.getTime() + 86400000),
    sourceTimestamp: new Date(periodEnd.getTime() + 86400000),
    currencyCode: 'TRY',
    metrics,
    warnings: [],
  };
}
const statements = [
  row('FY', 'annual', '2025-12-31Z', 'annual-r2'),
  row('FY', 'annual', '2024-12-31Z', 'annual-r1', {
    ...metric,
    revenue: '800',
    netIncome: '100',
  }),
  row('Q1', 'quarterly', '2025-03-31Z', 'q1', { ...metric, revenue: '250' }),
  row('Q2', 'quarterly', '2025-06-30Z', 'q2', { ...metric, revenue: '250' }),
  row('Q3', 'quarterly', '2025-09-30Z', 'q3', { ...metric, revenue: '250' }),
  row('Q4', 'quarterly', '2025-12-31Z', 'q4', { ...metric, revenue: '250' }),
];
class Reader implements FundamentalsReader {
  read(symbol: string) {
    return Promise.resolve(
      symbol === 'THYAO'
        ? {
            instrumentId: statements[0]!.instrumentId,
            symbol: 'THYAO',
            currencyCode: 'TRY',
            statements,
            latestMarketData: {
              price: '25',
              currencyCode: 'TRY',
              dataCutoffAt: new Date('2026-01-02Z'),
            },
          }
        : null,
    );
  }
}

describe('fundamentals API', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [FundamentalsController],
      providers: [
        FundamentalsService,
        { provide: FUNDAMENTALS_READER, useClass: Reader },
        {
          provide: MARKET_RATE_LIMITER,
          useValue: { consume: () => undefined },
        },
        { provide: APP_FILTER, useClass: GlobalExceptionFilter },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });
  afterAll(() => app.close());
  it('serves annual and quarterly immutable revisions without provider payload', async () => {
    const annual = await request(app.getHttpServer())
      .get('/api/v1/symbols/THYAO/financials?periodType=annual')
      .expect(200);
    expect(annual.body.data[0]).toMatchObject({
      providerRevision: 'annual-r2',
      periodType: 'annual',
    });
    expect(annual.text).not.toContain('rawPayload');
    const quarterly = await request(app.getHttpServer())
      .get('/api/v1/symbols/THYAO/financials?periodType=quarterly')
      .expect(200);
    expect(quarterly.body.data).toHaveLength(4);
  });
  it('builds TTM and returns versioned ratios with a separate market cutoff', async () => {
    const financials = await request(app.getHttpServer())
      .get('/api/v1/symbols/THYAO/financials?periodType=ttm')
      .expect(200);
    expect(
      financials.body.data[0].metrics.find(
        (m: { code: string }) => m.code === 'revenue',
      ).value,
    ).toBe('1000');
    const ratios = await request(app.getHttpServer())
      .get('/api/v1/symbols/THYAO/ratios?periodType=annual')
      .expect(200);
    expect(ratios.body.meta).toMatchObject({
      formulaVersion: 'fundamentals-ratios-v1',
      financialPeriodEnd: '2025-12-31T00:00:00.000Z',
      marketDataCutoffAt: '2026-01-02T00:00:00.000Z',
    });
    expect(
      ratios.body.data.find((item: { code: string }) => item.code === 'pe')
        .value,
    ).toBe('12.5');
    expect(ratios.text).not.toMatch(/NaN|Infinity/u);
  });
  it('serves trends and stable errors', async () => {
    const trends = await request(app.getHttpServer())
      .get(
        '/api/v1/symbols/THYAO/financial-trends?metric=revenue&periodType=annual',
      )
      .expect(200);
    expect(
      trends.body.data.map((item: { value: string }) => item.value),
    ).toEqual(['800', '1000']);
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/symbols/UNKNOWN/financials')
          .expect(404)
      ).body.error.code,
    ).toBe('SYMBOL_NOT_FOUND');
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/symbols/THYAO/ratios?periodType=bad')
          .expect(400)
      ).body.error.code,
    ).toBe('FUNDAMENTAL_PERIOD_INVALID');
  });
});
