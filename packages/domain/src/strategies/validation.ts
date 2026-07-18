import { INDICATOR_TIMEFRAMES } from '../indicators/contracts.js';
import { createCoreIndicatorRegistry } from '../indicators/registry/indicator-registry.js';
import type {
  ScanOperand,
  ScanRuleAst,
  ScanRuleNode,
} from '../scanner/ast/contracts.js';
import { validateScanRule } from '../scanner/validation/scan-rule-validator.js';

import type {
  FundamentalFieldOperand,
  PositionSizing,
  StrategyCostPolicyReference,
  StrategyDataIntegrityPolicy,
  StrategyDefinition,
  StrategyExecutionPolicyReference,
  StrategyGroupNode,
  StrategyOperand,
  StrategyParameterBinding,
  StrategyParameterDefinition,
  StrategyPointInTimeContext,
  StrategyRequiredData,
  StrategyRiskControls,
  StrategyRuleAst,
  StrategyRuleNode,
  StrategyValidationIssue,
  StrategyValidationLimits,
  StrategyValidationResult,
  StrategyValidationWarning,
  StrategyWarmupResolution,
  StrategyWorkloadEstimate,
} from './contracts.js';
import { STRATEGY_SCHEMA_VERSION } from './contracts.js';
import { StrategyDomainError } from './errors.js';
import {
  bindStrategyParameters,
  isParameterDefinitionValid,
} from './parameter-binding.js';

export const DEFAULT_STRATEGY_VALIDATION_LIMITS: StrategyValidationLimits = {
  maxComplexityScore: 1_000,
  maxNodes: 300,
  maxEstimatedOperationsPerInstrument: 100_000,
};

export interface StrategyValidationOptions {
  readonly limits?: StrategyValidationLimits | undefined;
  readonly pointInTime?: StrategyPointInTimeContext | undefined;
}

interface MutableAnalysis {
  readonly errors: StrategyValidationIssue[];
  readonly warnings: StrategyValidationWarning[];
  readonly priceTimeframes: Set<string>;
  readonly priceFields: Set<string>;
  readonly fundamentalMetrics: Set<string>;
  readonly indicatorDefinitions: Map<
    string,
    StrategyRequiredData['indicatorDefinitions'][number]
  >;
  readonly warmupByTimeframe: Map<string, number>;
  nodeCount: number;
  conditionCount: number;
  indicatorCount: number;
}

const indicatorRegistry = createCoreIndicatorRegistry();

export function validateStrategyDefinition(
  value: unknown,
  options: StrategyValidationOptions = {},
): StrategyValidationResult {
  const limits = options.limits ?? DEFAULT_STRATEGY_VALIDATION_LIMITS;
  const analysis: MutableAnalysis = {
    errors: [],
    warnings: [],
    priceTimeframes: new Set(),
    priceFields: new Set(),
    fundamentalMetrics: new Set(),
    indicatorDefinitions: new Map(),
    warmupByTimeframe: new Map(),
    nodeCount: 0,
    conditionCount: 0,
    indicatorCount: 0,
  };
  if (!isRecord(value)) {
    issue(
      analysis,
      'STRATEGY_INVALID_FIELD',
      '/',
      'Strategy definition must be an object',
    );
    return result(analysis, limits);
  }
  exactKeys(
    value,
    [
      'schemaVersion',
      'baseTimeframe',
      'entryRule',
      'exitRule',
      'filterRule',
      'parameters',
      'positionSizing',
      'riskControls',
      'executionPolicy',
      'costPolicy',
      'dataIntegrityPolicy',
      'benchmarkCode',
    ],
    '/',
    analysis,
  );
  if (value.schemaVersion !== STRATEGY_SCHEMA_VERSION) {
    issue(
      analysis,
      'STRATEGY_INVALID_FIELD',
      '/schemaVersion',
      'Only strategy schema version 1 is supported',
    );
  }
  const baseTimeframe = isOneOf(value.baseTimeframe, INDICATOR_TIMEFRAMES)
    ? value.baseTimeframe
    : null;
  if (baseTimeframe === null) {
    issue(
      analysis,
      'STRATEGY_INVALID_FIELD',
      '/baseTimeframe',
      'Base timeframe is not supported',
    );
  }
  const parameters = parseParameterDefinitions(value.parameters, analysis);
  const binding = bindDefaults(parameters, analysis);
  const executionPolicy = parseExecutionPolicy(value.executionPolicy, analysis);
  const costPolicy = parseCostPolicy(value.costPolicy, analysis);
  const dataIntegrityPolicy = parseDataIntegrityPolicy(
    value.dataIntegrityPolicy,
    analysis,
  );
  const positionSizing = parsePositionSizing(value.positionSizing, analysis);
  const riskControls = parseRiskControls(value.riskControls, analysis);
  const entryRule = parseRule(
    value.entryRule,
    '/entryRule',
    binding,
    baseTimeframe,
    options.pointInTime,
    analysis,
  );
  const exitRule = parseRule(
    value.exitRule,
    '/exitRule',
    binding,
    baseTimeframe,
    options.pointInTime,
    analysis,
  );
  const filterRule =
    value.filterRule === null
      ? null
      : parseRule(
          value.filterRule,
          '/filterRule',
          binding,
          baseTimeframe,
          options.pointInTime,
          analysis,
        );
  const benchmarkCode = parseBenchmark(value.benchmarkCode, analysis);

  enforceComplexity(analysis, limits);
  const normalizedDefinition =
    analysis.errors.length === 0 &&
    baseTimeframe !== null &&
    binding !== null &&
    executionPolicy !== null &&
    costPolicy !== null &&
    dataIntegrityPolicy !== null &&
    positionSizing !== null &&
    riskControls !== null &&
    entryRule !== null &&
    exitRule !== null &&
    (value.filterRule === null || filterRule !== null) &&
    benchmarkCode !== undefined
      ? freeze({
          schemaVersion: STRATEGY_SCHEMA_VERSION,
          baseTimeframe,
          entryRule,
          exitRule,
          filterRule,
          parameters: normalizeParameterDefinitions(parameters),
          positionSizing,
          riskControls,
          executionPolicy,
          costPolicy,
          dataIntegrityPolicy,
          benchmarkCode,
        } satisfies StrategyDefinition)
      : undefined;

  return result(analysis, limits, normalizedDefinition, binding ?? undefined);
}

