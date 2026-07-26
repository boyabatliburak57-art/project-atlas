import {
  buildTtm,
  selectFundamentalRevisionAt,
  type NormalizedFundamentalStatement,
} from '@atlas/domain';
import { describe, expect, it } from 'vitest';

import {
  shouldApplyCorporateAction,
  type ProviderCorporateAction,
} from '../../corporate-actions';
import { normalizeStatement } from '../../fundamentals';
import { ProviderContractError } from '../errors';
import type {
  ProviderHttpRequest,
  ProviderHttpResponse,
  ProviderHttpTransport,
} from './contracts';
import {
  VendorFinancialProviderAdapter,
  type FinancialProviderConfiguration,
} from './financial-provider-adapter';

const configuration: FinancialProviderConfiguration = {
  code: 'selected-financial-vendor',
  baseUrl: 'https://financial-data.invalid/v1/',
  fundamentalsPath: 'fundamentals',
  corporateActionsPath: 'corporate-actions',
  credential: {
    store: 'secretStore',
    reference: 'providers/selected-financial-vendor',
  },
  capabilities: {
    supportsAnnual: true,
    supportsQuarterly: true,
    supportedCurrencies: ['TRY', 'USD'],
    supportedMetrics: ['revenue', 'netIncome', 'totalAssets'],
    revisionMode: 'immutable',
  },
  timeoutMs: 2_000,
  maxAttempts: 2,
  baseBackoffMs: 0,
};

const annualPeriod = {
  fiscalYear: 2025,
  fiscalPeriod: 'FY',
  periodType: 'annual',
  periodStart: '2025-01-01T00:00:00.000Z',
  periodEnd: '2025-12-31T23:59:59.000Z',
};

const annualStatement = {
  providerSymbol: 'THYAO.IS',
  ...annualPeriod,
  providerRevision: 'annual-r1',
  publishedAt: '2026-02-01T08:00:00.000Z',
  availableAt: '2026-02-01T08:05:00.000Z',
  sourceTimestamp: '2026-02-01T08:01:00.000Z',
  currencyCode: 'try',
  unitScale: '1000',
  statementScope: 'consolidated' as const,
  metrics: { revenue: '10.123456789012', netIncome: '2' },
};

const actionBase = {
  providerEventId: 'event-1',
  providerSymbol: 'THYAO.IS',
  announcementAt: '2026-01-01T08:00:00.000Z',
  exAt: '2026-02-01T08:00:00.000Z',
  recordAt: '2026-02-02T08:00:00.000Z',
  paymentAt: '2026-02-03T08:00:00.000Z',
  effectiveAt: '2026-02-01T08:00:00.000Z',
  availableAt: '2026-01-01T08:01:00.000Z',
  sourceTimestamp: '2026-01-01T08:00:30.000Z',
  providerRevision: 'action-r1',
  factor: null,
  cashPerShare: null,
  subscriptionPrice: null,
  currencyCode: null,
  oldSymbol: null,
  newSymbol: null,
  successorSymbol: null,
};

class QueueTransport implements ProviderHttpTransport {
  readonly requests: ProviderHttpRequest[] = [];
  constructor(private readonly outcomes: (ProviderHttpResponse | Error)[]) {}
  request(request: ProviderHttpRequest): Promise<ProviderHttpResponse> {
    this.requests.push(request);
    const outcome = this.outcomes.shift();
    if (outcome instanceof Error) return Promise.reject(outcome);
    if (outcome === undefined) return Promise.reject(new Error('No fixture'));
    return Promise.resolve(outcome);
  }
}

const response = (body: unknown, status = 200): ProviderHttpResponse => ({
  status,
  headers: {},
  body,
});

function adapter(
  outcomes: (ProviderHttpResponse | Error)[],
  credential = 'financial-secret-never-report',
) {
  const transport = new QueueTransport([...outcomes]);
  return {
    provider: new VendorFinancialProviderAdapter(configuration, transport, {
      resolve: () => Promise.resolve(credential),
    }),
    transport,
  };
}

const range = {
  from: new Date('2026-01-01T00:00:00.000Z'),
  to: new Date('2026-12-31T23:59:59.000Z'),
};

