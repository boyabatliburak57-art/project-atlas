import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('support creation, data issue, ownership-safe timeline and account lifecycle are accessible', async ({
  page,
}) => {
  const items: Array<Record<string, unknown>> = [];
  await page.route('**/api/v1/support/requests', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      const created = {
        ...body,
        id: '00000000-0000-4000-8000-000000000999',
        referenceCode: 'SUP-ABCDEF123456',
        status: 'open',
        timeline: [
          {
            id: 'event-1',
            kind: 'created',
            message: 'Talep oluşturuldu.',
          },
        ],
        version: 1,
      };
      items.push(created);
      await route.fulfill({
        contentType: 'application/json',
        json: { data: created },
        status: 201,
      });
      return;
    }
    await route.fulfill({
      contentType: 'application/json',
      json: { data: { items } },
    });
  });

  await page.goto('/support');
  await page.getByLabel('Talep türü').selectOption('dataIssue');
  await page.getByLabel('Konu').fill('THYAO fiyat verisi');
  await page
    .getByLabel('Açıklama')
    .fill('Günlük fiyat serisinde beklenmeyen değer var.');
  await page.getByLabel('Sembol').fill('THYAO');
  await page.getByLabel('Zaman aralığı').fill('1d');
  await page.getByLabel('Başlangıç').fill('2026-07-01');
  await page.getByLabel('Bitiş').fill('2026-07-25');
  await page.getByLabel('Beklenen').fill('120,50 kapanış');
  await page.getByLabel('Gözlenen').fill('0 kapanış');
  await page.getByRole('button', { name: 'Talep oluştur' }).click();

  await expect(page.getByText('SUP-ABCDEF123456')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Hesap yaşam döngüsü' }),
  ).toBeVisible();
  await expect(page.getByText(/grace period içinde iptal/iu)).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Veri export’u iste' }),
  ).toHaveAttribute('href', '/reports');
  await page.keyboard.press('Tab');
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test('admin queue presents safe denial and internal-only metadata copy', async ({
  page,
}) => {
  await page.route('**/api/v1/admin/support/requests', (route) =>
    route.fulfill({
      contentType: 'application/json',
      json: {
        data: {
          items: [
            {
              id: 'request-1',
              referenceCode: 'SUP-QUEUE000001',
              status: 'investigating',
              subject: 'Veri kontrolü',
              type: 'dataIssue',
            },
          ],
        },
      },
    }),
  );
  await page.goto('/admin/support');
  await expect(page.getByText('SUP-QUEUE000001')).toBeVisible();
  await expect(page.getByText(/SLA metadata yalnız admin/iu)).toBeVisible();
});
