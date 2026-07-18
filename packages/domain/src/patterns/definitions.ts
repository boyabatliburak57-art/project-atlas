import type {
  PatternBar,
  PatternDefinition,
  PatternDetectionCore,
  PatternDirection,
  PatternInput,
} from './contracts.js';
import { PatternRegistry } from './registry.js';

type DetectionCore = PatternDetectionCore | null;
const noParameters = {
  metadata: { type: 'object', additionalProperties: false },
  parse(value: unknown) {
    if (
      typeof value !== 'object' ||
      value === null ||
      Object.keys(value).length > 0
    )
      throw new Error('invalid parameters');
    return {};
  },
};
const evidenceSchema = {
  schemaVersion: 1,
  type: 'object',
  required: ['points'],
};
const immediate = { mode: 'detection_bar_closed' };
const none = { mode: 'none' };

export function createCorePatternRegistry() {
  const registry = new PatternRegistry();
  for (const definition of coreDefinitions) registry.register(definition);
  return registry;
}

export const coreDefinitions: readonly PatternDefinition<
  Record<string, never>
>[] = [
  candle('DOJI', 'neutral', 1, (bar) => {
    const range = bar.high! - bar.low!;
    return range > 0 && Math.abs(bar.close! - bar.open!) <= range * 0.1;
  }),
  candle(
    'HAMMER',
    'bullish',
    1,
    (bar) =>
      shadows(bar).range > 0 &&
      shadows(bar).body > 0 &&
      shadows(bar).lower >= shadows(bar).body * 2 &&
      shadows(bar).upper <=
        Math.max(shadows(bar).body, shadows(bar).range * 0.1),
  ),
  candle(
    'INVERTED_HAMMER',
    'bullish',
    1,
    (bar) =>
      shadows(bar).range > 0 &&
      shadows(bar).body > 0 &&
      shadows(bar).upper >= shadows(bar).body * 2 &&
      shadows(bar).lower <=
        Math.max(shadows(bar).body, shadows(bar).range * 0.1),
  ),
  engulfing('BULLISH_ENGULFING', 'bullish'),
  engulfing('BEARISH_ENGULFING', 'bearish'),
  breakout('HIGH_BREAKOUT_20', 20, 'high'),
  breakout('HIGH_BREAKOUT_55', 55, 'high'),
  breakout('LOW_BREAKDOWN_20', 20, 'low'),
  breakout('LOW_BREAKDOWN_55', 55, 'low'),
  movingAverageCross('GOLDEN_CROSS', 'bullish'),
  movingAverageCross('DEATH_CROSS', 'bearish'),
  volumeBreakout(),
  doubleCandidate('DOUBLE_TOP_CANDIDATE', 'top'),
  doubleCandidate('DOUBLE_BOTTOM_CANDIDATE', 'bottom'),
  triangleCandidate('ASCENDING_TRIANGLE_CANDIDATE', 'ascending'),
  triangleCandidate('DESCENDING_TRIANGLE_CANDIDATE', 'descending'),
];

function base(
  code: string,
  category: 'candlestick' | 'trend_breakout' | 'geometric',
  minimumInput: number,
  requiredFields: PatternDefinition<Record<string, never>>['requiredFields'],
  detect: PatternDefinition<Record<string, never>>['detect'],
  policies: {
    confirmation: Record<string, unknown>;
    invalidation: Record<string, unknown>;
  } = { confirmation: immediate, invalidation: none },
): PatternDefinition<Record<string, never>> {
  return {
    code,
    version: 1,
    algorithmVersion: `${code.toLowerCase()}-v1`,
    category,
    parameterSchema: noParameters,
    minimumInput,
    requiredFields,
    evidenceSchema,
    confirmationPolicy: policies.confirmation,
    invalidationPolicy: policies.invalidation,
    detect,
  };
}

function candle(
  code: string,
  direction: PatternDirection,
  minimum: number,
  matches: (bar: PatternBar) => boolean,
) {
  return base(
    code,
    'candlestick',
    minimum,
    ['open', 'high', 'low', 'close'],
    (input) => {
      const bar = input.bars.at(-1)!;
      if (!matches(bar)) return null;
      return result(input, 'confirmed', direction, [
        point(bar, 'candle', bar.close!),
      ]);
    },
  );
}

