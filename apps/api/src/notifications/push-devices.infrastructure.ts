import { createCipheriv, createHash, randomBytes } from 'node:crypto';

import { pushDevices } from '@atlas/database';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, isNull } from 'drizzle-orm';

import { ApiDatabase } from '../scanner/scanner-runtime.infrastructure';
import type { PushDeviceStore, PushTokenProtector } from './push-devices.ports';

@Injectable()
export class AesPushTokenProtector implements PushTokenProtector {
  constructor(private readonly config: ConfigService) {}

  protect(rawToken: string) {
    const secret = this.config.get<string>('PUSH_TOKEN_ENCRYPTION_KEY');
    if (!secret || secret.length < 32)
      throw new ServiceUnavailableException({
        code: 'PUSH_REGISTRATION_UNAVAILABLE',
        message: 'Push registration is unavailable',
      });
    const key = createHash('sha256').update(secret).digest();
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, nonce);
    const encrypted = Buffer.concat([
      cipher.update(rawToken, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return {
      ciphertext: Buffer.concat([nonce, tag, encrypted]).toString('base64url'),
      hash: createHash('sha256').update(rawToken).digest('hex'),
    };
  }
}

@Injectable()
export class PostgresPushDeviceStore implements PushDeviceStore {
  constructor(private readonly connection: ApiDatabase) {}

  async findByInstallation(installationId: string) {
    const row =
      (
        await this.connection.database
          .select()
          .from(pushDevices)
          .where(eq(pushDevices.installationId, installationId))
          .limit(1)
      )[0] ?? null;
    return row ? toView(row) : null;
  }

  async upsert(input: Parameters<PushDeviceStore['upsert']>[0]) {
    const row = (
      await this.connection.database
        .insert(pushDevices)
        .values(input)
        .onConflictDoUpdate({
          target: [pushDevices.ownerUserId, pushDevices.installationId],
          set: {
            appVersion: input.appVersion,
            environment: input.environment,
            lastSeenAt: input.lastSeenAt,
            locale: input.locale,
            permissionStatus: input.permissionStatus,
            platform: input.platform,
            revokedAt: input.revokedAt,
            timezone: input.timezone,
            tokenCiphertext: input.tokenCiphertext,
            tokenHash: input.tokenHash,
            updatedAt: input.updatedAt,
          },
        })
        .returning()
    )[0]!;
    return toView(row);
  }

  async revoke(ownerUserId: string, installationId: string, at: Date) {
    const row =
      (
        await this.connection.database
          .update(pushDevices)
          .set({ revokedAt: at, updatedAt: at })
          .where(
            and(
              eq(pushDevices.ownerUserId, ownerUserId),
              eq(pushDevices.installationId, installationId),
              isNull(pushDevices.revokedAt),
            ),
          )
          .returning()
      )[0] ?? null;
    return row ? toView(row) : null;
  }

  async revokeAll(ownerUserId: string, at: Date) {
    return (
      await this.connection.database
        .update(pushDevices)
        .set({ revokedAt: at, updatedAt: at })
        .where(
          and(
            eq(pushDevices.ownerUserId, ownerUserId),
            isNull(pushDevices.revokedAt),
          ),
        )
        .returning({ id: pushDevices.id })
    ).length;
  }
}

function toView(row: typeof pushDevices.$inferSelect) {
  return {
    ...row,
    platform: row.platform as 'ios',
    environment: row.environment as 'development' | 'production',
    permissionStatus: row.permissionStatus as
      | 'notDetermined'
      | 'granted'
      | 'denied'
      | 'provisional'
      | 'unavailable',
  };
}
