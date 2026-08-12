import { describe, expect, it } from 'vitest';
import { parseMobileEnvironment } from './environment';

describe('mobile environment', () => {
  it('accepts typed configuration', () => {
    expect(
      parseMobileEnvironment(
        {
          EXPO_PUBLIC_API_BASE_URL: 'https://api.atlas.test/api/v1',
          EXPO_PUBLIC_APP_ENV: 'staging',
        },
        { release: true },
      ).EXPO_PUBLIC_APP_ENV,
    ).toBe('staging');
  });

  it('fails a release without an API URL', () => {
    expect(() => parseMobileEnvironment({}, { release: true })).toThrow(
      'EXPO_PUBLIC_API_BASE_URL',
    );
  });

  it('rejects cleartext, local and staging hosts for production', () => {
    for (const url of [
      'http://api.atlas.example/api/v1',
      'https://localhost/api/v1',
      'https://staging.atlas.example/api/v1',
    ]) {
      expect(() =>
        parseMobileEnvironment(
          { EXPO_PUBLIC_API_BASE_URL: url, EXPO_PUBLIC_APP_ENV: 'production' },
          { release: true },
        ),
      ).toThrow('production transport');
    }
  });
});
