import { z } from 'zod';

export type PortfolioAvailability =
  | 'AVAILABLE'
  | 'PROVIDER_REQUIRED'
  | 'NOT_EVALUABLE'
  | 'PARTIAL'
  | 'STALE'
  | 'MISSING_COST_BASIS'
  | 'BENCHMARK_UNAVAILABLE';

const decimal = z
  .string()
  .regex(/^-?(?:0|[1-9]\d{0,14})(?:\.\d{1,8})?$/u, 'DECIMAL_INVALID');

export function canonicalDecimal(value: string, allowNegative = false) {
  const normalized = value.trim().replace(/\./gu, '').replace(',', '.');
  const parsed = decimal.parse(normalized);
  if (!allowNegative && parsed.startsWith('-'))
    throw new Error('NEGATIVE_NOT_ALLOWED');
  return parsed;
}

export function validateTransaction(input: {
  readonly type:
    | 'BUY'
    | 'SELL'
    | 'CASH_DEPOSIT'
    | 'CASH_WITHDRAWAL'
    | 'DIVIDEND';
  readonly quantity?: string;
  readonly unitPrice?: string;
  readonly cashAmount?: string;
  readonly availableQuantity?: string;
}) {
  if (input.type === 'BUY' || input.type === 'SELL') {
    const quantity = canonicalDecimal(input.quantity ?? '');
    const price = canonicalDecimal(input.unitPrice ?? '');
    if (Number(quantity) <= 0 || Number(price) <= 0)
      throw new Error('TRANSACTION_BOUNDS');
    if (
      input.type === 'SELL' &&
      Number(quantity) >
        Number(canonicalDecimal(input.availableQuantity ?? '0'))
    )
      throw new Error('PORTFOLIO_INSUFFICIENT_POSITION');
  } else if (Number(canonicalDecimal(input.cashAmount ?? '')) <= 0)
    throw new Error('TRANSACTION_BOUNDS');
  return input;
}

export class IdempotentTransactions {
  private readonly values = new Map<string, string>();
  create(key: string, factory: () => string) {
    const current = this.values.get(key);
    if (current) return current;
    const created = factory();
    this.values.set(key, created);
    return created;
  }
}

export class PositionPages<T extends { readonly id: string }> {
  private readonly cursors = new Set<string>();
  private readonly values = new Map<string, T>();
  append(cursor: string, items: readonly T[]) {
    if (this.cursors.has(cursor)) return this.list();
    this.cursors.add(cursor);
    for (const item of items) this.values.set(item.id, item);
    return this.list();
  }
  list() {
    return [...this.values.values()];
  }
}

export function maskFinancialValue(hidden: boolean, value: string) {
  return hidden
    ? { visual: '••••••', accessibility: 'Finansal değer gizli' }
    : { visual: value, accessibility: value };
}

export function safePortfolioShare(deepLink: string) {
  if (!/^atlas:\/\/portfolio$/u.test(deepLink))
    throw new Error('SHARE_LINK_NOT_ALLOWED');
  return `Atlas · Portföy ve risk metodolojisi\n${deepLink}`;
}

export function mutationAllowed(online: boolean) {
  if (!online) throw new Error('OFFLINE_MUTATION_BLOCKED');
  return true;
}

export function redactPortfolioTelemetry(
  event: string,
  values: Readonly<Record<string, unknown>>,
) {
  const blocked =
    /value|pnl|quantity|cost|amount|symbol|portfolio|name|note|user|resource|cash|risk|token|payload/iu;
  return {
    event,
    attributes: Object.fromEntries(
      Object.entries(values).filter(([key]) => !blocked.test(key)),
    ),
  };
}

export function riskAvailability(
  observations: number,
  benchmarkRequired: boolean,
  benchmarkAvailable: boolean,
): PortfolioAvailability {
  if (benchmarkRequired && !benchmarkAvailable) return 'BENCHMARK_UNAVAILABLE';
  return observations < 30 ? 'NOT_EVALUABLE' : 'AVAILABLE';
}
