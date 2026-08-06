import * as SecureStore from 'expo-secure-store';

export interface SecureStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clearAuth(): Promise<void>;
}

export const AUTH_SESSION_KEY = 'atlas.auth.session.v1';

export class ExpoSecureStorage implements SecureStorage {
  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      throw new Error('SECURE_STORAGE_UNAVAILABLE');
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch {
      throw new Error('SECURE_STORAGE_UNAVAILABLE');
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      throw new Error('SECURE_STORAGE_UNAVAILABLE');
    }
  }

  clearAuth(): Promise<void> {
    return this.removeItem(AUTH_SESSION_KEY);
  }
}

export class InMemorySecureStorage implements SecureStorage {
  private readonly values = new Map<string, string>();
  constructor(private readonly fail = false) {}

  getItem(key: string): Promise<string | null> {
    if (this.fail)
      return Promise.reject(new Error('SECURE_STORAGE_UNAVAILABLE'));
    return Promise.resolve(this.values.get(key) ?? null);
  }

  setItem(key: string, value: string): Promise<void> {
    if (this.fail)
      return Promise.reject(new Error('SECURE_STORAGE_UNAVAILABLE'));
    this.values.set(key, value);
    return Promise.resolve();
  }

  removeItem(key: string): Promise<void> {
    if (this.fail)
      return Promise.reject(new Error('SECURE_STORAGE_UNAVAILABLE'));
    this.values.delete(key);
    return Promise.resolve();
  }

  clearAuth(): Promise<void> {
    return this.removeItem(AUTH_SESSION_KEY);
  }
}