function parseRule(
  value: unknown,
  path: string,
  binding: StrategyParameterBinding | null,
  baseTimeframe: string | null,
  pointInTime: StrategyPointInTimeContext | undefined,
  analysis: MutableAnalysis,
): StrategyRuleAst | null {
  inspectForbidden(value, path, analysis);
  const scannerValue = transformRule(
    value,
    path,
    binding,
    baseTimeframe,
    pointInTime,
    analysis,
  );
  const scannerValidation = validateScanRule(scannerValue, {
    maxDepth: 12,
    maxNodes: 10_000,
  });
  if (!scannerValidation.valid) {
    for (const error of scannerValidation.errors) {
      issue(
        analysis,
        error.code === 'INVALID_OPERAND' ||
          error.code === 'OPERATOR_NOT_SUPPORTED' ||
          error.code === 'OPERAND_TYPES_INCOMPATIBLE'
          ? 'STRATEGY_UNSUPPORTED_OPERAND_OPERATOR'
          : 'STRATEGY_AST_INVALID',
        prefixPath(path, error.path),
        error.message,
      );
    }
    return null;
  }
  if (scannerValidation.normalizedRule !== undefined) {
    analyzeResolvedRule(scannerValidation.normalizedRule, path, analysis);
  }
  if (!isRecord(value)) return null;
  return normalizeStrategyRule(value as unknown as StrategyRuleAst);
}

function transformRule(
  value: unknown,
  path: string,
  binding: StrategyParameterBinding | null,
  baseTimeframe: string | null,
  pointInTime: StrategyPointInTimeContext | undefined,
  analysis: MutableAnalysis,
): unknown {
  if (!isRecord(value) || !isRecord(value.root)) return value;
  return {
    ...value,
    root: transformNode(
      value.root,
      `${path}/root`,
      binding,
      baseTimeframe,
      pointInTime,
      analysis,
    ),
  };
}

function transformNode(
  value: unknown,
  path: string,
  binding: StrategyParameterBinding | null,
  baseTimeframe: string | null,
  pointInTime: StrategyPointInTimeContext | undefined,
  analysis: MutableAnalysis,
): unknown {
  analysis.nodeCount += 1;
  if (!isRecord(value)) return value;
  if (value.type === 'group') {
    return {
      ...value,
      children: Array.isArray(value.children)
        ? value.children.map((child, index) =>
            transformNode(
              child,
              `${path}/children/${index}`,
              binding,
              baseTimeframe,
              pointInTime,
              analysis,
            ),
          )
        : value.children,
    };
  }
  if (value.type !== 'condition') return value;
  analysis.conditionCount += 1;
  return {
    ...value,
    left: transformOperand(
      value.left,
      `${path}/left`,
      binding,
      baseTimeframe,
      pointInTime,
      analysis,
    ),
    ...(value.right === undefined
      ? {}
      : {
          right: transformOperand(
            value.right,
            `${path}/right`,
            binding,
            baseTimeframe,
            pointInTime,
            analysis,
          ),
        }),
    ...(value.upperBound === undefined
      ? {}
      : {
          upperBound: transformOperand(
            value.upperBound,
            `${path}/upperBound`,
            binding,
            baseTimeframe,
            pointInTime,
            analysis,
          ),
        }),
  };
}

