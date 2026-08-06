import {
  ONBOARDING_STEPS,
  defaultOnboardingState,
  normalizeOnboardingState,
  type OnboardingState,
  type OnboardingStep,
} from '@atlas/domain/preferences';

export interface OnboardingDraft {
  readonly state: OnboardingState;
  readonly version: number;
}

export function startOnboarding(version = 1): OnboardingDraft {
  return {
    state: { ...defaultOnboardingState(), status: 'in_progress' },
    version,
  };
}

export function completeStep(
  draft: OnboardingDraft,
  step: OnboardingStep,
  options: { readonly demoDataRequested?: boolean } = {},
): OnboardingDraft {
  const completedSteps = ONBOARDING_STEPS.filter(
    (candidate) =>
      draft.state.completedSteps.includes(candidate) || candidate === step,
  );
  const index = ONBOARDING_STEPS.indexOf(step);
  const currentStep =
    ONBOARDING_STEPS[Math.min(index + 1, ONBOARDING_STEPS.length - 1)]!;
  return {
    version: draft.version,
    state: normalizeOnboardingState({
      ...draft.state,
      completedSteps,
      currentStep,
      demoDataRequested:
        options.demoDataRequested ?? draft.state.demoDataRequested,
      status: 'in_progress',
    }),
  };
}

export function skipOptionalStep(
  draft: OnboardingDraft,
  step: OnboardingStep,
): OnboardingDraft {
  if (step === 'disclosure' || step === 'summary')
    throw new Error('ONBOARDING_STEP_REQUIRED');
  return completeStep(draft, step);
}

export function resetOnboarding(version: number): OnboardingDraft {
  return { state: defaultOnboardingState(), version };
}
