export interface NotificationView {
  readonly id: string;
  readonly userId: string;
  readonly type: string;
  readonly title: string;
  readonly body: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly readAt: Date | null;
  readonly occurredAt: Date;
  readonly expiresAt: Date | null;
  readonly createdAt: Date;
}

export interface NotificationPreferenceView {
  readonly userId: string;
  readonly timezone: string;
  readonly locale: string;
  readonly emailAlertsEnabled: boolean;
  readonly dailyDigestEnabled: boolean;
  readonly scanCompletionEnabled: boolean;
  readonly quietHoursEnabled: boolean;
  readonly quietHoursStartMinute: number | null;
  readonly quietHoursEndMinute: number | null;
  readonly throttleMinutes: number;
}

export interface NotificationCenterStore {
  list(input: {
    userId: string;
    limit: number;
    cursor?: { occurredAt: Date; id: string };
    type?: string;
    unread?: boolean;
    from?: Date;
    to?: Date;
    now: Date;
  }): Promise<readonly NotificationView[]>;
  find(id: string): Promise<NotificationView | null>;
  countUnread(userId: string, now: Date): Promise<number>;
  markRead(
    userId: string,
    id: string,
    at: Date,
  ): Promise<NotificationView | null>;
  markUnread(userId: string, id: string): Promise<NotificationView | null>;
  markAllRead(userId: string, at: Date): Promise<number>;
  getPreferences(userId: string): Promise<NotificationPreferenceView | null>;
  putPreferences(
    preferences: NotificationPreferenceView,
    now: Date,
  ): Promise<NotificationPreferenceView>;
}

export const NOTIFICATION_CENTER_STORE = Symbol('NOTIFICATION_CENTER_STORE');
