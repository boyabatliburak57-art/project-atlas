import { BacktestDomainError } from '@atlas/domain';

export type BacktestWorkerErrorCode =
  | 'BACKTEST_RUN_NOT_FOUND'
  | 'BACKTEST_RUN_INVALID_STATE'
  | 'BACKTEST_SNAPSHOT_UNAVAILABLE'
  | 'BACKTEST_SNAPSHOT_NOT_FOUND'
  | 'BACKTEST_SNAPSHOT_NOT_EVALUABLE'
  | 'BACKTEST_SNAPSHOT_INVALID'
  | 'BACKTEST_SNAPSHOT_MISMATCH'
  | 'BACKTEST_CHECKPOINT_INVALID'
  | 'BACKTEST_DETERMINISTIC_VALIDATION_FAILED'
  | 'BACKTEST_PERSISTENCE_FAILED'
  | 'BACKTEST_RUN_TIMEOUT';

export class BacktestWorkerError extends Error {
  override readonly name = 'BacktestWorkerError';
  constructor(
    readonly code: BacktestWorkerErrorCode,
    readonly retryable: boolean,
    options?: ErrorOptions,
  ) {
    super(code, options);
  }
}

export function normalizeBacktestWorkerError(
  error: unknown,
): BacktestWorkerError {
  if (error instanceof BacktestWorkerError) return error;
  if (error instanceof BacktestDomainError)
    return new BacktestWorkerError(
      error.code.includes('CHECKPOINT')
        ? 'BACKTEST_CHECKPOINT_INVALID'
        : 'BACKTEST_DETERMINISTIC_VALIDATION_FAILED',
      false,
      { cause: error },
    );
  return new BacktestWorkerError('BACKTEST_PERSISTENCE_FAILED', true, {
    cause: error,
  });
}
