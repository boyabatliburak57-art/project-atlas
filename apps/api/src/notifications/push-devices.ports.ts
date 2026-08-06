export interface PushDeviceView {
  readonly id: string;
  readonly ownerUserId: string;
  readonly installationId: string;
  readonly platform: 'ios';
  readonly environment: 'development' | 'production';
  readonly tokenHash: string;
  readonly tokenCiphertext: string;
  readonly permissionStatus:
    | 'notDetermined'
    | 'granted'
    | 'denied'
    | 'provisional'
    | 'unavailable';
  readonly appVersion: string;
  readonly locale: string;
  readonly timezone: string;
  readonly lastSeenAt: Date;
  readonly revokedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface PushDeviceStore {
  findByInstallation(installationId: string): Promise<PushDeviceView | null>;
  upsert(
    input: Omit<PushDeviceView, 'id' | 'createdAt'>,
  ): Promise<PushDeviceView>;
  revoke(
    ownerUserId: string,
    installationId: string,
    at: Date,
  ): Promise<PushDeviceView | null>;
  revokeAll(ownerUserId: string, at: Date): Promise<number>;
}

export interface PushTokenProtector {
  protect(rawToken: string): {
    readonly ciphertext: string;
    readonly hash: string;
  };
}

export const PUSH_DEVICE_STORE = Symbol('PUSH_DEVICE_STORE');
export const PUSH_TOKEN_PROTECTOR = Symbol('PUSH_TOKEN_PROTECTOR');
