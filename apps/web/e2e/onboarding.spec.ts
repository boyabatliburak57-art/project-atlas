import { expect, test } from '@playwright/test';

test('onboarding resumes, skips, completes and remains keyboard accessible', async ({
  page,
}) => {
  let version = 1;
  let lastPatch: Record<string, unknown> | undefined;
  const preference = () => ({
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
    version,
  });
  await page.route('**/api/v1/me/preferences', async (route) => {
    if (route.request().method() === 'PATCH') {
      lastPatch = route.request().postDataJSON() as Record<string, unknown>;
      version += 1;
    }
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: preference() }),
    });
  });
  await page.route('**/api/v1/me/onboarding/complete', async (route) => {
    version += 1;
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          ...preference(),
          onboardingState: {
            ...preference().onboardingState,
            status: 'completed',
          },
        },
      }),
    });
  });
  await page.route('**/api/v1/me/onboarding/reset', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: preference() }),
    }),
  );

  await page.goto('/onboarding');
  await expect(
    page.getByRole('heading', {
      name: 'Atlas’ı çalışma biçiminize göre ayarlayın.',
    }),
  ).toBeVisible();
  await expect(page.getByText('yatırım tavsiyesi vermez')).toBeVisible();
  await page.getByRole('button', { name: 'Devam et' }).click();
  await expect.poll(() => lastPatch).toMatchObject({ expectedVersion: 1 });
  await page.getByRole('button', { name: 'Şimdilik atla' }).click();
  await page.getByRole('button', { name: 'Kurulumu tamamla' }).click();
  await expect(page.getByRole('status')).toHaveText('Onboarding tamamlandı.');
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();
});
