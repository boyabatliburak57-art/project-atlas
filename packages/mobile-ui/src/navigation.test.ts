import { describe, expect, it } from 'vitest';
import {
  formatNavigationBadge,
  navigationKind,
  visibleNavigationItems,
} from './navigation-model';
describe('adaptive navigation contracts', () => {
  it('switches at width breakpoints without route state', () => {
    expect(navigationKind(359)).toBe('bottom');
    expect(navigationKind(768)).toBe('rail-compact');
    expect(navigationKind(1024)).toBe('rail-expanded');
  });
  it('hides zero and caps large badges', () => {
    expect(formatNavigationBadge(0)).toBeUndefined();
    expect(formatNavigationBadge(100)).toBe('99+');
  });
  it('removes hidden flags without empty slots', () => {
    expect(
      visibleNavigationItems([
        { icon: null, key: 'a', label: 'A' },
        { icon: null, key: 'b', label: 'B', visible: false },
      ]),
    ).toHaveLength(1);
  });
});
