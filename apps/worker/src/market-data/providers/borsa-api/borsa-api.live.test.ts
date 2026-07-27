import { describe, expect, it } from 'vitest';

import { BorsaApiAdapter } from './borsa-api-adapter';

const live = process.env.RUN_LIVE_BORSA_API_TESTS === 'true';
const pilotSymbols = ['THYAO', 'GARAN', 'AKBNK', 'EREGL', 'TUPRS'] as const;

if (live)
  describe('borsa-api live contract', () => {
    it.each(pilotSymbols)(
      'returns valid delayed daily OHLCV for %s',
      async (symbol) => {
        const adapter = new BorsaApiAdapter();
        const to = new Date();
        const from = new Date(to.getTime() - 14 * 86_400_000);
        const result = await adapter.fetchBars({
          providerSymbol: symbol,
          timeframe: '1d',
          from,
          to,
        });
        expect(result.bars.length).toBeGreaterThan(0);
        for (const bar of result.bars) {
          expect(bar.providerSymbol).toBe(symbol);
          expect(Number(bar.volume)).toBeGreaterThanOrEqual(0);
          expect(Number(bar.high)).toBeGreaterThanOrEqual(
            Math.max(Number(bar.open), Number(bar.close), Number(bar.low)),
          );
          expect(Number(bar.low)).toBeLessThanOrEqual(
            Math.min(Number(bar.open), Number(bar.close), Number(bar.high)),
          );
          expect(bar.qualityFlags).toEqual(
            expect.arrayContaining(['DELAYED', 'UNOFFICIAL_SOURCE']),
          );
        }
      },
      30_000,
    );
  });
