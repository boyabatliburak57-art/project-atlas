import type {
  EmailAdapter,
  EmailSendRequest,
  EmailSendResult,
} from './contracts';
import { createHash } from 'node:crypto';

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

export class SandboxEmailAdapter implements EmailAdapter {
  readonly mode = 'SANDBOX_INTEGRATION';
  private readonly results = new Map<string, EmailSendResult>();
  private readonly window: number[] = [];

  constructor(
    private readonly options: {
      readonly maximumPerMinute?: number;
      readonly now?: () => Date;
    } = {},
  ) {}

  send(request: EmailSendRequest): Promise<EmailSendResult> {
    const existing = this.results.get(request.idempotencyKey);
    if (existing !== undefined) return Promise.resolve(existing);
    validateSendRequest(request);
    const now = (this.options.now?.() ?? new Date()).getTime();
    while ((this.window[0] ?? now) <= now - 60_000) this.window.shift();
    if (this.window.length >= (this.options.maximumPerMinute ?? 60))
      return Promise.reject(new EmailDeliveryError('EMAIL_RATE_LIMITED'));
    this.window.push(now);
    const result = {
      messageId: `sandbox-${createHash('sha256')
        .update(request.idempotencyKey)
        .digest('hex')}`,
    };
    this.results.set(request.idempotencyKey, result);
    return Promise.resolve(result);
  }
}

export interface EmailProviderCredentialResolver {
  resolve(reference: string): Promise<string>;
}

export class TransactionalEmailHttpAdapter implements EmailAdapter {
  readonly mode = 'REAL_INTEGRATION';

  constructor(
    private readonly options: {
      readonly baseUrl: string;
      readonly credentialReference: string;
      readonly credentials: EmailProviderCredentialResolver;
      readonly fetch?: typeof fetch;
      readonly timeoutMs?: number;
    },
  ) {
    const reference = options.credentialReference;
    if (!/^(secret|vault|aws-sm|gcp-sm|azure-kv):\/\//u.test(reference))
      throw new Error('EMAIL_CREDENTIAL_REFERENCE_INVALID');
  }

  async send(request: EmailSendRequest): Promise<EmailSendResult> {
    validateSendRequest(request);
    if (request.rendered === undefined)
      throw new EmailDeliveryError('EMAIL_PROVIDER_UNAVAILABLE');
    const credential = await this.options.credentials.resolve(
      this.options.credentialReference,
    );
    const abort = new AbortController();
    const timer = setTimeout(
      () => abort.abort(),
      this.options.timeoutMs ?? 10_000,
    );
    try {
      const response = await (this.options.fetch ?? fetch)(
        new URL('/v1/transactional/messages', this.options.baseUrl),
        {
          body: JSON.stringify({
            contentHash: request.rendered.contentHash,
            html: request.rendered.html,
            idempotencyKey: request.idempotencyKey,
            locale: request.locale,
            recipient: request.recipient,
            subject: request.rendered.subject,
            template: {
              code: request.templateCode,
              version: request.templateVersion,
            },
            text: request.rendered.text,
          }),
          headers: {
            authorization: `Bearer ${credential}`,
            'content-type': 'application/json',
            'idempotency-key': request.idempotencyKey,
          },
          method: 'POST',
          signal: abort.signal,
        },
      );
      if (response.status === 429)
        throw new EmailDeliveryError('EMAIL_RATE_LIMITED');
      if (response.status >= 500)
        throw new EmailDeliveryError('EMAIL_PROVIDER_UNAVAILABLE');
      if (response.status === 400 || response.status === 422)
        throw new EmailDeliveryError('EMAIL_INVALID_RECIPIENT');
      if (!response.ok)
        throw new EmailDeliveryError('EMAIL_PROVIDER_UNAVAILABLE');
      const body = (await response.json()) as { messageId?: unknown };
      if (typeof body.messageId !== 'string' || body.messageId.length > 512)
        throw new EmailDeliveryError('EMAIL_PROVIDER_UNAVAILABLE');
      return { messageId: body.messageId };
    } catch (error) {
      if (error instanceof EmailDeliveryError) throw error;
      if (error instanceof Error && error.name === 'AbortError')
        throw new EmailDeliveryError('EMAIL_TIMEOUT');
      throw new EmailDeliveryError('EMAIL_PROVIDER_UNAVAILABLE');
    } finally {
      clearTimeout(timer);
    }
  }
}

function validateSendRequest(request: EmailSendRequest): void {
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(request.recipient) ||
    request.recipient.length > 320
  )
    throw new EmailDeliveryError('EMAIL_INVALID_RECIPIENT');
  if (request.idempotencyKey.length < 8 || request.idempotencyKey.length > 255)
    throw new EmailDeliveryError('EMAIL_PROVIDER_UNAVAILABLE');
  if (
    request.rendered !== undefined &&
    (/[\r\n]/u.test(request.rendered.subject) ||
      /<(script|iframe|object|embed|form)\b|on[a-z]+\s*=|javascript:/iu.test(
        request.rendered.html,
      ))
  )
    throw new EmailDeliveryError('EMAIL_PROVIDER_UNAVAILABLE');
}
