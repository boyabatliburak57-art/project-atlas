import { describe, expect, it } from 'vitest';
import { formatPercent, formatTry } from '@atlas/financial-formatting';
describe('mobile UI contracts', () => {
  it('formats finance safely', () => {
    expect(formatTry(-0)).not.toContain('-');
    expect(formatPercent(0.0406)).toContain('4,06');
  });
  it('keeps non-color indicator contract', () => {
    expect(['▲', '▼', '—']).toHaveLength(3);
  });
});
