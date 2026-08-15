import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { eventFixtures } from './events-evidence-data';
import {
  categoryLabels,
  eventAccessibilityLabel,
  safeKapTelemetry,
  safeSourceUrl,
} from './events-model';

describe('KAP mobile presentation contracts', () => {
  it('labels every canonical category without provider taxonomy leakage', () => {
    expect(Object.keys(categoryLabels)).toHaveLength(15);
    expect(categoryLabels.FINANCIAL_RESULT).toBe('Finansal Sonuçlar');
    expect(categoryLabels.OTHER).toBe('Diğer');
  });

  it('announces correction and personal relevance without color-only meaning', () => {
    const label = eventAccessibilityLabel(eventFixtures[6]!);
    expect(label).toContain('düzeltilmiş bildirim');
    expect(eventAccessibilityLabel(eventFixtures[0]!)).toContain(
      'takip listesi ve portföyle ilgili',
    );
  });

  it('accepts only credential-free HTTPS source links', () => {
    expect(safeSourceUrl('https://kap.example.test/a')).toBe(true);
    for (const value of [
      'http://kap.example.test/a',
      'javascript:alert(1)',
      'file:///tmp/a',
      'data:text/plain,a',
      'https://token:secret@kap.example.test/a',
    ])
      expect(safeSourceUrl(value)).toBe(false);
  });

  it('emits no disclosure, search, watchlist or portfolio content in telemetry', () => {
    expect(safeKapTelemetry('kap_detail_opened')).toEqual({
      event: 'kap_detail_opened',
    });
  });

  it('compile-time swaps all KAP contract fixtures out of production', () => {
    const production = readFileSync(
      resolve(__dirname, 'events-evidence-data.production.ts'),
      'utf8',
    );
    const metro = readFileSync(
      resolve(__dirname, '../../../metro.config.js'),
      'utf8',
    );
    expect(production).toContain(
      'eventFixtures: readonly KapEventDetail[] = []',
    );
    expect(production).toContain('eventFixturesEnabledAtCompileTime = false');
    expect(metro).toContain("moduleName.endsWith('/events-evidence-data')");
  });
});
