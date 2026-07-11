import { describe, expect, it } from 'vitest';

import {
  normalizeBistSymbol,
  planInstrumentImport,
} from './normalize-instruments';

describe('BIST instrument normalization', () => {
  it('normalizes a canonical BIST symbol without removing characters', () => {
    expect(normalizeBistSymbol(' thyao ')).toBe('THYAO');
    expect(() => normalizeBistSymbol('THYAO.IS')).toThrow(
      'Invalid BIST symbol',
    );
  });

  it('rejects duplicate provider symbols, duplicate ISINs and non-BIST records', () => {
    const result = planInstrumentImport([
      {
        providerSymbol: 'DUP.IS',
        symbol: 'AAA',
        name: 'Duplicate One',
        marketCode: 'BIST',
        currencyCode: 'TRY',
      },
      {
        providerSymbol: 'dup.is',
        symbol: 'BBB',
        name: 'Duplicate Two',
        marketCode: 'BIST',
        currencyCode: 'TRY',
      },
      {
        providerSymbol: 'ONE.IS',
        symbol: 'ONE',
        name: 'ISIN One',
        marketCode: 'BIST',
        currencyCode: 'TRY',
        isin: 'TR0000000001',
      },
      {
        providerSymbol: 'TWO.IS',
        symbol: 'TWO',
        name: 'ISIN Two',
        marketCode: 'BIST',
        currencyCode: 'TRY',
        isin: 'TR0000000001',
      },
      {
        providerSymbol: 'NASDAQ',
        symbol: 'TEST',
        name: 'Wrong Market',
        marketCode: 'NASDAQ',
        currencyCode: 'USD',
      },
    ]);

    expect(result.instruments).toHaveLength(0);
    expect(result.rejections.map((rejection) => rejection.code)).toEqual([
      'DUPLICATE_PROVIDER_SYMBOL',
      'DUPLICATE_PROVIDER_SYMBOL',
      'DUPLICATE_ISIN',
      'DUPLICATE_ISIN',
      'INVALID_MARKET',
    ]);
  });

  it('maps an explicitly suspended instrument to the inactive domain status', () => {
    const result = planInstrumentImport([
      {
        providerSymbol: 'SUSP.IS',
        symbol: 'SUSP',
        name: 'Suspended Instrument',
        marketCode: 'BIST',
        currencyCode: 'try',
        status: 'suspended',
      },
    ]);

    expect(result.instruments[0]).toMatchObject({
      currencyCode: 'TRY',
      normalizedSymbol: 'SUSP',
      status: 'inactive',
    });
  });
});
