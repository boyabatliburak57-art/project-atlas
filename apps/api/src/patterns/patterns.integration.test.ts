/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
import type { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GlobalExceptionFilter } from '../common/http/global-exception.filter';
import { MARKET_RATE_LIMITER } from '../market/market-overview.ports';
import { PatternsController } from './patterns.controller';
import { PATTERN_READ_MODEL, type PatternReadModel } from './patterns.ports';
import { PatternsService } from './patterns.service';

const instance = {
  id: '92000000-0000-4000-8000-000000000001',
  instrumentId: '92000000-0000-4000-8000-000000000002',
  symbol: 'THYAO',
  timeframe: '1d',
  adjustmentMode: 'raw',
  code: 'DOUBLE_BOTTOM_CANDIDATE',
  version: 1,
  algorithmVersion: 'double_bottom_candidate-v1',
  state: 'candidate',
  direction: 'bullish',
  startTime: new Date('2026-01-01Z'),
  endTime: new Date('2026-01-07Z'),
  detectedAt: new Date('2026-01-07Z'),
  confirmedAt: null,
  invalidatedAt: null,
  dataCutoffAt: new Date('2026-01-07Z'),
  confidence: null,
  evidence: {
    schemaVersion: 1,
    points: [
      { time: '2026-01-02T00:00:00.000Z', price: '100', role: 'firstPivot' },
    ],
    breakoutLevel: 110,
    invalidationLevel: 98,
  },
  warnings: [{ code: 'ALGORITHMIC_CANDIDATE_NOT_PREDICTION' }],
} as const;
class Reader implements PatternReadModel {
  catalog() {
    return Promise.resolve([
      {
        code: 'DOUBLE_BOTTOM_CANDIDATE',
        version: 1,
        algorithmVersion: 'double_bottom_candidate-v1',
        category: 'geometric',
      },
    ]);
  }
  symbolId(symbol: string) {
    return Promise.resolve(
      symbol === 'THYAO'
        ? { id: instance.instrumentId, symbol: 'THYAO' }
        : null,
    );
  }
  list(input: Parameters<PatternReadModel['list']>[0]) {
    return Promise.resolve(
      !input.instrumentId || input.instrumentId === instance.instrumentId
        ? [instance]
        : [],
    );
  }
}

describe('pattern API and chart-marker contract', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [PatternsController],
      providers: [
        PatternsService,
        { provide: PATTERN_READ_MODEL, useClass: Reader },
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
  it('serves the versioned catalog', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/patterns/catalog')
      .expect(200);
    expect(response.body.data[0]).toMatchObject({
      code: 'DOUBLE_BOTTOM_CANDIDATE',
      version: 1,
      algorithmVersion: 'double_bottom_candidate-v1',
    });
  });
  it('serves symbol and market candidates with deterministic chart markers', async () => {
    const symbol = await request(app.getHttpServer())
      .get('/api/v1/symbols/THYAO/patterns?state=candidate')
      .expect(200);
    expect(symbol.body.data[0]).toMatchObject({
      state: 'candidate',
      chartMarkers: [
        {
          time: '2026-01-02T00:00:00.000Z',
          price: '100',
          role: 'firstPivot',
          evidenceVersion: 1,
        },
      ],
    });
    expect(symbol.body.meta.disclaimer).toContain('not predictions');
    const market = await request(app.getHttpServer())
      .get('/api/v1/market/patterns')
      .expect(200);
    expect(market.body.data).toHaveLength(1);
    expect(market.text).not.toMatch(/NaN|Infinity/u);
  });
  it('returns stable symbol and query errors', async () => {
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/symbols/UNKNOWN/patterns')
          .expect(404)
      ).body.error.code,
    ).toBe('SYMBOL_NOT_FOUND');
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/market/patterns?state=wrong')
          .expect(400)
      ).body.error.code,
    ).toBe('PATTERN_QUERY_INVALID');
  });
});
