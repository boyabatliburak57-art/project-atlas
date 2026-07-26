import {
  communicationDeliveryAttempts,
  communicationProviderEvents,
  createDatabase,
  notificationDeliveries,
  notificationPreferences,
  notifications,
  runMigrations,
} from '@atlas/database';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { TelemetryService } from '../observability/telemetry.service';
import { ApiDatabase } from '../scanner/scanner-runtime.infrastructure';
import { EmailWebhookService, signEmailWebhook } from './email-webhook.service';

const secret = 'email-webhook-test-secret-at-least-32-bytes';
const userId = '00000000-0000-4000-8000-000000009601';
const notificationId = '00000000-0000-4000-8000-000000009602';
const deliveryId = '00000000-0000-4000-8000-000000009603';
const messageId = 'sandbox-provider-message-9601';

describe('signed e-mail bounce and complaint webhooks', () => {
  const { db, pool } = createDatabase(requireDatabaseUrl());
  const config = new ConfigService({
    ATLAS_ENV: 'test',
    EMAIL_PROVIDER_KEY: 'sandbox',
    EMAIL_WEBHOOK_SIGNING_SECRET: secret,
    RELEASE_VERSION: 'test',
  });
  const service = new EmailWebhookService(
    { database: db, pool } as ApiDatabase,
    config,
    new TelemetryService(config, { write: () => undefined }),
  );

  beforeAll(async () => {
    await pool.query('drop schema if exists public cascade');
    await pool.query('drop schema if exists drizzle cascade');
    await pool.query('create schema public');
    await runMigrations(db);
    await db.insert(notifications).values({
      body: 'Safe notification body',
      id: notificationId,
      occurredAt: new Date('2026-07-26T10:00:00Z'),
      title: 'Safe notification',
      type: 'security',
      userId,
    });
    await db.insert(notificationDeliveries).values({
      channel: 'email',
      deliveredAt: new Date('2026-07-26T10:01:00Z'),
      id: deliveryId,
      idempotencyKey: 'security-notification-9601',
      locale: 'tr-TR',
      notificationId,
      status: 'delivered',
      templateCode: 'security-alert',
      templateVersion: 1,
      userId,
    });
    const { createHash } = await import('node:crypto');
    await db.insert(communicationDeliveryAttempts).values({
      attempt: 1,
      completedAt: new Date('2026-07-26T10:01:00Z'),
      deliveryId,
      providerKey: 'sandbox',
      providerMessageIdHash: createHash('sha256')
        .update(messageId)
        .digest('hex'),
      retryable: 'false',
      startedAt: new Date('2026-07-26T10:00:30Z'),
      status: 'delivered',
    });
  });

  afterAll(() => pool.end());

  it('rejects missing or invalid webhook signatures', async () => {
    await expect(
      service.process({
        body: event('invalid-event', 'bounce'),
        now: new Date('2026-07-26T10:02:00Z'),
        signature: '0'.repeat(64),
        timestamp: String(new Date('2026-07-26T10:02:00Z').getTime()),
      }),
    ).rejects.toMatchObject({
      response: { code: 'EMAIL_WEBHOOK_SIGNATURE_INVALID' },
    });
  });

  it('persists bounce once, marks delivery failed and disables alert e-mail', async () => {
    const now = new Date('2026-07-26T10:02:00Z');
    const body = event('bounce-event-9601', 'bounce');
    const timestamp = String(now.getTime());
    await expect(
      service.process({
        body,
        now,
        signature: signEmailWebhook(body, timestamp, secret),
        timestamp,
      }),
    ).resolves.toMatchObject({ accepted: true, matched: true });
    const [delivery] = await db
      .select()
      .from(notificationDeliveries)
      .where(eq(notificationDeliveries.id, deliveryId));
    expect(delivery).toMatchObject({
      errorCode: 'EMAIL_PERMANENT_BOUNCE',
      status: 'failed',
    });
    const [preference] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
    expect(preference?.emailAlertsEnabled).toBe(false);
  });

  it('deduplicates provider event replay', async () => {
    const now = new Date('2026-07-26T10:02:30Z');
    const body = event('bounce-event-9601', 'bounce');
    const timestamp = String(now.getTime());
    await expect(
      service.process({
        body,
        now,
        signature: signEmailWebhook(body, timestamp, secret),
        timestamp,
      }),
    ).resolves.toMatchObject({ duplicate: true });
    expect(await db.select().from(communicationProviderEvents)).toHaveLength(1);
  });

  it('accepts a signed complaint without exposing provider message ID', async () => {
    const now = new Date('2026-07-26T10:03:00Z');
    const body = event('complaint-event-9602', 'complaint');
    const timestamp = String(now.getTime());
    await service.process({
      body,
      now,
      signature: signEmailWebhook(body, timestamp, secret),
      timestamp,
    });
    const serialized = JSON.stringify(
      await db.select().from(communicationProviderEvents),
    );
    expect(serialized).not.toContain(messageId);
    expect(serialized).not.toContain('complaint-event-9602');
  });
});

function event(eventId: string, type: 'bounce' | 'complaint') {
  return {
    eventId,
    messageId,
    occurredAt: '2026-07-26T10:01:30.000Z',
    type,
  } as const;
}

function requireDatabaseUrl(): string {
  const value = process.env['TEST_DATABASE_URL'];
  if (!value) throw new Error('TEST_DATABASE_URL is required');
  return value;
}
