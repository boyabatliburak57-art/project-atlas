import { describe, expect, it, vi } from 'vitest';
import { NetworkStatusController } from './network-status';

describe('network state', () => {
  it('publishes online/offline transitions', () => {
    const controller = new NetworkStatusController();
    const listener = vi.fn();
    controller.subscribe(listener);
    controller.setOnline(false);
    controller.setOnline(true);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(controller.current()).toEqual({
      status: 'online',
      online: true,
      reasonCode: 'ONLINE',
    });
  });

  it('deduplicates native state and represents unknown separately', () => {
    const controller = new NetworkStatusController();
    const listener = vi.fn();
    const remove = controller.subscribe(listener);
    controller.setStatus('unknown');
    controller.setStatus('constrained');
    controller.setStatus('constrained');
    expect(listener).toHaveBeenCalledOnce();
    expect(controller.current().reasonCode).toBe('CONSTRAINED');
    expect(controller.listenerCount()).toBe(1);
    remove();
    expect(controller.listenerCount()).toBe(0);
  });
});
