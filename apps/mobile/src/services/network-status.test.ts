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
      online: true,
      reasonCode: 'ONLINE',
    });
  });
});
