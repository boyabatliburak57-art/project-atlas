import {
  alertEvaluations,
  alertRevisions,
  alerts,
  alertTriggers,
  instruments,
  notificationDeliveries,
  notificationOutbox,
  notifications,
  type Database,
} from '@atlas/database';
import { and, count, eq, inArray, isNull, lte, sql } from 'drizzle-orm';

import type {
  EmailDeliveryWork,
  NotificationStore,
  NotificationWriteResult,
  TriggerNotificationContext,
} from './contracts';

export class PostgresNotificationStore implements NotificationStore {
  constructor(private readonly database: Database) {}

  async loadTriggerContext(
    triggerId: string,
  ): Promise<TriggerNotificationContext | null> {
    const row = (
      await this.database
        .select({
          trigger: alertTriggers,
          alert: alerts,
          revision: alertRevisions,
          evaluation: alertEvaluations,
          symbol: instruments.symbol,
        })
        .from(alertTriggers)
        .innerJoin(alerts, eq(alerts.id, alertTriggers.alertId))
        .innerJoin(
          alertRevisions,
          and(
            eq(alertRevisions.alertId, alertTriggers.alertId),
            eq(alertRevisions.revision, alertTriggers.alertRevision),
          ),
        )
        .innerJoin(
          alertEvaluations,
          eq(alertEvaluations.id, alertTriggers.evaluationId),
        )
        .leftJoin(instruments, eq(instruments.id, alertTriggers.instrumentId))
        .where(eq(alertTriggers.id, triggerId))
        .limit(1)
    )[0];
    if (row === undefined) return null;
    return {
      triggerId: row.trigger.id,
      alertId: row.alert.id,
      alertRevision: row.trigger.alertRevision,
      alertName: row.alert.name,
      userId: row.alert.ownerUserId,
      instrumentId: row.trigger.instrumentId,
      symbol: row.symbol,
      triggerType: row.trigger.triggerType,
      channels: row.revision.channels,
      dataTime: row.evaluation.dataCutoffAt,
      occurredAt: row.trigger.occurredAt,
    };
  }

  async writeTriggerNotification(input: {
    readonly context: TriggerNotificationContext;
    readonly preference: Parameters<
      NotificationStore['writeTriggerNotification']
    >[0]['preference'];
    readonly emailAvailableAt: Date;
    readonly now: Date;
  }): Promise<NotificationWriteResult> {
    return this.database.transaction(async (transaction) => {
      await transaction.execute(sql`
        select pg_advisory_xact_lock(
          hashtextextended(${`notification:${input.context.triggerId}`}, 0)
        )
      `);
      const existing = (
        await transaction
          .select({ id: notifications.id })
          .from(notifications)
          .where(eq(notifications.alertTriggerId, input.context.triggerId))
          .limit(1)
      )[0];
      if (existing !== undefined) {
        return {
          notificationId: existing.id,
          outboxItems: [],
          duplicate: true,
        };
      }
      const notification = (
        await transaction
          .insert(notifications)
          .values({
            userId: input.context.userId,
            alertTriggerId: input.context.triggerId,
            type: 'alertTriggered',
            title: input.context.alertName,
            body: notificationBody(input.context),
            metadata: {
              alertId: input.context.alertId,
              alertRevision: input.context.alertRevision,
              instrumentId: input.context.instrumentId,
              symbol: input.context.symbol,
              triggerType: input.context.triggerType,
              dataTime: input.context.dataTime.toISOString(),
              stale: false,
            },
            occurredAt: input.context.occurredAt,
            createdAt: input.now,
          })
          .returning({ id: notifications.id })
      )[0];
      if (notification === undefined) {
        throw new Error('Notification insert invariant failed');
      }
      const outboxItems: NotificationWriteResult['outboxItems'][number][] = [];
      if (input.context.channels.includes('email')) {
        const suppressed = !input.preference.emailAlertsEnabled;
        const delivery = (
          await transaction
            .insert(notificationDeliveries)
            .values({
              notificationId: notification.id,
              userId: input.context.userId,
              channel: 'email',
              idempotencyKey: `alert-trigger:${input.context.triggerId}:email:v1`,
              status: suppressed ? 'suppressed' : 'pending',
              templateCode: 'alert-triggered',
              templateVersion: 1,
              locale: input.preference.locale,
              scheduledAt: input.emailAvailableAt,
              createdAt: input.now,
              updatedAt: input.now,
            })
            .returning({ id: notificationDeliveries.id })
        )[0];
        if (delivery === undefined) {
          throw new Error('Notification delivery insert invariant failed');
        }
        if (!suppressed) {
          const outbox = (
            await transaction
              .insert(notificationOutbox)
              .values({
                deliveryId: delivery.id,
                status: 'pending',
                availableAt: input.emailAvailableAt,
                payload: { notificationId: notification.id },
                createdAt: input.now,
                updatedAt: input.now,
              })
              .returning({ id: notificationOutbox.id })
          )[0];
          if (outbox === undefined) {
            throw new Error('Notification outbox insert invariant failed');
          }
          outboxItems.push({
            outboxId: outbox.id,
            attempt: 1,
            availableAt: input.emailAvailableAt,
          });
        }
      }
      return {
        notificationId: notification.id,
        outboxItems,
        duplicate: false,
      };
    });
  }

