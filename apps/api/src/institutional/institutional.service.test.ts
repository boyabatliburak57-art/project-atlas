import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';

import type { MarketRateLimiter } from '../market/market-overview.ports';
import type { InstitutionalReader } from './institutional.ports';
import { InstitutionalService } from './institutional.service';

const institutionId = '31000000-0000-4000-8000-000000000001';
function reader(
  overrides: Partial<InstitutionalReader> = {},
): InstitutionalReader {
  return {
    searchInstitutions: vi
      .fn()
      .mockResolvedValue([
        { id: institutionId, canonicalName: 'Atlas Test Yatırım' },
      ]),
    overview: vi.fn().mockResolvedValue({ topBuyers: [], topSellers: [] }),
    instrumentFlow: vi.fn().mockResolvedValue([]),
    institution: vi.fn().mockResolvedValue({
      id: institutionId,
      canonicalName: 'Atlas Test Yatırım',
    }),
    institutionFlows: vi.fn().mockResolvedValue([]),
    settlement: vi.fn().mockResolvedValue([]),
    institutionHoldings: vi.fn().mockResolvedValue([]),
    settlementHistory: vi.fn().mockResolvedValue([]),
    capability: vi.fn().mockResolvedValue({
      availability: 'PROVIDER_REQUIRED',
      health: 'UNAVAILABLE',
      checkedAt: null,
    }),
    ...overrides,
  };
}
function service(overrides: Partial<InstitutionalReader> = {}) {
  const limiter: MarketRateLimiter = { consume: vi.fn() };
  return new InstitutionalService(
    reader(overrides),
    limiter,
    new ConfigService({ AUTH_SESSION_HMAC_KEY: 'a'.repeat(64) }),
  );
}

describe('InstitutionalService bounded public queries', () => {
  it('returns canonical institution results', async () =>
    expect(
      (await service().search('client', { q: 'Atlas' })).data.items,
    ).toHaveLength(1));
  it('rejects short institution queries', () =>
    expect(service().search('client', { q: 'a' })).rejects.toBeInstanceOf(
      BadRequestException,
    ));
  it('rejects oversized institution queries', () =>
    expect(
      service().search('client', { q: 'a'.repeat(65) }),
    ).rejects.toBeInstanceOf(BadRequestException));
  it('returns provider-required metadata without fixtures', async () =>
    expect((await service().overview('client', {})).meta.providerState).toBe(
      'PROVIDER_REQUIRED',
    ));
  it('keeps product availability separate from runtime health', async () => {
    const meta = (await service().overview('client', {})).meta;
    expect(meta.providerState).not.toBe(meta.runtimeHealth);
  });
  it('rejects unallowlisted AKD sort keys', () =>
    expect(
      service().instrumentFlow('client', 'ASELS', { sort: 'DROP TABLE' }),
    ).rejects.toBeInstanceOf(BadRequestException));
  it('rejects malformed symbols', () =>
    expect(
      service().instrumentFlow('client', '../secret', {}),
    ).rejects.toBeInstanceOf(BadRequestException));
  it('bounds page sizes', () =>
    expect(
      service().instrumentFlow('client', 'ASELS', { limit: 500 }),
    ).rejects.toBeInstanceOf(BadRequestException));
  it('bounds custom ranges to one year', () =>
    expect(
      service().overview('client', { from: '2020-01-01', to: '2026-01-01' }),
    ).rejects.toBeInstanceOf(BadRequestException));
  it('rejects invalid settlement sort keys', () =>
    expect(
      service().settlement('client', 'ASELS', { sort: 'unsafe' }),
    ).rejects.toBeInstanceOf(BadRequestException));
  it('returns institution details with bounded flows', async () =>
    expect(
      (await service().institution('client', institutionId, { period: '5D' }))
        .data.institution,
    ).toMatchObject({ id: institutionId }));
  it('does not turn a missing institution into public provider metadata', () =>
    expect(
      service({ institution: vi.fn().mockResolvedValue(null) }).institution(
        'client',
        institutionId,
        {},
      ),
    ).rejects.toBeInstanceOf(NotFoundException));
  it('rejects arbitrary institution identifiers', () =>
    expect(
      service().institution('client', 'vendor-broker-1', {}),
    ).rejects.toBeInstanceOf(BadRequestException));
  it('rejects invalid settlement institution filters', () =>
    expect(
      service().settlementHistory('client', 'ASELS', {
        institutionId: 'vendor-id',
      }),
    ).rejects.toBeInstanceOf(BadRequestException));
  it('never exposes provider selection as a query field', () =>
    expect(
      service().settlement('client', 'ASELS', { provider: 'internal-adapter' }),
    ).rejects.toBeInstanceOf(BadRequestException));
  it('uses source-classified foreign settlement only', async () => {
    const settlement = vi.fn().mockResolvedValue([]);
    await service({ settlement }).foreignSettlement('client', 'ASELS', {});
    expect(settlement).toHaveBeenCalledWith(
      expect.objectContaining({ residency: 'FOREIGN' }),
    );
  });
  it('limits rolling periods by actual observed trading sessions', async () => {
    const instrumentFlow = vi.fn().mockResolvedValue([]);
    await service({ instrumentFlow }).instrumentFlow('client', 'ASELS', {
      period: '5D',
    });
    expect(instrumentFlow).toHaveBeenCalledWith(
      expect.objectContaining({ tradingSessionLimit: 5 }),
    );
  });
});
