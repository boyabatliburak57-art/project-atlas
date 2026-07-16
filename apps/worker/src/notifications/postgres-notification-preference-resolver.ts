import { notificationPreferences, type Database } from '@atlas/database';
import { eq } from 'drizzle-orm';

import type {
  NotificationPreference,
  NotificationPreferenceResolver,
} from './contracts';

export class PostgresNotificationPreferenceResolver implements NotificationPreferenceResolver {
  constructor(private readonly database: Database) {}

  async resolve(userId: string): Promise<NotificationPreference> {
    const row = (
      await this.database
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId))
        .limit(1)
    )[0];
    return row === undefined
      ? {
          userId,
          timezone: 'UTC',
          locale: 'tr-TR',
          emailAlertsEnabled: true,
          quietHoursEnabled: false,
          quietHoursStartMinute: null,
          quietHoursEndMinute: null,
          throttleMinutes: 0,
        }
      : {
          userId,
          timezone: row.timezone,
          locale: row.locale,
          emailAlertsEnabled: row.emailAlertsEnabled,
          quietHoursEnabled: row.quietHoursEnabled,
          quietHoursStartMinute: row.quietHoursStartMinute,
          quietHoursEndMinute: row.quietHoursEndMinute,
          throttleMinutes: row.throttleMinutes,
        };
  }
}
