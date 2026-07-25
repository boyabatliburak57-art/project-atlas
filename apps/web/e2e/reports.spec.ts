import { expect, test } from '@playwright/test';

test('report center generates, explains, downloads and deletes safely by keyboard', async ({
  page,
}) => {
  const report = {
    id: '018f6ec7-0e31-7d58-9f8f-111111111111',
    reportType: 'account_security',
    sourceType: 'account_security',
    sourceId: null,
    status: 'ready',
    contentType: 'text/csv; charset=utf-8',
    byteSize: 42,
    methodology: {
      report: 'report-v1',
      freshness: 'market-freshness-v1',
    },
    sourceRevisions: { schema: 'report-v1' },
    warnings: [],
    dataCutoffAt: '2026-07-25T10:00:00.000Z',
    generatedAt: '2026-07-25T10:00:00.000Z',
    expiresAt: '2026-08-01T10:00:00.000Z',
    createdAt: '2026-07-25T10:00:00.000Z',
  };
  let items: (typeof report)[] = [];
  let generatedBody: unknown;

  await page.route('**/api/v1/reports?**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { items, nextCursor: null } }),
    });
  });
  await page.route('**/api/v1/reports', async (route) => {
    generatedBody = route.request().postDataJSON();
    items = [report];
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: report }),
    });
  });
  await page.route(`**/api/v1/reports/${report.id}/download`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          downloadUrl: `/api/v1/reports/${report.id}/download?token=signed`,
          expiresAt: '2026-07-25T10:01:00.000Z',
          filename: 'atlas-account-security.csv',
        },
      }),
    });
  });
  await page.route(
    `**/api/v1/reports/${report.id}/download?token=signed`,
    async (route) => {
      await route.fulfill({
        contentType: 'text/csv',
        headers: {
          'content-disposition':
            'attachment; filename="atlas-account-security.csv"',
        },
        body: '"safe","value"\r\n',
      });
    },
  );
  await page.route(`**/api/v1/reports/${report.id}`, async (route) => {
    items = [];
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { id: report.id, deleted: true } }),
    });
  });

  await page.goto('/reports');
  await expect(page.getByRole('heading', { name: 'Raporlar' })).toBeVisible();
  await page.getByRole('button', { name: 'Rapor oluştur' }).press('Enter');
  await expect
    .poll(() => generatedBody)
    .toEqual({
      reportType: 'account_security',
      format: 'csv',
    });
  const reportList = page.locator('.report-list');
  await expect(reportList.getByText('Hesap ve güvenlik')).toBeVisible();
  await page.getByText('Metodoloji ve uyarılar').click();
  await expect(page.getByText('market-freshness-v1')).toBeVisible();
  await expect(page.getByText('Uyarılar: Uyarı yok')).toBeVisible();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'İndir' }).click();
  expect((await download).suggestedFilename()).toBe(
    'atlas-account-security.csv',
  );

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Sil' }).click();
  await expect(reportList.getByText('Hesap ve güvenlik')).toBeHidden();
  await expect(page.getByText('Rapor silindi')).toBeVisible();
});
