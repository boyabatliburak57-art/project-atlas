import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { PreferencesService } from './preferences.service';

class MemoryRepository {
  private readonly rows = new Map<string, ReturnType<typeof base>>();
  find(userId: string) {
    return Promise.resolve(this.rows.get(userId) ?? null);
  }
  create(userId: string, values: Record<string, unknown>) {
    if (this.rows.has(userId)) return Promise.resolve(null);
    const row = base(userId, values);
    this.rows.set(userId, row);
    return Promise.resolve(row);
  }
  update(
    userId: string,
    expectedVersion: number,
    values: Record<string, unknown>,
  ) {
    const current = this.rows.get(userId);
    if (current === undefined || current.version !== expectedVersion)
      return Promise.resolve(null);
    const row = { ...current, ...values, version: current.version + 1 };
    this.rows.set(userId, row);
    return Promise.resolve(row);
  }
}

describe('PreferencesService', () => {
  it('returns backend defaults and persists an ownership-scoped update', async () => {
    const service = create();
    expect((await service.get('user-a')).locale).toBe('tr-TR');
    const updated = await service.update('user-a', {
      expectedVersion: 1,
      timezone: 'UTC',
      defaultBenchmark: 'XU030',
    });
    expect(updated).toMatchObject({
      userId: 'user-a',
      timezone: 'UTC',
      defaultBenchmark: 'XU030',
      version: 2,
    });
    expect((await service.get('user-b')).timezone).toBe('Europe/Istanbul');
  });

  it('rejects stale optimistic versions', async () => {
    const service = create();
    await service.update('user-a', { expectedVersion: 1, timezone: 'UTC' });
    await expect(
      service.update('user-a', {
        expectedVersion: 1,
        timezone: 'Europe/London',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('resumes and skips onboarding without completing missing steps', async () => {
    const service = create();
    const updated = await service.update('user-a', {
      expectedVersion: 1,
      onboarding: {
        status: 'skipped',
        currentStep: 'watchlist',
        completedSteps: ['disclosure', 'marketLocaleTimezone', 'benchmark'],
        demoDataRequested: false,
        completedAt: null,
      },
    });
    expect(updated.onboardingState).toMatchObject({
      status: 'skipped',
      currentStep: 'watchlist',
    });
  });

  it('completes all eight onboarding steps and can reset', async () => {
    const service = create();
    const completed = await service.complete('user-a', {
      expectedVersion: 1,
      demoDataRequested: true,
    });
    expect(completed.onboardingState.completedSteps).toHaveLength(8);
    const reset = await service.reset('user-a', { expectedVersion: 2 });
    expect(reset.onboardingState).toMatchObject({
      status: 'not_started',
      currentStep: 'disclosure',
    });
  });

  it('rejects invalid timezone and inconsistent quiet hours', async () => {
    const service = create();
    await expect(
      service.update('user-a', {
        expectedVersion: 1,
        timezone: 'not/a-zone',
      }),
    ).rejects.toMatchObject({ response: { code: 'PREFERENCES_INVALID' } });
    await expect(
      service.update('user-a', {
        expectedVersion: 1,
        quietHours: { enabled: true, startMinute: null, endMinute: null },
      }),
    ).rejects.toMatchObject({ response: { code: 'PREFERENCES_INVALID' } });
  });
});

function create() {
  return new PreferencesService(new MemoryRepository() as never);
}
function base(userId: string, values: Record<string, unknown>) {
  return {
    userId,
    locale: 'tr-TR',
    timezone: 'Europe/Istanbul',
    dateFormat: 'dd.MM.yyyy',
    numberFormat: 'tr-TR',
    currency: 'TRY',
    defaultMarket: 'BIST',
    defaultBenchmark: 'XU100',
    defaultChartAdjustment: 'adjusted',
    defaultTimeframe: '1d',
    notificationChannels: ['in_app', 'email'],
    quietHours: { enabled: false, startMinute: null, endMinute: null },
    accessibility: { reducedMotion: false },
    display: { compactTable: false, methodologyDetailLevel: 'standard' },
    onboardingState: {
      status: 'not_started',
      currentStep: 'disclosure',
      completedSteps: [],
      demoDataRequested: false,
      completedAt: null,
    },
    version: 2,
    ...values,
  };
}
