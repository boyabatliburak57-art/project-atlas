import { expect, test } from '@playwright/test';

const flag = {
  description: 'Stop creation of new scanner runs',
  expiresAt: null,
  flagType: 'kill_switch',
  id: '00000000-0000-4000-8000-000000007701',
  key: 'scanner.new-runs.disabled',
  owner: 'scanner-runtime',
};

test('operations admin sees platform state and submits an audited kill switch command', async ({
  page,
}) => {
  let command: Record<string, unknown> | undefined;
  await page.route('**/api/v1/admin/operations/overview', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          audit: [{ action: 'release.create' }],
          backup: { status: 'healthy' },
          incidents: [],
          queues: [
            {
              counts: { failed: 0, waiting: 2 },
              name: 'scanner',
              paused: false,
            },
          ],
          recovery: [{ status: 'passed' }],
          releases: [{ status: 'healthy' }],
        },
      }),
    }),
  );
  await page.route('**/api/v1/admin/feature-flags', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { expired: [], items: [flag] } }),
    }),
  );
  await page.route(
    `**/api/v1/admin/feature-flags/${flag.key}/history`,
    (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            flag,
            versions: [{ enabled: false, environment: 'test', version: 1 }],
          },
        }),
      }),
  );
  await page.route(
    `**/api/v1/admin/maintenance/kill-switches/${flag.key}/enable`,
    async (route) => {
      command = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: { enabled: true, version: 2 } }),
      });
    },
  );

  await page.goto('/admin/operations');
  await expect(
    page.getByRole('heading', { name: 'Platform durumu ve güvenli müdahale.' }),
  ).toBeVisible();
  await expect(page.getByRole('table', { name: 'Queue status' })).toContainText(
    'scanner',
  );
  const switches = page.getByRole('region', {
    name: 'Feature flags ve kill switches',
  });
  await switches.getByLabel('Confirmation').fill('ENABLE_KILL_SWITCH');
  await switches.getByRole('button', { name: 'Enable' }).click();
  await expect
    .poll(() => command)
    .toMatchObject({
      confirmation: 'ENABLE_KILL_SWITCH',
      expectedVersion: 1,
      reason: 'Controlled incident mitigation',
    });
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();
});

test('queue control, percentage rollout and version conflict remain explicit', async ({
  page,
}) => {
  let queueCommand: Record<string, unknown> | undefined;
  let rolloutCommand: Record<string, unknown> | undefined;
  await page.route('**/api/v1/admin/operations/overview', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          audit: [],
          backup: { status: 'healthy' },
          dataFreshness: {},
          incidents: [{ status: 'mitigating' }],
          queues: [
            {
              counts: { failed: 1, waiting: 0 },
              name: 'scanner',
              paused: false,
            },
          ],
          recovery: [{ status: 'passed' }],
          releases: [{ status: 'healthy', version: '0.9.0-rc.1' }],
        },
      }),
    }),
  );
  await page.route('**/api/v1/admin/feature-flags', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          expired: [],
          items: [
            { ...flag, flagType: 'release', key: 'release.strategy-lab' },
          ],
        },
      }),
    }),
  );
  await page.route('**/api/v1/admin/feature-flags/*/history', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { flag, versions: [{ version: 7 }] } }),
    }),
  );
  await page.route(
    '**/api/v1/admin/operations/queues/scanner/pause',
    async (route) => {
      queueCommand = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      });
    },
  );
  await page.route(
    '**/api/v1/admin/feature-flags/*/versions',
    async (route) => {
      rolloutCommand = route.request().postDataJSON() as Record<
        string,
        unknown
      >;
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'FEATURE_FLAG_VERSION_CONFLICT' },
        }),
      });
    },
  );

  await page.goto('/admin/operations');
  await page.getByLabel('Queue confirmation').fill('PAUSE_SCANNER_QUEUE');
  await page.getByRole('button', { name: 'Pause queue' }).click();
  await expect.poll(() => queueCommand).toMatchObject({ expectedVersion: 0 });
  await page.getByLabel('Rollout percentage').fill('25');
  await page.getByRole('button', { name: /Update .* rollout/ }).click();
  await expect
    .poll(() => rolloutCommand)
    .toMatchObject({
      expectedVersion: 7,
      rolloutPercentage: 25,
    });
  await expect(
    page.getByRole('alert').filter({ hasText: 'Operational change rejected' }),
  ).toContainText('Operational change rejected');
});

