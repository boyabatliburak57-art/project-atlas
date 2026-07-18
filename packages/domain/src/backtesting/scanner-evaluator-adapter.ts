import type { ScanOperand, ScanRuleAst } from '../scanner/ast/contracts.js';
import {
  evaluateScanRule,
  type PreparedOperandValue,
  type ScanRuleEvaluation,
} from '../scanner/evaluation/index.js';
import { createScanOperandKey } from '../scanner/evaluation/operand-values.js';
import type {
  BacktestBar,
  BacktestSignalContext,
  BacktestSignalEvaluator,
} from './contracts.js';

export interface BacktestOperandValueResolver {
  resolve(
    operand: ScanOperand,
    context: BacktestSignalContext,
  ): PreparedOperandValue | undefined;
}

export class ScannerBacktestSignalEvaluator implements BacktestSignalEvaluator {
  constructor(private readonly resolver?: BacktestOperandValueResolver) {}

  evaluate(
    rule: ScanRuleAst,
    context: BacktestSignalContext,
  ): ScanRuleEvaluation {
    assertNoFutureOrOpenBars(context);
    const values = new Map<string, PreparedOperandValue>();
    for (const operand of collectOperands(rule)) {
      const resolved =
        resolveBarOperand(operand, context.bars) ??
        this.resolver?.resolve(operand, context);
      if (resolved !== undefined)
        values.set(createScanOperandKey(operand), resolved);
    }
    return evaluateScanRule(rule, values);
  }
}

function resolveBarOperand(
  operand: ScanOperand,
  bars: readonly BacktestBar[],
): PreparedOperandValue | undefined {
  if (operand.type !== 'priceField' && operand.type !== 'volumeField') {
    return undefined;
  }
  const field = operand.type === 'volumeField' ? 'volume' : operand.field;
  const current = bars.at(-1);
  const previous = bars.at(-2);
  return {
    type: 'number',
    current: finiteNumber(current?.[field] ?? null),
    previous: finiteNumber(previous?.[field] ?? null),
  };
}

function finiteNumber(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function collectOperands(rule: ScanRuleAst): readonly ScanOperand[] {
  const operands = new Map<string, ScanOperand>();
  const visit = (node: ScanRuleAst['root']['children'][number]): void => {
    if (node.type === 'group') {
      node.children.forEach(visit);
      return;
    }
    [node.left, node.right, node.upperBound].forEach((operand) => {
      if (operand !== undefined)
        operands.set(createScanOperandKey(operand), operand);
    });
  };
  rule.root.children.forEach(visit);
  return [...operands.values()];
}

function assertNoFutureOrOpenBars(context: BacktestSignalContext): void {
  const signalTime = Date.parse(context.signalAt);
  if (
    context.bars.some(
      (bar) => !bar.isClosed || Date.parse(bar.timestamp) > signalTime,
    )
  ) {
    throw new Error('BACKTEST_SIGNAL_CONTEXT_LOOKAHEAD');
  }
}
