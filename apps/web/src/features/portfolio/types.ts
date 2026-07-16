export interface WatchlistItem {
  readonly id: string;
  readonly instrumentId: string;
  readonly note: string | null;
  readonly tags: readonly string[];
  readonly sortOrder: number;
}

export interface Watchlist {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: 'active' | 'deleted';
  readonly items: readonly WatchlistItem[];
  readonly updatedAt: string;
}

export interface MarketSummaryItem {
  readonly instrumentId: string;
  readonly symbol: string;
  readonly company: string;
  readonly lastPrice: string | null;
  readonly dailyChangePercent: string | null;
  readonly dataTime: string | null;
  readonly stale: boolean;
  readonly activeAlertCount: number;
}

export interface AlertSource {
  readonly type: string;
  readonly instrumentId?: string;
  readonly savedScanId?: string;
  readonly savedScanRevision?: number;
}

export interface Alert {
  readonly id: string;
  readonly name: string;
  readonly status: 'active' | 'paused' | 'invalid' | 'deleted';
  readonly currentRevision: number;
  readonly revision: {
    readonly source: AlertSource;
    readonly triggerPolicy: string;
    readonly repeatPolicy: string;
    readonly timeframe: string | null;
    readonly sourceConfiguration: Readonly<Record<string, unknown>>;
    readonly channels: readonly string[];
  };
  readonly updatedAt: string;
}

export interface Notification {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly body: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly readAt: string | null;
  readonly occurredAt: string;
}

export interface NotificationPreferences {
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
