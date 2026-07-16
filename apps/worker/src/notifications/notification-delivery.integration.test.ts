import {
  alertEvaluations,
  alertRevisions,
  alerts,
  alertTriggers,
  createDatabase,
  instruments,
  notificationDeliveries,
  notificationOutbox,
  notificationPreferences,
  notifications,
  runMigrations,
} from '@atlas/database';
import type { NotificationDeliveryQueuePayload } from '@atlas/types';
import { count, eq } from 'drizzle-orm';
import { Queue } from 'bullmq';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { parseEnvironment } from '../config/environment';
import { StructuredLogger } from '../observability/structured-logger';
import { DEFAULT_JOB_OPTIONS, QUEUE_NAMES } from '../queue/queue-contracts';
import { createRedisConnection } from '../queue/redis-connection';
import { WorkerRuntime } from '../runtime/worker-runtime';
import { FakeEmailAdapter } from './email-adapter';
import { createNotificationComposition } from './notification-composition';
import { PostgresNotificationStore } from './postgres-notification-store';

function requireTestDatabaseUrl(): string {
  const value = process.env.TEST_DATABASE_URL;
  if (
    value === undefined ||
    !new URL(value).pathname.slice(1).endsWith('_test')
  ) {
    throw new Error('TEST_DATABASE_URL with an _test database is required');
  }
  return value;
}

const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
const ownerQuiet = '00000000-0000-4000-8000-000000001801';
const ownerDisabled = '00000000-0000-4000-8000-000000001802';
const ownerRetry = '00000000-0000-4000-8000-000000001803';
const ownerPermanent = '00000000-0000-4000-8000-000000001804';
const instrumentId = '00000000-0000-4000-8000-000000001811';

