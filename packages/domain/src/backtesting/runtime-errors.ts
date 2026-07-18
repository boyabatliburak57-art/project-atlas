export type BacktestRuntimeApplicationErrorCode =
  | 'BACKTEST_IDEMPOTENCY_KEY_REQUIRED'
  | 'BACKTEST_IDEMPOTENCY_CONFLICT'
  | 'BACKTEST_COMPLEXITY_LIMIT_EXCEEDED'
  | 'BACKTEST_ENTITLEMENT_DENIED'
  | 'BACKTEST_SNAPSHOT_NOT_EVALUABLE'
  | 'BACKTEST_RUN_NOT_FOUND'
  | 'BACKTEST_RUN_ACCESS_DENIED'
  | 'BACKTEST_RUN_NOT_CANCELLABLE'
  | 'EXPERIMENT_GRID_INVALID'
  | 'EXPERIMENT_PARAMETER_INVALID'
  | 'EXPERIMENT_COMBINATION_LIMIT_EXCEEDED'
  | 'EXPERIMENT_DUPLICATE_BINDING'
  | 'EXPERIMENT_HOLDOUT_OVERLAP';

export class BacktestRuntimeApplicationError extends Error {
  override readonly name = 'BacktestRuntimeApplicationError';
  constructor(
    readonly code: BacktestRuntimeApplicationErrorCode,
    readonly details: Readonly<Record<string, unknown>> = {},
  ) {
    super(code);
  }
}
