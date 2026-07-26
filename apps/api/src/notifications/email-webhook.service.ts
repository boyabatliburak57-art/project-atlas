import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import {
  communicationDeliveryAttempts,
  communicationProviderEvents,
  notificationDeliveries,
  notificationPreferences,
} from '@atlas/database';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { ApiDatabase } from '../scanner/scanner-runtime.infrastructure';
import { TelemetryService } from '../observability/telemetry.service';

const eventSchema = z
  .object({
    eventId: z.string().min(8).max(512),
    messageId: z.string().min(1).max(512),
    occurredAt: z.iso.datetime({ offset: true }),
    type: z.enum(['bounce', 'complaint']),
  })
  .strict();

@Injectable()
export class EmailWebhookService {
  private readonly providerKey: string;
  private readonly signingSecret: string;
  private readonly seen = new Map<string, number>();

  constructor(
    private readonly connection: ApiDatabase,
    config: ConfigService,
    private readonly telemetry: TelemetryService,
  ) {
    this.providerKey =
      config.get<string>('EMAIL_PROVIDER_KEY') ?? 'transactional-email';
    this.signingSecret = config.getOrThrow<string>(
      'EMAIL_WEBHOOK_SIGNING_SECRET',
    );
  }

  async process(input: {
    readonly body: unknown;
    readonly signature: string | undefined;
    readonly timestamp: string | undefined;
    readonly now?: Date;
  }) {
    const now = input.now ?? new Date();
    const event = parseEvent(input.body);
    this.verifySignature(event, input.signature, input.timestamp, now);
    this.enforceRateLimit(now);
    const eventHash = hash(event.eventId);
    const messageHash = hash(event.messageId);
    const result = await this.connection.database.transaction(
      async (transaction) => {
        const inserted = await transaction
          .insert(communicationProviderEvents)
          .values({
            eventType: event.type,
            occurredAt: new Date(event.occurredAt),
            providerEventIdHash: eventHash,
            providerKey: this.providerKey,
            providerMessageIdHash: messageHash,
            signatureVersion: 'hmac-sha256-v1',
          })
          .onConflictDoNothing()
          .returning({ id: communicationProviderEvents.id });
        if (inserted.length === 0) return { duplicate: true };
        const [attempt] = await transaction
          .select({
            deliveryId: communicationDeliveryAttempts.deliveryId,
          })
          .from(communicationDeliveryAttempts)
          .where(
            eq(
              communicationDeliveryAttempts.providerMessageIdHash,
              messageHash,
            ),
          )
          .limit(1);
        if (attempt === undefined) return { duplicate: false, matched: false };
        const [delivery] = await transaction
          .update(notificationDeliveries)
          .set({
            deliveredAt: null,
            errorCode:
              event.type === 'bounce'
                ? 'EMAIL_PERMANENT_BOUNCE'
                : 'EMAIL_COMPLAINT',
            failedAt: now,
            status: 'failed',
            updatedAt: now,
          })
          .where(eq(notificationDeliveries.id, attempt.deliveryId))
          .returning({ userId: notificationDeliveries.userId });
        await transaction
          .update(communicationDeliveryAttempts)
          .set({
            completedAt: now,
            errorCode:
              event.type === 'bounce'
                ? 'EMAIL_PERMANENT_BOUNCE'
                : 'EMAIL_COMPLAINT',
            retryable: 'false',
            status: event.type === 'bounce' ? 'bounced' : 'complained',
          })
          .where(
            and(
              eq(
                communicationDeliveryAttempts.providerMessageIdHash,
                messageHash,
              ),
              eq(communicationDeliveryAttempts.deliveryId, attempt.deliveryId),
            ),
          );
        if (delivery !== undefined)
          await transaction
            .insert(notificationPreferences)
            .values({
              emailAlertsEnabled: false,
              userId: delivery.userId,
            })
            .onConflictDoUpdate({
              set: { emailAlertsEnabled: false, updatedAt: now },
              target: notificationPreferences.userId,
            });
        return { duplicate: false, matched: delivery !== undefined };
      },
    );
    this.telemetry.metric({
      kind: 'counter',
      labels: {
        environment: 'runtime',
        outcome: result.duplicate ? 'duplicate' : 'accepted',
        service: 'atlas-api',
      },
      name: `email.webhook.${event.type}`,
      value: 1,
    });
    return { accepted: true, ...result };
  }

  private verifySignature(
    event: z.infer<typeof eventSchema>,
    signature: string | undefined,
    timestamp: string | undefined,
    now: Date,
  ): void {
    if (
      signature === undefined ||
      timestamp === undefined ||
      !/^\d{10,13}$/u.test(timestamp)
    )
      invalidSignature();
    const timestampMs =
      timestamp.length === 10 ? Number(timestamp) * 1_000 : Number(timestamp);
    if (
      !Number.isSafeInteger(timestampMs) ||
      Math.abs(now.getTime() - timestampMs) > 5 * 60_000
    )
      invalidSignature();
    const payload = `${timestamp}.${canonical(event)}`;
    const expected = createHmac('sha256', this.signingSecret)
      .update(payload)
      .digest('hex');
    if (
      !/^[a-f0-9]{64}$/u.test(signature) ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    )
      invalidSignature();
  }

  private enforceRateLimit(now: Date): void {
    const windowStart = now.getTime() - 60_000;
    for (const [key, timestamp] of this.seen)
      if (timestamp < windowStart) this.seen.delete(key);
    if (this.seen.size >= 300)
      throw new BadRequestException({
        code: 'EMAIL_WEBHOOK_RATE_LIMITED',
        message: 'Webhook rate limit exceeded',
      });
    this.seen.set(`${now.getTime()}:${this.seen.size}`, now.getTime());
  }
}

function parseEvent(value: unknown): z.infer<typeof eventSchema> {
  const result = eventSchema.safeParse(value);
  if (!result.success)
    throw new BadRequestException({
      code: 'EMAIL_WEBHOOK_INVALID',
      message: 'Webhook payload is invalid',
    });
  return result.data;
}

function invalidSignature(): never {
  throw new UnauthorizedException({
    code: 'EMAIL_WEBHOOK_SIGNATURE_INVALID',
    message: 'Webhook signature is invalid',
  });
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function canonical(value: Readonly<Record<string, unknown>>): string {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(value).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
  );
}

export function signEmailWebhook(
  body: Readonly<Record<string, unknown>>,
  timestamp: string,
  secret: string,
): string {
  return createHmac('sha256', secret)
    .update(`${timestamp}.${canonical(body)}`)
    .digest('hex');
}
