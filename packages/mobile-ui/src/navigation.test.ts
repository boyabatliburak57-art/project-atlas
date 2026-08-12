import { describe, expect, it } from 'vitest';
import {
  formatNavigationAccessibilityLabel,
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
  it('announces a badge as part of its parent tab without a duplicate element', () => {
    expect(formatNavigationAccessibilityLabel('More', 4)).toBe(
      'More, 4 bildirim',
    );
    expect(formatNavigationAccessibilityLabel('Home', 0)).toBe('Home');
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
