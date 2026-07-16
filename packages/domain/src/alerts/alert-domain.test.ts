import { describe, expect, it } from 'vitest';

import {
  AlertDomainError,
  applyRepeatPolicy,
  assertExpectedAlertRevision,
  compareMatchSets,
  createAlertRevision,
  createEvaluationIdentityKey,
  createInitialAlertState,
  createNextAlertRevision,
  createTriggerDeduplicationKey,
  transitionAlert,
  type Alert,
  type AlertEvaluationInput,
  type AlertRevision,
  type AlertState,
} from './index.js';

const alertId = '00000000-0000-4000-8000-000000001501';
const userId = '00000000-0000-4000-8000-000000001502';
const instrumentA = '00000000-0000-4000-8000-000000001503';
const instrumentB = '00000000-0000-4000-8000-000000001504';
const instrumentC = '00000000-0000-4000-8000-000000001505';
const initialTime = new Date('2026-07-15T08:00:00.000Z');

function revision(): AlertRevision {
  return createAlertRevision({
    alertId,
    source: { type: 'instrument_indicator', instrumentId: instrumentA },
    triggerPolicy: 'thresholdCrossed',
    repeatPolicy: 'afterReset',
    timeframe: '1d',
    evaluationMode: 'closed_bar',
    sourceConfiguration: { indicator: { code: 'RSI', period: 14 } },
    channels: ['in_app'],
    createdBy: userId,
    createdAt: initialTime,
  });
}

function state(alertRevision = 1): AlertState {
  return createInitialAlertState({
    alertId,
    alertRevision,
    now: initialTime,
  });
}

function evaluation(
  overrides: Partial<AlertEvaluationInput> = {},
): AlertEvaluationInput {
  return {
    alertId,
    alertRevision: 1,
    sourceEventId: 'bar:2026-07-15',
    dataCutoffAt: new Date('2026-07-15T15:10:00.000Z'),
    status: 'matched',
    evaluatedAt: new Date('2026-07-15T15:10:01.000Z'),
    evaluationWindow: '1d:2026-07-15T00:00:00.000Z',
    ...overrides,
  };
}

describe('alert revision', () => {
  it('creates immutable source/configuration and appends a new revision', () => {
    const first = revision();
    const second = createNextAlertRevision(first, {
      repeatPolicy: 'oncePerClosedBar',
      channels: ['email', 'in_app', 'email'],
      createdBy: userId,
      createdAt: new Date('2026-07-15T09:00:00.000Z'),
    });

    expect(first.revision).toBe(1);
    expect(first.repeatPolicy).toBe('afterReset');
    expect(second).toMatchObject({
      revision: 2,
      repeatPolicy: 'oncePerClosedBar',
      channels: ['email', 'in_app'],
    });
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.source)).toBe(true);
    expect(Object.isFrozen(first.sourceConfiguration)).toBe(true);
    expect(Object.isFrozen(first.sourceConfiguration.indicator as object)).toBe(
      true,
    );
  });

  it('detects a stale expected revision', () => {
    expect(() => assertExpectedAlertRevision(2, 1)).toThrowError(
      expect.objectContaining<Partial<AlertDomainError>>({
        code: 'ALERT_REVISION_CONFLICT',
      }),
    );
  });

  it('validates source references and positive source revisions', () => {
    expect(() =>
      createAlertRevision({
        ...revision(),
        revision: 2,
        source: {
          type: 'saved_scan',
          savedScanId: 'scan',
          savedScanRevision: 0,
        },
      }),
    ).toThrowError(
      expect.objectContaining<Partial<AlertDomainError>>({
        code: 'ALERT_INVALID',
      }),
    );
  });
});

