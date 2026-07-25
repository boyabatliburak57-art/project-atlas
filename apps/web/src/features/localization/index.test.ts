import { describe, expect, it } from 'vitest';

import {
  createFormatters,
  localizeReasonCode,
  parseLocalizedDecimal,
  translate,
} from './index';

describe('localization boundary', () => {
  it('keeps Turkish as default and permits an English catalog', () => {
    expect(translate('searchResults', { count: 3 })).toBe('3 sonuç bulundu');
    expect(translate('searchResults', { count: 3 }, 'en-US')).toBe(
      '3 results found',
    );
  });

  it('formats timezone-safe dates and currencies', () => {
    const tr = createFormatters('tr-TR', 'Europe/Istanbul');
    const en = createFormatters('en-US', 'UTC');
    expect(tr.dateTime('2026-01-01T00:00:00.000Z')).toContain('03:00');
    expect(en.dateTime('2026-01-01T00:00:00.000Z')).toContain('12:00 AM');
    expect(tr.currency(1234.5)).toContain('₺');
    expect(en.currency(1234.5, 'USD')).toContain('$');
  });

  it('parses decimal input only at the locale boundary', () => {
    expect(parseLocalizedDecimal('1.234,56')).toBe(1234.56);
    expect(parseLocalizedDecimal('1,234.56', 'en-US')).toBe(1234.56);
    expect(parseLocalizedDecimal('12unsafe')).toBeNull();
  });

  it('localizes safe reason codes without exposing internal values', () => {
    expect(localizeReasonCode('stale_data')).toBe('Piyasa verisi güncel değil');
    expect(localizeReasonCode('database_connection_failed')).toBe(
      'Bilinmeyen neden',
    );
  });
});
