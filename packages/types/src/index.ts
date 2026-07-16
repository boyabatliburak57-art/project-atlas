export const ATLAS_QUEUE_NAMES = {
  alerts: 'atlas.alerts.v1',
  notifications: 'atlas.notifications.v1',
  deadLetter: 'atlas.system.dead-letter.v1',
  marketData: 'atlas.market-data.v1',
  scanner: 'atlas.scanner.v1',
  system: 'atlas.system.v1',
} as const;

export const ATLAS_JOB_NAMES = {
  alertEvaluate: 'alerts.evaluate.v1',
  notificationDeliver: 'notifications.deliver.v1',
  barIngestion: 'market-data.bar-ingestion.v1',
  deadLetter: 'system.dead-letter.v1',
  heartbeat: 'system.heartbeat.v1',
  instrumentSync: 'market-data.instrument-sync.v1',
  scannerRun: 'scanner.run.v1',
} as const;

export interface ScannerRunQueuePayload {
  readonly runId: string;
  readonly correlationId: string;
}

export interface MarketDataAlertEvent {
  readonly type: 'market_data_updated';
  readonly eventId: string;
  readonly instrumentId: string;
  readonly timeframe: string;
  readonly barOpenTime: string;
  readonly dataCutoffAt: string;
  readonly isClosed: boolean;
}

export interface ScanCompletedAlertEvent {
  readonly type: 'scan_completed';
  readonly eventId: string;
  readonly scanRunId: string;
  readonly dataCutoffAt: string;
}

export type AlertEvaluationQueuePayload =
  | MarketDataAlertEvent
  | ScanCompletedAlertEvent;

export interface NotificationDeliveryQueuePayload {
  readonly outboxId: number;
  readonly attempt: number;
}
