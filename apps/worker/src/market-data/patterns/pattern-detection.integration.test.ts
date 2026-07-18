import {
  createDatabase,
  dataProviders,
  instruments,
  patternInstances,
  priceBars,
  runMigrations,
} from '@atlas/database';
import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DatabasePatternDetectionStore } from './database-pattern-detection-store';
import { processPatternDetectionJob } from './pattern-detection-job';
import { PatternDetectionService } from './pattern-detection-service';

function databaseUrl() {
  const value = process.env.TEST_DATABASE_URL;
  if (!value || !new URL(value).pathname.endsWith('_test'))
    throw new Error('TEST_DATABASE_URL must end with _test');
  return value;
}
const providerId = '91000000-0000-4000-8000-000000000001';
const topId = '91000000-0000-4000-8000-000000000002';
const bottomId = '91000000-0000-4000-8000-000000000003';
const start = new Date('2026-01-01T00:00:00.000Z');

describe('closed-bar pattern worker with PostgreSQL', () => {
  const { db, pool } = createDatabase(databaseUrl());
  const service = new PatternDetectionService(
    new DatabasePatternDetectionStore(db),
  );
  beforeAll(async () => {
    await pool.query('drop schema if exists public cascade');
    await pool.query('drop schema if exists drizzle cascade');
    await pool.query('create schema public');
    await runMigrations(db);
    await db.insert(dataProviders).values({
      id: providerId,
      code: 'pattern-fixture',
      name: 'Pattern fixture',
      status: 'active',
    });
    await db.insert(instruments).values([
      {
        id: topId,
        symbol: 'TOP',
        normalizedSymbol: 'TOP',
        name: 'Top candidate',
        marketCode: 'BIST',
        currencyCode: 'TRY',
        status: 'active',
      },
      {
        id: bottomId,
        symbol: 'BOTTOM',
        normalizedSymbol: 'BOTTOM',
        name: 'Bottom candidate',
        marketCode: 'BIST',
        currencyCode: 'TRY',
        status: 'active',
      },
    ]);
    await seedBars(topId, doubleBars('top'));
    await seedBars(bottomId, doubleBars('bottom'));
  });
  afterAll(() => pool.end());

  it('persists candidates once for duplicate closed-bar events', async () => {
    const job = {
      data: {
        instrumentIds: [topId, bottomId],
        timeframe: '1d',
        adjustmentMode: 'raw',
        dataCutoffAt: new Date(start.getTime() + 6 * 86400000).toISOString(),
      },
    } as never;
    const first = await processPatternDetectionJob(job, service);
    expect(first.inserted).toBeGreaterThanOrEqual(2);
    const replay = await processPatternDetectionJob(job, service);
    expect(replay.inserted).toBe(0);
    expect(replay.duplicates).toBe(replay.detections);
    const candidates = await db
      .select()
      .from(patternInstances)
      .where(
        and(
          inArray(patternInstances.instrumentId, [topId, bottomId]),
          eq(patternInstances.state, 'candidate'),
        ),
      );
    expect(candidates.map((item) => item.patternCode)).toEqual(
      expect.arrayContaining([
        'DOUBLE_TOP_CANDIDATE',
        'DOUBLE_BOTTOM_CANDIDATE',
      ]),
    );
  });

  it('confirms or invalidates candidates only on a later closed bar', async () => {
    await seedBars(topId, [{ close: 105, high: 106, low: 104 }], 7);
    await seedBars(bottomId, [{ close: 112, high: 113, low: 111 }], 7);
    const result = await service.execute({
      instrumentIds: [topId, bottomId],
      timeframe: '1d',
      adjustmentMode: 'raw',
      dataCutoffAt: new Date(start.getTime() + 7 * 86400000),
    });
    expect(typeof result.transitions.confirmed).toBe('number');
    expect(typeof result.transitions.invalidated).toBe('number');
    expect(result.transitions.confirmed).toBeGreaterThanOrEqual(1);
    expect(result.transitions.invalidated).toBeGreaterThanOrEqual(1);
    const transitioned = await db
      .select()
      .from(patternInstances)
      .where(inArray(patternInstances.instrumentId, [topId, bottomId]));
    expect(
      transitioned.find(
        (item) => item.patternCode === 'DOUBLE_BOTTOM_CANDIDATE',
      )?.state,
    ).toBe('confirmed');
    expect(
      transitioned.find((item) => item.patternCode === 'DOUBLE_TOP_CANDIDATE')
        ?.state,
    ).toBe('invalidated');
  });

  async function seedBars(
    instrumentId: string,
    values: readonly { close: number; high: number; low: number }[],
    offset = 0,
  ) {
    await db.insert(priceBars).values(
      values.map((value, index) => {
        const openTime = new Date(
          start.getTime() + (offset + index) * 86400000,
        );
        return {
          instrumentId,
          providerId,
          timeframe: '1d',
          openTime,
          closeTime: new Date(openTime.getTime() + 86400000),
          open: String(value.close),
          high: String(value.high),
          low: String(value.low),
          close: String(value.close),
          volume: '100',
          isClosed: true,
          sourceTimestamp: new Date(openTime.getTime() + 86400000),
          revision: 1,
          qualityStatus: 'accepted',
        };
      }),
    );
  }
});

function doubleBars(mode: 'top' | 'bottom') {
  const values = Array.from({ length: 7 }, () =>
    mode === 'top'
      ? { close: 95, high: 97, low: 93 }
      : { close: 105, high: 107, low: 103 },
  );
  if (mode === 'top') {
    values[1] = { close: 98, high: 100, low: 96 };
    values[3] = { close: 92, high: 94, low: 90 };
    values[5] = { close: 99, high: 101, low: 97 };
  } else {
    values[1] = { close: 102, high: 104, low: 100 };
    values[3] = { close: 108, high: 110, low: 106 };
    values[5] = { close: 101, high: 103, low: 99 };
  }
  return values;
}
