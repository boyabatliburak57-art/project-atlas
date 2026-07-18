import { describe, expect, it } from 'vitest';

import type { StrategyDefinition, StrategyRuleAst } from './contracts.js';
import { bindStrategyParameters } from './parameter-binding.js';
import { validateStrategyDefinition } from './validation.js';

export function strategyRule(operator: 'LT' | 'GT' = 'LT'): StrategyRuleAst {
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
      nodeId: `root-${operator.toLowerCase()}`,
      operator: 'AND',
      children: [
        {
          type: 'condition',
          nodeId: `rsi-${operator.toLowerCase()}`,
          operator,
          left: {
            type: 'indicator',
            code: 'RSI',
            version: 1,
            timeframe: '1d',
            parameters: { period: { $parameter: 'rsiPeriod' } },
          },
          right: { type: 'parameter', name: 'threshold' },
        },
      ],
    },
  };
}

export function strategyDefinition(): StrategyDefinition {
  return {
    schemaVersion: 1,
    baseTimeframe: '1d',
    entryRule: strategyRule('LT'),
    exitRule: strategyRule('GT'),
    filterRule: null,
    parameters: [
      {
        name: 'rsiPeriod',
        type: 'integer',
        defaultValue: 14,
        minimum: 2,
        maximum: 100,
      },
      {
        name: 'threshold',
        type: 'number',
        defaultValue: 35,
        minimum: 0,
        maximum: 100,
      },
    ],
    positionSizing: { type: 'equalWeight' },
    riskControls: {
      stopLossPercent: 5,
      takeProfitPercent: 15,
      maxPositionWeight: 20,
      maxConcurrentPositions: 5,
      allowShort: false,
      allowLeverage: false,
      allowNegativeCash: false,
    },
    executionPolicy: {
      code: 'closed_bar_next_open',
      version: 'next-open-v1',
      signalBarPolicy: 'closed_only',
      higherTimeframeBarPolicy: 'closed_only',
      missingBarPolicy: 'defer_to_next_available',
    },
    costPolicy: {
      code: 'percentage_commission_fixed_bps_slippage',
      version: 'cost-v1',
      commissionPercent: 0.1,
      minimumCommission: 1,
      slippageBps: 5,
      fixedFee: 0,
      marketTaxPercent: 0,
    },
    dataIntegrityPolicy: {
      universePolicy: 'point_in_time',
      fundamentalAvailabilityPolicy: 'publication_and_revision',
      corporateActionPolicyVersion: 'corporate-action-v1',
      adjustmentMode: 'split_adjusted',
    },
    benchmarkCode: 'XU100',
  };
}

describe('strategy parameter binding', () => {
  const parameters = strategyDefinition().parameters;

  it('uses parameter defaults', () => {
    expect(bindStrategyParameters(parameters).values).toEqual({
      rsiPeriod: 14,
      threshold: 35,
    });
  });

  it('applies valid parameter overrides', () => {
    expect(
      bindStrategyParameters(parameters, { rsiPeriod: 21, threshold: 30 })
        .values,
    ).toEqual({ rsiPeriod: 21, threshold: 30 });
  });

  it('rejects out-of-range parameters', () => {
    expect(() =>
      bindStrategyParameters(parameters, { threshold: 101 }),
    ).toThrowError(
      expect.objectContaining({ code: 'STRATEGY_PARAMETER_BINDING_INVALID' }),
    );
  });

  it('creates a deterministic binding hash independent of override order', () => {
    const first = bindStrategyParameters(parameters, {
      threshold: 30,
      rsiPeriod: 21,
    });
    const second = bindStrategyParameters(parameters, {
      rsiPeriod: 21,
      threshold: 30,
    });
    expect(first.hash).toBe(second.hash);
  });
});

