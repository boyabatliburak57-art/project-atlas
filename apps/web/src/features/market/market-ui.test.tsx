import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MarketApiError, safeMarketError } from './api';
import {
  DirectionValue,
  formatNumber,
  FreshnessBanner,
  MarketState,
} from './market-ui';

describe('market intelligence UI contracts', () => {
  it('shows missing financial and market values as data missing, never zero', () => {
    expect(formatNumber(null)).toBe('Veri yok');
    expect(formatNumber(undefined)).toBe('Veri yok');
    render(<DirectionValue value={null} />);
    expect(screen.getByText('Veri yok')).toBeVisible();
  });

  it('communicates direction with text as well as color', () => {
    render(<DirectionValue value="1.25" />);
    expect(screen.getByText('Yükseliş')).toBeVisible();
    expect(screen.getByText(/\+1,25%/u)).toBeVisible();
  });

  it('announces partial and stale freshness states', () => {
    const { rerender } = render(
      <FreshnessBanner
        meta={{
          generationId: 'g1',
          dataCutoffAt: '2026-07-18T15:00:00.000Z',
          status: 'partial',
          partial: true,
          stale: false,
          excludedCount: 10,
        }}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Kısmi piyasa görünümü',
    );
    rerender(
      <FreshnessBanner
        meta={{
          generationId: 'g1',
          dataCutoffAt: '2026-07-18T15:00:00.000Z',
          status: 'stale',
          partial: true,
          stale: true,
        }}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Gecikmiş veri');
  });

  it('uses accessible status and alert roles', () => {
    const view = render(<MarketState kind="loading">Yükleniyor</MarketState>);
    expect(within(view.container).getByRole('status')).toBeVisible();
    view.rerender(<MarketState kind="error">Güvenli hata</MarketState>);
    expect(within(view.container).getByRole('alert')).toHaveTextContent(
      'Güvenli hata',
    );
  });

  it('maps ownership and provider failures to safe public copy', () => {
    expect(
      safeMarketError(new MarketApiError('CHART_MARKER_ACCESS_DENIED', 403)),
    ).toContain('Özel işaretler gizlendi');
    expect(
      safeMarketError(new MarketApiError('PROVIDER_RAW_TIMEOUT', 500)),
    ).not.toContain('PROVIDER_RAW_TIMEOUT');
  });
});
