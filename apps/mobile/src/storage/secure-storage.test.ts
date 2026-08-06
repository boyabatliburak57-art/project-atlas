import { describe, expect, it } from 'vitest';
import { AUTH_SESSION_KEY, InMemorySecureStorage } from './secure-storage';

describe('secure storage', () => {
  it('sets, gets, removes and clears auth deterministically', async () => {
    const storage = new InMemorySecureStorage();
    await storage.setItem(AUTH_SESSION_KEY, 'secret');
    expect(await storage.getItem(AUTH_SESSION_KEY)).toBe('secret');
    await storage.clearAuth();
    expect(await storage.getItem(AUTH_SESSION_KEY)).toBeNull();
  });

  it('fails safely without a plaintext fallback', async () => {
    const storage = new InMemorySecureStorage(true);
    await expect(storage.setItem(AUTH_SESSION_KEY, 'secret')).rejects.toThrow(
      'SECURE_STORAGE_UNAVAILABLE',
    );
  });
});