describe('backtest-safe strategy validation', () => {
  it('resolves required data, indicator warm-up, complexity and workload', () => {
    const validation = validateStrategyDefinition(strategyDefinition());
    expect(validation).toMatchObject({
      valid: true,
      requiredData: {
        priceTimeframes: ['1d'],
        priceFields: ['close'],
        requiresHistoricalUniverse: true,
        requiresCorporateActions: true,
      },
      warmup: { maximumBars: 15 },
      workload: { indicatorCount: 2, conditionCount: 2 },
    });
    expect(validation.complexityScore).toBeGreaterThan(0);
  });

  it('rejects a future bar reference', () => {
    const definition = structuredClone(strategyDefinition()) as unknown as {
      entryRule: { root: { children: { left: Record<string, unknown> }[] } };
    };
    definition.entryRule.root.children[0]!.left.barOffset = 1;
    expect(codes(definition)).toContain('STRATEGY_FUTURE_BAR_REFERENCE');
  });

  it('validates fundamental publication and revision availability', () => {
    const definition = withFundamental(strategyDefinition());
    const beforePublication = validateStrategyDefinition(definition, {
      pointInTime: {
        asOf: new Date('2025-03-01T00:00:00Z'),
        fundamentals: {
          revenue: {
            publishedAt: new Date('2025-03-15T00:00:00Z'),
            revisionAvailableAt: new Date('2025-03-15T00:00:00Z'),
          },
        },
      },
    });
    expect(beforePublication.errors).toContainEqual(
      expect.objectContaining({
        code: 'STRATEGY_FUNDAMENTAL_NOT_AVAILABLE',
        path: '/filterRule/root/children/0/left',
      }),
    );

    const afterPublication = validateStrategyDefinition(definition, {
      pointInTime: {
        asOf: new Date('2025-03-16T00:00:00Z'),
        fundamentals: {
          revenue: {
            publishedAt: new Date('2025-03-15T00:00:00Z'),
            revisionAvailableAt: new Date('2025-03-15T00:00:00Z'),
          },
        },
      },
    });
    expect(afterPublication.valid).toBe(true);
    expect(afterPublication.requiredData.fundamentalMetrics).toEqual([
      'revenue',
    ]);
  });

  it('rejects incomplete higher-timeframe alignment', () => {
    const definition = structuredClone(strategyDefinition()) as unknown as {
      executionPolicy: Record<string, unknown>;
    };
    definition.executionPolicy.higherTimeframeBarPolicy = 'include_open';
    expect(codes(definition)).toContain('STRATEGY_INCOMPLETE_HIGHER_TIMEFRAME');
  });

  it('rejects strategies above the complexity limit', () => {
    const validation = validateStrategyDefinition(strategyDefinition(), {
      limits: {
        maxComplexityScore: 1,
        maxNodes: 300,
        maxEstimatedOperationsPerInstrument: 100_000,
      },
    });
    expect(validation.errors).toContainEqual(
      expect.objectContaining({ code: 'STRATEGY_COMPLEXITY_LIMIT_EXCEEDED' }),
    );
  });

  it('preserves a stable validation error path', () => {
    const definition = structuredClone(strategyDefinition()) as unknown as {
      entryRule: { root: { children: Record<string, unknown>[] } };
    };
    definition.entryRule.root.children[0]!.operator = 'UNSAFE_OPERATOR';
    expect(validateStrategyDefinition(definition).errors).toContainEqual(
      expect.objectContaining({
        code: 'STRATEGY_UNSUPPORTED_OPERAND_OPERATOR',
        path: '/entryRule/root/children/0/operator',
      }),
    );
  });

  it.each([
    [
      'free expression',
      { type: 'expression', expression: 'close > 1' },
      'STRATEGY_FREE_EXPRESSION_FORBIDDEN',
    ],
    ['SQL', { type: 'sql', sql: 'select true' }, 'STRATEGY_SQL_EVAL_FORBIDDEN'],
    [
      'eval',
      { type: 'eval', eval: 'process.exit()' },
      'STRATEGY_SQL_EVAL_FORBIDDEN',
    ],
    [
      'unsupported operand',
      { type: 'remoteValue', key: 'x' },
      'STRATEGY_UNSUPPORTED_OPERAND_OPERATOR',
    ],
  ])('rejects %s operands', (_label, operand, code) => {
    const definition = structuredClone(strategyDefinition()) as unknown as {
      entryRule: { root: { children: { left: unknown }[] } };
    };
    definition.entryRule.root.children[0]!.left = operand;
    expect(codes(definition)).toContain(code);
  });

  it('rejects invalid sizing, risk and missing cost fields', () => {
    const sizing = structuredClone(strategyDefinition()) as unknown as {
      positionSizing: unknown;
    };
    sizing.positionSizing = { type: 'fixedPercent', percent: 101 };
    expect(codes(sizing)).toContain('STRATEGY_POSITION_SIZING_INVALID');

    const risk = structuredClone(strategyDefinition()) as unknown as {
      riskControls: { allowShort: boolean };
    };
    risk.riskControls.allowShort = true;
    expect(codes(risk)).toContain('STRATEGY_RISK_CONTROL_INVALID');

    const cost = structuredClone(strategyDefinition()) as unknown as {
      costPolicy: Record<string, unknown>;
    };
    delete cost.costPolicy.slippageBps;
    expect(codes(cost)).toContain('STRATEGY_COST_POLICY_INVALID');
  });
});

function codes(value: unknown): string[] {
  return validateStrategyDefinition(value).errors.map(({ code }) => code);
}

function withFundamental(definition: StrategyDefinition): unknown {
  const value = structuredClone(definition) as unknown as {
    filterRule: StrategyRuleAst | null;
  };
  value.filterRule = {
    version: 1,
    universe: strategyRule().universe,
    root: {
      type: 'group',
      nodeId: 'fundamental-root',
      operator: 'AND',
      children: [
        {
          type: 'condition',
          nodeId: 'revenue-positive',
          operator: 'GT',
          left: {
            type: 'fundamentalField',
            metricCode: 'revenue',
            period: 'latestAvailable',
            publicationPolicy: 'pointInTime',
            revisionPolicy: 'availableAtEventTime',
          },
          right: { type: 'constantNumber', value: 0 },
        },
      ],
    },
  };
  return value;
}
