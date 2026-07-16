export type AlertDomainErrorCode =
  | 'ALERT_INVALID'
  | 'ALERT_INVALID_TRANSITION'
  | 'ALERT_REVISION_CONFLICT';

export class AlertDomainError extends Error {
  override readonly name = 'AlertDomainError';

  constructor(
    readonly code: AlertDomainErrorCode,
    readonly details?: unknown,
  ) {
    super(code);
  }
}
