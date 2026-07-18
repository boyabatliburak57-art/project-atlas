import type {
  IndicatorOperand,
  PriceFieldOperand,
  ScanConditionOptions,
  ScanGroupOperator,
  ScanOperand,
  ScanOperator,
  ScanUniverseFilter,
  VolumeFieldOperand,
} from '../scanner/ast/contracts.js';

export const STRATEGY_SCHEMA_VERSION = 1 as const;

export interface ParameterOperand {
  readonly type: 'parameter';
  readonly name: string;
}

export interface FundamentalFieldOperand {
  readonly type: 'fundamentalField';
  readonly metricCode: string;
  readonly period: 'annual' | 'quarterly' | 'ttm' | 'latestAvailable';
  readonly publicationPolicy: 'pointInTime';
  readonly revisionPolicy: 'availableAtEventTime';
}

export interface StrategyBarReference {
  readonly barOffset?: number | undefined;
  readonly barClosePolicy?: 'closedOnly' | undefined;
}

export type StrategyOperand =
  | ScanOperand
  | (IndicatorOperand & StrategyBarReference)
  | (PriceFieldOperand & StrategyBarReference)
  | (VolumeFieldOperand & StrategyBarReference)
  | ParameterOperand
  | FundamentalFieldOperand;

export interface StrategyConditionNode {
  readonly type: 'condition';
  readonly nodeId: string;
  readonly operator: ScanOperator;
  readonly left: StrategyOperand;
  readonly right?: StrategyOperand | undefined;
  readonly upperBound?: StrategyOperand | undefined;
  readonly options?: ScanConditionOptions | undefined;
}

export interface StrategyGroupNode {
  readonly type: 'group';
  readonly nodeId: string;
  readonly operator: ScanGroupOperator;
  readonly children: readonly StrategyRuleNode[];
}

export type StrategyRuleNode = StrategyGroupNode | StrategyConditionNode;

export interface StrategyRuleAst {
  readonly version: 1;
  readonly universe: ScanUniverseFilter;
  readonly root: StrategyGroupNode;
}

export type StrategyParameterDefinition =
  | {
      readonly name: string;
      readonly type: 'number';
      readonly defaultValue: number;
      readonly minimum: number;
      readonly maximum: number;
    }
  | {
      readonly name: string;
      readonly type: 'integer';
      readonly defaultValue: number;
      readonly minimum: number;
      readonly maximum: number;
    }
  | {
      readonly name: string;
      readonly type: 'boolean';
      readonly defaultValue: boolean;
    }
  | {
      readonly name: string;
      readonly type: 'enum';
      readonly defaultValue: string;
      readonly values: readonly string[];
    };

export type StrategyParameterValue = number | boolean | string;

export interface StrategyParameterBinding {
  readonly values: Readonly<Record<string, StrategyParameterValue>>;
  readonly hash: string;
}

export type PositionSizing =
  | { readonly type: 'equalWeight' }
  | { readonly type: 'fixedCash'; readonly amount: number }
  | { readonly type: 'fixedPercent'; readonly percent: number }
  | {
      readonly type: 'volatilityTarget';
      readonly annualizedTargetPercent: number;
      readonly lookbackBars: number;
    }
  | { readonly type: 'riskPerTrade'; readonly riskPercent: number };

export interface StrategyRiskControls {
  readonly stopLossPercent?: number | undefined;
  readonly takeProfitPercent?: number | undefined;
  readonly trailingStopPercent?: number | undefined;
  readonly maxHoldingBars?: number | undefined;
  readonly maxPositionWeight: number;
  readonly maxConcurrentPositions: number;
  readonly allowShort: false;
  readonly allowLeverage: false;
  readonly allowNegativeCash: false;
}

export interface StrategyExecutionPolicyReference {
  readonly code: 'closed_bar_next_open' | 'same_bar_close_research';
  readonly version: string;
  readonly signalBarPolicy: 'closed_only';
  readonly higherTimeframeBarPolicy: 'closed_only';
  readonly missingBarPolicy: 'skip_fill' | 'defer_to_next_available';
}

export type StrategyCostPolicyReference =
  | {
      readonly code: 'percentage_commission_fixed_bps_slippage';
      readonly version: string;
      readonly commissionPercent: number;
      readonly minimumCommission: number;
      readonly slippageBps: number;
      readonly fixedFee: number;
      readonly marketTaxPercent: number;
    }
  | {
      readonly code: 'cost_free';
      readonly version: string;
      readonly explicitlyAccepted: true;
    };

export interface StrategyDataIntegrityPolicy {
  readonly universePolicy: 'point_in_time';
  readonly fundamentalAvailabilityPolicy: 'publication_and_revision';
  readonly corporateActionPolicyVersion: string;
  readonly adjustmentMode: 'raw' | 'split_adjusted' | 'total_return_adjusted';
}

export interface StrategyDefinition {
  readonly schemaVersion: typeof STRATEGY_SCHEMA_VERSION;
  readonly baseTimeframe: IndicatorOperand['timeframe'];
  readonly entryRule: StrategyRuleAst;
  readonly exitRule: StrategyRuleAst;
  readonly filterRule: StrategyRuleAst | null;
  readonly parameters: readonly StrategyParameterDefinition[];
  readonly positionSizing: PositionSizing;
  readonly riskControls: StrategyRiskControls;
  readonly executionPolicy: StrategyExecutionPolicyReference;
  readonly costPolicy: StrategyCostPolicyReference;
  readonly dataIntegrityPolicy: StrategyDataIntegrityPolicy;
  readonly benchmarkCode: string | null;
}

export type StrategyStatus = 'draft' | 'validated' | 'archived' | 'deleted';
export type StrategyRevisionStatus = 'draft' | 'validated';

