export type AlertSourceType =
  | 'saved_scan'
  | 'preset_scan'
  | 'instrument_price'
  | 'instrument_percent_change'
  | 'instrument_indicator'
  | 'watchlist_saved_scan';

export type AlertSource =
  | {
      readonly type: 'saved_scan';
      readonly savedScanId: string;
      readonly savedScanRevision: number;
    }
  | {
      readonly type: 'preset_scan';
      readonly presetScanId: string;
      readonly presetScanRevision: number;
    }
  | {
      readonly type:
        | 'instrument_price'
        | 'instrument_percent_change'
        | 'instrument_indicator';
      readonly instrumentId: string;
    }
  | {
      readonly type: 'watchlist_saved_scan';
      readonly watchlistId: string;
      readonly savedScanId: string;
      readonly savedScanRevision: number;
    };

export type AlertStatus = 'active' | 'paused' | 'invalid' | 'deleted';
export type AlertTriggerPolicy =
  | 'anyMatch'
  | 'newMatch'
  | 'symbolEntered'
  | 'symbolExited'
  | 'thresholdCrossed';
export type AlertRepeatPolicy =
  | 'once'
  | 'oncePerClosedBar'
  | 'oncePerDay'
  | 'afterReset'
  | 'everyNewMatch';
export type AlertEvaluationMode = 'closed_bar' | 'intrabar';
export type AlertChannel = 'in_app' | 'email';
export type AlertEvaluationStatus =
  | 'matched'
  | 'not_matched'
  | 'not_evaluable'
  | 'failed';
export type AlertMatchState =
  | 'unknown'
  | 'matched'
  | 'not_matched'
  | 'not_evaluable';

export interface Alert {
  readonly id: string;
  readonly ownerUserId: string;
  readonly name: string;
  readonly status: AlertStatus;
  readonly currentRevision: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
}

export interface AlertRevision {
  readonly alertId: string;
  readonly revision: number;
  readonly source: AlertSource;
  readonly triggerPolicy: AlertTriggerPolicy;
  readonly repeatPolicy: AlertRepeatPolicy;
  readonly timeframe: string | null;
  readonly evaluationMode: AlertEvaluationMode;
  readonly sourceConfiguration: Readonly<Record<string, unknown>>;
  readonly channels: readonly AlertChannel[];
  readonly createdBy: string;
  readonly createdAt: Date;
}

export interface NewAlertRevision extends Omit<AlertRevision, 'revision'> {
  readonly revision?: number;
}

export interface ReviseAlertInput {
  readonly source?: AlertSource;
  readonly triggerPolicy?: AlertTriggerPolicy;
  readonly repeatPolicy?: AlertRepeatPolicy;
  readonly timeframe?: string | null;
  readonly evaluationMode?: AlertEvaluationMode;
  readonly sourceConfiguration?: Readonly<Record<string, unknown>>;
  readonly channels?: readonly AlertChannel[];
  readonly createdBy: string;
  readonly createdAt: Date;
}

export interface AlertEvaluationIdentity {
  readonly alertId: string;
  readonly alertRevision: number;
  readonly sourceEventId: string;
  readonly dataCutoffAt: Date;
}

export interface AlertTriggerIdentity extends AlertEvaluationIdentity {
  readonly triggerType: AlertTriggerPolicy;
  readonly instrumentId?: string | undefined;
  readonly timeframe?: string | null | undefined;
  readonly evaluationWindow?: string | null | undefined;
}

export interface AlertStateData {
  readonly lastTriggeredWindow?: string | undefined;
  readonly lastTriggeredDay?: string | undefined;
  readonly matchedInstrumentIds?: readonly string[] | undefined;
}

export interface AlertState {
  readonly alertId: string;
  readonly alertRevision: number;
  readonly stateKey: string;
  readonly matchState: AlertMatchState;
  readonly armed: boolean;
  readonly stateData: AlertStateData;
  readonly lastSourceEventId: string | null;
  readonly lastDataCutoffAt: Date | null;
  readonly lastTriggeredAt: Date | null;
  readonly updatedAt: Date;
}

export interface AlertEvaluationInput extends AlertEvaluationIdentity {
  readonly status: AlertEvaluationStatus;
  readonly evaluatedAt: Date;
  readonly evaluationWindow?: string | null | undefined;
  readonly matchedInstrumentIds?: readonly string[] | undefined;
}

export interface RepeatPolicyDecision {
  readonly shouldTrigger: boolean;
  readonly duplicate: boolean;
  readonly triggerInstrumentIds: readonly string[];
  readonly nextState: AlertState;
}

export interface MatchSetComparison {
  readonly entered: readonly string[];
  readonly exited: readonly string[];
  readonly unchanged: readonly string[];
}
