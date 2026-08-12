import * as Notifications from 'expo-notifications';
import type { AtlasApiClient, AtlasResponse } from '@atlas/api-client';
import {
  validatePushTarget,
  type PushTarget,
} from '../features/operations/operations-model';

export type PushPermissionStatus =
  | 'notDetermined'
  | 'granted'
  | 'denied'
  | 'provisional'
  | 'unavailable';

export interface PushDeviceRegistrationInput {
  readonly installationId: string;
  readonly token: string;
  readonly environment: 'development' | 'production';
  readonly permissionStatus: PushPermissionStatus;
  readonly appVersion: string;
  readonly locale: string;
  readonly timezone: string;
}

export class ExpoPushPermissionAdapter {
  async status(): Promise<PushPermissionStatus> {
    const permission = await Notifications.getPermissionsAsync();
    return mapPermission(permission.status, permission.ios?.status);
  }
  async requestAfterRationale(): Promise<PushPermissionStatus> {
    const current = await this.status();
    if (current === 'denied') return 'denied';
    const permission = await Notifications.requestPermissionsAsync();
    return mapPermission(permission.status, permission.ios?.status);
  }
}

export class MobilePushDeviceApi {
  constructor(private readonly client: AtlasApiClient) {}
  register(input: PushDeviceRegistrationInput) {
    return this.client.request<AtlasResponse<Record<string, unknown>>>({
      method: 'POST',
      path: '/push-devices/register',
      body: { ...input, platform: 'ios' },
    });
  }
  rotate(input: PushDeviceRegistrationInput) {
    return this.client.request<AtlasResponse<Record<string, unknown>>>({
      method: 'POST',
      path: '/push-devices/rotate',
      body: { ...input, platform: 'ios' },
    });
  }
  revoke(installationId: string) {
    if (!/^[A-Za-z0-9._:-]{16,160}$/u.test(installationId))
      throw new Error('INSTALLATION_ID_INVALID');
    return this.client.request<AtlasResponse<Record<string, unknown>>>({
      method: 'DELETE',
      path: `/push-devices/${encodeURIComponent(installationId)}`,
    });
  }
  revokeAll() {
    return this.client.request<AtlasResponse<{ revokedCount: number }>>({
      method: 'POST',
      path: '/push-devices/revoke-all',
    });
  }
}

export function parsePushIntent(value: unknown): PushTarget | null {
  if (!isRecord(value) || !isRecord(value['target'])) return null;
  const target = value['target'];
  if (typeof target['kind'] !== 'string' || typeof target['id'] !== 'string')
    return null;
  try {
    return validatePushTarget(target as PushTarget);
  } catch {
    return null;
  }
}

const allowedPushKeys = new Set([
  'type',
  'resourceType',
  'resourceId',
  'title',
  'body',
  'target',
  'correlationId',
]);
const forbiddenPushKey =
  /(?:token|session|portfolio|transaction|amount|strategy|ast|provider|email|user)/iu;

export function validatePrivacySafePushPayload(value: unknown): boolean {
  if (!isRecord(value)) return false;
  for (const [key, item] of Object.entries(value)) {
    if (!allowedPushKeys.has(key) || forbiddenPushKey.test(key)) return false;
    if (key === 'target') {
      if (parsePushIntent({ target: item }) === null) return false;
      continue;
    }
    if (typeof item !== 'string' || item.length > 240) return false;
  }
  return typeof value['type'] === 'string' && isRecord(value['target']);
}

export class PushListenerRegistry {
  private remove: (() => void) | null = null;
  start(subscribe: () => () => void) {
    if (this.remove) return false;
    this.remove = subscribe();
    return true;
  }
  stop() {
    this.remove?.();
    this.remove = null;
  }
}

function mapPermission(
  status: Notifications.PermissionStatus,
  iosStatus?: Notifications.IosAuthorizationStatus,
): PushPermissionStatus {
  if (iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL)
    return 'provisional';
  if (status === Notifications.PermissionStatus.GRANTED) return 'granted';
  if (status === Notifications.PermissionStatus.DENIED) return 'denied';
  if (status === Notifications.PermissionStatus.UNDETERMINED)
    return 'notDetermined';
  return 'unavailable';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