export interface Strategy {
  readonly id: string;
  readonly ownerUserId: string;
  readonly name: string;
  readonly description: string | null;
  readonly visibility: 'private';
  readonly status: StrategyStatus;
  readonly currentRevision: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
}

export interface StrategyRequiredData {
  readonly priceTimeframes: readonly string[];
  readonly priceFields: readonly string[];
  readonly indicatorDefinitions: readonly {
    readonly code: string;
    readonly version: number;
    readonly timeframe: string;
    readonly requiredInputFields: readonly string[];
  }[];
  readonly fundamentalMetrics: readonly string[];
  readonly requiresHistoricalUniverse: true;
  readonly requiresCorporateActions: boolean;
}

export interface StrategyWarmupResolution {
  readonly byTimeframe: Readonly<Record<string, number>>;
  readonly maximumBars: number;
}

export interface StrategyWorkloadEstimate {
  readonly nodeCount: number;
  readonly conditionCount: number;
  readonly indicatorCount: number;
  readonly timeframeCount: number;
  readonly estimatedOperationsPerInstrument: number;
}

export type StrategyValidationErrorCode =
  | 'STRATEGY_AST_INVALID'
  | 'STRATEGY_FUTURE_BAR_REFERENCE'
  | 'STRATEGY_FUNDAMENTAL_NOT_AVAILABLE'
  | 'STRATEGY_FUNDAMENTAL_POINT_IN_TIME_REQUIRED'
  | 'STRATEGY_INCOMPLETE_HIGHER_TIMEFRAME'
  | 'STRATEGY_FREE_EXPRESSION_FORBIDDEN'
  | 'STRATEGY_SQL_EVAL_FORBIDDEN'
  | 'STRATEGY_UNSUPPORTED_OPERAND_OPERATOR'
  | 'STRATEGY_PARAMETER_DEFINITION_INVALID'
  | 'STRATEGY_PARAMETER_BINDING_INVALID'
  | 'STRATEGY_POSITION_SIZING_INVALID'
  | 'STRATEGY_RISK_CONTROL_INVALID'
  | 'STRATEGY_EXECUTION_POLICY_INVALID'
  | 'STRATEGY_COST_POLICY_INVALID'
  | 'STRATEGY_DATA_INTEGRITY_POLICY_INVALID'
  | 'STRATEGY_COMPLEXITY_LIMIT_EXCEEDED'
  | 'STRATEGY_INVALID_FIELD';

export interface StrategyValidationIssue {
  readonly code: StrategyValidationErrorCode;
  readonly path: string;
  readonly message: string;
}

export interface StrategyValidationWarning {
  readonly code: 'COST_FREE_BACKTEST' | 'SAME_BAR_EXECUTION_RESEARCH_MODE';
  readonly path: string;
  readonly message: string;
}

export interface StrategyValidationResult {
  readonly valid: boolean;
  readonly errors: readonly StrategyValidationIssue[];
  readonly warnings: readonly StrategyValidationWarning[];
  readonly normalizedDefinition?: StrategyDefinition | undefined;
  readonly requiredData: StrategyRequiredData;
  readonly warmup: StrategyWarmupResolution;
  readonly complexityScore: number;
  readonly workload: StrategyWorkloadEstimate;
  readonly defaultParameterBinding?: StrategyParameterBinding | undefined;
}

export interface StrategyPointInTimeContext {
  readonly asOf: Date;
  readonly fundamentals: Readonly<
    Record<
      string,
      {
        readonly publishedAt: Date;
        readonly revisionAvailableAt: Date;
      }
    >
  >;
}

export interface StrategyValidationLimits {
  readonly maxComplexityScore: number;
  readonly maxNodes: number;
  readonly maxEstimatedOperationsPerInstrument: number;
}

export interface StrategyRevision {
  readonly id: string;
  readonly strategyId: string;
  readonly revision: number;
  readonly definition: StrategyDefinition;
  readonly status: StrategyRevisionStatus;
  readonly validation: StrategyValidationResult;
  readonly createdBy: string;
  readonly createdAt: Date;
}

export interface StrategyWithRevision extends Strategy {
  readonly revision: StrategyRevision;
}

export interface NewStrategyPersistenceInput {
  readonly ownerUserId: string;
  readonly name: string;
  readonly description: string | null;
  readonly definition: StrategyDefinition;
  readonly revisionStatus: StrategyRevisionStatus;
  readonly validation: StrategyValidationResult;
  readonly createdBy: string;
  readonly now: Date;
  readonly clonedFrom?:
    | { readonly strategyId: string; readonly revision: number }
    | undefined;
}

export interface ReviseStrategyPersistenceInput {
  readonly id: string;
  readonly ownerUserId: string;
  readonly expectedRevision: number;
  readonly name: string;
  readonly description: string | null;
  readonly definition: StrategyDefinition;
  readonly revisionStatus: StrategyRevisionStatus;
  readonly validation: StrategyValidationResult;
  readonly createdBy: string;
  readonly now: Date;
}

export type ReviseStrategyPersistenceResult =
  | { readonly outcome: 'updated'; readonly strategy: StrategyWithRevision }
  | { readonly outcome: 'conflict' };

export interface StrategyRepository {
  findById(id: string): Promise<StrategyWithRevision | null>;
  listRevisions(id: string): Promise<readonly StrategyRevision[]>;
  create(input: NewStrategyPersistenceInput): Promise<StrategyWithRevision>;
  revise(
    input: ReviseStrategyPersistenceInput,
  ): Promise<ReviseStrategyPersistenceResult>;
}

export type StrategyIndicatorLikeOperand =
  | (IndicatorOperand & StrategyBarReference)
  | (PriceFieldOperand & StrategyBarReference)
  | (VolumeFieldOperand & StrategyBarReference);