function transformOperand(
  value: unknown,
  path: string,
  binding: StrategyParameterBinding | null,
  baseTimeframe: string | null,
  pointInTime: StrategyPointInTimeContext | undefined,
  analysis: MutableAnalysis,
): unknown {
  if (!isRecord(value)) return value;
  validateBarReference(value, path, baseTimeframe, analysis);
  if (value.type === 'parameter') {
    const name = value.name;
    const parameterValue =
      typeof name === 'string' ? binding?.values[name] : undefined;
    if (parameterValue === undefined) {
      issue(
        analysis,
        'STRATEGY_PARAMETER_BINDING_INVALID',
        `${path}/name`,
        'Parameter operand must reference a defined parameter',
      );
      return value;
    }
    return typeof parameterValue === 'boolean'
      ? { type: 'constantBoolean', value: parameterValue }
      : typeof parameterValue === 'number'
        ? { type: 'constantNumber', value: parameterValue }
        : value;
  }
  if (value.type === 'fundamentalField') {
    validateFundamental(value, path, pointInTime, analysis);
    return { type: 'constantNumber', value: 0 };
  }
  const sanitized = Object.fromEntries(
    Object.entries(value).filter(
      ([key]) =>
        !['barOffset', 'barClosePolicy', 'useIncompleteBar'].includes(key),
    ),
  );
  if (value.type === 'indicator') {
    analysis.indicatorCount += 1;
    sanitized.parameters = resolveParameterReferences(
      value.parameters,
      binding,
      `${path}/parameters`,
      analysis,
    );
  }
  return sanitized;
}

function validateBarReference(
  value: Record<string, unknown>,
  path: string,
  baseTimeframe: string | null,
  analysis: MutableAnalysis,
): void {
  if (value.barOffset !== undefined) {
    if (!Number.isInteger(value.barOffset)) {
      issue(
        analysis,
        'STRATEGY_AST_INVALID',
        `${path}/barOffset`,
        'barOffset must be an integer',
      );
    } else if ((value.barOffset as number) > 0) {
      issue(
        analysis,
        'STRATEGY_FUTURE_BAR_REFERENCE',
        `${path}/barOffset`,
        'Future bar references are forbidden',
      );
    }
  }
  if (
    value.useIncompleteBar === true ||
    value.barClosePolicy === 'includeOpen'
  ) {
    issue(
      analysis,
      'STRATEGY_INCOMPLETE_HIGHER_TIMEFRAME',
      path,
      'Open or incomplete timeframe bars are forbidden',
    );
  }
  if (
    typeof value.timeframe === 'string' &&
    baseTimeframe !== null &&
    timeframeRank(value.timeframe) > timeframeRank(baseTimeframe) &&
    value.barClosePolicy !== undefined &&
    value.barClosePolicy !== 'closedOnly'
  ) {
    issue(
      analysis,
      'STRATEGY_INCOMPLETE_HIGHER_TIMEFRAME',
      `${path}/barClosePolicy`,
      'Higher timeframe operands must use closed bars',
    );
  }
}

function validateFundamental(
  value: Record<string, unknown>,
  path: string,
  pointInTime: StrategyPointInTimeContext | undefined,
  analysis: MutableAnalysis,
): void {
  if (
    typeof value.metricCode !== 'string' ||
    !/^[a-z][a-zA-Z0-9_]{1,63}$/.test(value.metricCode)
  ) {
    issue(
      analysis,
      'STRATEGY_UNSUPPORTED_OPERAND_OPERATOR',
      `${path}/metricCode`,
      'Fundamental metric code is invalid',
    );
    return;
  }
  if (
    !['annual', 'quarterly', 'ttm', 'latestAvailable'].includes(
      String(value.period),
    )
  ) {
    issue(
      analysis,
      'STRATEGY_UNSUPPORTED_OPERAND_OPERATOR',
      `${path}/period`,
      'Fundamental period is not supported',
    );
  }
  analysis.fundamentalMetrics.add(value.metricCode);
  if (
    value.publicationPolicy !== 'pointInTime' ||
    value.revisionPolicy !== 'availableAtEventTime'
  ) {
    issue(
      analysis,
      'STRATEGY_FUNDAMENTAL_POINT_IN_TIME_REQUIRED',
      path,
      'Fundamental operands require publication and revision availability policies',
    );
  }
  if (pointInTime === undefined) return;
  const availability = pointInTime.fundamentals[value.metricCode];
  if (
    availability === undefined ||
    availability.publishedAt.getTime() > pointInTime.asOf.getTime() ||
    availability.revisionAvailableAt.getTime() > pointInTime.asOf.getTime()
  ) {
    issue(
      analysis,
      'STRATEGY_FUNDAMENTAL_NOT_AVAILABLE',
      path,
      'Fundamental data was not published and revision-available at the evaluation time',
    );
  }
}

