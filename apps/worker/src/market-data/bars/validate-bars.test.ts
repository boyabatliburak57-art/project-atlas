import { describe, expect, it } from 'vitest';

import type { ProviderBarDto } from '../providers';
import type { BarPersistenceContext } from './contracts';
import { validateBars } from './validate-bars';

const command = {
  providerCode: 'fake-provider',
  providerSymbol: 'THYAO.IS',
  timeframe: '1d' as const,
  from: new Date('2026-07-01T00:00:00.000Z'),
  to: new Date('2026-07-10T00:00:00.000Z'),
};

const context: BarPersistenceContext = {
  providerId: '00000000-0000-4000-8000-000000000001',
  instrumentId: '00000000-0000-4000-8000-000000000002',
  command,
};

function bar(overrides: Partial<ProviderBarDto> = {}): ProviderBarDto {
  return {
    providerSymbol: 'THYAO.IS',
    timeframe: '1d',
    openTime: new Date('2026-07-02T07:00:00.000Z'),
    closeTime: new Date('2026-07-02T15:00:00.000Z'),
    open: '100.00',
    high: '105.00',
    low: '99.00',
    close: '103.00',
    volume: '1000000',
    isClosed: true,
    ...overrides,
  };
}

describe('OHLCV bar validation', () => {
  it('accepts a valid normalized bar', () => {
    const result = validateBars(
      [bar()],
      context,
      new Date('2026-07-12T00:00:00.000Z'),
    );

    expect(result.accepted).toHaveLength(1);
    expect(result.rejected).toHaveLength(0);
  });

  it('rejects invalid OHLC, negative volume and malformed decimals', () => {
    const result = validateBars(
      [bar({ high: '98.00', volume: '-1' }), bar({ close: 'NaN' })],
      context,
      new Date('2026-07-12T00:00:00.000Z'),
    );

    expect(result.rejected[0]?.codes).toEqual(
      expect.arrayContaining(['HIGH_PRICE_INVALID', 'VOLUME_NEGATIVE']),
    );
    expect(result.rejected[1]?.codes).toContain('NUMBER_FORMAT_INVALID');
  });

  it('rejects duplicate, mismatched, out-of-range and future bars', () => {
    const duplicate = bar();
    const invalid = bar({
      providerSymbol: 'OTHER.IS',
      timeframe: '1h',
      openTime: new Date('2027-01-01T07:00:00.000Z'),
      closeTime: new Date('2027-01-01T08:00:00.000Z'),
    });
    const result = validateBars(
      [duplicate, duplicate, invalid],
      context,
      new Date('2026-07-12T00:00:00.000Z'),
    );

    expect(result.rejected[0]?.codes).toContain('DUPLICATE_BAR_IN_BATCH');
    expect(result.rejected[1]?.codes).toEqual(
      expect.arrayContaining([
        'PROVIDER_SYMBOL_MISMATCH',
        'TIMEFRAME_MISMATCH',
        'BAR_OUTSIDE_REQUEST_RANGE',
        'FUTURE_TIMESTAMP',
      ]),
    );
  });

  it('rejects every bar when the provider mapping is missing', () => {
    const result = validateBars(
      [bar()],
      { ...context, instrumentId: null },
      new Date('2026-07-12T00:00:00.000Z'),
    );

    expect(result.rejected[0]?.codes).toContain('MAPPING_NOT_FOUND');
  });
});
