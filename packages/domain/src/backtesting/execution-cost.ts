import { Decimal, parseLedgerDecimal } from '../portfolio/decimal.js';
import type { BacktestCostPolicy, BacktestDecimal } from './contracts.js';
import { BacktestDomainError } from './contracts.js';

export interface ExecutionCostCalculation {
  readonly referencePrice: Decimal;
  readonly fillPrice: Decimal;
  readonly grossAmount: Decimal;
  readonly slippageAmount: Decimal;
  readonly commission: Decimal;
  readonly fixedFee: Decimal;
  readonly tax: Decimal;
  readonly explicitCosts: Decimal;
  readonly totalEconomicCosts: Decimal;
  readonly cashRequired: Decimal;
  readonly netProceeds: Decimal;
}

export function calculateExecutionCosts(input: {
  readonly side: 'BUY' | 'SELL';
  readonly quantity: Decimal;
  readonly referencePrice: Decimal;
  readonly policy: BacktestCostPolicy;
}): ExecutionCostCalculation {
  const zero = Decimal.ZERO;
  if (input.policy.type === 'costFree') {
    const gross = input.quantity.times(input.referencePrice);
    return {
      referencePrice: input.referencePrice,
      fillPrice: input.referencePrice,
      grossAmount: gross,
      slippageAmount: zero,
      commission: zero,
      fixedFee: zero,
      tax: zero,
      explicitCosts: zero,
      totalEconomicCosts: zero,
      cashRequired: gross,
      netProceeds: gross,
    };
  }
  const commissionPercent = nonNegative(
    input.policy.commissionPercent,
    'commissionPercent',
  );
  const minimumCommission = nonNegative(
    input.policy.minimumCommission,
    'minimumCommission',
  );
  const fixedFee = nonNegative(input.policy.fixedFee, 'fixedFee');
  const taxPercent = nonNegative(
    input.policy.marketTaxPercent,
    'marketTaxPercent',
  );
  const slippageBps = nonNegative(input.policy.slippageBps, 'slippageBps');
  const one = Decimal.parse('1');
  const slippageRate = slippageBps.dividedBy(Decimal.parse('10000'));
  const multiplier =
    input.side === 'BUY' ? one.plus(slippageRate) : one.minus(slippageRate);
  if (multiplier.isNegative() || multiplier.isZero()) {
    throw new BacktestDomainError('BACKTEST_PLAN_INVALID', {
      field: 'slippageBps',
    });
  }
  const fillPrice = input.referencePrice.times(multiplier);
  const grossAmount = input.quantity.times(fillPrice);
  const rawCommission = grossAmount
    .times(commissionPercent)
    .dividedBy(Decimal.parse('100'));
  const commission =
    rawCommission.compare(minimumCommission) < 0
      ? minimumCommission
      : rawCommission;
  const tax = grossAmount.times(taxPercent).dividedBy(Decimal.parse('100'));
  const explicitCosts = commission.plus(fixedFee).plus(tax);
  const slippageAmount = input.quantity.times(
    input.side === 'BUY'
      ? fillPrice.minus(input.referencePrice)
      : input.referencePrice.minus(fillPrice),
  );
  return {
    referencePrice: input.referencePrice,
    fillPrice,
    grossAmount,
    slippageAmount,
    commission,
    fixedFee,
    tax,
    explicitCosts,
    totalEconomicCosts: explicitCosts.plus(slippageAmount),
    cashRequired: grossAmount.plus(explicitCosts),
    netProceeds: grossAmount.minus(explicitCosts),
  };
}

export function costPolicyOrDefault(
  policy: BacktestCostPolicy | undefined,
): BacktestCostPolicy {
  return policy ?? { type: 'costFree', version: 'cost-free-v1' };
}

function nonNegative(value: BacktestDecimal, field: string): Decimal {
  try {
    return parseLedgerDecimal(value, field, { nonNegative: true });
  } catch (cause: unknown) {
    throw new BacktestDomainError('BACKTEST_PLAN_INVALID', { field, cause });
  }
}
