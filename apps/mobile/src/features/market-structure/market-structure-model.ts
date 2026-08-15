import type {
  MarketMeasureRow,
  MeasureStatus,
  MeasureType,
} from './market-structure-api';

export const measureTypeLabels: Readonly<Record<MeasureType, string>> = {
  SHORT_SELL_RESTRICTION: 'Açığa Satış / Kredili İşlem Tedbiri',
  MARGIN_TRADING_RESTRICTION: 'Kredili İşlem Tedbiri',
  GROSS_SETTLEMENT: 'Brüt Takas',
  SINGLE_PRICE: 'Tek Fiyat',
  ORDER_PACKAGE_MEASURE: 'Emir Paketi Tedbiri',
  OTHER_EXCHANGE_MEASURE: 'Diğer Tedbir',
};

export const measureStatusLabels: Readonly<Record<MeasureStatus, string>> = {
  SCHEDULED: 'Yaklaşan',
  ACTIVE: 'Aktif',
  EXPIRED: 'Sona Erdi',
  CORRECTED: 'Düzeltildi',
  SUPERSEDED: 'Önceki Sürüm',
  CANCELLED: 'İptal Edildi',
};

export function marketMeasureAccessibility(row: MarketMeasureRow) {
  const end = row.effectiveUntil
    ? `bitiş ${formatDate(row.effectiveUntil)}`
    : 'bitiş tarihi belirtilmemiş';
  return `${row.symbol}, ${measureTypeLabels[row.measureType]}, ${measureStatusLabels[row.status]}, başlangıç ${formatDate(row.effectiveFrom)}, ${end}`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Istanbul',
  }).format(new Date(value));
}

export function capabilityPresentation(capability: string) {
  if (capability === 'LICENSE_REQUIRED')
    return {
      title: 'Lisans gerekli',
      detail: 'Bu veri için gösterim lisansı gerekli.',
    };
  if (capability === 'NOT_AVAILABLE')
    return {
      title: 'Veri mevcut değil',
      detail: 'Bu veri kaynağı şu anda sunulmuyor.',
    };
  if (capability.startsWith('SUPPORTED_')) return null;
  return {
    title: 'Veri sağlayıcısı gerekli',
    detail:
      'Piyasa tedbirlerini görüntülemek için veri sağlayıcısı bağlantısı gerekli.',
  };
}

export function qualityPresentation(
  quality: string | undefined,
  deliveryMode: 'LIVE' | 'DELAYED' | undefined,
) {
  if (quality === 'STALE') return 'BAYAT';
  if (quality === 'PARTIAL') return 'KISMİ KAPSAM';
  if (deliveryMode === 'DELAYED') return 'GECİKMELİ';
  return 'GÜNCEL';
}

export const marketStructureMethodology =
  'Yayın tarihi kaydın duyurulduğu, başlangıç ve bitiş ise tedbirin geçerli olduğu dönemi gösterir. Açığa satış tedbiri ile açığa satış aktivitesi ayrı veri kümeleridir; bu bilgiler yatırım tavsiyesi değildir.';
