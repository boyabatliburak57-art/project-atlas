import { Decimal } from '../portfolio/decimal.js';
import type {
  FundamentalMetricCode,
  FundamentalRatioResult,
  NormalizedFundamentalStatement,
  RatioCalculationContext,
  RatioCode,
} from './contracts.js';
import { RATIO_CODES } from './contracts.js';

export const FUNDAMENTAL_FORMULA_VERSION = 'fundamentals-ratios-v1';

type NegativePolicy = 'allow' | 'not_evaluable';

interface Formula {
  readonly marketBased?: boolean;
  readonly denominatorPolicy: NegativePolicy;
  readonly calculate: (context: RatioCalculationContext) => Decimal | null;
}

const metric = (
  statement: NormalizedFundamentalStatement,
  code: FundamentalMetricCode,
) => {
  const value = statement.metrics[code];
  return value === undefined ? null : Decimal.parse(value, code);
};
const divide = (
  numerator: Decimal | null,
  denominator: Decimal | null,
  negative: NegativePolicy,
) => {
  if (numerator === null || denominator === null) return null;
  if (denominator.isZero()) return null;
  if (negative === 'not_evaluable' && denominator.isNegative()) return null;
  return numerator.dividedBy(denominator, 12);
};
const growth = (current: Decimal | null, previous: Decimal | null) =>
  divide(
    current === null || previous === null ? null : current.minus(previous),
    previous,
    'not_evaluable',
  );

const formulas: Record<RatioCode, Formula> = {
  pe: {
    marketBased: true,
    denominatorPolicy: 'not_evaluable',
    calculate: (c) =>
      divide(marketCap(c), metric(c.current, 'netIncome'), 'not_evaluable'),
  },
  pb: {
    marketBased: true,
    denominatorPolicy: 'not_evaluable',
    calculate: (c) =>
      divide(marketCap(c), metric(c.current, 'equity'), 'not_evaluable'),
  },
  evToEbitda: {
    marketBased: true,
    denominatorPolicy: 'not_evaluable',
    calculate: (c) =>
      divide(enterpriseValue(c), metric(c.current, 'ebitda'), 'not_evaluable'),
  },
  netDebtToEbitda: {
    denominatorPolicy: 'not_evaluable',
    calculate: (c) =>
      divide(netDebt(c.current), metric(c.current, 'ebitda'), 'not_evaluable'),
  },
  grossMargin: ratioFormula('grossProfit', 'revenue', 'not_evaluable'),
  operatingMargin: ratioFormula('operatingProfit', 'revenue', 'not_evaluable'),
  netMargin: ratioFormula('netIncome', 'revenue', 'not_evaluable'),
  roa: ratioFormula('netIncome', 'totalAssets', 'not_evaluable'),
  roe: ratioFormula('netIncome', 'equity', 'not_evaluable'),
  currentRatio: ratioFormula(
    'currentAssets',
    'currentLiabilities',
    'not_evaluable',
  ),
  debtToEquity: ratioFormula('financialDebt', 'equity', 'not_evaluable'),
  freeCashFlowMargin: ratioFormula('freeCashFlow', 'revenue', 'not_evaluable'),
  revenueGrowth: {
    denominatorPolicy: 'not_evaluable',
    calculate: (c) =>
      growth(
        metric(c.current, 'revenue'),
        c.previous ? metric(c.previous, 'revenue') : null,
      ),
  },
  netIncomeGrowth: {
    denominatorPolicy: 'not_evaluable',
    calculate: (c) =>
      growth(
        metric(c.current, 'netIncome'),
        c.previous ? metric(c.previous, 'netIncome') : null,
      ),
  },
};

export class VersionedRatioRegistry {
  list() {
    return RATIO_CODES.map((code) => ({
      code,
      formulaVersion: FUNDAMENTAL_FORMULA_VERSION,
      denominatorPolicy: formulas[code].denominatorPolicy,
    }));
  }

  calculate(
    context: RatioCalculationContext,
  ): readonly FundamentalRatioResult[] {
    return RATIO_CODES.map((code) => calculateRatio(code, context));
  }
}

function calculateRatio(
  code: RatioCode,
  context: RatioCalculationContext,
): FundamentalRatioResult {
  const formula = formulas[code];
  let value: Decimal | null = null;
  let reasonCode: string | null = null;
  if (formula.marketBased && context.market === undefined)
    reasonCode = 'MARKET_DATA_MISSING';
  else if (
    formula.marketBased &&
    context.market?.currencyCode !== context.current.currencyCode
  )
    reasonCode = 'CURRENCY_MISMATCH';
  else {
    try {
      value = formula.calculate(context);
      if (value === null) reasonCode = inferReason(code, context);
    } catch {
      reasonCode = 'INVALID_NUMERIC_INPUT';
    }
  }
  return {
    code,
    value: value?.toString() ?? null,
    status: value === null ? 'not_evaluable' : 'complete',
    reasonCode,
    formulaVersion: FUNDAMENTAL_FORMULA_VERSION,
    financialPeriod: `${context.current.fiscalYear}-${context.current.fiscalPeriod}`,
    marketDataCutoffAt: formula.marketBased
      ? (context.market?.dataCutoffAt ?? null)
      : null,
    inputRevisions: [
      context.current.providerRevision,
      ...(context.previous ? [context.previous.providerRevision] : []),
    ],
    warnings: [],
  };
}

function ratioFormula(
  numerator: FundamentalMetricCode,
  denominator: FundamentalMetricCode,
  policy: NegativePolicy,
): Formula {
  return {
    denominatorPolicy: policy,
    calculate: (c) =>
      divide(
        metric(c.current, numerator),
        metric(c.current, denominator),
        policy,
      ),
  };
}

function marketCap(context: RatioCalculationContext) {
  const shares = metric(context.current, 'sharesOutstanding');
  return context.market && shares
    ? Decimal.parse(context.market.price).times(shares)
    : null;
}

function netDebt(statement: NormalizedFundamentalStatement) {
  const debt = metric(statement, 'financialDebt');
  const cash = metric(statement, 'cashAndEquivalents');
  return debt && cash ? debt.minus(cash) : null;
}

function enterpriseValue(context: RatioCalculationContext) {
  const cap = marketCap(context);
  const debt = netDebt(context.current);
  return cap && debt ? cap.plus(debt) : null;
}

function inferReason(code: RatioCode, context: RatioCalculationContext) {
  if (
    (code === 'revenueGrowth' || code === 'netIncomeGrowth') &&
    !context.previous
  )
    return 'COMPARISON_PERIOD_MISSING';
  const denominator: Partial<Record<RatioCode, FundamentalMetricCode>> = {
    pe: 'netIncome',
    pb: 'equity',
    evToEbitda: 'ebitda',
    netDebtToEbitda: 'ebitda',
    grossMargin: 'revenue',
    operatingMargin: 'revenue',
    netMargin: 'revenue',
    roa: 'totalAssets',
    roe: 'equity',
    currentRatio: 'currentLiabilities',
    debtToEquity: 'equity',
    freeCashFlowMargin: 'revenue',
    revenueGrowth: 'revenue',
    netIncomeGrowth: 'netIncome',
  };
  const source =
    code === 'revenueGrowth' || code === 'netIncomeGrowth'
      ? context.previous
      : context.current;
  const raw = source?.metrics[denominator[code]!];
  if (raw === undefined) return 'INPUT_MISSING';
  const parsed = Decimal.parse(raw);
  if (parsed.isZero()) return 'DENOMINATOR_ZERO';
  if (parsed.isNegative()) return 'NEGATIVE_DENOMINATOR';
  return 'INPUT_MISSING';
}
