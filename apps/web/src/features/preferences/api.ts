'use client';

import { publicEnvironment } from '@/config/env';

export interface UserPreferences {
  readonly locale: 'tr-TR' | 'en-US';
  readonly timezone: string;
  readonly dateFormat: string;
  readonly numberFormat: 'tr-TR' | 'en-US';
  readonly currency: string;
  readonly defaultMarket: 'BIST';
  readonly defaultBenchmark: string;
  readonly defaultChartAdjustment: 'adjusted' | 'unadjusted';
  readonly defaultTimeframe: '1d' | '1w' | '1mo';
  readonly notificationChannels: readonly ('in_app' | 'email')[];
  readonly quietHours: {
    readonly enabled: boolean;
    readonly startMinute: number | null;
    readonly endMinute: number | null;
  };
  readonly accessibility: { readonly reducedMotion: boolean };
  readonly display: {
    readonly compactTable: boolean;
    readonly methodologyDetailLevel: 'summary' | 'standard' | 'detailed';
  };
  readonly onboardingState: OnboardingState;
  readonly version: number;
}
export interface OnboardingState {
  readonly status: 'not_started' | 'in_progress' | 'skipped' | 'completed';
  readonly currentStep: string;
  readonly completedSteps: readonly string[];
  readonly demoDataRequested: boolean;
  readonly completedAt: string | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(
    `${publicEnvironment.NEXT_PUBLIC_API_URL}${path}`,
    {
      ...init,
      headers: { 'content-type': 'application/json', ...init?.headers },
    },
  );
  const body = (await response.json()) as {
    data?: T;
    error?: { code?: string };
  };
  if (!response.ok)
    throw new Error(body.error?.code ?? `HTTP_${response.status}`);
  return body.data as T;
}

export const preferencesApi = {
  get: () => request<UserPreferences>('/me/preferences'),
  patch: (input: Record<string, unknown>) =>
    request<UserPreferences>('/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  complete: (expectedVersion: number, demoDataRequested: boolean) =>
    request<UserPreferences>('/me/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify({ expectedVersion, demoDataRequested }),
    }),
  reset: (expectedVersion: number) =>
    request<UserPreferences>('/me/onboarding/reset', {
      method: 'POST',
      body: JSON.stringify({ expectedVersion }),
    }),
};
