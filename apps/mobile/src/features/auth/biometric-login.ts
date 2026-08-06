import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricStatus =
  | 'AVAILABLE'
  | 'NOT_AVAILABLE'
  | 'NOT_ENROLLED'
  | 'ENABLED'
  | 'DISABLED'
  | 'LOCKED_OUT'
  | 'REAUTHENTICATION_REQUIRED';

export interface BiometricAdapter {
  capability(): Promise<BiometricStatus>;
  authenticate(): Promise<'success' | 'cancel' | 'failure' | 'lockout'>;
}

export const expoBiometricAdapter: BiometricAdapter = {
  async capability() {
    if (!(await LocalAuthentication.hasHardwareAsync())) return 'NOT_AVAILABLE';
    if (!(await LocalAuthentication.isEnrolledAsync())) return 'NOT_ENROLLED';
    return 'AVAILABLE';
  },
  async authenticate() {
    const result = await LocalAuthentication.authenticateAsync({
      biometricsSecurityLevel: 'strong',
      cancelLabel: 'Şifre ile devam et',
      disableDeviceFallback: true,
      fallbackLabel: 'Şifre ile devam et',
      promptMessage: 'Atlas oturumunun kilidini aç',
    });
    if (result.success) return 'success';
    if (result.error === 'user_cancel' || result.error === 'system_cancel')
      return 'cancel';
    if (result.error === 'lockout') return 'lockout';
    return 'failure';
  },
};

export class BiometricLoginController {
  private enabled = false;

  constructor(private readonly adapter: BiometricAdapter) {}

  isEnabled(): boolean {
    return this.enabled;
  }

  async enable(reauthenticated: boolean): Promise<BiometricStatus> {
    if (!reauthenticated) return 'REAUTHENTICATION_REQUIRED';
    const capability = await this.adapter.capability();
    if (capability !== 'AVAILABLE') return capability;
    const result = await this.adapter.authenticate();
    if (result === 'success') {
      this.enabled = true;
      return 'ENABLED';
    }
    return result === 'lockout' ? 'LOCKED_OUT' : 'DISABLED';
  }

  disable(): BiometricStatus {
    this.enabled = false;
    return 'DISABLED';
  }

  async unlock(): Promise<BiometricStatus> {
    if (!this.enabled) return 'DISABLED';
    const result = await this.adapter.authenticate();
    if (result === 'success') return 'ENABLED';
    return result === 'lockout' ? 'LOCKED_OUT' : 'REAUTHENTICATION_REQUIRED';
  }
}