function engulfing(code: string, direction: 'bullish' | 'bearish') {
  return base(
    code,
    'candlestick',
    2,
    ['open', 'high', 'low', 'close'],
    (input) => {
      const previous = input.bars.at(-2)!;
      const current = input.bars.at(-1)!;
      const bullish =
        previous.close! < previous.open! &&
        current.close! > current.open! &&
        current.open! <= previous.close! &&
        current.close! >= previous.open!;
      const bearish =
        previous.close! > previous.open! &&
        current.close! < current.open! &&
        current.open! >= previous.close! &&
        current.close! <= previous.open!;
      if (direction === 'bullish' ? !bullish : !bearish) return null;
      return result(input, 'confirmed', direction, [
        point(previous, 'engulfed', previous.close!),
        point(current, 'engulfing', current.close!),
      ]);
    },
  );
}

function breakout(code: string, period: number, mode: 'high' | 'low') {
  return base(
    code,
    'trend_breakout',
    period + 1,
    ['high', 'low', 'close'],
    (input) => {
      const current = input.bars.at(-1)!;
      const prior = input.bars.slice(-(period + 1), -1);
      const level =
        mode === 'high'
          ? Math.max(...prior.map((bar) => bar.high!))
          : Math.min(...prior.map((bar) => bar.low!));
      const match =
        mode === 'high' ? current.close! > level : current.close! < level;
      if (!match) return null;
      return {
        ...result(input, 'confirmed', mode === 'high' ? 'bullish' : 'bearish', [
          point(prior.at(-1)!, 'reference', level),
          point(
            current,
            mode === 'high' ? 'breakout' : 'breakdown',
            current.close!,
          ),
        ]),
        breakoutLevel: level,
        invalidationLevel: level,
      };
    },
  );
}

function movingAverageCross(code: string, direction: 'bullish' | 'bearish') {
  return base(code, 'trend_breakout', 201, ['close'], (input) => {
    const closes = input.bars.map((bar) => bar.close!);
    const previousFast = average(closes.slice(-51, -1));
    const currentFast = average(closes.slice(-50));
    const previousSlow = average(closes.slice(-201, -1));
    const currentSlow = average(closes.slice(-200));
    const match =
      direction === 'bullish'
        ? previousFast <= previousSlow && currentFast > currentSlow
        : previousFast >= previousSlow && currentFast < currentSlow;
    if (!match) return null;
    const bar = input.bars.at(-1)!;
    return {
      ...result(input, 'confirmed', direction, [
        point(bar, 'fastAverage', currentFast),
        point(bar, 'slowAverage', currentSlow),
      ]),
      breakoutLevel: currentSlow,
      invalidationLevel: currentSlow,
    };
  });
}

function volumeBreakout() {
  return base(
    'VOLUME_CONFIRMED_BREAKOUT',
    'trend_breakout',
    21,
    ['high', 'close', 'volume'],
    (input) => {
      const current = input.bars.at(-1)!;
      const prior = input.bars.slice(-21, -1);
      const level = Math.max(...prior.map((bar) => bar.high!));
      const averageVolume = average(prior.map((bar) => bar.volume!));
      if (!(current.close! > level && current.volume! >= averageVolume * 1.5))
        return null;
      return {
        ...result(input, 'confirmed', 'bullish', [
          point(current, 'breakout', current.close!),
          point(current, 'volume', current.volume!),
        ]),
        breakoutLevel: level,
        invalidationLevel: level,
        volumeConfirmation: true,
      };
    },
  );
}