  async listUnprocessedTriggerIds(limit: number): Promise<readonly string[]> {
    const rows = await this.database
      .select({ id: alertTriggers.id })
      .from(alertTriggers)
      .leftJoin(
        notifications,
        eq(notifications.alertTriggerId, alertTriggers.id),
      )
      .where(isNull(notifications.id))
      .orderBy(alertTriggers.occurredAt, alertTriggers.id)
      .limit(limit);
    return rows.map(({ id }) => id);
  }

  async listPendingOutbox(limit: number) {
    const rows = await this.database
      .select({
        outboxId: notificationOutbox.id,
        attemptCount: notificationOutbox.attemptCount,
        availableAt: notificationOutbox.availableAt,
      })
      .from(notificationOutbox)
      .where(eq(notificationOutbox.status, 'pending'))
      .orderBy(notificationOutbox.availableAt, notificationOutbox.id)
      .limit(limit);
    return rows.map((row) => ({
      outboxId: row.outboxId,
      attempt: row.attemptCount + 1,
      availableAt: row.availableAt,
    }));
  }

  async recoverStaleOutbox(input: {
    readonly staleBefore: Date;
    readonly now: Date;
  }): Promise<number> {
    return this.database.transaction(async (transaction) => {
      const recovered = await transaction
        .update(notificationOutbox)
        .set({
          status: 'pending',
          lockedAt: null,
          lockedBy: null,
          updatedAt: input.now,
        })
        .where(
          and(
            eq(notificationOutbox.status, 'processing'),
            lte(notificationOutbox.lockedAt, input.staleBefore),
          ),
        )
        .returning({ deliveryId: notificationOutbox.deliveryId });
      if (recovered.length > 0) {
        await transaction
          .update(notificationDeliveries)
          .set({ status: 'pending', updatedAt: input.now })
          .where(
            and(
              inArray(
                notificationDeliveries.id,
                recovered.map(({ deliveryId }) => deliveryId),
              ),
              eq(notificationDeliveries.status, 'processing'),
            ),
          );
      }
      return recovered.length;
    });
  }

  async claimOutbox(input: {
    readonly outboxId: number;
    readonly workerId: string;
    readonly now: Date;
  }): Promise<EmailDeliveryWork | null> {
    return this.database.transaction(async (transaction) => {
      const outbox = (
        await transaction
          .update(notificationOutbox)
          .set({
            status: 'processing',
            attemptCount: sql`${notificationOutbox.attemptCount} + 1`,
            lockedAt: input.now,
            lockedBy: input.workerId,
            updatedAt: input.now,
          })
          .where(
            and(
              eq(notificationOutbox.id, input.outboxId),
              eq(notificationOutbox.status, 'pending'),
              lte(notificationOutbox.availableAt, input.now),
              sql`${notificationOutbox.attemptCount} < ${notificationOutbox.maxAttempts}`,
            ),
          )
          .returning()
      )[0];
      if (outbox === undefined) return null;
      const row = (
        await transaction
          .select({
            delivery: notificationDeliveries,
            notification: notifications,
          })
          .from(notificationDeliveries)
          .innerJoin(
            notifications,
            eq(notifications.id, notificationDeliveries.notificationId),
          )
          .where(eq(notificationDeliveries.id, outbox.deliveryId))
          .limit(1)
      )[0];
      if (row === undefined)
        throw new Error('Delivery outbox invariant failed');
      await transaction
        .update(notificationDeliveries)
        .set({
          status: 'processing',
          attemptCount: outbox.attemptCount,
          errorCode: null,
          updatedAt: input.now,
        })
        .where(eq(notificationDeliveries.id, row.delivery.id));
      return {
        outboxId: outbox.id,
        deliveryId: row.delivery.id,
        notificationId: row.notification.id,
        userId: row.notification.userId,
        idempotencyKey: row.delivery.idempotencyKey,
        templateCode: row.delivery.templateCode,
        templateVersion: row.delivery.templateVersion,
        locale: row.delivery.locale,
        attempt: outbox.attemptCount,
        title: row.notification.title,
        body: row.notification.body,
        metadata: row.notification.metadata,
      };
    });
  }

