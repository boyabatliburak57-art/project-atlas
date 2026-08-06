import { describe, expect, it } from 'vitest';
import {
  IdempotentTransactions,
  PositionPages,
  canonicalDecimal,
  maskFinancialValue,
  mutationAllowed,
  redactPortfolioTelemetry,
  riskAvailability,
  safePortfolioShare,
  validateTransaction,
} from './portfolio-model';

describe('portfolio financial input', () => {
  it.each([
    ['1.234,56', '1234.56'],
    ['0,125', '0.125'],
    ['42', '42'],
  ])('canonicalizes %s', (input, output) =>
    expect(canonicalDecimal(input)).toBe(output),
  );
  it.each(['NaN', '1e5', '--1', '1234567890123456'])(
    'rejects invalid decimal %s',
    (input) => expect(() => canonicalDecimal(input)).toThrow(),
  );
  it('rejects negative values by default', () =>
    expect(() => canonicalDecimal('-1')).toThrow('NEGATIVE_NOT_ALLOWED'));
  it('accepts bounded buy records', () =>
    expect(
      validateTransaction({ type: 'BUY', quantity: '10', unitPrice: '281,40' }),
    ).toBeTruthy());
  it('accepts bounded sell records', () =>
    expect(
      validateTransaction({
        type: 'SELL',
        quantity: '2',
        unitPrice: '300',
        availableQuantity: '10',
      }),
    ).toBeTruthy());
  it('prevents excess sells', () =>
    expect(() =>
      validateTransaction({
        type: 'SELL',
        quantity: '11',
        unitPrice: '300',
        availableQuantity: '10',
      }),
    ).toThrow('PORTFOLIO_INSUFFICIENT_POSITION'));
  it.each(['BUY', 'SELL'] as const)('rejects zero quantity for %s', (type) =>
    expect(() =>
      validateTransaction({
        type,
        quantity: '0',
        unitPrice: '3',
        availableQuantity: '4',
      }),
    ).toThrow('TRANSACTION_BOUNDS'),
  );
  it.each(['CASH_DEPOSIT', 'CASH_WITHDRAWAL', 'DIVIDEND'] as const)(
    'validates %s',
    (type) =>
      expect(validateTransaction({ type, cashAmount: '25,50' })).toBeTruthy(),
  );
});

describe('idempotency and cursor invariants', () => {
  it('deduplicates a transaction request', () => {
    const ledger = new IdempotentTransactions();
    let count = 0;
    expect(ledger.create('key', () => `t-${++count}`)).toBe(
      ledger.create('key', () => `t-${++count}`),
    );
    expect(count).toBe(1);
  });
  it('keeps distinct transaction keys separate', () => {
    const ledger = new IdempotentTransactions();
    expect(ledger.create('a', () => '1')).not.toBe(
      ledger.create('b', () => '2'),
    );
  });
  it('appends stable cursor pages once', () => {
    const pages = new PositionPages<{ id: string }>();
    pages.append('start', [{ id: 'a' }]);
    pages.append('next', [{ id: 'b' }]);
    expect(pages.list()).toEqual([{ id: 'a' }, { id: 'b' }]);
  });
  it('does not repeat a cursor', () => {
    const pages = new PositionPages<{ id: string }>();
    pages.append('start', [{ id: 'a' }]);
    pages.append('start', [{ id: 'b' }]);
    expect(pages.list()).toEqual([{ id: 'a' }]);
  });
  it('deduplicates a concurrent position id', () => {
    const pages = new PositionPages<{ id: string }>();
    pages.append('a', [{ id: 'p' }]);
    pages.append('b', [{ id: 'p' }]);
    expect(pages.list()).toHaveLength(1);
  });
});

describe('privacy and availability', () => {
  it('does not expose hidden values to accessibility', () =>
    expect(maskFinancialValue(true, '₺100').accessibility).not.toContain(
      '100',
    ));
  it('retains visible accessibility values', () =>
    expect(maskFinancialValue(false, '₺100').accessibility).toBe('₺100'));
  it('shares no portfolio values', () =>
    expect(safePortfolioShare('atlas://portfolio')).not.toMatch(
      /₺|position|p\/l/iu,
    ));
  it('rejects arbitrary share routes', () =>
    expect(() => safePortfolioShare('https://evil.test')).toThrow(
      'SHARE_LINK_NOT_ALLOWED',
    ));
  it('blocks offline mutation', () =>
    expect(() => mutationAllowed(false)).toThrow('OFFLINE_MUTATION_BLOCKED'));
  it('allows online mutation', () => expect(mutationAllowed(true)).toBe(true));
  it('redacts financial telemetry', () =>
    expect(
      redactPortfolioTelemetry('portfolio_screen_viewed', {
        portfolioValue: 100,
        pnl: 2,
        timeframe: '1M',
      }).attributes,
    ).toEqual({ timeframe: '1M' }));
  it('requires data for volatility', () =>
    expect(riskAvailability(12, false, false)).toBe('NOT_EVALUABLE'));
  it('requires a benchmark for beta', () =>
    expect(riskAvailability(250, true, false)).toBe('BENCHMARK_UNAVAILABLE'));
  it('allows adequately supported risk', () =>
    expect(riskAvailability(250, false, false)).toBe('AVAILABLE'));
});
