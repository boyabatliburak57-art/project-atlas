import { describe, expect, it } from 'vitest';

import { flowRows, settlementRows } from './institutional-evidence-data';
import {
  flowAccessibility,
  flowDirection,
  formatCompactTry,
  isForeignAvailable,
  moneyFlowMethodology,
  settlementAccessibility,
} from './institutional-model';

describe('mobile institutional intelligence semantics', () => {
  it('uses sign and text for positive flow', () =>
    expect(flowDirection('12')).toEqual({ label: 'Net Alım', sign: '+' }));
  it('uses sign and text for negative flow', () =>
    expect(flowDirection('-12')).toEqual({ label: 'Net Satım', sign: '−' }));
  it('does not render a missing value as zero', () =>
    expect(formatCompactTry(null)).toBe('—'));
  it('formats large values compactly with tabular customer semantics', () =>
    expect(formatCompactTry('124400000')).toContain('124,4 mn'));
  it('includes direction and trade date in accessibility labels', () => {
    const label = flowAccessibility(flowRows[0]!);
    expect(label).toContain('Net Alım');
    expect(label).toContain('işlem tarihi');
  });
  it('uses explicit settlement date in accessibility labels', () =>
    expect(settlementAccessibility(settlementRows[0]!)).toContain(
      'takas tarihi',
    ));
  it('does not infer foreign coverage from unknown rows', () =>
    expect(isForeignAvailable([settlementRows[2]!])).toBe(false));
  it('accepts only source-classified foreign/domestic rows as available', () =>
    expect(isForeignAvailable(settlementRows)).toBe(true));
  it('defines money flow without a price prediction', () => {
    expect(moneyFlowMethodology).toContain('alış ve satış tutarları');
    expect(moneyFlowMethodology).toContain('yatırım tavsiyesi değildir');
    expect(moneyFlowMethodology).not.toMatch(/bullish|AL|SAT/u);
  });
});
