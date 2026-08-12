import { describe, expect, it } from 'vitest';

import { assertTestOnlyEnvironment } from './mobile-release-seed';

describe('mobile release E2E seed isolation', () => {
  it('accepts only an explicit local test fixture database', () => {
    expect(() =>
      assertTestOnlyEnvironment({
        ATLAS_ENV: 'test',
        ATLAS_MOBILE_E2E_FIXTURE: '1',
        DATABASE_URL: 'postgresql://atlas:local@127.0.0.1:5432/atlas_test',
      }),
    ).not.toThrow();
  });

  it('fails closed for production, remote databases and missing opt-in', () => {
    for (const environment of [
      {
        ATLAS_ENV: 'production',
        ATLAS_MOBILE_E2E_FIXTURE: '1',
        DATABASE_URL: 'postgresql://atlas:local@127.0.0.1:5432/atlas',
      },
      {
        ATLAS_ENV: 'test',
        ATLAS_MOBILE_E2E_FIXTURE: '1',
        DATABASE_URL: 'postgresql://atlas:local@database.example:5432/atlas',
      },
      {
        ATLAS_ENV: 'test',
        DATABASE_URL: 'postgresql://atlas:local@127.0.0.1:5432/atlas',
      },
    ])
      expect(() => assertTestOnlyEnvironment(environment)).toThrow();
  });
});
