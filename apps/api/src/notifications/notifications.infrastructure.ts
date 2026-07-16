import { notificationPreferences, notifications } from '@atlas/database';
import { Injectable } from '@nestjs/common';
import {
  and,
  count,
  desc,
  eq,
  gt,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
} from 'drizzle-orm';

import { ApiDatabase } from '../scanner/scanner-runtime.infrastructure';
import type { NotificationCenterStore } from './notifications.ports';

@Injectable()
export class PostgresNotificationCenterStore implements NotificationCenterStore {
  constructor(private readonly connection: ApiDatabase) {}

  list(input: Parameters<NotificationCenterStore['list']>[0]) {
    const cursor =
      input.cursor === undefined
        ? undefined
        : or(
            lt(notifications.occurredAt, input.cursor.occurredAt),
            and(
              eq(notifications.occurredAt, input.cursor.occurredAt),
              lt(notifications.id, input.cursor.id),
            ),
          );
    return this.connection.database
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, input.userId),
          or(
            isNull(notifications.expiresAt),
            gt(notifications.expiresAt, input.now),
          ),
          input.type === undefined
            ? undefined
            : eq(notifications.type, input.type),
          input.unread === undefined
            ? undefined
            : input.unread
              ? isNull(notifications.readAt)
              : isNotNull(notifications.readAt),
          input.from === undefined
            ? undefined
            : gt(notifications.occurredAt, input.from),
          input.to === undefined
            ? undefined
            : lte(notifications.occurredAt, input.to),
          cursor,
        ),
      )
      .orderBy(desc(notifications.occurredAt), desc(notifications.id))
      .limit(input.limit);
  }

  async find(id: string) {
    return (
      (
        await this.connection.database
          .select()
          .from(notifications)
          .where(eq(notifications.id, id))
          .limit(1)
      )[0] ?? null
    );
  }

  async countUnread(userId: string, now: Date) {
    const row = (
      await this.connection.database
        .select({ value: count() })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            isNull(notifications.readAt),
            or(
              isNull(notifications.expiresAt),
              gt(notifications.expiresAt, now),
            ),
          ),
        )
    )[0];
    return row?.value ?? 0;
  }

  async markRead(userId: string, id: string, at: Date) {
    return (
      (
        await this.connection.database
          .update(notifications)
          .set({ readAt: at })
          .where(
            and(
              eq(notifications.id, id),
              eq(notifications.userId, userId),
              isNull(notifications.readAt),
            ),
          )
          .returning()
      )[0] ?? null
    );
  }

  async markUnread(userId: string, id: string) {
    return (
      (
        await this.connection.database
          .update(notifications)
          .set({ readAt: null })
          .where(
            and(
              eq(notifications.id, id),
              eq(notifications.userId, userId),
              isNotNull(notifications.readAt),
            ),
          )
          .returning()
      )[0] ?? null
    );
  }

  async markAllRead(userId: string, at: Date) {
    const rows = await this.connection.database
      .update(notifications)
      .set({ readAt: at })
      .where(
        and(eq(notifications.userId, userId), isNull(notifications.readAt)),
      )
      .returning({ id: notifications.id });
    return rows.length;
  }

  async getPreferences(userId: string) {
    return (
      (
        await this.connection.database
          .select()
          .from(notificationPreferences)
          .where(eq(notificationPreferences.userId, userId))
          .limit(1)
      )[0] ?? null
    );
  }

  async putPreferences(
    input: Parameters<NotificationCenterStore['putPreferences']>[0],
    now: Date,
  ) {
    const row = (
      await this.connection.database
        .insert(notificationPreferences)
        .values({
          ...input,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: notificationPreferences.userId,
          set: {
            timezone: input.timezone,
            locale: input.locale,
            emailAlertsEnabled: input.emailAlertsEnabled,
            dailyDigestEnabled: input.dailyDigestEnabled,
            scanCompletionEnabled: input.scanCompletionEnabled,
            quietHoursEnabled: input.quietHoursEnabled,
            quietHoursStartMinute: input.quietHoursStartMinute,
            quietHoursEndMinute: input.quietHoursEndMinute,
            throttleMinutes: input.throttleMinutes,
            updatedAt: now,
          },
        })
        .returning()
    )[0];
    if (row === undefined)
      throw new Error('Notification preference upsert invariant failed');
    return row;
  }
}