describe('financial and corporate-action provider contracts', () => {
  it('1. maps an annual statement and fiscal period', async () => {
    const { provider } = adapter([
      response([annualPeriod]),
      response([annualStatement]),
    ]);
    const periods = await provider.listPeriods('THYAO.IS');
    const statements = await provider.fetchStatements('THYAO.IS', periods);
    expect(statements[0]).toMatchObject({
      periodType: 'annual',
      fiscalPeriod: 'FY',
      fiscalYear: 2025,
    });
  });

  it('2. maps quarterly statements', async () => {
    const quarter = {
      ...annualStatement,
      fiscalPeriod: 'Q1',
      periodType: 'quarterly',
      periodStart: '2025-01-01T00:00:00.000Z',
      periodEnd: '2025-03-31T23:59:59.000Z',
    };
    const { provider } = adapter([response([quarter])]);
    await expect(
      provider.fetchStatements('THYAO.IS', []),
    ).resolves.toMatchObject([{ periodType: 'quarterly', fiscalPeriod: 'Q1' }]);
  });

  it('3. preserves publication date separately from source time', async () => {
    const { provider } = adapter([response([annualStatement])]);
    const [statement] = await provider.fetchStatements('THYAO.IS', []);
    expect(statement?.publishedAt).toEqual(
      new Date(annualStatement.publishedAt),
    );
    expect(statement?.publishedAt).not.toEqual(statement?.sourceTimestamp);
  });

  it('4. retains restatements as distinct revisions', async () => {
    const { provider } = adapter([
      response([
        annualStatement,
        {
          ...annualStatement,
          providerRevision: 'annual-r2',
          availableAt: '2026-03-01T08:00:00.000Z',
          metrics: { ...annualStatement.metrics, revenue: '11' },
        },
      ]),
    ]);
    const statements = await provider.fetchStatements('THYAO.IS', []);
    expect(statements.map((item) => item.providerRevision)).toEqual([
      'annual-r1',
      'annual-r2',
    ]);
  });

  it('5. selects revisions only after available-at', () => {
    const base = normalizeStatement(
      {
        ...annualStatement,
        periodType: 'annual',
        periodStart: new Date(annualStatement.periodStart),
        periodEnd: new Date(annualStatement.periodEnd),
        publishedAt: new Date(annualStatement.publishedAt),
        availableAt: new Date(annualStatement.availableAt),
        sourceTimestamp: new Date(annualStatement.sourceTimestamp),
        currencyCode: 'TRY',
      },
      'instrument',
      configuration.code,
    );
    const restated: NormalizedFundamentalStatement = {
      ...base,
      providerRevision: 'annual-r2',
      availableAt: new Date('2026-03-01T08:00:00.000Z'),
      metrics: { ...base.metrics, revenue: '11000' },
    };
    expect(
      selectFundamentalRevisionAt(
        [base, restated],
        new Date('2026-02-15T00:00:00.000Z'),
      )?.providerRevision,
    ).toBe('annual-r1');
    expect(
      selectFundamentalRevisionAt(
        [base, restated],
        new Date('2026-03-02T00:00:00.000Z'),
      )?.providerRevision,
    ).toBe('annual-r2');
  });

  it('6. normalizes currency codes without implicit FX conversion', async () => {
    const { provider } = adapter([response([annualStatement])]);
    await expect(
      provider.fetchStatements('THYAO.IS', []),
    ).resolves.toMatchObject([{ currencyCode: 'TRY' }]);
  });

  it('7. normalizes units with decimal precision', () => {
    const normalized = normalizeStatement(
      {
        ...annualStatement,
        periodType: 'annual',
        periodStart: new Date(annualStatement.periodStart),
        periodEnd: new Date(annualStatement.periodEnd),
        publishedAt: new Date(annualStatement.publishedAt),
        availableAt: new Date(annualStatement.availableAt),
        sourceTimestamp: new Date(annualStatement.sourceTimestamp),
        currencyCode: 'TRY',
      },
      'instrument',
      configuration.code,
    );
    expect(normalized.metrics.revenue).toBe('10123.456789012');
  });

  it('8. keeps a missing metric absent rather than zero', () => {
    const normalized = normalizeStatement(
      {
        ...annualStatement,
        periodType: 'annual',
        periodStart: new Date(annualStatement.periodStart),
        periodEnd: new Date(annualStatement.periodEnd),
        publishedAt: new Date(annualStatement.publishedAt),
        availableAt: undefined,
        sourceTimestamp: new Date(annualStatement.sourceTimestamp),
        currencyCode: 'TRY',
      },
      'instrument',
      configuration.code,
    );
    expect(normalized.metrics.totalAssets).toBeUndefined();
  });

  it('9. produces TTM inputs from four compatible quarters', () => {
    const quarters = [0, 1, 2, 3].map(
      (index): NormalizedFundamentalStatement => ({
        instrumentId: 'instrument',
        providerCode: configuration.code,
        providerRevision: `q${index + 1}`,
        fiscalYear: 2025,
        fiscalPeriod: `Q${index + 1}`,
        periodType: 'quarterly',
        periodStart: new Date(Date.UTC(2025, index * 3, 1)),
        periodEnd: new Date(Date.UTC(2025, index * 3 + 3, 0)),
        publishedAt: new Date(Date.UTC(2025, index * 3 + 3, 15)),
        availableAt: new Date(Date.UTC(2025, index * 3 + 3, 15)),
        sourceTimestamp: new Date(Date.UTC(2025, index * 3 + 3, 15)),
        currencyCode: 'TRY',
        metrics: { revenue: '10', totalAssets: String(100 + index) },
        warnings: [],
      }),
    );
    expect(buildTtm(quarters)).toMatchObject({
      periodType: 'ttm',
      metrics: { revenue: '40', totalAssets: '103' },
    });
  });

  it.each([
    ['10. split', 'split', '2'],
    ['11. reverse split', 'reverseSplit', '0.5'],
    ['12. bonus share', 'bonusShare', '1.2'],
  ] as const)('%s maps an adjustment factor', async (_name, type, factor) => {
    const { provider } = adapter([response([{ ...actionBase, type, factor }])]);
    await expect(
      provider.fetchCorporateActions('THYAO.IS', range.from, range.to),
    ).resolves.toMatchObject([{ type, factor }]);
  });

  it('13. maps dividend cash-flow metadata separately', async () => {
    const { provider } = adapter([
      response([
        {
          ...actionBase,
          type: 'cashDividend',
          cashPerShare: '3.1415926535',
          currencyCode: 'try',
        },
      ]),
    ]);
    await expect(
      provider.fetchCorporateActions('THYAO.IS', range.from, range.to),
    ).resolves.toMatchObject([
      {
        type: 'cashDividend',
        cashPerShare: '3.1415926535',
        currencyCode: 'TRY',
      },
    ]);
  });

  it('14. maps supported rights issues', async () => {
    const { provider } = adapter([
      response([
        {
          ...actionBase,
          type: 'rightsIssue',
          factor: '1.25',
          subscriptionPrice: '10.50',
          currencyCode: 'TRY',
        },
      ]),
    ]);
    await expect(
      provider.fetchCorporateActions('THYAO.IS', range.from, range.to),
    ).resolves.toMatchObject([{ type: 'rightsIssue', factor: '1.25' }]);
  });

  it('15. maps delisting with explicit effective date and successor', async () => {
    const { provider } = adapter([
      response([
        {
          ...actionBase,
          type: 'delisting',
          successorSymbol: 'SUCCESSOR.IS',
        },
      ]),
    ]);
    await expect(
      provider.fetchCorporateActions('THYAO.IS', range.from, range.to),
    ).resolves.toMatchObject([
      {
        type: 'delisting',
        effectiveAt: new Date(actionBase.effectiveAt),
        successorSymbol: 'SUCCESSOR.IS',
      },
    ]);
  });

  it('16. provides a stable identity for duplicate action rejection', async () => {
    const { provider } = adapter([
      response([
        { ...actionBase, type: 'split', factor: '2' },
        { ...actionBase, type: 'split', factor: '2' },
      ]),
    ]);
    const actions = await provider.fetchCorporateActions(
      'THYAO.IS',
      range.from,
      range.to,
    );
    expect(new Set(actions.map((item) => item.providerEventId)).size).toBe(1);
  });

  it('17. prevents adjusted-price and position double application', () => {
    const split: ProviderCorporateAction = {
      ...actionBase,
      type: 'split',
      factor: '2',
      announcementAt: new Date(actionBase.announcementAt),
      exAt: new Date(actionBase.exAt),
      recordAt: new Date(actionBase.recordAt),
      paymentAt: new Date(actionBase.paymentAt),
      effectiveAt: new Date(actionBase.effectiveAt),
      availableAt: new Date(actionBase.availableAt),
      sourceTimestamp: new Date(actionBase.sourceTimestamp),
    };
    expect(
      shouldApplyCorporateAction(split, 'rawPricesAndPositionActions'),
    ).toBe(true);
    expect(shouldApplyCorporateAction(split, 'splitAdjustedPrices')).toBe(
      false,
    );
  });

  it('18. retries transient failures but not invalid payloads', async () => {
    const timeout = new Error('secret upstream timeout');
    timeout.name = 'TimeoutError';
    const transient = adapter([timeout, response([annualStatement])]);
    await transient.provider.fetchStatements('THYAO.IS', []);
    expect(transient.transport.requests).toHaveLength(2);

    const invalid = adapter([response([{ rawPayload: 'invalid' }])]);
    await expect(
      invalid.provider.fetchStatements('THYAO.IS', []),
    ).rejects.toMatchObject({ taxonomy: 'invalidPayload', retryable: false });
    expect(invalid.transport.requests).toHaveLength(1);
  });

  it('19. redacts credentials and upstream bodies from errors', async () => {
    const secret = 'credential-never-expose';
    const { provider } = adapter([response({ token: secret }, 401)], secret);
    let caught: unknown;
    try {
      await provider.fetchStatements('THYAO.IS', []);
    } catch (error: unknown) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ProviderContractError);
    expect(JSON.stringify(caught)).not.toContain(secret);
  });

  it('20. replays frozen provider fixtures deterministically', async () => {
    const fixture = Object.freeze([Object.freeze({ ...annualStatement })]);
    const first = adapter([response(fixture)]).provider;
    const second = adapter([response(fixture)]).provider;
    expect(await first.fetchStatements('THYAO.IS', [])).toEqual(
      await second.fetchStatements('THYAO.IS', []),
    );
  });
});
