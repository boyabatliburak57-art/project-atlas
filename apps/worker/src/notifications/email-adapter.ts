import type {
  EmailAdapter,
  EmailSendRequest,
  EmailSendResult,
} from './contracts';

export type EmailDeliveryErrorCode =
  | 'EMAIL_TIMEOUT'
  | 'EMAIL_PROVIDER_UNAVAILABLE'
  | 'EMAIL_RATE_LIMITED'
  | 'EMAIL_INVALID_RECIPIENT'
  | 'EMAIL_PERMANENT_BOUNCE'
  | 'EMAIL_ADAPTER_NOT_CONFIGURED';

const retryableCodes = new Set<EmailDeliveryErrorCode>([
  'EMAIL_TIMEOUT',
  'EMAIL_PROVIDER_UNAVAILABLE',
  'EMAIL_RATE_LIMITED',
]);

export class EmailDeliveryError extends Error {
  override readonly name = 'EmailDeliveryError';
  readonly retryable: boolean;

  constructor(readonly code: EmailDeliveryErrorCode) {
    super(code);
    this.retryable = retryableCodes.has(code);
  }
}

export class FakeEmailAdapter implements EmailAdapter {
  readonly sent: EmailSendRequest[] = [];
  private readonly outcomes: Array<
    | { readonly type: 'success' }
    | { readonly type: 'failure'; readonly code: EmailDeliveryErrorCode }
  > = [];
  private readonly results = new Map<string, EmailSendResult>();

  failNext(code: EmailDeliveryErrorCode): void {
    this.outcomes.push({ type: 'failure', code });
  }

  succeedNext(): void {
    this.outcomes.push({ type: 'success' });
  }

  send(request: EmailSendRequest): Promise<EmailSendResult> {
    const existing = this.results.get(request.idempotencyKey);
    if (existing !== undefined) return Promise.resolve(existing);
    const outcome = this.outcomes.shift() ?? { type: 'success' };
    if (outcome.type === 'failure') {
      return Promise.reject(new EmailDeliveryError(outcome.code));
    }
    this.sent.push(request);
    const result = { messageId: `fake-email-${this.sent.length}` };
    this.results.set(request.idempotencyKey, result);
    return Promise.resolve(result);
  }
}

export class UnconfiguredEmailAdapter implements EmailAdapter {
  send(): Promise<never> {
    return Promise.reject(
      new EmailDeliveryError('EMAIL_ADAPTER_NOT_CONFIGURED'),
    );
  }
}
