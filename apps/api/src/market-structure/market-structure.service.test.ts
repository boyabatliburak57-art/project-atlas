import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import type { MarketRateLimiter } from '../market/market-overview.ports';
import type { MarketStructureReader } from './market-structure.ports';
import { MarketStructureService } from './market-structure.service';

function reader(
  overrides: Partial<MarketStructureReader> = {},
): MarketStructureReader {
  return {
    measures: vi.fn().mockResolvedValue([]),
    event: vi.fn().mockResolvedValue(null),
    shortSelling: vi.fn().mockResolvedValue([]),
    capability: vi.fn().mockResolvedValue({
      availability: 'PROVIDER_REQUIRED',
      health: 'UNAVAILABLE',
      checkedAt: null,
    }),
    ...overrides,
  };
}
function service(overrides: Partial<MarketStructureReader> = {}) {
  const limiter: MarketRateLimiter = { consume: vi.fn() };
  return new MarketStructureService(
    reader(overrides),
    limiter,
    new ConfigService({ AUTH_SESSION_HMAC_KEY: 'a'.repeat(64) }),
  );
}
describe('MarketStructureService bounded API', () => {
  it('returns active measures with fail-closed capability metadata', async () =>
    expect((await service().active('client', 'ASELS')).meta.capability).toBe(
      'PROVIDER_REQUIRED',
    ));
  it('uses canonical server-side active mode', async () => {
    const measures = vi.fn().mockResolvedValue([]);
    await service({ measures }).active('client', 'ASELS');
    expect(measures).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'ACTIVE', symbol: 'ASELS' }),
    );
  });
  it('uses canonical bounded history mode', async () => {
    const measures = vi.fn().mockResolvedValue([]);
    await service({ measures }).history('client', 'ASELS', { limit: 20 });
    expect(measures).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'HISTORY', symbol: 'ASELS', limit: 21 }),
    );
  });
  it('uses one market-wide projection instead of symbol fan-out', async () => {
    const measures = vi.fn().mockResolvedValue([]);
    await service({ measures }).marketWide('client', { limit: 20 });
    expect(measures).toHaveBeenCalledTimes(1);
    expect(measures).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'MARKET_WIDE', symbol: null }),
    );
  });
  it('uses the active projection for symbol summaries', async () => {
    const measures = vi.fn().mockResolvedValue([]);
    await service({ measures }).summary('client', 'ASELS');
    expect(measures).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'ACTIVE', symbol: 'ASELS' }),
    );
  });
  it('rejects malformed symbols', () =>
    expect(service().active('client', '../secret')).rejects.toBeInstanceOf(
      BadRequestException,
    ));
  it('rejects unknown measure filters', () =>
    expect(
      service().history('client', 'ASELS', { types: 'DROP TABLE' }),
    ).rejects.toBeInstanceOf(BadRequestException));
  it('rejects unknown status filters', () =>
    expect(
      service().history('client', 'ASELS', { statuses: 'UNKNOWN' }),
    ).rejects.toBeInstanceOf(BadRequestException));
  it('bounds date ranges', () =>
    expect(
      service().history('client', 'ASELS', {
        from: '2020-01-01',
        to: '2026-01-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException));
  it('bounds page size', () =>
    expect(
      service().marketWide('client', { limit: 1000 }),
    ).rejects.toBeInstanceOf(BadRequestException));
  it('rejects arbitrary provider selection', () =>
    expect(
      service().marketWide('client', { provider: 'internal' }),
    ).rejects.toBeInstanceOf(BadRequestException));
  it('returns no fabricated short activity when provider is gated', async () =>
    expect(
      (
        await service().shortSelling('client', 'ASELS', {
          from: '2026-08-01',
          to: '2026-08-15',
        })
      ).data.items,
    ).toEqual([]));
  it('queries activity only when supported', async () => {
    const shortSelling = vi.fn().mockResolvedValue([{ quantity: '10' }]);
    const value = await service({
      shortSelling,
      capability: vi.fn().mockResolvedValue({
        availability: 'SUPPORTED_DELAYED',
        health: 'HEALTHY',
        checkedAt: new Date(),
      }),
    }).shortSelling('client', 'ASELS', {
      from: '2026-08-01',
      to: '2026-08-15',
    });
    expect(value.data.items).toHaveLength(1);
  });
  it('rejects oversized short-selling ranges', () =>
    expect(
      service().shortSelling('client', 'ASELS', {
        from: '2020-01-01',
        to: '2026-08-15',
      }),
    ).rejects.toBeInstanceOf(BadRequestException));
  it('rejects reversed short-selling ranges', () =>
    expect(
      service().shortSelling('client', 'ASELS', {
        from: '2026-08-15',
        to: '2026-08-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException));
  it('rejects malformed cursors', () =>
    expect(
      service().history('client', 'ASELS', {
        cursor: 'not-a-signed-cursor',
      }),
    ).rejects.toBeInstanceOf(BadRequestException));
  it('does not expose raw provider payload through response data', async () => {
    const value = await service({
      measures: vi
        .fn()
        .mockResolvedValue([{ measureType: 'GROSS_SETTLEMENT' }]),
    }).active('client', 'ASELS');
    expect(value.data.items[0]).not.toHaveProperty('rawPayload');
  });
  it('returns the canonical MarketEvent linked to a measure revision', async () => {
    const revisionId = '62000000-0000-4000-8000-000000000001';
    const value = await service({
      event: vi.fn().mockResolvedValue({
        revisionId,
        eventType: 'MARKET_MEASURE',
      }),
    }).event('client', revisionId);
    expect(value.data).toEqual({
      revisionId,
      eventType: 'MARKET_MEASURE',
    });
  });
  it('rejects malformed canonical MarketEvent identifiers', () =>
    expect(service().event('client', '../event')).rejects.toBeInstanceOf(
      BadRequestException,
    ));
});
