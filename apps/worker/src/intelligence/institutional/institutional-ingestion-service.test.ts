import { describe, expect, it, vi } from 'vitest';

import type { ExternalIdentityMapping } from '@atlas/domain';
import {
  InstitutionalIngestionError,
  InstitutionalIngestionService,
} from './institutional-ingestion-service';
import type {
  InstitutionalFlowProviderAdapter,
  InstitutionalIngestionStore,
  SettlementProviderAdapter,
} from './contracts';

const providerId = '10000000-0000-4000-8000-000000000001';
const mappings: readonly ExternalIdentityMapping[] = [
  mapping('INSTRUMENT', 'ASELS', '20000000-0000-4000-8000-000000000001'),
  mapping('INSTITUTION', 'BROKER', '30000000-0000-4000-8000-000000000001'),
];
const license = {
  licenseClass: 'DELAYED_DISPLAY_ONLY' as const,
  redistribution: ['EXPORT_PROHIBITED' as const],
};
const flowProvider: InstitutionalFlowProviderAdapter = {
  code: 'test-provider',
  dataset: 'akd-v1',
  deliveryMode: 'DELAYED',
  license,
  fetchInstitutionalFlows: vi.fn().mockResolvedValue({
    items: [
      {
        instrumentExternalId: 'ASELS',
        institutionExternalId: 'BROKER',
        tradeDate: '2026-08-14',
        buyValue: '20',
        sellValue: '5',
        currency: 'TRY',
        asOf: '2026-08-14T17:00:00Z',
        dataCutoff: '2026-08-14T17:00:00Z',
        sourceTimestamp: '2026-08-14T17:01:00Z',
        availableAt: '2026-08-14T17:02:00Z',
        providerRevision: 'r1',
      },
    ],
    nextCursor: 'next',
  }),
};
const settlementProvider: SettlementProviderAdapter = {
  code: 'test-provider',
  dataset: 'settlement-v1',
  deliveryMode: 'DELAYED',
  license,
  fetchSettlements: vi.fn().mockResolvedValue({
    items: [
      {
        instrumentExternalId: 'ASELS',
        institutionExternalId: 'BROKER',
        settlementDate: '2026-08-15',
        holdingQuantity: '100',
        residency: 'UNKNOWN',
        dataCutoff: '2026-08-15T17:00:00Z',
        sourceTimestamp: '2026-08-15T17:01:00Z',
        availableAt: '2026-08-14T17:02:00Z',
        providerRevision: 'r1',
      },
    ],
    nextCursor: null,
  }),
};
function store(completed = false): InstitutionalIngestionStore {
  return {
    resolveContext: vi.fn().mockResolvedValue({
      providerId,
      providerConnectionId: '40000000-0000-4000-8000-000000000001',
      mappings,
    }),
    beginRun: vi.fn().mockResolvedValue({
      runId: '50000000-0000-4000-8000-000000000001',
      completed,
    }),
    persistFlows: vi.fn().mockResolvedValue({ inserted: 1, duplicates: 0 }),
    persistSettlements: vi
      .fn()
      .mockResolvedValue({ inserted: 1, duplicates: 0 }),
    completeRun: vi.fn().mockResolvedValue(undefined),
    failRun: vi.fn().mockResolvedValue(undefined),
  };
}
const input = {
  from: new Date('2026-08-01T00:00:00Z'),
  to: new Date('2026-08-14T00:00:00Z'),
  cursor: null,
  limit: 200,
  correlationId: 'test',
};

describe('institutional ingestion workers', () => {
  it('normalizes and persists institutional flow', async () => {
    const target = store();
    expect(
      await new InstitutionalIngestionService(
        flowProvider,
        settlementProvider,
        target,
        () => new Date('2026-08-16T00:00:00Z'),
      ).executeFlow(input),
    ).toMatchObject({ inserted: 1, rejected: 0 });
  });
  it('normalizes and persists settlement separately', async () => {
    const target = store();
    expect(
      await new InstitutionalIngestionService(
        flowProvider,
        settlementProvider,
        target,
        () => new Date('2026-08-16T00:00:00Z'),
      ).executeSettlement(input),
    ).toMatchObject({ inserted: 1 });
  });
  it('fails closed when the flow provider is missing', () =>
    expect(
      new InstitutionalIngestionService(
        null,
        settlementProvider,
        store(),
      ).executeFlow(input),
    ).rejects.toMatchObject({
      code: 'INSTITUTIONAL_PROVIDER_REQUIRED',
      retryable: false,
    }));
  it('fails closed when the settlement provider is missing', () =>
    expect(
      new InstitutionalIngestionService(
        flowProvider,
        null,
        store(),
      ).executeSettlement(input),
    ).rejects.toMatchObject({
      code: 'SETTLEMENT_PROVIDER_REQUIRED',
      retryable: false,
    }));
  it('rejects unbounded backfills', () =>
    expect(
      new InstitutionalIngestionService(
        flowProvider,
        settlementProvider,
        store(),
      ).executeFlow({ ...input, from: new Date('2025-01-01T00:00:00Z') }),
    ).rejects.toBeInstanceOf(InstitutionalIngestionError));
  it('is checkpointable through provider cursors', async () =>
    expect(
      (
        await new InstitutionalIngestionService(
          flowProvider,
          settlementProvider,
          store(),
          () => new Date('2026-08-16T00:00:00Z'),
        ).executeFlow(input)
      ).nextCursor,
    ).toBe('next'));
  it('is idempotent for completed run identities', async () =>
    expect(
      await new InstitutionalIngestionService(
        flowProvider,
        settlementProvider,
        store(true),
      ).executeFlow(input),
    ).toMatchObject({ replayed: true, inserted: 0 }));
  it('rejects malformed records without leaking raw payload', async () => {
    const malformed = {
      ...flowProvider,
      fetchInstitutionalFlows: vi
        .fn()
        .mockResolvedValue({ items: [{ bad: 'payload' }], nextCursor: null }),
    } as unknown as InstitutionalFlowProviderAdapter;
    expect(
      await new InstitutionalIngestionService(
        malformed,
        settlementProvider,
        store(),
        () => new Date('2026-08-16T00:00:00Z'),
      ).executeFlow(input),
    ).toMatchObject({ rejected: 1 });
  });
});
function mapping(
  entityType: ExternalIdentityMapping['entityType'],
  externalId: string,
  canonicalEntityId: string,
): ExternalIdentityMapping {
  return {
    providerId,
    entityType,
    externalId,
    canonicalEntityId,
    validFrom: new Date('2020-01-01T00:00:00Z'),
    validTo: null,
    confidence: 1,
    status: 'RESOLVED',
    source: 'TEST',
    manualReviewState: 'APPROVED',
  };
}
