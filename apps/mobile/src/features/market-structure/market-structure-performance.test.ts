import { performance } from 'node:perf_hooks';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { marketMeasureFixtures } from './market-structure-evidence-data';

describe('Market Structure focused performance', () => {
  it('keeps a realistic client page bounded', () => {
    const page = Array.from({ length: 20 }, (_, index) => ({
      ...marketMeasureFixtures[index % marketMeasureFixtures.length]!,
      revisionId: `revision-${index}`,
    }));
    expect(page).toHaveLength(20);
  });

  it('filters a bounded page without an unexplained local regression', () => {
    const page = Array.from({ length: 20 }, (_, index) => ({
      ...marketMeasureFixtures[index % marketMeasureFixtures.length]!,
      revisionId: `revision-${index}`,
    }));
    const started = performance.now();
    for (let iteration = 0; iteration < 1_000; iteration += 1)
      page.filter((row) =>
        `${row.symbol} ${row.instrumentName}`.includes('ASELS'),
      );
    const elapsed = performance.now() - started;
    // A local regression guard, not a production SLA.
    expect(elapsed).toBeLessThan(250);
  });

  it('does not preload short-selling activity on overview', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, 'market-structure-screens.tsx'),
      'utf8',
    );
    expect(source).toContain('enabled: !fixture && !providerGated');
    expect(source).toContain("view === 'short-selling'");
  });
});
