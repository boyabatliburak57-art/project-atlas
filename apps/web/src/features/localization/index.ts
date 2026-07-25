export const supportedLocales = ['tr-TR', 'en-US'] as const;
export type AtlasLocale = (typeof supportedLocales)[number];

export const defaultLocale: AtlasLocale = 'tr-TR';
export const defaultTimeZone = 'Europe/Istanbul';

const messages = {
  'tr-TR': {
    skipToContent: 'Ana içeriğe geç',
    navigation: 'Ana navigasyon',
    search: 'Ara',
    close: 'Kapat',
    searchUnavailable: 'Arama şu anda kullanılamıyor',
    searchResults: '{count} sonuç bulundu',
    quickAction: 'Hızlı işlem',
    unknownReason: 'Bilinmeyen neden',
  },
  'en-US': {
    skipToContent: 'Skip to main content',
    navigation: 'Main navigation',
    search: 'Search',
    close: 'Close',
    searchUnavailable: 'Search is currently unavailable',
    searchResults: '{count} results found',
    quickAction: 'Quick action',
    unknownReason: 'Unknown reason',
  },
} as const;

export type MessageKey = keyof (typeof messages)['tr-TR'];

export function translate(
  key: MessageKey,
  values: Readonly<Record<string, string | number>> = {},
  locale: AtlasLocale = defaultLocale,
) {
  return Object.entries(values).reduce<string>(
    (message, [name, value]) => message.replace(`{${name}}`, String(value)),
    String(messages[locale][key]),
  );
}

export function createFormatters(
  locale: AtlasLocale = defaultLocale,
  timeZone = defaultTimeZone,
) {
  const safeTimeZone = validTimeZone(timeZone) ? timeZone : defaultTimeZone;
  return {
    dateTime(value: string | number | Date) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '—';
      return new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: safeTimeZone,
      }).format(date);
    },
    number(value: number, options?: Intl.NumberFormatOptions) {
      return new Intl.NumberFormat(locale, options).format(value);
    },
    currency(value: number, currency = 'TRY') {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
      }).format(value);
    },
    percent(value: number) {
      return new Intl.NumberFormat(locale, {
        style: 'percent',
        maximumFractionDigits: 2,
      }).format(value);
    },
  };
}

export function parseLocalizedDecimal(
  value: string,
  locale: AtlasLocale = defaultLocale,
) {
  const normalized =
    locale === 'tr-TR'
      ? value.replaceAll('.', '').replace(',', '.')
      : value.replaceAll(',', '');
  if (!/^[+-]?(?:\d+|\d*\.\d+)$/u.test(normalized.trim())) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function localizeReasonCode(
  reasonCode: string,
  locale: AtlasLocale = defaultLocale,
) {
  const labels: Record<AtlasLocale, Readonly<Record<string, string>>> = {
    'tr-TR': {
      forbidden: 'Bu işlem için yetkiniz yok',
      stale_data: 'Piyasa verisi güncel değil',
      rate_limited: 'İstek sınırı aşıldı',
    },
    'en-US': {
      forbidden: 'You are not authorized for this action',
      stale_data: 'Market data is stale',
      rate_limited: 'Request limit exceeded',
    },
  };
  return labels[locale][reasonCode] ?? translate('unknownReason', {}, locale);
}

function validTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
