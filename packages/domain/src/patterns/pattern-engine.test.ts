import { describe, expect, it } from 'vitest';
import type {
  PatternBar,
  PatternDefinition,
  PatternInput,
} from './contracts.js';
import { coreDefinitions, createCorePatternRegistry } from './definitions.js';
import { PatternExecutor } from './executor.js';
import { PatternRegistry } from './registry.js';

const registry = createCorePatternRegistry();
const executor = new PatternExecutor(registry);
const requests = registry
  .catalog()
  .map(({ code, version }) => ({ code, version }));
const cutoff = new Date('2026-07-18T00:00:00.000Z');
const bar = (
  index: number,
  close = 10,
  values: Partial<PatternBar> = {},
): PatternBar => ({
  timestamp: new Date(Date.UTC(2025, 0, 1 + index)),
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 100,
  isClosed: true,
  ...values,
});
const input = (
  bars: readonly PatternBar[],
  adjustmentMode: PatternInput['adjustmentMode'] = 'raw',
  dataCutoffAt = cutoff,
): PatternInput => ({
  instrumentId: '10000000-0000-4000-8000-000000000001',
  timeframe: '1d',
  adjustmentMode,
  bars,
  dataCutoffAt,
});
const detected = (code: string, bars: readonly PatternBar[]) =>
  executor.execute(input(bars), [{ code, version: 1 }])[0]!;

const fixtures: Record<string, PatternBar[]> = {
  DOJI: [bar(0, 10, { open: 10, close: 10.05, high: 11, low: 9 })],
  HAMMER: [bar(0, 11, { open: 10, close: 11, high: 11.5, low: 7 })],
  INVERTED_HAMMER: [bar(0, 11, { open: 10, close: 11, high: 14, low: 9.5 })],
  BULLISH_ENGULFING: [
    bar(0, 10, { open: 11, close: 10 }),
    bar(1, 11.5, { open: 9.5, close: 11.5, high: 12, low: 9 }),
  ],
  BEARISH_ENGULFING: [
    bar(0, 11, { open: 10, close: 11 }),
    bar(1, 9.5, { open: 11.5, close: 9.5, high: 12, low: 9 }),
  ],
  HIGH_BREAKOUT_20: breakoutBars(20, 'high'),
  HIGH_BREAKOUT_55: breakoutBars(55, 'high'),
  LOW_BREAKDOWN_20: breakoutBars(20, 'low'),
  LOW_BREAKDOWN_55: breakoutBars(55, 'low'),
  GOLDEN_CROSS: [
    ...Array.from({ length: 150 }, (_, i) => bar(i, 10)),
    ...Array.from({ length: 50 }, (_, i) => bar(150 + i, 9)),
    bar(200, 200, { high: 201, low: 199 }),
  ],
  DEATH_CROSS: [
    ...Array.from({ length: 150 }, (_, i) => bar(i, 10)),
    ...Array.from({ length: 50 }, (_, i) => bar(150 + i, 11)),
    bar(200, -100, { high: -99, low: -101 }),
  ],
  VOLUME_CONFIRMED_BREAKOUT: [
    ...Array.from({ length: 20 }, (_, i) =>
      bar(i, 9, { high: 10, volume: 100 }),
    ),
    bar(20, 11, { high: 11, volume: 200 }),
  ],
  DOUBLE_TOP_CANDIDATE: doubleBars('top'),
  DOUBLE_BOTTOM_CANDIDATE: doubleBars('bottom'),
  ASCENDING_TRIANGLE_CANDIDATE: triangleBars('ascending'),
  DESCENDING_TRIANGLE_CANDIDATE: triangleBars('descending'),
};