  async markDelivered(input: {
    readonly outboxId: number;
    readonly deliveryId: string;
    readonly now: Date;
  }): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await transaction
        .update(notificationOutbox)
        .set({
          status: 'completed',
          processedAt: input.now,
          lockedAt: null,
          lockedBy: null,
          updatedAt: input.now,
        })
        .where(eq(notificationOutbox.id, input.outboxId));
      await transaction
        .update(notificationDeliveries)
        .set({
          status: 'delivered',
          deliveredAt: input.now,
          failedAt: null,
          errorCode: null,
          updatedAt: input.now,
        })
        .where(eq(notificationDeliveries.id, input.deliveryId));
    });
  }

  async markRetry(input: {
    readonly outboxId: number;
    readonly deliveryId: string;
    readonly errorCode: string;
    readonly availableAt: Date;
    readonly now: Date;
  }): Promise<{ readonly exhausted: boolean; readonly nextAttempt: number }> {
    return this.database.transaction(async (transaction) => {
      const row = (
        await transaction
          .select({
            attemptCount: notificationOutbox.attemptCount,
            maxAttempts: notificationOutbox.maxAttempts,
          })
          .from(notificationOutbox)
          .where(eq(notificationOutbox.id, input.outboxId))
          .limit(1)
      )[0];
      if (row === undefined)
        throw new Error('Notification outbox was not found');
      const exhausted = row.attemptCount >= row.maxAttempts;
      await transaction
        .update(notificationOutbox)
        .set({
          status: exhausted ? 'failed' : 'pending',
          availableAt: input.availableAt,
          lockedAt: null,
          lockedBy: null,
          lastErrorCode: input.errorCode,
          processedAt: exhausted ? input.now : null,
          updatedAt: input.now,
        })
        .where(eq(notificationOutbox.id, input.outboxId));
      await transaction
        .update(notificationDeliveries)
        .set({
          status: exhausted ? 'failed' : 'pending',
          deliveredAt: null,
          failedAt: exhausted ? input.now : null,
          errorCode: input.errorCode,
          updatedAt: input.now,
        })
        .where(eq(notificationDeliveries.id, input.deliveryId));
      return { exhausted, nextAttempt: row.attemptCount + 1 };
    });
  }

  async markFailed(input: {
    readonly outboxId: number;
    readonly deliveryId: string;
    readonly errorCode: string;
    readonly now: Date;
  }): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await transaction
        .update(notificationOutbox)
        .set({
          status: 'failed',
          lockedAt: null,
          lockedBy: null,
          lastErrorCode: input.errorCode,
          processedAt: input.now,
          updatedAt: input.now,
        })
        .where(eq(notificationOutbox.id, input.outboxId));
      await transaction
        .update(notificationDeliveries)
        .set({
          status: 'failed',
          deliveredAt: null,
          failedAt: input.now,
          errorCode: input.errorCode,
          updatedAt: input.now,
        })
        .where(eq(notificationDeliveries.id, input.deliveryId));
    });
  }

  async countUnread(userId: string): Promise<number> {
    return (
      (
        await this.database
          .select({ value: count() })
          .from(notifications)
          .where(
            and(eq(notifications.userId, userId), isNull(notifications.readAt)),
          )
      )[0]?.value ?? 0
    );
  }

  async markRead(userId: string, notificationId: string, at: Date) {
    const rows = await this.database
      .update(notifications)
      .set({ readAt: at })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId),
          isNull(notifications.readAt),
        ),
      )
      .returning({ id: notifications.id });
    if (rows.length > 0) return true;
    return (
      (
        await this.database
          .select({ id: notifications.id })
          .from(notifications)
          .where(
            and(
              eq(notifications.id, notificationId),
              eq(notifications.userId, userId),
            ),
          )
          .limit(1)
      ).length > 0
    );
  }

  async markUnread(userId: string, notificationId: string, at: Date) {
    void at;
    const rows = await this.database
      .update(notifications)
      .set({ readAt: null })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId),
        ),
      )
      .returning({ id: notifications.id });
    return rows.length > 0;
  }

  async markAllRead(userId: string, at: Date): Promise<number> {
    return (
      await this.database
        .update(notifications)
        .set({ readAt: at })
        .where(
          and(eq(notifications.userId, userId), isNull(notifications.readAt)),
        )
        .returning({ id: notifications.id })
    ).length;
  }
}

function notificationBody(context: TriggerNotificationContext): string {
  const symbol = context.symbol === null ? '' : ` (${context.symbol})`;
  return `${context.alertName}${symbol} koşulu gerçekleşti. Veri zamanı: ${context.dataTime.toISOString()}. Bu bildirim yatırım tavsiyesi değildir.`;
}
