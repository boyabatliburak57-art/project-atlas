import { expect, test } from '@playwright/test';

test('global navigation, command palette and activity remain ownership-safe and accessible', async ({
  page,
}) => {
  await page.route('**/api/v1/search?**', async (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get('q')).toBe('THYAO');
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          items: [
            {
              id: 'instrument-1',
              type: 'instrument',
              title: '<img src=x onerror=alert(1)> THYAO',
              subtitle: 'Türk Hava Yolları',
              href: '/symbols/THYAO',
              highlight: [
                { text: '<img src=x onerror=alert(1)> ', matched: false },
                { text: 'THYAO', matched: true },
              ],
            },
          ],
          nextCursor: null,
        },
      }),
    });
  });
  await page.route('**/api/v1/activity?**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          items: [
            {
              id: 'activity-1',
              eventType: 'scan.completed',
              sourceType: 'scan',
              sourceId: '018f6ec7-0e31-7d58-9f8f-111111111111',
              status: 'completed',
              occurredAt: '2026-07-25T08:00:00.000Z',
              summary: 'Momentum taraması tamamlandı',
              metadata: { resultCount: 12 },
            },
          ],
          nextCursor: null,
        },
      }),
    });
  });

  await page.goto('/market');
  const navigation = page.getByRole('navigation', { name: 'Ana navigasyon' });
  await expect(navigation.getByRole('link', { name: 'Scanner' })).toBeVisible();
  await expect(
    navigation.getByRole('link', { name: 'Activity' }),
  ).toBeVisible();

  await page.keyboard.press('Control+K');
  const dialog = page.getByRole('dialog', {
    name: 'Global arama ve komutlar',
  });
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel('Sayfa, sembol veya kayıt ara')).toBeFocused();
  await page.getByLabel('Sayfa, sembol veya kayıt ara').fill('THYAO');
  await expect(page.getByRole('option')).toContainText('THYAO');
  expect(await page.locator('img[src="x"]').count()).toBe(0);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  await navigation.getByRole('link', { name: 'Activity' }).click();
  await expect(page).toHaveURL(/\/activity$/u);
  await expect(
    page.getByRole('heading', { name: 'Son etkinlikler' }),
  ).toBeVisible();
  await expect(page.getByText('Momentum taraması tamamlandı')).toBeVisible();

  await page.goto('/activity');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Ana içeriğe geç' }),
  ).toBeFocused();
});
