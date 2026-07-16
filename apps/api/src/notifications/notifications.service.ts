import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { z } from 'zod';

import type {
  NotificationListQueryDto,
  UpdateNotificationPreferencesDto,
} from './notifications.dto';
import {
  NOTIFICATION_CENTER_STORE,
  type NotificationCenterStore,
  type NotificationPreferenceView,
  type NotificationView,
} from './notifications.ports';

const typeSchema = z.enum([
  'alertTriggered',
  'alertDeliveryFailed',
  'dataStaleWarning',
  'scanCompleted',
  'systemAnnouncement',
  'security',
]);
const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().min(1).max(1024).optional(),
  type: typeSchema.optional(),
  unread: z.enum(['true', 'false']).optional(),
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
});
const cursorSchema = z.object({ occurredAt: z.iso.datetime(), id: z.uuid() });
const preferencesSchema = z
  .object({
    timezone: z.string().trim().min(1).max(64),
    locale: z
      .string()
      .trim()
      .regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/)
      .max(16),
    emailAlertsEnabled: z.boolean(),
    dailyDigestEnabled: z.boolean(),
    scanCompletionEnabled: z.boolean(),
    quietHoursEnabled: z.boolean(),
    quietHoursStartMinute: z.number().int().min(0).max(1439).nullable(),
    quietHoursEndMinute: z.number().int().min(0).max(1439).nullable(),
    throttleMinutes: z.number().int().min(0).max(1440),
  })
  .strict()
  .superRefine((value, context) => {
    const hasHours =
      value.quietHoursStartMinute !== null &&
      value.quietHoursEndMinute !== null;
    if (value.quietHoursEnabled !== hasHours) {
      context.addIssue({
        code: 'custom',
        path: ['quietHoursEnabled'],
        message: 'quiet hours are inconsistent',
      });
    }
    if (hasHours && value.quietHoursStartMinute === value.quietHoursEndMinute) {
      context.addIssue({
        code: 'custom',
        path: ['quietHoursEndMinute'],
        message: 'quiet hours must span time',
      });
    }
    if (!validTimezone(value.timezone)) {
      context.addIssue({
        code: 'custom',
        path: ['timezone'],
        message: 'timezone must be IANA',
      });
    }
  });

const defaultPreferences = (userId: string): NotificationPreferenceView => ({
  userId,
  timezone: 'UTC',
  locale: 'tr-TR',
  emailAlertsEnabled: true,
  dailyDigestEnabled: false,
  scanCompletionEnabled: true,
  quietHoursEnabled: false,
  quietHoursStartMinute: null,
  quietHoursEndMinute: null,
  throttleMinutes: 0,
});

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(NOTIFICATION_CENTER_STORE)
    private readonly store: NotificationCenterStore,
  ) {}

  async list(userId: string, query: NotificationListQueryDto) {
    const parsed = parse(listSchema, query);
    if (
      parsed.from !== undefined &&
      parsed.to !== undefined &&
      parsed.from > parsed.to
    )
      invalid('from');
    const rawCursor =
      parsed.cursor === undefined ? undefined : parseCursor(parsed.cursor);
    const rows = await this.store.list({
      userId,
      limit: parsed.limit + 1,
      now: new Date(),
      ...(rawCursor === undefined
        ? {}
        : {
            cursor: {
              occurredAt: new Date(rawCursor.occurredAt),
              id: rawCursor.id,
            },
          }),
      ...(parsed.type === undefined ? {} : { type: parsed.type }),
      ...(parsed.unread === undefined
        ? {}
        : { unread: parsed.unread === 'true' }),
      ...(parsed.from === undefined ? {} : { from: new Date(parsed.from) }),
      ...(parsed.to === undefined ? {} : { to: new Date(parsed.to) }),
    });
    const items = rows.slice(0, parsed.limit);
    const last = items.at(-1);
    return {
      items: items.map(toDto),
      nextCursor:
        rows.length > parsed.limit && last !== undefined
          ? encodeCursor({
              occurredAt: last.occurredAt.toISOString(),
              id: last.id,
            })
          : null,
    };
  }

  async unreadCount(userId: string) {
    return { unreadCount: await this.store.countUnread(userId, new Date()) };
  }

  async read(userId: string, rawId: string) {
    await this.owned(userId, id(rawId));
    const value = await this.store.markRead(userId, rawId, new Date());
    if (value === null) return toDto(await this.owned(userId, rawId));
    return toDto(value);
  }

  async unread(userId: string, rawId: string) {
    await this.owned(userId, id(rawId));
    const value = await this.store.markUnread(userId, rawId);
    if (value === null) return toDto(await this.owned(userId, rawId));
    return toDto(value);
  }

  async markAllRead(userId: string) {
    return { updatedCount: await this.store.markAllRead(userId, new Date()) };
  }

  async getPreferences(userId: string) {
    return preferenceDto(
      (await this.store.getPreferences(userId)) ?? defaultPreferences(userId),
    );
  }

  async putPreferences(userId: string, body: UpdateNotificationPreferencesDto) {
    const data = parse(preferencesSchema, body);
    return preferenceDto(
      await this.store.putPreferences({ userId, ...data }, new Date()),
    );
  }

  private async owned(
    userId: string,
    notificationId: string,
  ): Promise<NotificationView> {
    const notification = await this.store.find(notificationId);
    if (notification === null) {
      throw new NotFoundException({
        code: 'NOTIFICATION_NOT_FOUND',
        message: 'Notification was not found',
      });
    }
    if (notification.userId !== userId) {
      throw new ForbiddenException({
        code: 'NOTIFICATION_ACCESS_DENIED',
        message: 'Notification belongs to another user',
      });
    }
    return notification;
  }
}

function toDto(value: NotificationView) {
  return {
    id: value.id,
    type: value.type,
    title: value.title,
    body: value.body,
    metadata: value.metadata,
    readAt: value.readAt?.toISOString() ?? null,
    occurredAt: value.occurredAt.toISOString(),
    expiresAt: value.expiresAt?.toISOString() ?? null,
    createdAt: value.createdAt.toISOString(),
  };
}

function preferenceDto(value: NotificationPreferenceView) {
  return {
    timezone: value.timezone,
    locale: value.locale,
    emailAlertsEnabled: value.emailAlertsEnabled,
    dailyDigestEnabled: value.dailyDigestEnabled,
    scanCompletionEnabled: value.scanCompletionEnabled,
    quietHoursEnabled: value.quietHoursEnabled,
    quietHoursStartMinute: value.quietHoursStartMinute,
    quietHoursEndMinute: value.quietHoursEndMinute,
    throttleMinutes: value.throttleMinutes,
  };
}

function validTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

function id(value: string): string {
  const result = z.uuid().safeParse(value);
  if (!result.success) invalid('id');
  return result.data;
}

function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success)
    invalid(result.error.issues[0]?.path.join('.') ?? 'request');
  return result.data;
}

function invalid(field: string): never {
  throw new BadRequestException({
    code: 'NOTIFICATION_PREFERENCE_INVALID',
    message: 'Notification request is invalid',
    details: { field },
  });
}

function encodeCursor(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function parseCursor(raw: string) {
  try {
    return parse(
      cursorSchema,
      JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')),
    );
  } catch {
    invalid('cursor');
  }
}
