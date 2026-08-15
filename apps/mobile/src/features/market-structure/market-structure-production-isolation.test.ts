import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  marketMeasureFixtures,
  marketStructureFixturesEnabledAtCompileTime,
  shortSellingFixtures,
} from './market-structure-evidence-data.production';

describe('Market Structure production isolation', () => {
  it('compiles without deterministic fixture market data', () => {
    expect(marketStructureFixturesEnabledAtCompileTime).toBe(false);
    expect(marketMeasureFixtures).toEqual([]);
    expect(shortSellingFixtures).toEqual([]);
  });

  it('redirects the production bundle to the empty evidence module', () => {
    const metro = readFileSync(
      resolve(import.meta.dirname, '../../../metro.config.js'),
      'utf8',
    );
    expect(metro).toContain(
      "moduleName.endsWith('/market-structure-evidence-data')",
    );
  });
});
