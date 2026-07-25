import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function mockReadApis(page: Page) {
  await page.route('**/api/v1/reports?**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { items: [], nextCursor: null } }),
    }),
  );
  await page.route('**/api/v1/activity?**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { items: [], nextCursor: null } }),
    }),
  );
}

for (const path of ['/reports', '/activity']) {
  test(`${path} has no WCAG A/AA axe violations`, async ({ page }) => {
    await mockReadApis(page);
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(result.violations).toEqual([]);
  });
}

test('keyboard focus enters, remains in, and returns from command dialog', async ({
  page,
}) => {
  await mockReadApis(page);
  await page.goto('/activity');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Ana içeriğe geç' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();

  const trigger = page.getByRole('button', { name: /Ara/u });
  await trigger.focus();
  await trigger.press('Enter');
  const dialog = page.getByRole('dialog', {
    name: 'Global arama ve komutlar',
  });
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel('Sayfa, sembol veya kayıt ara')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Kapat' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Sayfa, sembol veya kayıt ara')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

for (const viewport of [
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`${viewport.name} navigation remains reachable without page overflow`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await mockReadApis(page);
    await page.goto('/activity');
    await expect(
      page.getByRole('navigation', { name: 'Ana navigasyon' }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect(page.getByRole('button', { name: /Ara/u })).toBeVisible();
  });
}
