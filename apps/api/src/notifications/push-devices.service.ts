import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { z } from 'zod';

import {
  PUSH_DEVICE_STORE,
  PUSH_TOKEN_PROTECTOR,
  type PushDeviceStore,
  type PushTokenProtector,
} from './push-devices.ports';

const bodySchema = z.object({
  installationId: z
    .string()
    .trim()
    .min(16)
    .max(160)
    .regex(/^[A-Za-z0-9._:-]+$/u),
  token: z.string().trim().min(32).max(4096),
  platform: z.literal('ios'),
  environment: z.enum(['development', 'production']),
  permissionStatus: z.enum([
    'notDetermined',
    'granted',
    'denied',
    'provisional',
    'unavailable',
  ]),
  appVersion: z.string().trim().min(1).max(32),
  locale: z
    .string()
    .trim()
    .regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/u)
    .max(16),
  timezone: z.string().trim().min(1).max(64),
});

@Injectable()
export class PushDevicesService {
  constructor(
    @Inject(PUSH_DEVICE_STORE) private readonly store: PushDeviceStore,
    @Inject(PUSH_TOKEN_PROTECTOR)
    private readonly protector: PushTokenProtector,
  ) {}

  async register(userId: string, body: unknown, now = new Date()) {
    const parsed = this.parse(body);
    const existing = await this.store.findByInstallation(parsed.installationId);
    if (existing && existing.ownerUserId !== userId)
      throw new ForbiddenException({
        code: 'PUSH_DEVICE_ACCESS_DENIED',
        message: 'Device registration is not available',
      });
    const protectedToken = this.protector.protect(parsed.token);
    const result = await this.store.upsert({
      ownerUserId: userId,
      installationId: parsed.installationId,
      platform: parsed.platform,
      environment: parsed.environment,
      tokenHash: protectedToken.hash,
      tokenCiphertext: protectedToken.ciphertext,
      permissionStatus: parsed.permissionStatus,
      appVersion: parsed.appVersion,
      locale: parsed.locale,
      timezone: parsed.timezone,
      lastSeenAt: now,
      revokedAt: null,
      updatedAt: now,
    });
    return publicDevice(result);
  }

  rotate(userId: string, body: unknown, now = new Date()) {
    return this.register(userId, body, now);
  }

  async revoke(userId: string, installationId: string, now = new Date()) {
    this.installation(installationId);
    const existing = await this.store.findByInstallation(installationId);
    if (!existing)
      throw new NotFoundException({
        code: 'PUSH_DEVICE_NOT_FOUND',
        message: 'Device registration was not found',
      });
    if (existing.ownerUserId !== userId)
      throw new ForbiddenException({
        code: 'PUSH_DEVICE_ACCESS_DENIED',
        message: 'Device registration is not available',
      });
    const result = await this.store.revoke(userId, installationId, now);
    return result ? publicDevice(result) : publicDevice(existing);
  }

  async revokeAll(userId: string, now = new Date()) {
    return { revokedCount: await this.store.revokeAll(userId, now) };
  }

  private parse(value: unknown) {
    const result = bodySchema.safeParse(value);
    if (!result.success)
      this.invalid(result.error.issues[0]?.path.join('.') ?? 'request');
    try {
      new Intl.DateTimeFormat('en-US', {
        timeZone: result.data.timezone,
      }).format(nowForValidation);
    } catch {
      this.invalid('timezone');
    }
    return result.data;
  }
  private installation(value: string) {
    const result = bodySchema.shape.installationId.safeParse(value);
    if (!result.success) this.invalid('installationId');
  }
  private invalid(field: string): never {
    throw new BadRequestException({
      code: 'PUSH_DEVICE_INVALID',
      message: 'Push device request is invalid',
      details: { field },
    });
  }
}

const nowForValidation = new Date('2026-01-01T00:00:00Z');
function publicDevice(value: {
  readonly id: string;
  readonly installationId: string;
  readonly platform: string;
  readonly environment: string;
  readonly permissionStatus: string;
  readonly lastSeenAt: Date;
  readonly revokedAt: Date | null;
}) {
  return {
    id: value.id,
    installationId: value.installationId,
    platform: value.platform,
    environment: value.environment,
    permissionStatus: value.permissionStatus,
    lastSeenAt: value.lastSeenAt.toISOString(),
    revokedAt: value.revokedAt?.toISOString() ?? null,
  };
}
