export type StrategyErrorCode =
  | 'STRATEGY_NOT_FOUND'
  | 'STRATEGY_ACCESS_DENIED'
  | 'STRATEGY_REVISION_CONFLICT'
  | 'STRATEGY_INVALID'
  | 'STRATEGY_DELETED'
  | 'STRATEGY_PARAMETER_BINDING_INVALID';

export class StrategyDomainError extends Error {
  override readonly name = 'StrategyDomainError';

  constructor(
    readonly code: StrategyErrorCode,
    readonly details?: unknown,
  ) {
    super(code);
  }
}
