export class AlertEvaluationError extends Error {
  override readonly name = 'AlertEvaluationError';

  constructor(
    readonly code: string,
    readonly retryable: boolean,
    options?: ErrorOptions,
  ) {
    super(code, options);
  }
}

export function isAlertErrorRetryable(error: unknown): boolean {
  return !(error instanceof AlertEvaluationError) || error.retryable;
}
