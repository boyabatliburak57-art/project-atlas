import { createHash } from 'node:crypto';

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import type {
  PushDeviceStore,
  PushDeviceView,
  PushTokenProtector,
} from './push-devices.ports';
import { PushDevicesService } from './push-devices.service';

const owner = '81000000-0000-4000-8000-000000000001';
const foreign = '81000000-0000-4000-8000-000000000002';
const installationId = 'install-iphone-17-0001';
const token = 'ExponentPushToken[abcdefghijklmnopqrstuvwxyz0123456789]';
const body = {
  installationId,
  token,
  platform: 'ios' as const,
  environment: 'development' as const,
  permissionStatus: 'granted' as const,
  appVersion: '0.1.0',
  locale: 'tr-TR',
  timezone: 'Europe/Istanbul',
};

class MemoryStore implements PushDeviceStore {
  readonly values = new Map<string, PushDeviceView>();
  findByInstallation(id: string) {
    return Promise.resolve(this.values.get(id) ?? null);
  }
  upsert(input: Omit<PushDeviceView, 'id' | 'createdAt'>) {
    const current = this.values.get(input.installationId);
    const value: PushDeviceView = {
      ...input,
      id: current?.id ?? '82000000-0000-4000-8000-000000000001',
      createdAt: current?.createdAt ?? input.updatedAt,
    };
    this.values.set(input.installationId, value);
    return Promise.resolve(value);
  }
  revoke(userId: string, id: string, at: Date) {
    const value = this.values.get(id);
    if (!value || value.ownerUserId !== userId) return Promise.resolve(null);
    const next = { ...value, revokedAt: at, updatedAt: at };
    this.values.set(id, next);
    return Promise.resolve(next);
  }
  revokeAll(userId: string, at: Date) {
    let count = 0;
    for (const [key, value] of this.values)
      if (value.ownerUserId === userId && !value.revokedAt) {
        this.values.set(key, { ...value, revokedAt: at, updatedAt: at });
        count++;
      }
    return Promise.resolve(count);
  }
}
const protector: PushTokenProtector = {
  protect(rawToken) {
    return {
      ciphertext: `encrypted:${rawToken.length}`,
      hash: createHash('sha256').update(rawToken).digest('hex'),
    };
  },
};
const setup = () => {
  const store = new MemoryStore();
  return { store, service: new PushDevicesService(store, protector) };
};

describe('PushDevicesService', () => {
  it('registers without returning the delivery token', async () => {
    const { service } = setup();
    const result = await service.register(owner, body);
    expect(result).not.toHaveProperty('token');
    expect(result).not.toHaveProperty('tokenHash');
  });
  it('stores only hash and ciphertext', async () => {
    const { service, store } = setup();
    await service.register(owner, body);
    const stored = await store.findByInstallation(installationId);
    expect(stored?.tokenHash).toHaveLength(64);
    expect(stored?.tokenCiphertext).not.toContain(token);
  });
  it('is idempotent for the same owner and installation', async () => {
    const { service, store } = setup();
    await service.register(owner, body);
    await service.register(owner, body);
    expect(store.values.size).toBe(1);
  });
  it('rejects device takeover', async () => {
    const { service } = setup();
    await service.register(owner, body);
    await expect(
      service.register(foreign, { ...body, token: `${token}x` }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('rotates a token', async () => {
    const { service, store } = setup();
    await service.register(owner, body);
    const previous = (await store.findByInstallation(installationId))!
      .tokenHash;
    await service.rotate(owner, { ...body, token: `${token}rotated` });
    expect(
      (await store.findByInstallation(installationId))!.tokenHash,
    ).not.toBe(previous);
  });
  it('revokes one installation', async () => {
    const { service } = setup();
    await service.register(owner, body);
    expect(
      (await service.revoke(owner, installationId)).revokedAt,
    ).not.toBeNull();
  });
  it('revoke is idempotent', async () => {
    const { service } = setup();
    await service.register(owner, body);
    const first = await service.revoke(owner, installationId);
    const second = await service.revoke(owner, installationId);
    expect(second.id).toBe(first.id);
  });
  it('rejects foreign revocation', async () => {
    const { service } = setup();
    await service.register(owner, body);
    await expect(
      service.revoke(foreign, installationId),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('returns not found for an unknown installation', async () => {
    await expect(
      setup().service.revoke(owner, installationId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
  it('revokes all owner devices for logout', async () => {
    const { service } = setup();
    await service.register(owner, body);
    await service.register(owner, {
      ...body,
      installationId: 'install-iphone-17-0002',
      token: `${token}2`,
    });
    expect(await service.revokeAll(owner)).toEqual({ revokedCount: 2 });
  });
  it.each([
    [{ ...body, token: 'short' }, 'token'],
    [{ ...body, platform: 'android' }, 'platform'],
    [{ ...body, environment: 'staging' }, 'environment'],
    [{ ...body, permissionStatus: 'allowed' }, 'permissionStatus'],
    [{ ...body, locale: 'invalid' }, 'locale'],
    [{ ...body, timezone: 'Mars/Olympus' }, 'timezone'],
    [{ ...body, installationId: '../bad' }, 'installationId'],
  ])('rejects invalid registration field %s', async (invalid, field) => {
    expect(field).toBeTruthy();
    await expect(
      setup().service.register(owner, invalid),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('supports provisional permission', async () =>
    expect(
      (
        await setup().service.register(owner, {
          ...body,
          permissionStatus: 'provisional',
        })
      ).permissionStatus,
    ).toBe('provisional'));
  it('supports denied permission without fabricating a token state', async () =>
    expect(
      (
        await setup().service.register(owner, {
          ...body,
          permissionStatus: 'denied',
        })
      ).permissionStatus,
    ).toBe('denied'));
});
