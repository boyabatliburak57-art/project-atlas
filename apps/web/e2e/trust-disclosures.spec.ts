import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('critical trust, methodology and legal-review disclosures are visible', async ({
  page,
}) => {
  await page.goto('/trust');

  await expect(
    page.getByRole('heading', {
      name: 'Sonuçların ne söylediğini ve ne söylemediğini görün.',
    }),
  ).toBeVisible();
  await expect(page.getByText(/yatırım tavsiyesi/u).first()).toBeVisible();
  await expect(page.getByText('Legal review required').first()).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Tazelik ve hesaplanabilirlik' }),
  ).toBeVisible();
  for (const state of ['Tam', 'Kısmi', 'Gecikmiş', 'Hesaplanamadı']) {
    await expect(
      page.locator('.trust-state-list dt').getByText(state, { exact: true }),
    ).toBeVisible();
  }
  await expect(
    page.getByRole('heading', { name: 'İndikatörler ve formasyonlar' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Değerleme ve risk' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Backtest ve deneyler' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Raporlar' })).toBeVisible();
  await expect(page.getByText(/Look-ahead/u)).toBeVisible();
  await expect(page.getByText(/ham sağlayıcı payload/u)).toBeVisible();

  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);
});

test('global disclosure is keyboard reachable from a product flow', async ({
  page,
}) => {
  await page.goto('/market');
  const trustLink = page.getByRole('link', {
    name: 'Güven, metodoloji ve açıklamalar',
  });
  await trustLink.scrollIntoViewIfNeeded();
  await expect(trustLink).toBeVisible();
  await trustLink.focus();
  await expect(trustLink).toBeFocused();
  await trustLink.press('Enter');
  await expect(page).toHaveURL(/\/trust$/u);
});