function resolveParameterReferences(
  value: unknown,
  binding: StrategyParameterBinding | null,
  path: string,
  analysis: MutableAnalysis,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      resolveParameterReferences(item, binding, `${path}/${index}`, analysis),
    );
  }
  if (!isRecord(value)) return value;
  if (Object.keys(value).length === 1 && '$parameter' in value) {
    const name = value.$parameter;
    const resolved =
      typeof name === 'string' ? binding?.values[name] : undefined;
    if (resolved === undefined) {
      issue(
        analysis,
        'STRATEGY_PARAMETER_BINDING_INVALID',
        path,
        'Indicator parameter reference is not defined',
      );
      return value;
    }
    return resolved;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      resolveParameterReferences(item, binding, `${path}/${key}`, analysis),
    ]),
  );
}

function inspectForbidden(
  value: unknown,
  path: string,
  analysis: MutableAnalysis,
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      inspectForbidden(item, `${path}/${index}`, analysis),
    );
    return;
  }
  if (!isRecord(value)) return;
  if (value.type === 'expression' || 'expression' in value) {
    issue(
      analysis,
      'STRATEGY_FREE_EXPRESSION_FORBIDDEN',
      path,
      'Free expressions are forbidden',
    );
  }
  if (
    value.type === 'sql' ||
    value.type === 'eval' ||
    'sql' in value ||
    'eval' in value ||
    'script' in value
  ) {
    issue(
      analysis,
      'STRATEGY_SQL_EVAL_FORBIDDEN',
      path,
      'SQL, eval and script inputs are forbidden',
    );
  }
  for (const [key, item] of Object.entries(value)) {
    inspectForbidden(item, `${path}/${key}`, analysis);
  }
}

function analyzeResolvedRule(
  rule: ScanRuleAst,
  path: string,
  analysis: MutableAnalysis,
): void {
  visitResolvedNode(rule.root, `${path}/root`, analysis);
}

function visitResolvedNode(
  node: ScanRuleNode,
  path: string,
  analysis: MutableAnalysis,
): void {
  if (node.type === 'group') {
    node.children.forEach((child, index) =>
      visitResolvedNode(child, `${path}/children/${index}`, analysis),
    );
    return;
  }
  [node.left, node.right, node.upperBound].forEach((operand, index) => {
    if (operand !== undefined) {
      analyzeResolvedOperand(operand, `${path}/operand/${index}`, analysis);
    }
  });
}

function analyzeResolvedOperand(
  operand: ScanOperand,
  path: string,
  analysis: MutableAnalysis,
): void {
  if (operand.type === 'priceField') {
    analysis.priceTimeframes.add(operand.timeframe);
    analysis.priceFields.add(operand.field);
    return;
  }
  if (operand.type === 'volumeField') {
    analysis.priceTimeframes.add(operand.timeframe);
    analysis.priceFields.add('volume');
    return;
  }
  if (operand.type !== 'indicator') return;
  analysis.priceTimeframes.add(operand.timeframe);
  try {
    const definition = indicatorRegistry.resolve(operand.code, operand.version);
    const parameters = definition.parseParameters(operand.parameters);
    const warmup = definition.getWarmup(parameters);
    const key = `${operand.code}@${operand.version}:${operand.timeframe}`;
    analysis.indicatorDefinitions.set(key, {
      code: operand.code,
      version: operand.version,
      timeframe: operand.timeframe,
      requiredInputFields: [...definition.catalog.requiredInputFields].sort(),
    });
    for (const field of definition.catalog.requiredInputFields) {
      analysis.priceFields.add(field);
    }
    analysis.warmupByTimeframe.set(
      operand.timeframe,
      Math.max(
        analysis.warmupByTimeframe.get(operand.timeframe) ?? 0,
        warmup.recommendedWarmupBars,
      ),
    );
    if (
      operand.output !== undefined &&
      definition.catalog.outputSpecification.kind === 'multi' &&
      !definition.catalog.outputSpecification.keys.includes(operand.output)
    ) {
      throw new Error('unsupported output');
    }
  } catch {
    issue(
      analysis,
      'STRATEGY_UNSUPPORTED_OPERAND_OPERATOR',
      path,
      'Indicator code, version, parameters or output are not supported',
    );
  }
}

