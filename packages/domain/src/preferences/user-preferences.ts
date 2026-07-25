export const ONBOARDING_STEPS = [
  'disclosure',
  'marketLocaleTimezone',
  'benchmark',
  'watchlist',
  'scannerPreset',
  'notifications',
  'demoData',
  'summary',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
export type OnboardingStatus =
  | 'not_started'
  | 'in_progress'
  | 'skipped'
  | 'completed';

export interface OnboardingState {
  readonly status: OnboardingStatus;
  readonly currentStep: OnboardingStep;
  readonly completedSteps: readonly OnboardingStep[];
  readonly demoDataRequested: boolean;
  readonly completedAt: string | null;
}

export function defaultOnboardingState(): OnboardingState {
  return {
    status: 'not_started',
    currentStep: 'disclosure',
    completedSteps: [],
    demoDataRequested: false,
    completedAt: null,
  };
}

export function normalizeOnboardingState(
  state: OnboardingState,
): OnboardingState {
  const completedSteps = ONBOARDING_STEPS.filter((step) =>
    state.completedSteps.includes(step),
  );
  if (!ONBOARDING_STEPS.includes(state.currentStep))
    throw new Error('ONBOARDING_STEP_INVALID');
  if (
    state.status === 'completed' &&
    completedSteps.length !== ONBOARDING_STEPS.length
  )
    throw new Error('ONBOARDING_INCOMPLETE');
  return { ...state, completedSteps };
}