describe('alert lifecycle', () => {
  const alert: Alert = {
    id: alertId,
    ownerUserId: userId,
    name: 'RSI reset',
    status: 'active',
    currentRevision: 1,
    createdAt: initialTime,
    updatedAt: initialTime,
    deletedAt: null,
  };

  it('supports pause, resume, invalidation and terminal soft delete', () => {
    const paused = transitionAlert(
      alert,
      'paused',
      new Date('2026-07-15T09:00:00Z'),
    );
    const active = transitionAlert(
      paused,
      'active',
      new Date('2026-07-15T10:00:00Z'),
    );
    const invalid = transitionAlert(
      active,
      'invalid',
      new Date('2026-07-15T11:00:00Z'),
    );
    const deleted = transitionAlert(
      invalid,
      'deleted',
      new Date('2026-07-15T12:00:00Z'),
    );

    expect(paused.status).toBe('paused');
    expect(active.status).toBe('active');
    expect(invalid.status).toBe('invalid');
    expect(deleted.deletedAt?.toISOString()).toBe('2026-07-15T12:00:00.000Z');
    expect(() =>
      transitionAlert(deleted, 'active', new Date('2026-07-15T13:00:00Z')),
    ).toThrowError(
      expect.objectContaining<Partial<AlertDomainError>>({
        code: 'ALERT_INVALID_TRANSITION',
      }),
    );
  });
});

describe('repeat policy state reducer', () => {
  it('fires once and remains consumed after a reset', () => {
    const first = applyRepeatPolicy('once', state(), evaluation());
    const reset = applyRepeatPolicy(
      'once',
      first.nextState,
      evaluation({
        sourceEventId: 'bar:2026-07-16-reset',
        status: 'not_matched',
        dataCutoffAt: new Date('2026-07-16T15:10:00Z'),
      }),
    );
    const second = applyRepeatPolicy(
      'once',
      reset.nextState,
      evaluation({
        sourceEventId: 'bar:2026-07-17',
        dataCutoffAt: new Date('2026-07-17T15:10:00Z'),
      }),
    );

    expect(first.shouldTrigger).toBe(true);
    expect(second.shouldTrigger).toBe(false);
  });

  it('fires at most once for each closed-bar window', () => {
    const first = applyRepeatPolicy('oncePerClosedBar', state(), evaluation());
    const sameBar = applyRepeatPolicy(
      'oncePerClosedBar',
      first.nextState,
      evaluation({ sourceEventId: 'bar:2026-07-15-replay' }),
    );
    const nextBar = applyRepeatPolicy(
      'oncePerClosedBar',
      sameBar.nextState,
      evaluation({
        sourceEventId: 'bar:2026-07-16',
        evaluationWindow: '1d:2026-07-16T00:00:00.000Z',
        dataCutoffAt: new Date('2026-07-16T15:10:00Z'),
      }),
    );

    expect([
      first.shouldTrigger,
      sameBar.shouldTrigger,
      nextBar.shouldTrigger,
    ]).toEqual([true, false, true]);
  });

  it('fires once per UTC day', () => {
    const first = applyRepeatPolicy('oncePerDay', state(), evaluation());
    const sameDay = applyRepeatPolicy(
      'oncePerDay',
      first.nextState,
      evaluation({
        sourceEventId: 'intraday:2',
        dataCutoffAt: new Date('2026-07-15T20:00:00Z'),
      }),
    );
    const nextDay = applyRepeatPolicy(
      'oncePerDay',
      sameDay.nextState,
      evaluation({
        sourceEventId: 'intraday:3',
        dataCutoffAt: new Date('2026-07-16T08:00:00Z'),
      }),
    );

    expect([
      first.shouldTrigger,
      sameDay.shouldTrigger,
      nextDay.shouldTrigger,
    ]).toEqual([true, false, true]);
  });

  it('implements afterReset as armed, disarmed and rearmed states', () => {
    const first = applyRepeatPolicy('afterReset', state(), evaluation());
    const held = applyRepeatPolicy(
      'afterReset',
      first.nextState,
      evaluation({ sourceEventId: 'bar:held' }),
    );
    const notEvaluable = applyRepeatPolicy(
      'afterReset',
      held.nextState,
      evaluation({ sourceEventId: 'bar:missing', status: 'not_evaluable' }),
    );
    const reset = applyRepeatPolicy(
      'afterReset',
      notEvaluable.nextState,
      evaluation({ sourceEventId: 'bar:reset', status: 'not_matched' }),
    );
    const matchedAgain = applyRepeatPolicy(
      'afterReset',
      reset.nextState,
      evaluation({ sourceEventId: 'bar:matched-again' }),
    );

    expect(first.shouldTrigger).toBe(true);
    expect(first.nextState.armed).toBe(false);
    expect(held.shouldTrigger).toBe(false);
    expect(notEvaluable.nextState.armed).toBe(false);
    expect(reset.nextState.armed).toBe(true);
    expect(matchedAgain.shouldTrigger).toBe(true);
  });

  it('returns only newly entered instruments for everyNewMatch', () => {
    const first = applyRepeatPolicy(
      'everyNewMatch',
      state(),
      evaluation({ matchedInstrumentIds: [instrumentB, instrumentA] }),
    );
    const second = applyRepeatPolicy(
      'everyNewMatch',
      first.nextState,
      evaluation({
        sourceEventId: 'scan-run:2',
        matchedInstrumentIds: [instrumentB, instrumentC],
      }),
    );

    expect(first.triggerInstrumentIds).toEqual([instrumentA, instrumentB]);
    expect(second.triggerInstrumentIds).toEqual([instrumentC]);
    expect(second.nextState.stateData.matchedInstrumentIds).toEqual([
      instrumentB,
      instrumentC,
    ]);
  });

  it('deduplicates the same source event and cutoff before state changes', () => {
    const first = applyRepeatPolicy('afterReset', state(), evaluation());
    const duplicate = applyRepeatPolicy(
      'afterReset',
      first.nextState,
      evaluation(),
    );

    expect(duplicate).toMatchObject({
      shouldTrigger: false,
      duplicate: true,
    });
    expect(duplicate.nextState).toBe(first.nextState);
  });

  it('leaves state untouched for a failed evaluation so it can be retried', () => {
    const current = state();
    const failed = applyRepeatPolicy(
      'afterReset',
      current,
      evaluation({ status: 'failed' }),
    );
    const retried = applyRepeatPolicy(
      'afterReset',
      failed.nextState,
      evaluation(),
    );

    expect(failed.nextState).toBe(current);
    expect(failed.duplicate).toBe(false);
    expect(retried.shouldTrigger).toBe(true);
  });

  it('does not share repeat state across revisions', () => {
    const consumed = applyRepeatPolicy('once', state(1), evaluation());
    const revised = applyRepeatPolicy(
      'once',
      state(2),
      evaluation({ alertRevision: 2 }),
    );

    expect(consumed.shouldTrigger).toBe(true);
    expect(revised.shouldTrigger).toBe(true);
  });
});

