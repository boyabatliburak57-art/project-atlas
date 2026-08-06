import { describe, expect, it } from 'vitest';
import { ONBOARDING_STEPS } from '@atlas/domain/preferences';
import {
  completeStep,
  resetOnboarding,
  skipOptionalStep,
  startOnboarding,
} from './onboarding-model';

describe('server-compatible onboarding model', () => {
  it('starts resumable progress', () =>
    expect(startOnboarding().state.status).toBe('in_progress'));
  it('preserves expected version', () =>
    expect(completeStep(startOnboarding(7), 'disclosure').version).toBe(7));
  it('advances in domain order', () =>
    expect(
      completeStep(startOnboarding(), 'disclosure').state.currentStep,
    ).toBe('marketLocaleTimezone'));
  it('deduplicates completed steps', () => {
    const once = completeStep(startOnboarding(), 'disclosure');
    expect(completeStep(once, 'disclosure').state.completedSteps).toEqual([
      'disclosure',
    ]);
  });
  it('supports optional skip', () =>
    expect(
      skipOptionalStep(startOnboarding(), 'benchmark').state.completedSteps,
    ).toContain('benchmark'));
  it('does not skip legal disclosure', () =>
    expect(() => skipOptionalStep(startOnboarding(), 'disclosure')).toThrow(
      'ONBOARDING_STEP_REQUIRED',
    ));
  it('does not skip summary', () =>
    expect(() => skipOptionalStep(startOnboarding(), 'summary')).toThrow(
      'ONBOARDING_STEP_REQUIRED',
    ));
  it('records demo preference', () =>
    expect(
      completeStep(startOnboarding(), 'demoData', { demoDataRequested: true })
        .state.demoDataRequested,
    ).toBe(true));
  it('resets to authoritative initial state', () =>
    expect(resetOnboarding(3)).toMatchObject({
      version: 3,
      state: { status: 'not_started' },
    }));
  it('uses the shared domain step contract', () =>
    expect(ONBOARDING_STEPS).toHaveLength(8));
});
