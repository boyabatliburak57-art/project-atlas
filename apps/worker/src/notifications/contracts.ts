export interface NotificationPreference {
  readonly userId: string;
  readonly timezone: string;
  readonly locale: string;
  readonly emailAlertsEnabled: boolean;
  readonly quietHoursEnabled: boolean;
  readonly quietHoursStartMinute: number | null;
  readonly quietHoursEndMinute: number | null;
  readonly throttleMinutes: number;
}

export interface TriggerNotificationContext {
  readonly triggerId: string;
  readonly alertId: string;
  readonly alertRevision: number;
  readonly alertName: string;
  readonly userId: string;
  readonly instrumentId: string | null;
  readonly symbol: string | null;
  readonly triggerType: string;
  readonly channels: readonly string[];
  readonly dataTime: Date;
  readonly occurredAt: Date;
}

export interface NotificationPreferenceResolver {
  resolve(userId: string): Promise<NotificationPreference>;
}

export interface NotificationWriteResult {
  readonly notificationId: string;
  readonly outboxItems: readonly {
    readonly outboxId: number;
    readonly attempt: number;
    readonly availableAt: Date;
  }[];
  readonly duplicate: boolean;
}

export interface NotificationStore {
  loadTriggerContext(
    triggerId: string,
  ): Promise<TriggerNotificationContext | null>;
  writeTriggerNotification(input: {
    readonly context: TriggerNotificationContext;
    readonly preference: NotificationPreference;
    readonly emailAvailableAt: Date;
    readonly now: Date;
  }): Promise<NotificationWriteResult>;
  listUnprocessedTriggerIds(limit: number): Promise<readonly string[]>;
  listPendingOutbox(limit: number): Promise<
    readonly {
      readonly outboxId: number;
      readonly attempt: number;
      readonly availableAt: Date;
    }[]
  >;
  recoverStaleOutbox(input: {
    readonly staleBefore: Date;
    readonly now: Date;
  }): Promise<number>;
  claimOutbox(input: {
    readonly outboxId: number;
    readonly workerId: string;
    readonly now: Date;
  }): Promise<EmailDeliveryWork | null>;
  markDelivered(input: {
    readonly outboxId: number;
    readonly deliveryId: string;
    readonly now: Date;
  }): Promise<void>;
  markRetry(input: {
    readonly outboxId: number;
    readonly deliveryId: string;
    readonly errorCode: string;
    readonly availableAt: Date;
    readonly now: Date;
  }): Promise<{ readonly exhausted: boolean; readonly nextAttempt: number }>;
  markFailed(input: {
    readonly outboxId: number;
    readonly deliveryId: string;
    readonly errorCode: string;
    readonly now: Date;
  }): Promise<void>;
  countUnread(userId: string): Promise<number>;
  markRead(userId: string, notificationId: string, at: Date): Promise<boolean>;
  markUnread(
    userId: string,
    notificationId: string,
    at: Date,
  ): Promise<boolean>;
  markAllRead(userId: string, at: Date): Promise<number>;
}

export interface EmailDeliveryWork {
  readonly outboxId: number;
  readonly deliveryId: string;
  readonly notificationId: string;
  readonly userId: string;
  readonly idempotencyKey: string;
  readonly templateCode: string;
  readonly templateVersion: number;
  readonly locale: string;
  readonly attempt: number;
  readonly title: string;
  readonly body: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface EmailRecipientResolver {
  resolve(userId: string): Promise<string | null>;
}

export interface EmailSendRequest {
  readonly recipient: string;
  readonly idempotencyKey: string;
  readonly templateCode: string;
  readonly templateVersion: number;
  readonly locale: string;
  readonly variables: Readonly<Record<string, string>>;
}

export interface EmailSendResult {
  readonly messageId: string;
}

export interface EmailAdapter {
  send(request: EmailSendRequest): Promise<EmailSendResult>;
}