describe('evaluation and trigger identity', () => {
  it('creates the same identity and dedup key for a replay', () => {
    const value = evaluation();
    expect(createEvaluationIdentityKey(value)).toBe(
      createEvaluationIdentityKey({
        ...value,
        dataCutoffAt: new Date(value.dataCutoffAt),
      }),
    );
    expect(
      createTriggerDeduplicationKey({ ...value, triggerType: 'anyMatch' }),
    ).toBe(
      createTriggerDeduplicationKey({
        ...value,
        dataCutoffAt: new Date(value.dataCutoffAt),
        triggerType: 'anyMatch',
      }),
    );
  });

  it('changes trigger deduplication when the revision or instrument changes', () => {
    const value = evaluation();
    const original = createTriggerDeduplicationKey({
      ...value,
      triggerType: 'newMatch',
      instrumentId: instrumentA,
    });
    const revised = createTriggerDeduplicationKey({
      ...value,
      alertRevision: 2,
      triggerType: 'newMatch',
      instrumentId: instrumentA,
    });
    const otherInstrument = createTriggerDeduplicationKey({
      ...value,
      triggerType: 'newMatch',
      instrumentId: instrumentB,
    });

    expect(new Set([original, revised, otherInstrument])).toHaveLength(3);
    expect(original.length).toBeLessThanOrEqual(255);
  });
});

describe('newMatch set comparison', () => {
  it('returns deterministic entered, exited and unchanged sets', () => {
    expect(
      compareMatchSets(
        [instrumentB, instrumentA],
        [instrumentC, instrumentB, instrumentB],
      ),
    ).toEqual({
      entered: [instrumentC],
      exited: [instrumentA],
      unchanged: [instrumentB],
    });
  });
});
