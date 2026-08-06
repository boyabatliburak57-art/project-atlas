import { describe, expect, it } from 'vitest';
import { formatPercent, formatTry } from './index';

describe('financial formatting', () => {
  it('formats TRY and explicit percentage direction', () => {
    expect(formatTry(1234.5)).toContain('1.234,50');
    expect(formatPercent(0.0125)).toContain('+');
  });
});
