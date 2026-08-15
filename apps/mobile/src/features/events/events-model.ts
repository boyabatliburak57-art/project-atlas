import type { EventCategory, KapEventSummary } from './events-api';

export const categoryLabels: Readonly<Record<EventCategory, string>> = {
  FINANCIAL_RESULT: 'Finansal Sonuçlar',
  MATERIAL_EVENT: 'Özel Durumlar',
  NEW_BUSINESS: 'Yeni İş',
  BUYBACK: 'Geri Alım',
  DIVIDEND: 'Temettü',
  CAPITAL_INCREASE: 'Sermaye Artırımı',
  CAPITAL_DECREASE: 'Sermaye Azaltımı',
  SPLIT: 'Bölünme',
  MERGER: 'Birleşme',
  ACQUISITION: 'Satın Alma',
  SHARE_TRANSACTION: 'Pay İşlemi',
  MANAGEMENT_CHANGE: 'Yönetim Değişikliği',
  IPO: 'Halka Arz',
  GUIDANCE: 'Beklenti',
  OTHER: 'Diğer',
};

export const featuredCategories: readonly EventCategory[] = [
  'FINANCIAL_RESULT',
  'MATERIAL_EVENT',
  'NEW_BUSINESS',
  'DIVIDEND',
  'BUYBACK',
  'CAPITAL_INCREASE',
  'MERGER',
  'IPO',
  'OTHER',
];

export function eventAccessibilityLabel(event: KapEventSummary): string {
  const symbol =
    event.instruments[0]?.symbol ?? event.companies[0]?.name ?? 'Şirket';
  const correction = event.corrected ? ', düzeltilmiş bildirim' : '';
  const relevance =
    event.relevance === 'BOTH'
      ? ', takip listesi ve portföyle ilgili'
      : event.relevance === 'WATCHLIST_RELEVANT'
        ? ', takip listesiyle ilgili'
        : event.relevance === 'PORTFOLIO_RELEVANT'
          ? ', portföyle ilgili'
          : '';
  return `${symbol}, ${categoryLabels[event.category]}, ${event.title}${correction}${relevance}`;
}

export function safeSourceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function safeKapTelemetry(
  event: string,
): Readonly<Record<string, string>> {
  return { event };
}
