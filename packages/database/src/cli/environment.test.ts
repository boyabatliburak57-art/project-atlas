import { describe, expect, it } from 'vitest';

import { requireDatabaseUrl } from './environment';

describe('requireDatabaseUrl', () => {
  it('fails fast when the connection string is missing', () => {
    expect(() => requireDatabaseUrl({})).toThrow('DATABASE_URL is required');
  });
});
