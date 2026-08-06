import type { AuthState } from '../features/auth/auth-session';

export type GuardDestination =
  | '/(auth)'
  | '/(auth)/account-locked'
  | '/(auth)/session-expired'
  | '/(auth)/verification'
  | '/(onboarding)'
  | '/(tabs)'
  | '/modal/admin';

export function resolveGuard(input: {
  readonly auth: AuthState;
  readonly onboardingComplete: boolean;
  readonly requestedAdmin: boolean;
}): GuardDestination {
  if (input.auth.status === 'locked') return '/(auth)/account-locked';
  if (input.auth.status === 'reauthenticationRequired')
    return '/(auth)/session-expired';
  if (input.auth.status === 'verificationRequired')
    return '/(auth)/verification';
  if (input.auth.status !== 'authenticated') return '/(auth)';
  if (!input.onboardingComplete) return '/(onboarding)';
  if (input.requestedAdmin && input.auth.session.roles.includes('admin'))
    return '/modal/admin';
  return '/(tabs)';
}