function doubleCandidate(code: string, mode: 'top' | 'bottom') {
  return base(
    code,
    'geometric',
    7,
    ['high', 'low', 'close'],
    (input) => {
      const bars = input.bars.slice(-7);
      const first = bars[1]!;
      const middle = bars[3]!;
      const second = bars[5]!;
      const a = mode === 'top' ? first.high! : first.low!;
      const b = mode === 'top' ? second.high! : second.low!;
      const valley = mode === 'top' ? middle.low! : middle.high!;
      const similar =
        Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1) <= 0.02;
      const depth =
        mode === 'top'
          ? valley <= Math.min(a, b) * 0.95
          : valley >= Math.max(a, b) * 1.05;
      if (!similar || !depth) return null;
      const direction = mode === 'top' ? 'bearish' : 'bullish';
      return {
        ...result(input, 'candidate', direction, [
          point(first, 'firstPivot', a),
          point(middle, 'neckline', valley),
          point(second, 'secondPivot', b),
        ]),
        breakoutLevel: valley,
        invalidationLevel:
          mode === 'top' ? Math.max(a, b) * 1.02 : Math.min(a, b) * 0.98,
      };
    },
    transitionPolicies(mode === 'top' ? 'below_breakout' : 'above_breakout'),
  );
}

function triangleCandidate(code: string, mode: 'ascending' | 'descending') {
  return base(
    code,
    'geometric',
    10,
    ['high', 'low', 'close'],
    (input) => {
      const bars = input.bars.slice(-10);
      const first = bars[0]!;
      const last = bars.at(-1)!;
      const highs = bars.map((bar) => bar.high!);
      const lows = bars.map((bar) => bar.low!);
      const flatHigh =
        (Math.max(...highs) - Math.min(...highs)) / Math.max(...highs) <= 0.025;
      const flatLow =
        (Math.max(...lows) - Math.min(...lows)) / Math.max(...lows) <= 0.025;
      const match =
        mode === 'ascending'
          ? flatHigh && lows.at(-1)! > lows[0]! * 1.03
          : flatLow && highs.at(-1)! < highs[0]! * 0.97;
      if (!match) return null;
      const breakoutLevel =
        mode === 'ascending' ? average(highs) : average(lows);
      return {
        ...result(
          input,
          'candidate',
          mode === 'ascending' ? 'bullish' : 'bearish',
          [
            point(
              first,
              mode === 'ascending'
                ? 'risingSupportStart'
                : 'fallingResistanceStart',
              mode === 'ascending' ? first.low! : first.high!,
            ),
            point(
              last,
              mode === 'ascending'
                ? 'risingSupportEnd'
                : 'fallingResistanceEnd',
              mode === 'ascending' ? last.low! : last.high!,
            ),
            point(last, 'horizontalBoundary', breakoutLevel),
          ],
        ),
        breakoutLevel,
        invalidationLevel:
          mode === 'ascending' ? Math.min(...lows) : Math.max(...highs),
      };
    },
    transitionPolicies(
      mode === 'ascending' ? 'above_breakout' : 'below_breakout',
    ),
  );
}

function transitionPolicies(mode: 'above_breakout' | 'below_breakout') {
  return {
    confirmation: { mode, closedBarsAfterDetection: 1 },
    invalidation: {
      mode:
        mode === 'above_breakout' ? 'below_invalidation' : 'above_invalidation',
      closedBarsAfterDetection: 1,
    },
  };
}
function shadows(bar: PatternBar) {
  const body = Math.abs(bar.close! - bar.open!);
  const top = Math.max(bar.open!, bar.close!);
  const bottom = Math.min(bar.open!, bar.close!);
  return {
    body,
    range: bar.high! - bar.low!,
    upper: bar.high! - top,
    lower: bottom - bar.low!,
  };
}
function point(bar: PatternBar, role: string, price: number) {
  return { time: bar.timestamp, price, role };
}
function average(values: readonly number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
function result(
  input: PatternInput,
  state: 'candidate' | 'confirmed',
  direction: PatternDirection,
  evidencePoints: NonNullable<DetectionCore>['evidencePoints'],
): NonNullable<DetectionCore> {
  const start = evidencePoints[0]?.time ?? input.bars.at(-1)!.timestamp;
  const end = input.bars.at(-1)!.timestamp;
  return {
    state,
    direction,
    startTime: start,
    endTime: end,
    detectedAt: end,
    evidencePoints,
    breakoutLevel: null,
    invalidationLevel: null,
    volumeConfirmation: null,
    confidence: null,
    warnings:
      state === 'candidate' ? ['ALGORITHMIC_CANDIDATE_NOT_PREDICTION'] : [],
  };
}
