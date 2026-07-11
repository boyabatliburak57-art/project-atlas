import { getTableName } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  dataProviders,
  dataQualityIssues,
  ingestionRuns,
  instruments,
  instrumentSymbolHistory,
  priceBars,
  providerInstrumentMappings,
  sectors,
} from './index';

describe('initial database schema', () => {
  it('contains only the eight TASK-007 tables', () => {
    expect(
      [
        sectors,
        instruments,
        instrumentSymbolHistory,
        dataProviders,
        providerInstrumentMappings,
        priceBars,
        dataQualityIssues,
        ingestionRuns,
      ].map(getTableName),
    ).toEqual([
      'sectors',
      'instruments',
      'instrument_symbol_history',
      'data_providers',
      'provider_instrument_mappings',
      'price_bars',
      'data_quality_issues',
      'ingestion_runs',
    ]);
  });
});
