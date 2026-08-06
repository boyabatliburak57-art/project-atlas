import { describe, expect, it, vi } from 'vitest';
import { AuthSessionController } from './auth-session';
import { InMemorySecureStorage } from '../../storage/secure-storage';

describe('AuthSessionController', () => {
  it('restores a valid session', async () => {
    const storage = new InMemorySecureStorage();
    const controller = new AuthSessionController(storage, () =>
      Promise.resolve(),
    );
    await controller.establish({
      expiresAt: '2099-01-01T00:00:00.000Z',
      roles: ['user'],
      token: 'secret',
      userId: 'user-1',
    });
    expect((await controller.restore()).status).toBe('authenticated');
  });

  it('clears storage and private query cache on logout', async () => {
    const clear = vi.fn(() => Promise.resolve());
    const storage = new InMemorySecureStorage();
    const controller = new AuthSessionController(storage, clear);
    await controller.establish({
      expiresAt: '2099-01-01T00:00:00.000Z',
      roles: [],
      token: 'secret',
      userId: 'user-1',
    });
    await controller.logout();
    expect(await controller.getToken()).toBeNull();
    expect(clear).toHaveBeenCalledOnce();
  });

  it('publishes expiration on unauthorized', async () => {
    const controller = new AuthSessionController(
      new InMemorySecureStorage(),
      () => Promise.resolve(),
    );
    await controller.onUnauthorized({
      status: 401,
      code: 'AUTHENTICATION_REQUIRED',
      safeMessage: 'Authentication required',
      fieldErrors: {},
      retryable: false,
    });
    expect(controller.snapshot().status).toBe('reauthenticationRequired');
  });

  it('fails closed when secure storage is unavailable', async () => {
    const clear = vi.fn(() => Promise.resolve());
    const controller = new AuthSessionController(
      new InMemorySecureStorage(true),
      clear,
    );
    expect((await controller.restore()).status).toBe('unavailable');
    expect(clear).toHaveBeenCalledOnce();
  });

  it('serializes parallel restore requests', async () => {
    const storage = new InMemorySecureStorage();
    const controller = new AuthSessionController(storage, () =>
      Promise.resolve(),
    );
    const [first, second] = await Promise.all([
      controller.restore(),
      controller.restore(),
    ]);
    expect(first.status).toBe('unauthenticated');
    expect(second.status).toBe('unauthenticated');
  });

  it('cleans device state during logout', async () => {
    const cleanup = vi.fn(() => Promise.resolve());
    const controller = new AuthSessionController(
      new InMemorySecureStorage(),
      () => Promise.resolve(),
      cleanup,
    );
    await controller.logout();
    expect(cleanup).toHaveBeenCalledOnce();
  });
});