function parseParameterDefinitions(
  value: unknown,
  analysis: MutableAnalysis,
): StrategyParameterDefinition[] {
  if (!Array.isArray(value)) {
    issue(
      analysis,
      'STRATEGY_PARAMETER_DEFINITION_INVALID',
      '/parameters',
      'Parameters must be an array',
    );
    return [];
  }
  const definitions: StrategyParameterDefinition[] = [];
  value.forEach((item, index) => {
    if (!isParameterDefinitionValid(item)) {
      issue(
        analysis,
        'STRATEGY_PARAMETER_DEFINITION_INVALID',
        `/parameters/${index}`,
        'Parameter definition is invalid',
      );
    } else definitions.push(item);
  });
  if (
    new Set(definitions.map(({ name }) => name)).size !== definitions.length
  ) {
    issue(
      analysis,
      'STRATEGY_PARAMETER_DEFINITION_INVALID',
      '/parameters',
      'Parameter names must be unique',
    );
  }
  return definitions;
}

function bindDefaults(
  definitions: readonly StrategyParameterDefinition[],
  analysis: MutableAnalysis,
): StrategyParameterBinding | null {
  try {
    return bindStrategyParameters(definitions);
  } catch (error) {
    const details =
      error instanceof StrategyDomainError && isRecord(error.details)
        ? error.details
        : {};
    issue(
      analysis,
      'STRATEGY_PARAMETER_BINDING_INVALID',
      typeof details.path === 'string' ? details.path : '/parameters',
      'Default parameter binding is invalid',
    );
    return null;
  }
}

function parsePositionSizing(
  value: unknown,
  analysis: MutableAnalysis,
): PositionSizing | null {
  if (!isRecord(value)) return invalidSizing(analysis);
  if (value.type === 'equalWeight') return { type: 'equalWeight' };
  if (
    value.type === 'fixedCash' &&
    finiteInRange(value.amount, Number.MIN_VALUE, Number.MAX_VALUE)
  ) {
    return { type: 'fixedCash', amount: value.amount as number };
  }
  if (
    value.type === 'fixedPercent' &&
    finiteInRange(value.percent, Number.MIN_VALUE, 100)
  ) {
    return { type: 'fixedPercent', percent: value.percent as number };
  }
  if (
    value.type === 'volatilityTarget' &&
    finiteInRange(value.annualizedTargetPercent, Number.MIN_VALUE, 100) &&
    Number.isInteger(value.lookbackBars) &&
    (value.lookbackBars as number) >= 2 &&
    (value.lookbackBars as number) <= 5_000
  ) {
    return {
      type: 'volatilityTarget',
      annualizedTargetPercent: value.annualizedTargetPercent as number,
      lookbackBars: value.lookbackBars as number,
    };
  }
  if (
    value.type === 'riskPerTrade' &&
    finiteInRange(value.riskPercent, Number.MIN_VALUE, 10)
  ) {
    return { type: 'riskPerTrade', riskPercent: value.riskPercent as number };
  }
  return invalidSizing(analysis);
}

function invalidSizing(analysis: MutableAnalysis): null {
  issue(
    analysis,
    'STRATEGY_POSITION_SIZING_INVALID',
    '/positionSizing',
    'Position sizing configuration is invalid',
  );
  return null;
}

function parseRiskControls(
  value: unknown,
  analysis: MutableAnalysis,
): StrategyRiskControls | null {
  if (!isRecord(value)) return invalidRisk(analysis);
  const optionalPercentFields = [
    'stopLossPercent',
    'takeProfitPercent',
    'trailingStopPercent',
  ] as const;
  if (
    optionalPercentFields.some(
      (field) =>
        value[field] !== undefined &&
        !finiteInRange(value[field], Number.MIN_VALUE, 100),
    ) ||
    (value.maxHoldingBars !== undefined &&
      (!Number.isInteger(value.maxHoldingBars) ||
        (value.maxHoldingBars as number) < 1)) ||
    !finiteInRange(value.maxPositionWeight, Number.MIN_VALUE, 100) ||
    !Number.isInteger(value.maxConcurrentPositions) ||
    (value.maxConcurrentPositions as number) < 1 ||
    (value.maxConcurrentPositions as number) > 1_000 ||
    value.allowShort !== false ||
    value.allowLeverage !== false ||
    value.allowNegativeCash !== false
  ) {
    return invalidRisk(analysis);
  }
  return {
    ...(value.stopLossPercent === undefined
      ? {}
      : { stopLossPercent: value.stopLossPercent as number }),
    ...(value.takeProfitPercent === undefined
      ? {}
      : { takeProfitPercent: value.takeProfitPercent as number }),
    ...(value.trailingStopPercent === undefined
      ? {}
      : { trailingStopPercent: value.trailingStopPercent as number }),
    ...(value.maxHoldingBars === undefined
      ? {}
      : { maxHoldingBars: value.maxHoldingBars as number }),
    maxPositionWeight: value.maxPositionWeight as number,
    maxConcurrentPositions: value.maxConcurrentPositions as number,
    allowShort: false,
    allowLeverage: false,
    allowNegativeCash: false,
  };
}

