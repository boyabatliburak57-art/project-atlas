import type { AtlasApiClient, AtlasResponse } from '@atlas/api-client';
import type { OnboardingState } from '@atlas/domain/preferences';

export interface MobilePreferences {
  readonly version: number;
  readonly locale: 'tr-TR' | 'en-US';
  readonly timezone: string;
  readonly defaultMarket: 'BIST';
  readonly defaultBenchmark: string;
  readonly defaultTimeframe: '1d' | '1w' | '1mo';
  readonly notificationChannels: readonly ('in_app' | 'email')[];
  readonly onboardingState: OnboardingState;
}

export class MobilePreferencesApi {
  constructor(private readonly client: AtlasApiClient) {}

  async get(): Promise<MobilePreferences> {
    return (
      await this.client.request<AtlasResponse<MobilePreferences>>({
        path: '/me/preferences',
      })
    ).data;
  }

  async update(
    expectedVersion: number,
    changes: Readonly<Record<string, unknown>>,
  ): Promise<MobilePreferences> {
    return (
      await this.client.request<AtlasResponse<MobilePreferences>>({
        body: { ...changes, expectedVersion },
        method: 'PATCH',
        path: '/me/preferences',
      })
    ).data;
  }

  async completeOnboarding(
    expectedVersion: number,
    demoDataRequested: boolean,
  ) {
    return (
      await this.client.request<AtlasResponse<MobilePreferences>>({
        body: { demoDataRequested, expectedVersion },
        method: 'POST',
        path: '/me/onboarding/complete',
      })
    ).data;
  }

  async resetOnboarding(expectedVersion: number) {
    return (
      await this.client.request<AtlasResponse<MobilePreferences>>({
        body: { expectedVersion },
        method: 'POST',
        path: '/me/onboarding/reset',
      })
    ).data;
  }
}
