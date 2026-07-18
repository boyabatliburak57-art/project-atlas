import { describe, expect, it } from 'vitest';

import type { ScanRuleAst } from '../scanner/ast/contracts.js';
import type {
  BacktestBar,
  BacktestExecutionPlan,
  BacktestForcedExitEvent,
} from './contracts.js';
import { DeterministicBacktestEngine } from './engine.js';
import { ScannerBacktestSignalEvaluator } from './scanner-evaluator-adapter.js';

const engine = new DeterministicBacktestEngine(
  new ScannerBacktestSignalEvaluator(),
);

function rule(operator: 'GT' | 'LT', value: number): ScanRuleAst {
  return {
    version: 1,
    universe: {
      market: 'BIST',
      statuses: ['active'],
      indexCodes: [],
      sectorIds: [],
    },
    root: {
      type: 'group',
      nodeId: `root-${operator}-${value}`,
      operator: 'AND',
      children: [
        {
          type: 'condition',
          nodeId: `condition-${operator}-${value}`,
          operator,
          left: { type: 'priceField', field: 'close', timeframe: '1d' },
          right: { type: 'constantNumber', value },
        },
      ],
    },
  };
}

function plan(
  overrides: Partial<BacktestExecutionPlan> = {},
): BacktestExecutionPlan {
  return {
    runId: 'run-065',
    strategyRevisionId: 'strategy-revision-1',
    dataSnapshotHash: 'snapshot-065',
    engineVersion: 'engine-v1',
    executionPolicyVersion: 'closed-bar-next-open-v1',
    eventOrderingPolicyVersion: 'event-ordering-v1',
    roundingPolicyVersion: 'whole-share-half-even-v1',
    timeframe: '1d',
    initialCash: '1000',
    entryRule: rule('GT', 10),
    exitRule: rule('LT', 10),
    positionSizing: { type: 'fixedCash', amount: '500' },
    maxConcurrentPositions: 5,
    fractionalShares: false,
    allowShort: false,
    allowLeverage: false,
    liquidateAtEnd: false,
    ...overrides,
  };
}

function bar(
  day: number,
  close: string,
  options: {
    symbol?: string;
    instrumentId?: string;
    open?: string | null;
    eventId?: string;
    isClosed?: boolean;
  } = {},
): BacktestBar {
  const symbol = options.symbol ?? 'AAA';
  return {
    eventId: options.eventId ?? `${symbol}-bar-${day}`,
    type: 'bar',
    instrumentId: options.instrumentId ?? `instrument-${symbol}`,
    symbol,
    timestamp: `2025-01-${String(day).padStart(2, '0')}T15:00:00.000Z`,
    open: options.open === undefined ? close : options.open,
    high: close,
    low: close,
    close,
    volume: '100000',
    isClosed: options.isClosed ?? true,
  };
}

function roundTripEvents(): readonly BacktestBar[] {
  return [
    bar(1, '11', { open: '10' }),
    bar(2, '13', { open: '12' }),
    bar(3, '9', { open: '10' }),
    bar(4, '8', { open: '8' }),
  ];
}

