import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(import.meta.dirname, 'market-structure-screens.tsx'),
  'utf8',
);
const api = readFileSync(
  resolve(import.meta.dirname, 'market-structure-api.ts'),
  'utf8',
);

describe('Market Structure focused mobile contract', () => {
  it('has no client authoritative active-state calculation', () => {
    expect(source).not.toMatch(
      /Date\.now\(\).*effective|effective.*Date\.now\(\)/su,
    );
    expect(source).toContain('measureStatusLabels[row.status]');
  });

  it('uses bounded first pages and cursor continuation', () => {
    expect(api).toContain('limit: 20');
    expect(api).toContain('cursor');
    expect(source).toContain('useInfiniteQuery');
  });

  it('uses only three permanent local tabs', () => {
    expect(source).toContain("['overview', 'measures', 'short-selling']");
  });

  it('provides accessibility roles and selected state', () => {
    expect(source).toContain('accessibilityRole="tab"');
    expect(source).toContain('accessibilityState={{ selected:');
    expect(source).toContain(
      'accessibilityLabel={marketMeasureAccessibility(row)}',
    );
  });

  it('does not offer export or share for restricted data', () => {
    expect(source).not.toMatch(/CSV|Dışa aktar|Paylaş/u);
  });

  it('uses the canonical MarketEvent relation instead of duplicating events', () => {
    expect(api).toContain('readonly marketEventId: string | null');
    expect(api).toContain(
      'path: `/market-structure/events/${encodeURIComponent(revisionId)}`',
    );
    expect(source).toContain('testID="related-market-event"');
    expect(source).toContain('testID="market-measure-event-symbol"');
  });

  it('keeps deterministic relevance fixtures out of the production path', () => {
    expect(source).toContain('fixture &&');
    expect(source).toContain('{props.fixture ? (');
  });
});