function invalidRisk(analysis: MutableAnalysis): null {
  issue(
    analysis,
    'STRATEGY_RISK_CONTROL_INVALID',
    '/riskControls',
    'Risk controls are invalid or enable unsupported leverage/short behavior',
  );
  return null;
}

function parseExecutionPolicy(
  value: unknown,
  analysis: MutableAnalysis,
): StrategyExecutionPolicyReference | null {
  if (
    !isRecord(value) ||
    !['closed_bar_next_open', 'same_bar_close_research'].includes(
      String(value.code),
    ) ||
    typeof value.version !== 'string' ||
    value.version.trim().length === 0 ||
    value.signalBarPolicy !== 'closed_only' ||
    value.higherTimeframeBarPolicy !== 'closed_only' ||
    !['skip_fill', 'defer_to_next_available'].includes(
      String(value.missingBarPolicy),
    )
  ) {
    issue(
      analysis,
      value !== null &&
        typeof value === 'object' &&
        ('higherTimeframeBarPolicy' in value || 'signalBarPolicy' in value)
        ? 'STRATEGY_INCOMPLETE_HIGHER_TIMEFRAME'
        : 'STRATEGY_EXECUTION_POLICY_INVALID',
      '/executionPolicy',
      'Execution policy must use closed bars and a supported execution mode',
    );
    return null;
  }
  if (value.code === 'same_bar_close_research') {
    analysis.warnings.push({
      code: 'SAME_BAR_EXECUTION_RESEARCH_MODE',
      path: '/executionPolicy/code',
      message: 'Same-bar execution is research-only and may be optimistic',
    });
  }
  return {
    code: value.code as StrategyExecutionPolicyReference['code'],
    version: value.version,
    signalBarPolicy: 'closed_only',
    higherTimeframeBarPolicy: 'closed_only',
    missingBarPolicy:
      value.missingBarPolicy as StrategyExecutionPolicyReference['missingBarPolicy'],
  };
}

function parseCostPolicy(
  value: unknown,
  analysis: MutableAnalysis,
): StrategyCostPolicyReference | null {
  if (!isRecord(value) || typeof value.version !== 'string' || !value.version) {
    return invalidCost(analysis);
  }
  if (value.code === 'cost_free' && value.explicitlyAccepted === true) {
    analysis.warnings.push({
      code: 'COST_FREE_BACKTEST',
      path: '/costPolicy/code',
      message: 'Cost-free backtests require a visible result warning',
    });
    return {
      code: 'cost_free',
      version: value.version,
      explicitlyAccepted: true,
    };
  }
  if (
    value.code === 'percentage_commission_fixed_bps_slippage' &&
    finiteInRange(value.commissionPercent, 0, 100) &&
    finiteInRange(value.minimumCommission, 0, Number.MAX_VALUE) &&
    finiteInRange(value.slippageBps, 0, 10_000) &&
    finiteInRange(value.fixedFee, 0, Number.MAX_VALUE) &&
    finiteInRange(value.marketTaxPercent, 0, 100)
  ) {
    return {
      code: value.code,
      version: value.version,
      commissionPercent: value.commissionPercent as number,
      minimumCommission: value.minimumCommission as number,
      slippageBps: value.slippageBps as number,
      fixedFee: value.fixedFee as number,
      marketTaxPercent: value.marketTaxPercent as number,
    };
  }
  return invalidCost(analysis);
}

function invalidCost(analysis: MutableAnalysis): null {
  issue(
    analysis,
    'STRATEGY_COST_POLICY_INVALID',
    '/costPolicy',
    'Cost policy and all mandatory model fields are required',
  );
  return null;
}

function parseDataIntegrityPolicy(
  value: unknown,
  analysis: MutableAnalysis,
): StrategyDataIntegrityPolicy | null {
  if (
    !isRecord(value) ||
    value.universePolicy !== 'point_in_time' ||
    value.fundamentalAvailabilityPolicy !== 'publication_and_revision' ||
    typeof value.corporateActionPolicyVersion !== 'string' ||
    value.corporateActionPolicyVersion.trim().length === 0 ||
    !['raw', 'split_adjusted', 'total_return_adjusted'].includes(
      String(value.adjustmentMode),
    )
  ) {
    issue(
      analysis,
      'STRATEGY_DATA_INTEGRITY_POLICY_INVALID',
      '/dataIntegrityPolicy',
      'Point-in-time universe, publication/revision and adjustment policies are required',
    );
    return null;
  }
  return {
    universePolicy: 'point_in_time',
    fundamentalAvailabilityPolicy: 'publication_and_revision',
    corporateActionPolicyVersion: value.corporateActionPolicyVersion,
    adjustmentMode:
      value.adjustmentMode as StrategyDataIntegrityPolicy['adjustmentMode'],
  };
}

