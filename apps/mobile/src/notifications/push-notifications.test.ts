import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-notifications', () => ({
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
}));

import {
  MobilePushDeviceApi,
  PushListenerRegistry,
  parsePushIntent,
} from './push-notifications';

const uuid = '81000000-0000-4000-8000-000000000001';
describe('push intent safety', () => {
  it('accepts a symbol intent', () =>
    expect(
      parsePushIntent({ target: { kind: 'symbol', id: 'THYAO' } }),
    ).toEqual({ kind: 'symbol', id: 'THYAO' }));
  it('accepts an alert intent', () =>
    expect(parsePushIntent({ target: { kind: 'alert', id: uuid } })).toEqual({
      kind: 'alert',
      id: uuid,
    }));
  it('accepts a scan result intent', () =>
    expect(
      parsePushIntent({ target: { kind: 'scan-result', id: uuid } }),
    ).toEqual({ kind: 'scan-result', id: uuid }));
  it('accepts a watchlist intent', () =>
    expect(
      parsePushIntent({ target: { kind: 'watchlist', id: uuid } }),
    ).toEqual({ kind: 'watchlist', id: uuid }));
  it('rejects arbitrary routes', () =>
    expect(
      parsePushIntent({ target: { kind: 'admin', id: uuid } }),
    ).toBeNull());
  it('rejects malformed resource identifiers', () =>
    expect(
      parsePushIntent({ target: { kind: 'alert', id: '../owner' } }),
    ).toBeNull());
  it('rejects missing targets', () => expect(parsePushIntent({})).toBeNull());
  it('rejects raw strings', () =>
    expect(parsePushIntent('atlas://admin')).toBeNull());
});
describe('push listener lifecycle', () => {
  it('prevents duplicate listeners', () => {
    const registry = new PushListenerRegistry();
    expect(registry.start(() => () => undefined)).toBe(true);
    expect(registry.start(() => () => undefined)).toBe(false);
  });
  it('cleans up and allows restart', () => {
    const remove = vi.fn();
    const registry = new PushListenerRegistry();
    registry.start(() => remove);
    registry.stop();
    expect(remove).toHaveBeenCalledOnce();
    expect(registry.start(() => () => undefined)).toBe(true);
  });
});
describe('push device API', () => {
  const request = vi.fn(() => Promise.resolve({ data: {}, meta: {} }));
  const api = new MobilePushDeviceApi({ request } as never);
  const input = {
    installationId: 'install-iphone-17-0001',
    token: 'ExponentPushToken[abcdefghijklmnopqrstuvwxyz0123456789]',
    environment: 'development' as const,
    permissionStatus: 'granted' as const,
    appVersion: '0.1.0',
    locale: 'tr-TR',
    timezone: 'Europe/Istanbul',
  };
  it('registers using the owner-scoped endpoint', async () => {
    await api.register(input);
    expect(request).toHaveBeenLastCalledWith(
      expect.objectContaining({ path: '/push-devices/register' }),
    );
  });
  it('rotates using the rotation endpoint', async () => {
    await api.rotate(input);
    expect(request).toHaveBeenLastCalledWith(
      expect.objectContaining({ path: '/push-devices/rotate' }),
    );
  });
  it('revokes an encoded installation', async () => {
    await api.revoke(input.installationId);
    expect(request).toHaveBeenLastCalledWith(
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
  it('revokes all devices during logout cleanup', async () => {
    await api.revokeAll();
    expect(request).toHaveBeenLastCalledWith(
      expect.objectContaining({ path: '/push-devices/revoke-all' }),
    );
  });
  it('rejects malformed installation IDs', () =>
    expect(() => api.revoke('../bad')).toThrow('INSTALLATION_ID_INVALID'));
});