describe('mandatory pattern definitions', () => {
  for (const definition of coreDefinitions)
    it(`detects positive fixture for ${definition.code}`, () => {
      const result = detected(definition.code, fixtures[definition.code]!);
      expect(result.status).toBe('detected');
      if (result.status === 'detected') {
        expect(result.detection.evidencePoints.length).toBeGreaterThan(0);
        expect(result.detection.algorithmVersion).toBe(
          definition.algorithmVersion,
        );
        expect(JSON.stringify(result)).not.toMatch(/NaN|Infinity/u);
        if (definition.category === 'geometric')
          expect(result.detection.state).toBe('candidate');
      }
    });

  it('rejects a constant-series near miss', () => {
    const results = executor.execute(
      input(
        Array.from({ length: 220 }, (_, i) =>
          bar(i, 10, { high: 10, low: 10 }),
        ),
      ),
      requests,
    );
    expect(
      results.filter((result) => result.status === 'detected'),
    ).toHaveLength(0);
  });
  it('does not use future or open bars when creating a candidate', () => {
    const bars = fixtures.DOUBLE_TOP_CANDIDATE!;
    const candidateCutoff = bars.at(-1)!.timestamp;
    const original = executor.execute(input(bars, 'raw', candidateCutoff), [
      { code: 'DOUBLE_TOP_CANDIDATE', version: 1 },
    ])[0];
    const future = bar(1000, 500, {
      timestamp: new Date('2027-01-01Z'),
      high: 600,
      low: 400,
    });
    const withFuture = executor.execute(
      input([...bars, future], 'raw', candidateCutoff),
      [{ code: 'DOUBLE_TOP_CANDIDATE', version: 1 }],
    )[0]!;
    expect(withFuture).toEqual(original);
  });
  it('marks short input not evaluable', () =>
    expect(detected('HIGH_BREAKOUT_55', [bar(0)])).toMatchObject({
      status: 'not_evaluable',
      reasonCode: 'INPUT_TOO_SHORT',
    }));
  it('marks missing volume not evaluable', () => {
    const bars = fixtures.VOLUME_CONFIRMED_BREAKOUT!.map((item) => ({
      ...item,
      volume: null,
    }));
    expect(detected('VOLUME_CONFIRMED_BREAKOUT', bars)).toMatchObject({
      status: 'not_evaluable',
      reasonCode: 'MISSING_VOLUME',
    });
  });
  it('is adjustment-scale consistent', () => {
    const raw = detected('HIGH_BREAKOUT_20', fixtures.HIGH_BREAKOUT_20!);
    const scaled = executor.execute(
      input(
        fixtures.HIGH_BREAKOUT_20!.map((item) => ({
          ...item,
          open: item.open! / 2,
          high: item.high! / 2,
          low: item.low! / 2,
          close: item.close! / 2,
        })),
        'split-adjusted',
      ),
      [{ code: 'HIGH_BREAKOUT_20', version: 1 }],
    )[0]!;
    expect(scaled.status).toBe(raw.status);
  });
  it('keeps algorithm versions as separate registry definitions', () => {
    const custom = {
      ...coreDefinitions[0]!,
      version: 2,
      algorithmVersion: 'doji-v2',
    } satisfies PatternDefinition<Record<string, never>>;
    const local = new PatternRegistry()
      .register(coreDefinitions[0]!)
      .register(custom);
    expect(
      local.catalog().map(({ version, algorithmVersion }) => ({
        version,
        algorithmVersion,
      })),
    ).toEqual([
      { version: 1, algorithmVersion: 'doji-v1' },
      { version: 2, algorithmVersion: 'doji-v2' },
    ]);
  });
  it('produces deterministic evidence and deduplication keys', () => {
    expect(
      detected('DOUBLE_BOTTOM_CANDIDATE', fixtures.DOUBLE_BOTTOM_CANDIDATE!),
    ).toEqual(
      detected('DOUBLE_BOTTOM_CANDIDATE', fixtures.DOUBLE_BOTTOM_CANDIDATE!),
    );
  });
  it('guards non-finite input', () => {
    expect(detected('DOJI', [{ ...bar(0), close: Number.NaN }])).toMatchObject({
      status: 'not_evaluable',
      reasonCode: 'INPUT_INVALID',
    });
  });
});

function breakoutBars(period: number, mode: 'high' | 'low') {
  const prior = Array.from({ length: period }, (_, i) =>
    bar(i, 10, { high: 11, low: 9 }),
  );
  return [
    ...prior,
    mode === 'high'
      ? bar(period, 12, { high: 12.5, low: 11 })
      : bar(period, 8, { high: 9, low: 7.5 }),
  ];
}
function doubleBars(mode: 'top' | 'bottom') {
  const bars = Array.from({ length: 7 }, (_, i) =>
    bar(i, mode === 'top' ? 95 : 105, {
      high: mode === 'top' ? 97 : 107,
      low: mode === 'top' ? 93 : 103,
    }),
  );
  if (mode === 'top') {
    bars[1] = bar(1, 98, { high: 100, low: 96 });
    bars[3] = bar(3, 92, { high: 94, low: 90 });
    bars[5] = bar(5, 99, { high: 101, low: 97 });
  } else {
    bars[1] = bar(1, 102, { high: 104, low: 100 });
    bars[3] = bar(3, 108, { high: 110, low: 106 });
    bars[5] = bar(5, 101, { high: 103, low: 99 });
  }
  return bars;
}
function triangleBars(mode: 'ascending' | 'descending') {
  return Array.from({ length: 10 }, (_, i) =>
    mode === 'ascending'
      ? bar(i, 95, { high: 100 + (i % 2) * 0.5, low: 80 + i })
      : bar(i, 85, { high: 100 - i, low: 80 + (i % 2) * 0.5 }),
  );
}