test('non-admin receives a safe denied state without operational data', async ({
  page,
}) => {
  await page.route('**/api/v1/admin/**', (route) =>
    route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'ADMIN_SCOPE_REQUIRED' } }),
    }),
  );
  await page.goto('/admin/operations');
  await expect(
    page.getByRole('alert').filter({ hasText: 'Admin yetkisi gerekli' }),
  ).toContainText('Admin yetkisi gerekli');
  await expect(page.getByRole('table')).toHaveCount(0);
});

test('admin legal publishing requires explicit counsel evidence and version', async ({
  page,
}) => {
  let approval: Record<string, unknown> | undefined;
  await page.route('**/api/v1/admin/operations/overview', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          audit: [],
          incidents: [],
          queues: [],
          recovery: [],
          releases: [],
        },
      }),
    }),
  );
  await page.route('**/api/v1/admin/feature-flags', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { expired: [], items: [] } }),
    }),
  );
  await page.route('**/api/v1/admin/data-operations', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: { connections: [], corrections: [], findings: [], runs: [] },
      }),
    }),
  );
  await page.route('**/api/v1/admin/legal/documents', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            documentType: 'privacyNotice',
            id: '00000000-0000-4000-8000-000000009713',
            locale: 'tr-TR',
            rowVersion: 3,
            status: 'draft',
            title: 'Gizlilik Bildirimi',
            version: 2,
          },
        ],
      }),
    }),
  );
  await page.route(
    '**/api/v1/admin/legal/documents/*/approve',
    async (route) => {
      approval = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: { status: 'approved' } }),
      });
    },
  );
  await page.goto('/admin/operations');
  const button = page.getByRole('button', {
    name: 'Record counsel approval',
  });
  await expect(button).toBeDisabled();
  await page
    .getByLabel('Legal approval reference')
    .fill('COUNSEL-APPROVAL-2026-097');
  await page.getByLabel('Approval confirmation').fill('LEGAL_COUNSEL_APPROVED');
  await expect(button).toBeEnabled();
  await button.click();
  await expect
    .poll(() => approval)
    .toMatchObject({
      confirmation: 'LEGAL_COUNSEL_APPROVED',
      expectedVersion: 3,
      legalApprovalReference: 'COUNSEL-APPROVAL-2026-097',
    });
});

test('admin reviews data-quality findings and versioned correction operations accessibly', async ({
  page,
}) => {
  let correctionCommand: Record<string, unknown> | undefined;
  await page.route('**/api/v1/admin/operations/overview', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          audit: [],
          incidents: [],
          queues: [],
          recovery: [],
          releases: [],
        },
      }),
    }),
  );
  await page.route('**/api/v1/admin/feature-flags', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { expired: [], items: [] } }),
    }),
  );
  await page.route('**/api/v1/admin/data-operations', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          connections: [
            {
              id: 'provider-1',
              providerKey: 'sandbox',
              status: 'degraded',
              version: 2,
            },
          ],
          corrections: [
            {
              findingId: 'finding-1',
              id: 'correction-1',
              rebuildStatus: 'not_requested',
              state: 'open',
              version: 3,
            },
          ],
          findings: [
            {
              findingType: 'missingBar',
              id: 'finding-1',
              resourceKey: 'BIST:X',
              severity: 'warning',
              status: 'open',
              version: 1,
            },
          ],
          runs: [{ capability: 'ohlcv', id: 'run-1', status: 'failed' }],
        },
      }),
    }),
  );
  await page.route(
    '**/api/v1/admin/data-operations/corrections/correction-1/investigating',
    async (route) => {
      correctionCommand = route.request().postDataJSON() as Record<
        string,
        unknown
      >;
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: { id: 'correction-1', state: 'investigating', version: 4 },
        }),
      });
    },
  );

  await page.goto('/admin/operations');
  const dataOperations = page.getByRole('region', {
    name: 'Data reconciliation',
  });
  await expect(
    dataOperations.getByRole('table', { name: 'Data correction requests' }),
  ).toContainText('open');
  await dataOperations
    .getByRole('button', { name: 'Start investigation' })
    .click();
  await expect
    .poll(() => correctionCommand)
    .toMatchObject({
      expectedVersion: 3,
      reason: 'Controlled incident mitigation',
    });
  await dataOperations.getByLabel('Correction confirmation').focus();
  await expect(page.locator(':focus')).toHaveAccessibleName(
    'Correction confirmation',
  );
});
