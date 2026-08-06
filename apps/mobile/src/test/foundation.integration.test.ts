import { describe, expect, it } from 'vitest';
import { AtlasApiClient } from '@atlas/api-client';
import { AuthSessionController } from '../features/auth/auth-session';
import { FeatureFlagController } from '../features/flags/feature-flags';
import {
  createAtlasQueryClient,
  clearPrivateQueries,
} from '../query/query-client';
import { InMemorySecureStorage } from '../storage/secure-storage';

describe('mobile foundation integration', () => {
  it('restores auth, bootstraps flags and clears private state on unauthorized', async () => {
    const query = createAtlasQueryClient();
    query.setQueryData(['private', 'scope', 'portfolio'], { value: 1 });
    const auth = new AuthSessionController(new InMemorySecureStorage(), () =>
      clearPrivateQueries(query),
    );
    await auth.establish({
      expiresAt: '2099-01-01T00:00:00.000Z',
      roles: [],
      token: 'session',
      userId: 'user',
    });
    const flags = new FeatureFlagController();
    flags.bootstrap({
      mobileHome: { enabled: true, reasonCode: 'AVAILABLE', version: 1 },
    });
    const client = new AtlasApiClient({
      baseUrl: 'https://api.atlas.test/api/v1',
      context: () => ({
        appVersion: '0.1.0',
        locale: 'tr-TR',
        platform: 'ios',
        timezone: 'Europe/Istanbul',
      }),
      credentials: auth,
      fetch: () =>
        Promise.resolve(
          new Response(JSON.stringify({ code: 'AUTHENTICATION_REQUIRED' }), {
            status: 401,
          }),
        ),
    });
    await expect(
      client.request({ path: '/me/preferences' }),
    ).rejects.toMatchObject({ status: 401 });
    expect(auth.snapshot().status).toBe('reauthenticationRequired');
    expect(
      query.getQueryData(['private', 'scope', 'portfolio']),
    ).toBeUndefined();
    expect(flags.current().mobileHome.enabled).toBe(true);
  });
});
