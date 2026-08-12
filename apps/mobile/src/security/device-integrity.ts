export type DeviceIntegritySignal = 'unknown' | 'noSignal' | 'riskSignal';
export interface DeviceIntegrityDecision {
  readonly allowAuthentication: true;
  readonly requireSensitiveActionReauth: boolean;
  readonly userWarning: boolean;
}
export function evaluateDeviceIntegrity(
  signal: DeviceIntegritySignal,
): DeviceIntegrityDecision {
  return {
    allowAuthentication: true,
    requireSensitiveActionReauth: signal === 'riskSignal',
    userWarning: signal === 'riskSignal',
  };
}
