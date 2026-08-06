import { describe, expect, it } from 'vitest';
import { FocusLifecycle } from './focus-model';
describe('modal focus lifecycle', () => {
  it('restores trigger and guards nested overlays', () => {
    const lifecycle = new FocusLifecycle();
    lifecycle.captureTrigger(42);
    lifecycle.opened();
    expect(() => lifecycle.opened()).toThrow(/Nested/u);
    expect(lifecycle.closed(7)).toBe(42);
  });
  it('uses a safe fallback when trigger disappeared', () => {
    const lifecycle = new FocusLifecycle();
    lifecycle.opened();
    expect(lifecycle.closed(7)).toBe(7);
  });
});
