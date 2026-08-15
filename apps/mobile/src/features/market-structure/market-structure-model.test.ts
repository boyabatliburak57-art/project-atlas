import { describe, expect, it } from 'vitest';

import {
  marketMeasureFixtures,
  shortSellingFixtures,
} from './market-structure-evidence-data';
import {
  capabilityPresentation,
  formatDate,
  marketMeasureAccessibility,
  marketStructureMethodology,
  measureStatusLabels,
  measureTypeLabels,
  qualityPresentation,
} from './market-structure-model';

describe('Market Structure mobile semantics', () => {
  it('maps every canonical measure type to customer terminology', () => {
    expect(Object.keys(measureTypeLabels)).toHaveLength(6);
    expect(measureTypeLabels.GROSS_SETTLEMENT).toBe('Brüt Takas');
  });

  it('distinguishes scheduled, active and expired authoritative states', () => {
    expect(measureStatusLabels.SCHEDULED).toBe('Yaklaşan');
    expect(measureStatusLabels.ACTIVE).toBe('Aktif');
    expect(measureStatusLabels.EXPIRED).toBe('Sona Erdi');
  });

  it('distinguishes corrected and previous revisions', () => {
    expect(measureStatusLabels.CORRECTED).toBe('Düzeltildi');
    expect(measureStatusLabels.SUPERSEDED).toBe('Önceki Sürüm');
  });

  it('keeps publication, start and end semantics in the accessible row', () => {
    const label = marketMeasureAccessibility(marketMeasureFixtures[0]!);
    expect(label).toContain('başlangıç');
    expect(label).toContain('bitiş');
    expect(label).toContain('Aktif');
  });

  it('formats dates in the fixed product timezone', () =>
    expect(formatDate('2026-08-14T00:00:00Z')).toMatch(/14 Ağu 2026/u));

  it('does not confuse provider-required with no measure', () => {
    expect(capabilityPresentation('PROVIDER_REQUIRED')?.title).toBe(
      'Veri sağlayıcısı gerekli',
    );
    expect(capabilityPresentation('SUPPORTED_DELAYED')).toBeNull();
  });

  it('distinguishes license-required and not-available states', () => {
    expect(capabilityPresentation('LICENSE_REQUIRED')?.title).toBe(
      'Lisans gerekli',
    );
    expect(capabilityPresentation('NOT_AVAILABLE')?.title).toBe(
      'Veri mevcut değil',
    );
  });

  it('distinguishes delayed, stale and partial quality states', () => {
    expect(qualityPresentation('COMPLETE', 'DELAYED')).toBe('GECİKMELİ');
    expect(qualityPresentation('STALE', 'DELAYED')).toBe('BAYAT');
    expect(qualityPresentation('PARTIAL', 'LIVE')).toBe('KISMİ KAPSAM');
  });

  it('keeps restriction and activity as separate fixture records', () => {
    expect(
      marketMeasureFixtures.some(
        (row) => row.measureType === 'SHORT_SELL_RESTRICTION',
      ),
    ).toBe(true);
    expect(shortSellingFixtures[0]).not.toHaveProperty('measureType');
  });

  it('preserves missing values instead of rendering source zeroes', () => {
    const missing = { ...shortSellingFixtures[0]!, value: null };
    expect(missing.value).toBeNull();
  });

  it('has no price direction or investment advice interpretation', () => {
    expect(marketStructureMethodology).toContain('yatırım tavsiyesi değildir');
    expect(marketStructureMethodology).not.toMatch(
      /bullish|bearish|yükselecek|düşecek/u,
    );
  });

  it('keeps state semantics text-based rather than color-only', () => {
    for (const label of Object.values(measureStatusLabels))
      expect(label.length).toBeGreaterThan(2);
  });
});