function parseBenchmark(
  value: unknown,
  analysis: MutableAnalysis,
): string | null | undefined {
  if (value === null) return null;
  if (typeof value === 'string' && /^[A-Z0-9_-]{1,32}$/.test(value)) {
    return value;
  }
  issue(
    analysis,
    'STRATEGY_INVALID_FIELD',
    '/benchmarkCode',
    'Benchmark code is invalid',
  );
  return undefined;
}

function enforceComplexity(
  analysis: MutableAnalysis,
  limits: StrategyValidationLimits,
): void {
  const workload = workloadEstimate(analysis);
  const complexityScore = complexity(analysis);
  if (
    analysis.nodeCount > limits.maxNodes ||
    complexityScore > limits.maxComplexityScore ||
    workload.estimatedOperationsPerInstrument >
      limits.maxEstimatedOperationsPerInstrument
  ) {
    issue(
      analysis,
      'STRATEGY_COMPLEXITY_LIMIT_EXCEEDED',
      '/',
      'Strategy complexity or estimated workload exceeds the configured limit',
    );
  }
}

function result(
  analysis: MutableAnalysis,
  limits: StrategyValidationLimits,
  normalizedDefinition?: StrategyDefinition,
  binding?: StrategyParameterBinding,
): StrategyValidationResult {
  const workload = workloadEstimate(analysis);
  const complexityScore = complexity(analysis);
  const warmup: StrategyWarmupResolution = {
    byTimeframe: Object.freeze(
      Object.fromEntries(
        [...analysis.warmupByTimeframe.entries()].sort(([left], [right]) =>
          left.localeCompare(right, 'en-US'),
        ),
      ),
    ),
    maximumBars: Math.max(0, ...analysis.warmupByTimeframe.values()),
  };
  const requiredData: StrategyRequiredData = {
    priceTimeframes: [...analysis.priceTimeframes].sort(),
    priceFields: [...analysis.priceFields].sort(),
    indicatorDefinitions: [...analysis.indicatorDefinitions.values()].sort(
      (left, right) =>
        `${left.code}@${left.version}:${left.timeframe}`.localeCompare(
          `${right.code}@${right.version}:${right.timeframe}`,
          'en-US',
        ),
    ),
    fundamentalMetrics: [...analysis.fundamentalMetrics].sort(),
    requiresHistoricalUniverse: true,
    requiresCorporateActions:
      normalizedDefinition?.dataIntegrityPolicy.adjustmentMode !== 'raw',
  };
  return freeze({
    valid: analysis.errors.length === 0,
    errors: analysis.errors,
    warnings: analysis.warnings,
    ...(normalizedDefinition === undefined ? {} : { normalizedDefinition }),
    requiredData,
    warmup,
    complexityScore,
    workload,
    ...(binding === undefined ? {} : { defaultParameterBinding: binding }),
  });
}

function workloadEstimate(analysis: MutableAnalysis): StrategyWorkloadEstimate {
  const timeframeCount = analysis.priceTimeframes.size;
  const warmupCost = [...analysis.warmupByTimeframe.values()].reduce(
    (total, bars) => total + bars,
    0,
  );
  return {
    nodeCount: analysis.nodeCount,
    conditionCount: analysis.conditionCount,
    indicatorCount: analysis.indicatorCount,
    timeframeCount,
    estimatedOperationsPerInstrument:
      analysis.nodeCount +
      analysis.conditionCount * 3 +
      analysis.indicatorCount * 10 +
      warmupCost,
  };
}

function complexity(analysis: MutableAnalysis): number {
  return (
    analysis.nodeCount * 2 +
    analysis.conditionCount * 3 +
    analysis.indicatorCount * 10 +
    analysis.priceTimeframes.size * 5 +
    analysis.fundamentalMetrics.size * 8
  );
}

function normalizeStrategyRule(rule: StrategyRuleAst): StrategyRuleAst {
  return {
    version: 1,
    universe: {
      market: 'BIST',
      statuses: uniqueSorted(rule.universe.statuses),
      indexCodes: uniqueSorted(rule.universe.indexCodes),
      sectorIds: uniqueSorted(rule.universe.sectorIds),
    },
    root: normalizeGroup(rule.root),
  };
}

