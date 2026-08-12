import { describe, expect, it } from 'vitest';
import { darkTheme, lightTheme, palette, spacing } from './index';

describe('design tokens', () => {
  it('keeps financial semantic colors distinct and spacing bounded', () => {
    expect(palette.positive).not.toBe(palette.negative);
    expect(Object.values(spacing)).toEqual([
      0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64,
    ]);
    expect(lightTheme.background).not.toBe(darkTheme.background);
  });
});
