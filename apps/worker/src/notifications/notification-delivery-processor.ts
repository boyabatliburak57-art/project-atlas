import type {
  EmailAdapter,
  EmailDeliveryWork,
  EmailRecipientResolver,
  NotificationStore,
} from './contracts';
import { EmailDeliveryError } from './email-adapter';

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
    try {
      await this.dependencies.email.send({
        recipient,
        idempotencyKey: work.idempotencyKey,
        templateCode: work.templateCode,
        templateVersion: work.templateVersion,
        locale: work.locale,
        variables: templateVariables(work),
      });
      await this.dependencies.store.markDelivered({
        outboxId,
        deliveryId: work.deliveryId,
        now: this.dependencies.now?.() ?? new Date(),
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
