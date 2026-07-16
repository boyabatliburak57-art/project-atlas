import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  DataWarning,
  errorMessage,
  formatMoney,
  formatPercent,
  formatSignedMoney,
  humanReason,
  Metric,
} from './portfolio-ui';
import type { PortfolioValuation } from './types';

describe('portfolio UI financial and accessibility contracts', () => {
  it('does not represent missing money or risk values as zero', () => {
    expect(formatMoney(null)).toBe('Veri yok');
    expect(formatMoney(undefined)).toBe('Veri yok');
    expect(humanReason('INSUFFICIENT_OBSERVATIONS')).toBe('yetersiz gözlem');
  });

  it('keeps locale formatting separate from decimal API strings', () => {
    expect(formatMoney('1234.5000000000')).toBe('1.234,50 ₺');
    expect(formatSignedMoney('150')).toBe('+150,00 ₺');
    expect(formatPercent('0.125')).toBe('+12,50%');
  });

  it('exposes partial valuation as visible status content', () => {
    render(<DataWarning valuation={partialValuation()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Kısmi değerleme');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Eksik fiyatlar sıfır kabul edilmedi',
    );
  });

  it('uses semantic definition list content for metrics', () => {
    render(
      <dl>
        <Metric label="Gerçekleşmiş P&L" value="+150,00 ₺" tone="positive" />
      </dl>,
    );
    expect(screen.getByText('Gerçekleşmiş P&L').tagName).toBe('DT');
    expect(screen.getByText('+150,00 ₺').tagName).toBe('DD');
  });

  it('maps ownership errors to stable user-facing copy', () => {
    expect(errorMessage(new Error('PORTFOLIO_ACCESS_DENIED'))).toContain(
      'PORTFOLIO_ACCESS_DENIED',
    );
  });
});

function partialValuation(): PortfolioValuation {
  return {
    portfolioId: '00000000-0000-4000-8000-000000000049',
    ledgerVersion: 1,
    valuationAt: '2026-07-16T12:00:00.000Z',
    dataCutoffAt: '2026-07-16T11:00:00.000Z',
    pricePolicyVersion: 'closed-daily-v1',
    mode: 'official',
    persistable: true,
    status: 'partial',
    cashBalance: '100',
    positionsMarketValue: '0',
    totalValue: '100',
    realizedPnl: '0',
    unrealizedPnl: null,
    netContributions: '100',
    missingPriceCount: 1,
    warnings: [
      {
        code: 'MISSING_PRICE',
        instrumentId: '10000000-0000-4000-8000-000000000049',
      },
    ],
    positions: [],
  };
}
