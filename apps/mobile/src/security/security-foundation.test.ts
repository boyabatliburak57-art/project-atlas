import { describe, expect, it, vi } from 'vitest';
import {
  MOBILE_DATA_POLICIES,
  canPersistBulkData,
} from './data-classification';
import {
  CACHE_SCHEMA_VERSION,
  OFFLINE_MUTATION_QUEUE,
  OFFLINE_POLICIES,
  OwnerScopedMemoryCache,
  assertOfflineMutationAllowed,
  migrateCacheEnvelope,
} from './offline-cache';
import { AppLockController } from './app-lock';
import { REDACTED, RedactingLogger, redactSensitive } from './redaction';
import { assertClipboardCopyAllowed } from './clipboard-policy';
import { evaluateDeviceIntegrity } from './device-integrity';
import { InstallationGuard } from './installation-guard';
import {
  BACKGROUND_REFRESH_STATUS,
  CLIENT_BACKGROUND_FINANCIAL_EVALUATION,
  assertBackgroundTaskAllowed,
} from './background-policy';
import {
  InMemorySecureStorage,
  AUTH_SESSION_KEY,
} from '../storage/secure-storage';

describe('mobile data classification and offline policy', () => {
  it('keeps auth and financial bulk data out of ordinary persistence', () => {
    expect(MOBILE_DATA_POLICIES.AUTH_SECRET.persistence).toBe('protected-only');
    expect(MOBILE_DATA_POLICIES.FINANCIAL_SENSITIVE.persistence).toBe(
      'memory-only',
    );
    expect(canPersistBulkData('FINANCIAL_SENSITIVE')).toBe(false);
  });
  it('prohibits automatic offline mutation queues', () => {
    expect(OFFLINE_MUTATION_QUEUE).toBe('DISABLED');
    expect(
      Object.values(OFFLINE_POLICIES).every(
        (item) => item.mutation === 'blocked',
      ),
    ).toBe(true);
    expect(() => assertOfflineMutationAllowed(false)).toThrow(
      'OFFLINE_MUTATION_BLOCKED',
    );
    expect(() => assertOfflineMutationAllowed(true)).not.toThrow();
  });
  it('isolates cache entries by owner and expires stale data', () => {
    const cache = new OwnerScopedMemoryCache();
    cache.set('owner-a', 'portfolio', 'summary', { amount: 'private-a' }, 100);
    expect(cache.read('owner-b', 'portfolio', 'summary', 101)).toEqual({
      status: 'UNAVAILABLE',
    });
    expect(
      cache.read('owner-a', 'portfolio', 'summary', 100 + 5 * 60_000 + 1),
    ).toEqual({ status: 'EXPIRED_OFFLINE_CACHE' });
  });
  it('uses a bounded LRU cache and supports owner cleanup', () => {
    const cache = new OwnerScopedMemoryCache(2);
    cache.set('a', 'help', '1', 1, 0);
    cache.set('a', 'help', '2', 2, 0);
    cache.set('b', 'help', '3', 3, 0);
    expect(cache.size()).toBe(2);
    cache.clearOwner('a');
    expect(cache.size()).toBe(1);
    cache.clearPrivate();
    expect(cache.size()).toBe(0);
  });
  it('purges corrupt or incompatible cache envelopes', () => {
    expect(migrateCacheEnvelope(null).action).toBe('purge');
    expect(
      migrateCacheEnvelope({ schemaVersion: CACHE_SCHEMA_VERSION - 1 }).action,
    ).toBe('purge');
    expect(
      migrateCacheEnvelope({ schemaVersion: CACHE_SCHEMA_VERSION }).action,
    ).toBe('use');
  });
});

describe('app lock and device integrity', () => {
  it('locks immediately on background and is cancel-safe', () => {
    let now = 10;
    const lock = new AppLockController('immediately', () => now);
    lock.onBackground();
    expect(lock.snapshot()).toBe('locked');
    expect(lock.unlock('cancel')).toBe('locked');
    expect(lock.unlock('success')).toBe('unlocked');
    now += 1;
  });
  it('uses monotonic elapsed time for grace-period locking', () => {
    let monotonic = 100;
    const lock = new AppLockController('shortGrace', () => monotonic, 30);
    lock.onBackground();
    monotonic = 129;
    expect(lock.onForeground()).toBe('unlocked');
    lock.onBackground();
    monotonic = 160;
    expect(lock.onForeground()).toBe('locked');
  });
  it('never treats device integrity as authentication', () => {
    expect(evaluateDeviceIntegrity('riskSignal')).toEqual({
      allowAuthentication: true,
      requireSensitiveActionReauth: true,
      userWarning: true,
    });
  });
  it('limits background work to native lifecycle chores', () => {
    expect(BACKGROUND_REFRESH_STATUS).toBe('NOT_REQUIRED_FOR_V1');
    expect(CLIENT_BACKGROUND_FINANCIAL_EVALUATION).toBe('PROHIBITED');
    expect(() =>
      assertBackgroundTaskAllowed('notificationHandling'),
    ).not.toThrow();
    expect(() =>
      assertBackgroundTaskAllowed('sensitiveFileCleanup'),
    ).not.toThrow();
    expect(() => assertBackgroundTaskAllowed('backtestExecution')).toThrow(
      'BACKGROUND_FINANCIAL_TASK_PROHIBITED',
    );
  });
});

describe('redaction, clipboard and reinstall safety', () => {
  it('redacts nested tokens, financial fields and sensitive query values', () => {
    expect(
      redactSensitive({
        authorization: 'Bearer secret',
        nested: { portfolioValue: 42, url: 'atlas://reset/path?token=abc' },
      }),
    ).toEqual({
      authorization: REDACTED,
      nested: {
        portfolioValue: REDACTED,
        url: `atlas://reset/path?token=${REDACTED}`,
      },
    });
  });
  it('redacts before writing to a logger sink', () => {
    const write = vi.fn();
    new RedactingLogger({ write }).write({
      password: 'secret',
      reasonCode: 'SAFE',
    });
    expect(write).toHaveBeenCalledWith({
      password: REDACTED,
      reasonCode: 'SAFE',
    });
  });
  it('requires explicit copy and blocks sensitive classes', () => {
    expect(() => assertClipboardCopyAllowed('PUBLIC', true)).not.toThrow();
    expect(() => assertClipboardCopyAllowed('PUBLIC', false)).toThrow();
    expect(() => assertClipboardCopyAllowed('AUTH_SECRET', true)).toThrow();
    expect(() =>
      assertClipboardCopyAllowed('FINANCIAL_SENSITIVE', true),
    ).toThrow();
  });
  it('clears keychain auth when the sandbox installation marker is absent', async () => {
    const storage = new InMemorySecureStorage();
    await storage.setItem(AUTH_SESSION_KEY, 'stale-session');
    let marker = false;
    const guard = new InstallationGuard(
      {
        exists: () => Promise.resolve(marker),
        create: () => {
          marker = true;
          return Promise.resolve();
        },
      },
      storage,
    );
    await expect(guard.enforce()).resolves.toBe('initialized');
    await expect(storage.getItem(AUTH_SESSION_KEY)).resolves.toBeNull();
    await expect(guard.enforce()).resolves.toBe('existing');
  });
});
