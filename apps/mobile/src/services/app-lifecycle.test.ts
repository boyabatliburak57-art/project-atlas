import { describe, expect, it, vi } from 'vitest';
import { AppLifecycleController } from './app-lifecycle';

describe('app lifecycle', () => {
  it('fires foreground refetch once per background transition', () => {
    const controller = new AppLifecycleController();
    const refetch = vi.fn();
    controller.onForeground(refetch);
    controller.transition('background');
    controller.transition('active');
    controller.transition('active');
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('publishes privacy-cover states once and cleans listeners', () => {
    const controller = new AppLifecycleController();
    const listener = vi.fn();
    const remove = controller.onStateChange(listener);
    controller.transition('inactive');
    controller.transition('inactive');
    controller.transition('background');
    expect(listener).toHaveBeenCalledTimes(2);
    expect(controller.snapshot()).toBe('background');
    expect(controller.listenerCount()).toBe(1);
    remove();
    expect(controller.listenerCount()).toBe(0);
  });
});