describe('notification center and delivery runtime', () => {
  const databaseUrl = requireTestDatabaseUrl();
  const { db, pool } = createDatabase(databaseUrl);
  const connection = createRedisConnection(redisUrl);
  const queue = new Queue<NotificationDeliveryQueuePayload>(
    QUEUE_NAMES.notifications,
    { connection, defaultJobOptions: DEFAULT_JOB_OPTIONS },
  );
  const logger = new StructuredLogger('error', { write: () => undefined });
  const store = new PostgresNotificationStore(db);
  const email = new FakeEmailAdapter();
  const recipients = new Map([
    [ownerQuiet, 'quiet@example.test'],
    [ownerRetry, 'retry@example.test'],
    [ownerPermanent, 'permanent@example.test'],
  ]);
  const composition = createNotificationComposition({
    database: db,
    queue,
    logger,
    store,
    email,
    recipients: {
      resolve: (userId) => Promise.resolve(recipients.get(userId) ?? null),
    },
  });
  const noOp = {
    process: () => Promise.resolve(),
    close: () => Promise.resolve(),
  };
  const noOpAlert = {
    ...noOp,
    catchUp: () => Promise.resolve(0),
  };
  let runtime: WorkerRuntime;
  let triggerSequence = 0;
  let quietTriggerId: string;

  beforeAll(async () => {
    await pool.query('drop schema if exists public cascade');
    await pool.query('drop schema if exists drizzle cascade');
    await pool.query('create schema public');
    await runMigrations(db);
    await queue.waitUntilReady();
    await queue.obliterate({ force: true });
    await db.insert(instruments).values({
      id: instrumentId,
      symbol: 'NTF1',
      normalizedSymbol: 'NTF1',
      name: 'Notification Fixture',
      marketCode: 'BIST',
      currencyCode: 'TRY',
      status: 'active',
    });
    const minute = localMinute(new Date(), 'Europe/Istanbul');
    await db.insert(notificationPreferences).values([
      {
        userId: ownerQuiet,
        timezone: 'Europe/Istanbul',
        locale: 'tr-TR',
        emailAlertsEnabled: true,
        quietHoursEnabled: true,
        quietHoursStartMinute: (minute + 1_439) % 1_440,
        quietHoursEndMinute: (minute + 2) % 1_440,
      },
      {
        userId: ownerDisabled,
        timezone: 'UTC',
        locale: 'tr-TR',
        emailAlertsEnabled: false,
      },
      {
        userId: ownerRetry,
        timezone: 'UTC',
        locale: 'tr-TR',
        emailAlertsEnabled: true,
      },
      {
        userId: ownerPermanent,
        timezone: 'UTC',
        locale: 'tr-TR',
        emailAlertsEnabled: true,
      },
    ]);
    quietTriggerId = await insertTrigger(ownerQuiet, ['in_app', 'email']);
    runtime = await WorkerRuntime.start(
      parseEnvironment({
        DATABASE_URL: databaseUrl,
        REDIS_URL: redisUrl,
        WORKER_CONCURRENCY: 1,
        WORKER_HEARTBEAT_INTERVAL_MS: 60_000,
      }),
      logger,
      noOp,
      noOp,
      noOpAlert,
      composition,
    );
  });

  afterAll(async () => {
    await runtime?.stop('notification-integration-cleanup');
    await Promise.allSettled([queue.close(), pool.end()]);
  });

  it('writes one in-app notification and exposes the unread data path', async () => {
    await waitFor(async () => (await store.countUnread(ownerQuiet)) === 1);
    const row = (
      await db
        .select()
        .from(notifications)
        .where(eq(notifications.alertTriggerId, quietTriggerId))
    )[0]!;
    expect(row.body).toContain('Veri zamanı:');
    expect(row.body).toContain('yatırım tavsiyesi değildir');
    expect(JSON.stringify(row.metadata)).not.toContain('ruleAst');

    expect(await store.markRead(ownerQuiet, row.id, new Date())).toBe(true);
    expect(await store.countUnread(ownerQuiet)).toBe(0);
    expect(await store.markUnread(ownerQuiet, row.id, new Date())).toBe(true);
    expect(await store.markAllRead(ownerQuiet, new Date())).toBe(1);
    expect(await store.countUnread(ownerQuiet)).toBe(0);
  });

  it('defers e-mail outbox availability during user-local quiet hours', async () => {
    const row = (
      await db
        .select({
          scheduledAt: notificationDeliveries.scheduledAt,
          availableAt: notificationOutbox.availableAt,
          createdAt: notificationDeliveries.createdAt,
        })
        .from(notificationDeliveries)
        .innerJoin(
          notificationOutbox,
          eq(notificationOutbox.deliveryId, notificationDeliveries.id),
        )
        .innerJoin(
          notifications,
          eq(notifications.id, notificationDeliveries.notificationId),
        )
        .where(eq(notifications.alertTriggerId, quietTriggerId))
    )[0]!;
    expect(row.availableAt.getTime()).toBeGreaterThan(row.createdAt.getTime());
    expect(row.scheduledAt).toEqual(row.availableAt);
  });

  it('suppresses disabled e-mail without creating outbox work', async () => {
    const triggerId = await insertTrigger(ownerDisabled, ['in_app', 'email']);
    await composition.handleTriggerIds([triggerId]);
    const delivery = (
      await db
        .select()
        .from(notificationDeliveries)
        .innerJoin(
          notifications,
          eq(notifications.id, notificationDeliveries.notificationId),
        )
        .where(eq(notifications.alertTriggerId, triggerId))
    )[0]!;
    expect(delivery.notification_deliveries.status).toBe('suppressed');
    expect(
      await db
        .select({ value: count() })
        .from(notificationOutbox)
        .where(
          eq(
            notificationOutbox.deliveryId,
            delivery.notification_deliveries.id,
          ),
        ),
    ).toEqual([{ value: 0 }]);
  });

  it('prevents duplicate notification and delivery creation', async () => {
    await composition.handleTriggerIds([quietTriggerId, quietTriggerId]);
    expect(
      await db
        .select({ value: count() })
        .from(notifications)
        .where(eq(notifications.alertTriggerId, quietTriggerId)),
    ).toEqual([{ value: 1 }]);
  });

  it('retries a temporary fake adapter failure and delivers once', async () => {
    email.failNext('EMAIL_TIMEOUT');
    const triggerId = await insertTrigger(ownerRetry, ['in_app', 'email']);
    await composition.handleTriggerIds([triggerId]);
    await waitFor(
      async () => (await deliveryStatus(triggerId)) === 'delivered',
    );

    const delivery = await deliveryForTrigger(triggerId);
    expect(delivery.attemptCount).toBe(2);
    expect(
      email.sent.filter(({ recipient }) => recipient === 'retry@example.test'),
    ).toHaveLength(1);
  });

  it('does not retry a permanent fake adapter failure', async () => {
    email.failNext('EMAIL_PERMANENT_BOUNCE');
    const triggerId = await insertTrigger(ownerPermanent, ['in_app', 'email']);
    await composition.handleTriggerIds([triggerId]);
    await waitFor(async () => (await deliveryStatus(triggerId)) === 'failed');

    const delivery = await deliveryForTrigger(triggerId);
    expect(delivery).toMatchObject({
      attemptCount: 1,
      errorCode: 'EMAIL_PERMANENT_BOUNCE',
    });
  });

  async function insertTrigger(
    ownerUserId: string,
    channels: readonly string[],
  ): Promise<string> {
    triggerSequence += 1;
    const suffix = String(1_820 + triggerSequence).padStart(12, '0');
    const alertId = `00000000-0000-4000-8000-${suffix}`;
    const triggerId = `00000000-0000-4000-9000-${suffix}`;
    await db.insert(alerts).values({
      id: alertId,
      ownerUserId,
      name: `Notification alert ${triggerSequence}`,
      status: 'active',
      currentRevision: 1,
    });
    await db.insert(alertRevisions).values({
      alertId,
      revision: 1,
      sourceType: 'instrument_price',
      instrumentId,
      triggerPolicy: 'thresholdCrossed',
      repeatPolicy: 'once',
      timeframe: '1d',
      sourceConfiguration: { operator: 'GT', threshold: 100 },
      channels,
      createdBy: ownerUserId,
    });
    const evaluation = (
      await db
        .insert(alertEvaluations)
        .values({
          alertId,
          alertRevision: 1,
          sourceEventId: `notification-event-${triggerSequence}`,
          dataCutoffAt: new Date(),
          instrumentId,
          timeframe: '1d',
          evaluationWindow: `window-${triggerSequence}`,
          status: 'matched',
        })
        .returning({ id: alertEvaluations.id })
    )[0]!;
    await db.insert(alertTriggers).values({
      id: triggerId,
      alertId,
      alertRevision: 1,
      evaluationId: evaluation.id,
      instrumentId,
      triggerType: 'thresholdCrossed',
      deduplicationKey: `notification-trigger-${triggerSequence}`,
      occurredAt: new Date(),
    });
    return triggerId;
  }

  async function deliveryForTrigger(triggerId: string) {
    return (
      await db
        .select({
          status: notificationDeliveries.status,
          attemptCount: notificationDeliveries.attemptCount,
          errorCode: notificationDeliveries.errorCode,
        })
        .from(notificationDeliveries)
        .innerJoin(
          notifications,
          eq(notifications.id, notificationDeliveries.notificationId),
        )
        .where(eq(notifications.alertTriggerId, triggerId))
    )[0]!;
  }

  async function deliveryStatus(
    triggerId: string,
  ): Promise<string | undefined> {
    return (await deliveryForTrigger(triggerId)).status;
  }
});

function localMinute(value: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);
  return (
    Number(parts.find(({ type }) => type === 'hour')?.value ?? 0) * 60 +
    Number(parts.find(({ type }) => type === 'minute')?.value ?? 0)
  );
}

async function waitFor(
  predicate: () => Promise<boolean>,
  timeoutMs = 10_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!(await predicate())) {
    if (Date.now() >= deadline)
      throw new Error('Timed out waiting for condition');
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}
