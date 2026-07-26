import { expect, test, type Page, type Route } from '@playwright/test';

const document = {
  content:
    'Bu teknik test metni yatırım tavsiyesi değildir ve yayımlanmış sürüm görünürlüğünü doğrular.',
  contentHash: 'a'.repeat(64),
  documentType: 'investmentRiskDisclosure',
  effectiveAt: '2026-07-26T00:00:00.000Z',
  id: '00000000-0000-4000-8000-000000009711',
  locale: 'tr-TR',
  materialChange: true,
  title: 'Yatırım Riski Açıklaması',
  version: 2,
};

test.beforeEach(async ({ page }) => {
  await mockLegalApi(page);
});

test('settings exposes versioned legal documents, consent and critical disclosure', async ({
  page,
}) => {
  await page.goto('/legal');
  await expect(
    page.getByRole('heading', {
      name: 'Geçerli belge sürümlerini ve verdiğiniz onayları inceleyin.',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Yatırım Riski Açıklaması' }),
  ).toBeVisible();
  await expect(page.getByText('Sürüm 2 · tr-TR')).toBeVisible();
  await expect(page.getByText(/yatırım tavsiyesi değildir/u)).toBeVisible();
  await page.getByRole('button', { name: 'Okudum ve onaylıyorum' }).click();
  await expect(page.getByRole('status')).toHaveText(
    'Onay geçmişi güncellendi.',
  );
  await expect(
    page.getByRole('link', { name: 'Güven, metodoloji ve açıklamalar' }),
  ).toBeVisible();
});

test('onboarding disclosure is keyboard reachable and requests re-consent', async ({
  page,
}) => {
  await page.route('**/api/v1/me/preferences', (route) =>
    envelope(route, {
      accessibility: { reducedMotion: false },
      createdAt: '2026-07-26T00:00:00Z',
      currency: 'TRY',
      dateFormat: 'dd.MM.yyyy',
      defaultBenchmark: 'XU100',
      defaultChartAdjustment: 'adjusted',
      defaultMarket: 'BIST',
      defaultTimeframe: '1d',
      display: {
        compactTable: false,
        methodologyDetailLevel: 'standard',
      },
      locale: 'tr-TR',
      notificationChannels: ['in_app', 'email'],
      numberFormat: 'tr-TR',
      onboardingState: {
        completedAt: null,
        completedSteps: [],
        currentStep: 'disclosure',
        demoDataRequested: false,
        status: 'not_started',
      },
      quietHours: { enabled: false, endMinute: null, startMinute: null },
      timezone: 'Europe/Istanbul',
      updatedAt: '2026-07-26T00:00:00Z',
      userId: '00000000-0000-4000-8000-000000009712',
      version: 1,
    }),
  );
  await page.route('**/api/v1/me/consents?locale=tr-TR', (route) =>
    envelope(route, {
      history: [],
      reconsentRequired: [
        {
          documentId: document.id,
          documentType: document.documentType,
          locale: document.locale,
          version: document.version,
        },
      ],
    }),
  );
  await page.goto('/onboarding');
  await expect(page.getByText('Atlas yatırım tavsiyesi vermez')).toBeVisible();
  const consent = page.getByRole('button', { name: 'Yeni sürümü onayla' });
  await expect(consent).toBeVisible();
  await consent.focus();
  await expect(consent).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toBeVisible();
});

async function mockLegalApi(page: Page) {
  await page.route('**/api/v1/legal/documents?locale=tr-TR', (route) =>
    envelope(route, [document]),
  );
  await page.route('**/api/v1/me/consents?locale=tr-TR', (route) =>
    envelope(route, { history: [], reconsentRequired: [] }),
  );
  await page.route('**/api/v1/legal/consents', (route) =>
    envelope(route, {
      documentId: document.id,
      documentVersion: document.version,
      locale: document.locale,
      source: 'settings',
    }),
  );
}

function envelope(route: Route, data: unknown) {
  return route.fulfill({
    body: JSON.stringify({ data, meta: { requestId: 'legal-e2e' } }),
    contentType: 'application/json',
    status: 200,
  });
}