describe('DeterministicBacktestEngine financial fixtures', () => {
  it('1. constructs a single-symbol buy and sell trade', () => {
    const result = engine.run(plan(), roundTripEvents());
    expect(
      result.fills.map((fill) => [fill.side, fill.price, fill.quantity]),
    ).toEqual([
      ['BUY', '12', '41'],
      ['SELL', '8', '41'],
    ]);
    expect(result.trades).toHaveLength(1);
    expect(result.summary).toMatchObject({
      endingEquity: '836',
      realizedPnl: '-164',
      tradeCount: 1,
    });
  });

  it('2. processes multiple symbols in one timestamp bucket', () => {
    const events = [
      bar(1, '11', { symbol: 'BBB' }),
      bar(1, '11', { symbol: 'AAA' }),
      bar(2, '12', { symbol: 'BBB' }),
      bar(2, '12', { symbol: 'AAA' }),
    ];
    const result = engine.run(plan(), events);
    expect(result.fills.map((fill) => fill.symbol)).toEqual(['AAA', 'BBB']);
    expect(result.state.positions).toHaveLength(2);
  });

  it('3. applies equal-weight sizing against the portfolio equity', () => {
    const result = engine.run(
      plan({
        positionSizing: { type: 'equalWeight' },
        maxConcurrentPositions: 2,
      }),
      [
        bar(1, '101', { symbol: 'AAA' }),
        bar(1, '101', { symbol: 'BBB' }),
        bar(2, '100', { symbol: 'AAA', open: '100' }),
        bar(2, '100', { symbol: 'BBB', open: '100' }),
      ],
    );
    expect(result.fills.map((fill) => fill.quantity)).toEqual(['5', '5']);
    expect(result.state.cash).toBe('0');
  });

  it('4. applies fixed-cash and fixed-percentage sizing', () => {
    const events = [bar(1, '11'), bar(2, '100', { open: '100' })];
    const fixedCash = engine.run(
      plan({ positionSizing: { type: 'fixedCash', amount: '300' } }),
      events,
    );
    const fixedPercentage = engine.run(
      plan({ positionSizing: { type: 'fixedPercentage', percent: '20' } }),
      events,
    );
    expect(fixedCash.fills[0]?.quantity).toBe('3');
    expect(fixedPercentage.fills[0]?.quantity).toBe('2');
  });

  it('5. rejects an order atomically when fixed cash exceeds available cash', () => {
    const result = engine.run(
      plan({ positionSizing: { type: 'fixedCash', amount: '1001' } }),
      [bar(1, '11'), bar(2, '12')],
    );
    expect(result.fills).toHaveLength(0);
    expect(result.state.cash).toBe('1000');
    expect(result.warnings).toContainEqual({
      code: 'INSUFFICIENT_CASH',
      eventId: 'AAA-bar-2',
      instrumentId: 'instrument-AAA',
    });
  });

  it('6. enforces maximum concurrent positions with stable winner selection', () => {
    const events = [
      bar(1, '11', { symbol: 'ZZZ' }),
      bar(1, '11', { symbol: 'AAA' }),
      bar(2, '12', { symbol: 'ZZZ' }),
      bar(2, '12', { symbol: 'AAA' }),
    ];
    const result = engine.run(plan({ maxConcurrentPositions: 1 }), events);
    expect(result.fills.map((fill) => fill.symbol)).toEqual(['AAA']);
    expect(
      result.warnings.some((item) => item.code === 'MAX_POSITIONS_REACHED'),
    ).toBe(true);
  });

  it('7. uses stable symbol ordering independent of input order', () => {
    const ordered = [
      bar(1, '11', { symbol: 'AAA' }),
      bar(1, '11', { symbol: 'BBB' }),
      bar(2, '12', { symbol: 'AAA' }),
      bar(2, '12', { symbol: 'BBB' }),
    ];
    const reversed = [...ordered].reverse();
    expect(engine.run(plan(), ordered).resultHash).toBe(
      engine.run(plan(), reversed).resultHash,
    );
  });

  it('8. fills a closed-bar signal only at the next available open', () => {
    const result = engine.run(plan(), [
      bar(1, '11', { open: '7' }),
      bar(2, '50', { open: '13' }),
    ]);
    expect(result.fills[0]).toMatchObject({
      signalAt: '2025-01-01T15:00:00.000Z',
      filledAt: '2025-01-02T15:00:00.000Z',
      price: '13',
    });
  });

  it('9. prevents same-bar leakage and excludes future bars from signal context', () => {
    const observedHistoryEnds: string[] = [];
    const recordingEngine = new DeterministicBacktestEngine({
      evaluate: (scanRule, context) => {
        observedHistoryEnds.push(context.bars.at(-1)!.timestamp);
        return new ScannerBacktestSignalEvaluator().evaluate(scanRule, context);
      },
    });
    const result = recordingEngine.run(plan(), [
      bar(1, '11', { open: '1' }),
      bar(2, '1000', { open: '17' }),
    ]);
    expect(observedHistoryEnds[0]).toBe('2025-01-01T15:00:00.000Z');
    expect(result.fills[0]?.price).toBe('17');
    expect(result.fills[0]?.filledAt).not.toBe(result.fills[0]?.signalAt);
  });

  it('10. executes a forced exit before normal same-timestamp bar signals', () => {
    const forced: BacktestForcedExitEvent = {
      eventId: 'forced-3',
      type: 'forcedExit',
      instrumentId: 'instrument-AAA',
      symbol: 'AAA',
      timestamp: '2025-01-03T15:00:00.000Z',
      price: '15',
      reason: 'delisting',
    };
    const result = engine.run(plan(), [
      bar(1, '11'),
      bar(2, '12'),
      forced,
      bar(3, '20'),
    ]);
    expect(result.trades[0]).toMatchObject({
      exitPrice: '15',
      exitReason: 'forcedExit',
    });
    expect(result.state.positions).toHaveLength(0);
  });

  it('11. liquidates remaining positions at the final closed price', () => {
    const result = engine.run(plan({ liquidateAtEnd: true }), [
      bar(1, '11'),
      bar(2, '14', { open: '12' }),
    ]);
    expect(result.fills.at(-1)).toMatchObject({
      side: 'SELL',
      price: '14',
      reason: 'endOfTest',
    });
    expect(result.state.positions).toHaveLength(0);
  });

  it('12. produces a finite zero-trade summary', () => {
    const result = engine.run(plan({ entryRule: rule('GT', 1000) }), [
      bar(1, '10'),
      bar(2, '11'),
    ]);
    expect(result.summary).toMatchObject({
      endingEquity: '1000',
      totalReturnPercent: '0',
      tradeCount: 0,
      winRatePercent: '0',
      profitFactor: null,
    });
  });

  it('13. defers through a missing execution bar without synthesizing a fill', () => {
    const result = engine.run(plan(), [
      bar(1, '11'),
      bar(2, '12', { open: null }),
      bar(3, '13', { open: '13' }),
    ]);
    expect(result.fills[0]).toMatchObject({
      filledAt: '2025-01-03T15:00:00.000Z',
      price: '13',
    });
    expect(
      result.warnings.some((item) => item.code === 'MISSING_EXECUTION_PRICE'),
    ).toBe(true);
  });

  it('14. produces identical hashes and outputs for identical inputs', () => {
    const first = engine.run(plan(), roundTripEvents());
    const second = engine.run(plan(), roundTripEvents());
    expect(second).toEqual(first);
    expect(second.resultHash).toBe(first.resultHash);
  });

  it('15. ignores duplicate events without duplicate fill or trade', () => {
    const events = roundTripEvents();
    const result = engine.run(plan(), [...events, events[0]!, events[1]!]);
    expect(
      new Set(result.fills.map((fill) => fill.deduplicationKey)).size,
    ).toBe(result.fills.length);
    expect(new Set(result.trades.map((trade) => trade.id)).size).toBe(
      result.trades.length,
    );
    expect(
      result.warnings.filter((item) => item.code === 'DUPLICATE_EVENT_IGNORED'),
    ).toHaveLength(2);
  });

  it('16. resumes from a validated checkpoint', () => {
    const events = roundTripEvents();
    const partial = engine.run(plan(), events, {
      stopAfterTimestampBuckets: 2,
    });
    expect(partial.status).toBe('checkpointed');
    const resumed = engine.run(plan(), events, {
      checkpoint: partial.checkpoint,
    });
    expect(resumed.status).toBe('completed');
    expect(resumed.fills).toHaveLength(2);
  });

  it('17. checkpoint resume produces the same result as an uninterrupted run', () => {
    const events = roundTripEvents();
    const complete = engine.run(plan(), events);
    const partial = engine.run(plan(), events, {
      stopAfterTimestampBuckets: 2,
    });
    const resumed = engine.run(plan(), events, {
      checkpoint: partial.checkpoint,
    });
    expect(resumed.resultHash).toBe(complete.resultHash);
    expect(resumed.fills).toEqual(complete.fills);
    expect(resumed.trades).toEqual(complete.trades);
    expect(resumed.equityCurve).toEqual(complete.equityCurve);
  });

  it('18. never emits NaN or Infinity in public or persistent results', () => {
    const results = [
      engine.run(plan(), roundTripEvents()),
      engine.run(plan({ entryRule: rule('GT', 1000) }), [bar(1, '10')]),
    ];
    for (const result of results) {
      const serialized = JSON.stringify(result);
      expect(serialized).not.toMatch(/NaN|Infinity/);
    }
    expect(results[0]?.summary?.profitFactor).toBe('0');
    expect(results[1]?.summary?.profitFactor).toBeNull();
  });
});
