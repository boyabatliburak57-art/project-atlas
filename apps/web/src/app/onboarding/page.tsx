import type { Metadata } from 'next';

import { OnboardingWorkspace } from '@/features/preferences/onboarding-workspace';

export const metadata: Metadata = {
  title: 'Başlangıç kurulumu · Project Atlas',
};

export default function OnboardingPage() {
  return <OnboardingWorkspace />;
}
