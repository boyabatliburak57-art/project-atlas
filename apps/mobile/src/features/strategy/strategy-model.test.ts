import { describe, expect, it } from 'vitest';
import {
  boundExperimentCombinations,
  canMutate,
  displayMetric,
  IdempotentRunRequests,
  mergeTradePage,
  redactStrategyTelemetry,
  safeStrategyLink,
  validateBacktestConfiguration,
  validateStrategyRules,
} from './strategy-model';

describe('strategy mobile safety contracts', () => {
  it('validates only the shared mobile rule allowlist', () => {
    expect(
      validateStrategyRules(
        [{ field: 'rsi', operator: 'gte', value: '55' }],
        1,
      ),
    ).toHaveLength(1);
    expect(() =>
      validateStrategyRules(
        [{ field: 'sql', operator: 'exec', value: '1' }],
        1,
      ),
    ).toThrow();
  });
  it('bounds nesting and rule count', () => {
    expect(() => validateStrategyRules([], 1)).toThrow(
      'STRATEGY_RULE_COUNT_INVALID',
    );
    expect(() =>
      validateStrategyRules([{ field: 'rsi', operator: 'gt', value: '1' }], 5),
    ).toThrow('STRATEGY_RULE_DEPTH_EXCEEDED');
  });
  it('validates date, capital, cost and position bounds', () => {
    expect(
      validateBacktestConfiguration({
        start: '2025-01-01',
        end: '2026-01-01',
        initialCapital: '100000',
        commissionBps: 10,
        slippageBps: 5,
        maxPositions: 10,
      }),
    ).toBeTruthy();
    expect(() =>
      validateBacktestConfiguration({
        start: '2026-01-01',
        end: '2025-01-01',
        initialCapital: '0',
        commissionBps: -1,
        slippageBps: 0,
        maxPositions: 0,
      }),
    ).toThrow();
  });
  it('deduplicates run submissions', () => {
    const runs = new IdempotentRunRequests();
    expect(runs.create('same', () => 'run-1')).toBe(
      runs.create('same', () => 'run-2'),
    );
  });
  it('bounds experiments', () => {
    expect(
      boundExperimentCombinations([
        ['1', '2'],
        ['a', 'b'],
      ]),
    ).toBe(4);
    expect(() =>
      boundExperimentCombinations([
        Array.from({ length: 65 }, (_, i) => String(i)),
      ]),
    ).toThrow('EXPERIMENT_COMBINATION_LIMIT');
  });
  it('deduplicates cursor trades', () => {
    expect(
      mergeTradePage([{ id: '1' }], [{ id: '1' }, { id: '2' }]),
    ).toHaveLength(2);
  });
  it('never presents missing metrics as zero', () => {
    expect(displayMetric(null, 'ZERO_DRAWDOWN')).toEqual({
      status: 'NOT_EVALUABLE',
      reasonCode: 'ZERO_DRAWDOWN',
    });
  });
  it('blocks offline and providerless execution', () => {
    expect(() => canMutate(false, true)).toThrow('OFFLINE_MUTATION_BLOCKED');
    expect(() => canMutate(true, false)).toThrow('PROVIDER_REQUIRED');
  });
  it('redacts private research telemetry', () => {
    expect(
      redactStrategyTelemetry({
        screen: 'result',
        strategyName: 'private',
        capital: 10,
      }),
    ).toEqual({ screen: 'result' });
  });
  it('allows only typed owner-resolved deep links', () => {
    expect(
      safeStrategyLink('atlas://backtest/123e4567-e89b-12d3-a456-426614174000'),
    ).toContain('backtest');
    expect(() => safeStrategyLink('atlas://reports/private')).toThrow();
  });
});
