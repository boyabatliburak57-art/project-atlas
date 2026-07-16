import type { Alert, AlertRevision, AlertStatus } from '@atlas/domain';

export interface AlertView extends Alert {
  readonly revision: AlertRevision;
}

export interface AlertEvaluationView {
  readonly id: number;
  readonly alertId: string;
  readonly alertRevision: number;
  readonly sourceEventId: string;
  readonly dataCutoffAt: Date;
  readonly instrumentId: string | null;
  readonly timeframe: string | null;
  readonly evaluationWindow: string | null;
  readonly status: string;
  readonly reasonCode: string | null;
  readonly result: Readonly<Record<string, unknown>>;
  readonly durationMs: number | null;
  readonly evaluatedAt: Date;
}

export interface AlertTriggerView {
  readonly id: string;
  readonly alertId: string;
  readonly alertRevision: number;
  readonly evaluationId: number;
  readonly instrumentId: string | null;
  readonly triggerType: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly occurredAt: Date;
}

export interface AlertStore {
  listOwned(input: {
    userId: string;
    status?: AlertStatus;
    limit: number;
    cursor?: { updatedAt: Date; id: string };
  }): Promise<{ items: readonly AlertView[]; hasNext: boolean }>;
  find(id: string): Promise<AlertView | null>;
  create(input: {
    id: string;
    userId: string;
    name: string;
    revision: AlertRevision;
    now: Date;
  }): Promise<AlertView>;
  revise(input: {
    userId: string;
    id: string;
    name: string;
    expectedRevision: number;
    revision: AlertRevision;
    now: Date;
  }): Promise<AlertView | null>;
  rename(input: {
    userId: string;
    id: string;
    name: string;
    expectedRevision: number;
    now: Date;
  }): Promise<AlertView | null>;
  setStatus(input: {
    userId: string;
    id: string;
    from: readonly AlertStatus[];
    to: AlertStatus;
    now: Date;
  }): Promise<AlertView | null>;
  revisions(alertId: string): Promise<readonly AlertRevision[]>;
  evaluations(
    alertId: string,
    limit: number,
    before?: number,
  ): Promise<readonly AlertEvaluationView[]>;
  triggers(
    alertId: string,
    limit: number,
    before?: Date,
  ): Promise<readonly AlertTriggerView[]>;
  sourceAccess(
    userId: string,
    source: AlertRevision['source'],
  ): Promise<'allowed' | 'denied' | 'invalid'>;
}

export interface AlertDryRunResult {
  readonly status: 'matched' | 'not_matched' | 'not_evaluable' | 'failed';
  readonly reasonCode: string | null;
  readonly matchedInstrumentIds: readonly string[];
  readonly dataCutoffAt: Date;
}

export interface AlertDryRunEvaluator {
  evaluate(input: {
    readonly userId: string;
    readonly alert: AlertView;
    readonly dataCutoffAt: Date;
  }): Promise<AlertDryRunResult>;
}

export const ALERT_STORE = Symbol('ALERT_STORE');
export const ALERT_DRY_RUN_EVALUATOR = Symbol('ALERT_DRY_RUN_EVALUATOR');
