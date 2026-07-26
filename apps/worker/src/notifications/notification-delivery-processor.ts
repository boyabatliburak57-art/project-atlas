import type {
  EmailAdapter,
  EmailDeliveryWork,
  EmailRecipientResolver,
  NotificationStore,
} from './contracts';
import { EmailDeliveryError } from './email-adapter';
import { CommunicationTemplateRegistry } from './communication-templates';

export interface NotificationDeliveryResult {
  readonly status: 'delivered' | 'failed' | 'retry_scheduled' | 'duplicate';
  readonly nextAttempt?: number | undefined;
  readonly availableAt?: Date | undefined;
}

export class NotificationDeliveryProcessor {
  constructor(
    private readonly dependencies: {
      readonly store: NotificationStore;
      readonly email: EmailAdapter;
      readonly recipients: EmailRecipientResolver;
      readonly workerId: string;
      readonly now?: (() => Date) | undefined;
      readonly templates?: CommunicationTemplateRegistry | undefined;
    },
  ) {}

  async process(outboxId: number): Promise<NotificationDeliveryResult> {
    const now = this.dependencies.now?.() ?? new Date();
    const work = await this.dependencies.store.claimOutbox({
      outboxId,
      workerId: this.dependencies.workerId,
      now,
    });
    if (work === null) return { status: 'duplicate' };
    const recipient = await this.dependencies.recipients.resolve(work.userId);
    if (recipient === null) {
      await this.dependencies.store.markFailed({
        outboxId,
        deliveryId: work.deliveryId,
        errorCode: 'EMAIL_INVALID_RECIPIENT',
        now,
      });
      return { status: 'failed' };
    }
    await this.dependencies.store.recordAttemptStarted?.({
      attempt: work.attempt,
      deliveryId: work.deliveryId,
      now,
      providerKey: providerKey(this.dependencies.email),
    });
    try {
      const variables = templateVariables(work);
      const rendered = (
        this.dependencies.templates ?? new CommunicationTemplateRegistry()
      ).render({
        code: work.templateCode,
        locale: work.locale,
        variables,
        version: work.templateVersion,
      });
      const sent = await this.dependencies.email.send({
        recipient,
        idempotencyKey: work.idempotencyKey,
        templateCode: work.templateCode,
        templateVersion: work.templateVersion,
        locale: work.locale,
        variables,
        rendered: {
          contentHash: rendered.contentHash,
          html: rendered.html,
          subject: rendered.subject,
          text: rendered.text,
        },
      });
      await this.dependencies.store.markDelivered({
        outboxId,
        deliveryId: work.deliveryId,
        now: this.dependencies.now?.() ?? new Date(),
      });
      await this.dependencies.store.recordAttemptOutcome?.({
        attempt: work.attempt,
        deliveryId: work.deliveryId,
        now: this.dependencies.now?.() ?? new Date(),
        providerMessageId: sent.messageId,
        retryable: false,
        status: 'delivered',
      });
      return { status: 'delivered' };
    } catch (error: unknown) {
      const normalized =
        error instanceof EmailDeliveryError
          ? error
          : new EmailDeliveryError('EMAIL_PROVIDER_UNAVAILABLE');
      const failedAt = this.dependencies.now?.() ?? new Date();
      if (!normalized.retryable) {
        await this.dependencies.store.markFailed({
          outboxId,
          deliveryId: work.deliveryId,
          errorCode: normalized.code,
          now: failedAt,
        });
        await this.dependencies.store.recordAttemptOutcome?.({
          attempt: work.attempt,
          deliveryId: work.deliveryId,
          errorCode: normalized.code,
          now: failedAt,
          retryable: false,
          status: 'failed',
        });
        return { status: 'failed' };
      }
      const availableAt = new Date(
        failedAt.getTime() + retryDelayMs(work.attempt),
      );
      const retry = await this.dependencies.store.markRetry({
        outboxId,
        deliveryId: work.deliveryId,
        errorCode: normalized.code,
        availableAt,
        now: failedAt,
      });
      await this.dependencies.store.recordAttemptOutcome?.({
        attempt: work.attempt,
        deliveryId: work.deliveryId,
        errorCode: normalized.code,
        now: failedAt,
        retryable: !retry.exhausted,
        status: retry.exhausted ? 'failed' : 'retry_scheduled',
      });
      return retry.exhausted
        ? { status: 'failed' }
        : {
            status: 'retry_scheduled',
            nextAttempt: retry.nextAttempt,
            availableAt,
          };
    }
  }
}

function providerKey(adapter: EmailAdapter): string {
  const mode = (adapter as { readonly mode?: unknown }).mode;
  return mode === 'REAL_INTEGRATION'
    ? 'transactional-http'
    : mode === 'SANDBOX_INTEGRATION'
      ? 'sandbox'
      : 'test';
}

function retryDelayMs(attempt: number): number {
  return Math.min(60_000, 1_000 * 2 ** Math.max(0, attempt - 1));
}

function templateVariables(
  work: EmailDeliveryWork,
): Readonly<Record<string, string>> {
  return {
    title: work.title,
    body: work.body,
    dataTime: metadataString(work.metadata['dataTime']),
    symbol: metadataString(work.metadata['symbol']),
    disclaimer: 'Bu bildirim yatırım tavsiyesi değildir.',
  };
}

function metadataString(value: unknown): string {
  return typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
    ? String(value)
    : '';
}
