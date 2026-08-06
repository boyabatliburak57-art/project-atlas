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
});
