import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';

const demoResources = [
  'watchlist',
  'savedScan',
  'portfolio',
  'alert',
  'strategy',
  'backtestResult',
].map((resourceType, index) => ({
  disclaimer:
    'DEMO — Bu örnek yatırım tavsiyesi veya gerçek kullanıcı verisi değildir.',
  id: `00000000-0000-4000-8000-${String(9_810 + index).padStart(12, '0')}`,
  isDemo: true,
  label: `DEMO · ${resourceType}`,
  ownerUserId: '00000000-0000-4000-8000-000000009809',
  payload: {},
  resourceType,
}));

test('help search, categories, article metadata and related navigation work', async ({
  page,
}) => {
  await mockDemo(page, []);
  await page.goto('/help');
  await expect(
    page.getByRole('heading', {
      name: 'Ürünü, veriyi ve sonuçların sınırlarını anlayın.',
    }),
  ).toBeVisible();
  await page.getByLabel('Yardım merkezinde ara').fill('XIRR');
  await expect(page.getByRole('status')).toContainText('2 makale');
  await page.getByRole('link', { name: 'Finans ve veri sözlüğü' }).click();
  await expect(page).toHaveURL(/\/help\/glossary$/u);
  await expect(page.getByText(/XIRR:/u)).toBeVisible();
  await expect(page.getByText(/tr-TR · help-v1/u)).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'İlgili makaleler' }),
  ).toBeVisible();
});

test('help is keyboard accessible and has no WCAG A/AA violations', async ({
  page,
}) => {
  await mockDemo(page, []);
  await page.goto('/help');
  const search = page.getByLabel('Yardım merkezinde ara');
  await search.focus();
  await expect(search).toBeFocused();
  await search.fill('scanner');
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);
});

test('demo creation, disclaimer and reset actions remain explicit', async ({
  page,
}) => {
  let resources: typeof demoResources | [] = [];
  await page.route('**/api/v1/me/demo', async (route) => {
    if (route.request().method() === 'POST') resources = demoResources;
    if (route.request().method() === 'DELETE') {
      const removed = resources.length;
      resources = [];
      return envelope(route, { removed });
    }
    return envelope(route, resources);
  });
  await page.goto('/help');
  await page.getByRole('button', { name: 'Demo kaynakları oluştur' }).click();
  await expect(
    page.getByRole('list', { name: 'Hesabıma ait demo kaynakları' }),
  ).toContainText('DEMO · backtestResult');
  await expect(page.getByText(/yatırım tavsiyesi/u).first()).toBeVisible();
  await page
    .getByRole('button', { name: 'Yalnız demo kaynaklarını sıfırla' })
    .click();
  await expect(
    page.getByRole('list', { name: 'Hesabıma ait demo kaynakları' }),
  ).toBeEmpty();
});

test('global command search and portfolio empty state link to contextual help', async ({
  page,
}) => {
  await page.route('**/api/v1/navigation/search?**', (route) =>
    envelope(route, { items: [] }),
  );
  await page.route('**/api/v1/portfolios**', (route) =>
    envelope(route, { items: [] }),
  );
  await page.goto('/portfolios');
  await expect(page.getByText(/güvenli DEMO örneğini/u)).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Portföy rehberini aç' }),
  ).toHaveAttribute('href', '/help/portfoy-risk');
  await page.keyboard.press('Control+k');
  const command = page.getByLabel('Sayfa, sembol veya kayıt ara');
  await command.fill('data cutoff');
  await expect(
    page.getByRole('option').filter({ hasText: 'Veri tazeliği ve metodoloji' }),
  ).toBeVisible();
});

async function mockDemo(page: Page, resources: typeof demoResources | []) {
  await page.route('**/api/v1/me/demo', (route) => envelope(route, resources));
}

function envelope(route: Route, data: unknown) {
  return route.fulfill({
    body: JSON.stringify({ data, meta: { requestId: 'help-demo-e2e' } }),
    contentType: 'application/json',
    status: 200,
  });
}
