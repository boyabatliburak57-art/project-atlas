import { z } from 'zod';

export type MetricState =
  | { readonly status: 'AVAILABLE'; readonly value: string }
  | { readonly status: 'NOT_EVALUABLE'; readonly reasonCode: string };

const boundedRule = z.object({
  field: z.enum(['close', 'volume', 'rsi', 'sma', 'ema', 'pattern']),
  operator: z.enum(['gt', 'gte', 'lt', 'lte', 'crossesAbove', 'crossesBelow']),
  value: z.string().regex(/^-?\d+(?:\.\d{1,8})?$/u),
});

export function validateStrategyRules(
  rules: readonly unknown[],
  depth: number,
) {
  if (depth > 4) throw new Error('STRATEGY_RULE_DEPTH_EXCEEDED');
  if (rules.length === 0 || rules.length > 30)
    throw new Error('STRATEGY_RULE_COUNT_INVALID');
  return rules.map((rule) => boundedRule.parse(rule));
}

export function validateBacktestConfiguration(input: {
  readonly start: string;
  readonly end: string;
  readonly initialCapital: string;
  readonly commissionBps: number;
  readonly slippageBps: number;
  readonly maxPositions: number;
}) {
  if (Date.parse(input.start) >= Date.parse(input.end))
    throw new Error('BACKTEST_PERIOD_INVALID');
  if (
    !/^\d+(?:\.\d{1,2})?$/u.test(input.initialCapital) ||
    Number(input.initialCapital) <= 0
  )
    throw new Error('INITIAL_CAPITAL_INVALID');
  if (input.commissionBps < 0 || input.commissionBps > 500)
    throw new Error('COMMISSION_INVALID');
  if (input.slippageBps < 0 || input.slippageBps > 500)
    throw new Error('SLIPPAGE_INVALID');
  if (
    !Number.isInteger(input.maxPositions) ||
    input.maxPositions < 1 ||
    input.maxPositions > 100
  )
    throw new Error('MAX_POSITIONS_INVALID');
  return input;
}

export class IdempotentRunRequests {
  private readonly runs = new Map<string, string>();
  create(key: string, create: () => string) {
    const existing = this.runs.get(key);
    if (existing) return existing;
    const value = create();
    this.runs.set(key, value);
    return value;
  }
}

export function boundExperimentCombinations(
  dimensions: readonly (readonly string[])[],
) {
  const combinations = dimensions.reduce(
    (total, values) => total * values.length,
    1,
  );
  if (combinations < 1 || combinations > 64)
    throw new Error('EXPERIMENT_COMBINATION_LIMIT');
  return combinations;
}

export function mergeTradePage<T extends { readonly id: string }>(
  current: readonly T[],
  incoming: readonly T[],
) {
  return [
    ...new Map([...current, ...incoming].map((row) => [row.id, row])).values(),
  ];
}

export function displayMetric(
  value: string | null,
  reasonCode?: string,
): MetricState {
  return value === null
    ? {
        status: 'NOT_EVALUABLE',
        reasonCode: reasonCode ?? 'INSUFFICIENT_HISTORY',
      }
    : { status: 'AVAILABLE', value };
}

export function canMutate(online: boolean, providerAvailable: boolean) {
  if (!online) throw new Error('OFFLINE_MUTATION_BLOCKED');
  if (!providerAvailable) throw new Error('PROVIDER_REQUIRED');
  return true;
}

export function redactStrategyTelemetry(
  values: Readonly<Record<string, unknown>>,
) {
  const blocked =
    /ast|strategyName|threshold|symbol|universe|trade|result|capital|parameter|user|token|resource/iu;
  return Object.fromEntries(
    Object.entries(values).filter(([key]) => !blocked.test(key)),
  );
}

export function safeStrategyLink(link: string) {
  if (!/^atlas:\/\/(strategy|backtest|experiment)\/[0-9a-f-]{36}$/u.test(link))
    throw new Error('STRATEGY_LINK_NOT_ALLOWED');
  return link;
}
