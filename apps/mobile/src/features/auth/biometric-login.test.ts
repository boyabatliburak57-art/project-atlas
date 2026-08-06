import { describe, expect, it, vi } from 'vitest';
import {
  BiometricLoginController,
  type BiometricAdapter,
  type BiometricStatus,
} from './biometric-login';

function adapter(
  capability: BiometricStatus = 'AVAILABLE',
  result: 'success' | 'cancel' | 'failure' | 'lockout' = 'success',
): BiometricAdapter {
  return {
    capability: vi.fn(() => Promise.resolve(capability)),
    authenticate: vi.fn(() => Promise.resolve(result)),
  };
}

describe('biometric local session unlock', () => {
  it('requires explicit reauthentication before enable', async () =>
    expect(new BiometricLoginController(adapter()).enable(false)).resolves.toBe(
      'REAUTHENTICATION_REQUIRED',
    ));
  it('enables after successful local authentication', async () =>
    expect(new BiometricLoginController(adapter()).enable(true)).resolves.toBe(
      'ENABLED',
    ));
  it('reports unavailable hardware', async () =>
    expect(
      new BiometricLoginController(adapter('NOT_AVAILABLE')).enable(true),
    ).resolves.toBe('NOT_AVAILABLE'));
  it('reports missing enrollment', async () =>
    expect(
      new BiometricLoginController(adapter('NOT_ENROLLED')).enable(true),
    ).resolves.toBe('NOT_ENROLLED'));
  it('keeps disabled after cancellation', async () =>
    expect(
      new BiometricLoginController(adapter('AVAILABLE', 'cancel')).enable(true),
    ).resolves.toBe('DISABLED'));
  it('reports lockout without bypass', async () =>
    expect(
      new BiometricLoginController(adapter('AVAILABLE', 'lockout')).enable(
        true,
      ),
    ).resolves.toBe('LOCKED_OUT'));
  it('uses password reauthentication fallback after unlock failure', async () => {
    const controller = new BiometricLoginController(
      adapter('AVAILABLE', 'failure'),
    );
    expect(await controller.unlock()).toBe('DISABLED');
  });
  it('clears enabled state when disabled', async () => {
    const controller = new BiometricLoginController(adapter());
    await controller.enable(true);
    expect(controller.disable()).toBe('DISABLED');
    expect(controller.isEnabled()).toBe(false);
  });
});
