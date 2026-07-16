import type {
  AlertEvaluationInput,
  AlertMatchState,
  AlertRepeatPolicy,
  AlertState,
  RepeatPolicyDecision,
} from './contracts.js';
import { AlertDomainError } from './errors.js';
import { compareMatchSets } from './match-set.js';

export function createInitialAlertState(input: {
  readonly alertId: string;
  readonly alertRevision: number;
  readonly stateKey?: string | undefined;
  readonly now: Date;
}): AlertState {
  if (
    input.alertId.trim().length === 0 ||
    !Number.isInteger(input.alertRevision) ||
    input.alertRevision < 1 ||
    (input.stateKey !== undefined && input.stateKey.trim().length === 0) ||
    Number.isNaN(input.now.getTime())
  ) {
    throw new AlertDomainError('ALERT_INVALID', { field: 'alertState' });
  }
  return freezeState({
    alertId: input.alertId,
    alertRevision: input.alertRevision,
    stateKey: input.stateKey ?? 'default',
    matchState: 'unknown',
    armed: true,
    stateData: {},
    lastSourceEventId: null,
    lastDataCutoffAt: null,
    lastTriggeredAt: null,
    updatedAt: input.now,
  });
}

export function applyRepeatPolicy(
  repeatPolicy: AlertRepeatPolicy,
  state: AlertState,
  evaluation: AlertEvaluationInput,
): RepeatPolicyDecision {
  assertCompatible(state, evaluation);
  if (sameEvent(state, evaluation)) {
    return Object.freeze({
      shouldTrigger: false,
      duplicate: true,
      triggerInstrumentIds: Object.freeze([]),
      nextState: state,
    });
  }

  if (evaluation.status === 'failed') {
    return Object.freeze({
      shouldTrigger: false,
      duplicate: false,
      triggerInstrumentIds: Object.freeze([]),
      nextState: state,
    });
  }
  if (evaluation.status === 'not_evaluable') {
    return decision(false, [], state, evaluation, 'not_evaluable', state.armed);
  }
  if (evaluation.status === 'not_matched') {
    return decision(
      false,
      [],
      state,
      evaluation,
      'not_matched',
      repeatPolicy === 'afterReset' ? true : state.armed,
      repeatPolicy === 'everyNewMatch' ? { matchedInstrumentIds: [] } : {},
    );
  }

  if (repeatPolicy === 'everyNewMatch') {
    const current = evaluation.matchedInstrumentIds ?? [];
    const comparison = compareMatchSets(
      state.stateData.matchedInstrumentIds ?? [],
      current,
    );
    return decision(
      comparison.entered.length > 0,
      comparison.entered,
      state,
      evaluation,
      current.length === 0 ? 'not_matched' : 'matched',
      state.armed,
      { matchedInstrumentIds: [...new Set(current)].sort() },
    );
  }

  const shouldTrigger = shouldTriggerMatch(repeatPolicy, state, evaluation);
  return decision(
    shouldTrigger,
    shouldTrigger && evaluation.matchedInstrumentIds !== undefined
      ? [...new Set(evaluation.matchedInstrumentIds)].sort()
      : [],
    state,
    evaluation,
    'matched',
    repeatPolicy === 'afterReset' && shouldTrigger ? false : state.armed,
    triggerWindowData(repeatPolicy, evaluation, shouldTrigger),
  );
}

function shouldTriggerMatch(
  repeatPolicy: Exclude<AlertRepeatPolicy, 'everyNewMatch'>,
  state: AlertState,
  evaluation: AlertEvaluationInput,
): boolean {
  if (repeatPolicy === 'once') return state.lastTriggeredAt === null;
  if (repeatPolicy === 'afterReset') return state.armed;
  if (repeatPolicy === 'oncePerClosedBar') {
    const window = requiredWindow(evaluation);
    return state.stateData.lastTriggeredWindow !== window;
  }
  const day = evaluation.dataCutoffAt.toISOString().slice(0, 10);
  return state.stateData.lastTriggeredDay !== day;
}

function triggerWindowData(
  repeatPolicy: AlertRepeatPolicy,
  evaluation: AlertEvaluationInput,
  triggered: boolean,
): Partial<AlertState['stateData']> {
  if (!triggered) return {};
  if (repeatPolicy === 'oncePerClosedBar') {
    return { lastTriggeredWindow: requiredWindow(evaluation) };
  }
  if (repeatPolicy === 'oncePerDay') {
    return {
      lastTriggeredDay: evaluation.dataCutoffAt.toISOString().slice(0, 10),
    };
  }
  return {};
}

function decision(
  shouldTrigger: boolean,
  triggerInstrumentIds: readonly string[],
  state: AlertState,
  evaluation: AlertEvaluationInput,
  matchState: AlertMatchState,
  armed: boolean,
  stateDataPatch: Partial<AlertState['stateData']> = {},
): RepeatPolicyDecision {
  const nextState = freezeState({
    ...state,
    matchState,
    armed,
    stateData: { ...state.stateData, ...stateDataPatch },
    lastSourceEventId: evaluation.sourceEventId,
    lastDataCutoffAt: evaluation.dataCutoffAt,
    lastTriggeredAt: shouldTrigger
      ? evaluation.evaluatedAt
      : state.lastTriggeredAt,
    updatedAt: evaluation.evaluatedAt,
  });
  return Object.freeze({
    shouldTrigger,
    duplicate: false,
    triggerInstrumentIds: Object.freeze([...triggerInstrumentIds]),
    nextState,
  });
}

function sameEvent(
  state: AlertState,
  evaluation: AlertEvaluationInput,
): boolean {
  return (
    state.lastSourceEventId === evaluation.sourceEventId &&
    state.lastDataCutoffAt?.getTime() === evaluation.dataCutoffAt.getTime()
  );
}

function assertCompatible(
  state: AlertState,
  evaluation: AlertEvaluationInput,
): void {
  if (
    state.alertId !== evaluation.alertId ||
    state.alertRevision !== evaluation.alertRevision
  ) {
    throw new AlertDomainError('ALERT_INVALID', {
      field: 'evaluationStateIdentity',
    });
  }
  if (
    evaluation.sourceEventId.trim().length === 0 ||
    Number.isNaN(evaluation.dataCutoffAt.getTime()) ||
    Number.isNaN(evaluation.evaluatedAt.getTime())
  ) {
    throw new AlertDomainError('ALERT_INVALID', { field: 'evaluation' });
  }
}

function requiredWindow(evaluation: AlertEvaluationInput): string {
  const window = evaluation.evaluationWindow?.trim();
  if (window === undefined || window.length === 0) {
    throw new AlertDomainError('ALERT_INVALID', {
      field: 'evaluationWindow',
    });
  }
  return window;
}

function freezeState(state: AlertState): AlertState {
  return Object.freeze({
    ...state,
    stateData: Object.freeze({
      ...state.stateData,
      ...(state.stateData.matchedInstrumentIds === undefined
        ? {}
        : {
            matchedInstrumentIds: Object.freeze([
              ...state.stateData.matchedInstrumentIds,
            ]),
          }),
    }),
    lastDataCutoffAt:
      state.lastDataCutoffAt === null ? null : new Date(state.lastDataCutoffAt),
    lastTriggeredAt:
      state.lastTriggeredAt === null ? null : new Date(state.lastTriggeredAt),
    updatedAt: new Date(state.updatedAt),
  });
}