function normalizeGroup(group: StrategyGroupNode): StrategyGroupNode {
  return {
    type: 'group',
    nodeId: group.nodeId,
    operator: group.operator,
    children: group.children
      .map(normalizeNode)
      .sort((left, right) =>
        JSON.stringify(left).localeCompare(JSON.stringify(right), 'en-US'),
      ),
  };
}

function normalizeNode(node: StrategyRuleNode): StrategyRuleNode {
  if (node.type === 'group') return normalizeGroup(node);
  return {
    type: 'condition',
    nodeId: node.nodeId,
    operator: node.operator,
    left: normalizeOperand(node.left),
    ...(node.right === undefined
      ? {}
      : { right: normalizeOperand(node.right) }),
    ...(node.upperBound === undefined
      ? {}
      : { upperBound: normalizeOperand(node.upperBound) }),
    ...(node.options === undefined ? {} : { options: { ...node.options } }),
  };
}

function normalizeOperand(operand: StrategyOperand): StrategyOperand {
  if (operand.type === 'indicator') {
    return {
      type: 'indicator',
      code: operand.code.toUpperCase(),
      version: operand.version,
      ...(operand.output === undefined ? {} : { output: operand.output }),
      timeframe: operand.timeframe,
      parameters: canonicalObject(operand.parameters),
      ...('barOffset' in operand && operand.barOffset !== undefined
        ? { barOffset: operand.barOffset }
        : {}),
      ...('barClosePolicy' in operand && operand.barClosePolicy !== undefined
        ? { barClosePolicy: operand.barClosePolicy }
        : {}),
    };
  }
  if (operand.type === 'fundamentalField') {
    return {
      type: 'fundamentalField',
      metricCode: operand.metricCode,
      period: operand.period,
      publicationPolicy: 'pointInTime',
      revisionPolicy: 'availableAtEventTime',
    } satisfies FundamentalFieldOperand;
  }
  if (operand.type === 'priceField') {
    return {
      type: 'priceField',
      field: operand.field,
      timeframe: operand.timeframe,
      ...('barOffset' in operand && operand.barOffset !== undefined
        ? { barOffset: operand.barOffset }
        : {}),
      ...('barClosePolicy' in operand && operand.barClosePolicy !== undefined
        ? { barClosePolicy: operand.barClosePolicy }
        : {}),
    };
  }
  if (operand.type === 'volumeField') {
    return {
      type: 'volumeField',
      field: 'volume',
      timeframe: operand.timeframe,
      ...('barOffset' in operand && operand.barOffset !== undefined
        ? { barOffset: operand.barOffset }
        : {}),
      ...('barClosePolicy' in operand && operand.barClosePolicy !== undefined
        ? { barClosePolicy: operand.barClosePolicy }
        : {}),
    };
  }
  return { ...operand };
}

function normalizeParameterDefinitions(
  values: readonly StrategyParameterDefinition[],
): readonly StrategyParameterDefinition[] {
  return [...values]
    .map((value) =>
      value.type === 'enum'
        ? { ...value, values: [...value.values].sort() }
        : { ...value },
    )
    .sort((left, right) => left.name.localeCompare(right.name, 'en-US'));
}

function exactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  analysis: MutableAnalysis,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      issue(
        analysis,
        'STRATEGY_INVALID_FIELD',
        path === '/' ? `/${key}` : `${path}/${key}`,
        'Unknown fields are not allowed',
      );
    }
  }
}

function issue(
  analysis: MutableAnalysis,
  code: StrategyValidationIssue['code'],
  path: string,
  message: string,
): void {
  if (
    !analysis.errors.some((item) => item.code === code && item.path === path)
  ) {
    analysis.errors.push({ code, path, message });
  }
}

function prefixPath(prefix: string, path: string): string {
  return path === '/' ? prefix : `${prefix}${path}`;
}

function finiteInRange(value: unknown, minimum: number, maximum: number) {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum
  );
}

function timeframeRank(value: string): number {
  return INDICATOR_TIMEFRAMES.indexOf(
    value as (typeof INDICATOR_TIMEFRAMES)[number],
  );
}

function uniqueSorted<T extends string>(values: readonly T[]): readonly T[] {
  return [...new Set(values)].sort((left, right) =>
    left.localeCompare(right, 'en-US'),
  );
}

function canonicalObject(
  value: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalValue(value[key])]),
  );
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (isRecord(value)) return canonicalObject(value);
  return Object.is(value, -0) ? 0 : value;
}

function freeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const nested of Object.values(value)) freeze(nested);
    Object.freeze(value);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function isOneOf<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
): value is T[number] {
  return typeof value === 'string' && allowed.includes(value);
}
