import { setTimeout as delay } from 'node:timers/promises';

import { FUNDAMENTAL_METRIC_CODES } from '@atlas/domain';
import { z } from 'zod';

import type { ProviderCorporateAction } from '../../corporate-actions';
import type {
  FundamentalsProvider,
  FundamentalsProviderCapabilities,
  ProviderFundamentalPeriod,
  ProviderFundamentalStatement,
} from '../../fundamentals';
import { ProviderContractError } from '../errors';
import type { ProviderCredentialReference } from '../provider-core';
import type {
  ProviderCredentialResolver,
  ProviderHttpResponse,
  ProviderHttpTransport,
} from './contracts';

const date = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value));
const decimal = z.string().regex(/^[+-]?(?:0|[1-9]\d*)(?:\.\d+)?$/);
const metrics = z.partialRecord(z.enum(FUNDAMENTAL_METRIC_CODES), decimal);

const periodSchema = z.strictObject({
  fiscalYear: z.number().int().min(1900).max(2200),
  fiscalPeriod: z.string().trim().min(1).max(24),
  periodType: z.enum(['annual', 'quarterly']),
  periodStart: date,
  periodEnd: date,
});

const statementSchema = periodSchema.extend({
  providerSymbol: z.string().trim().min(1).max(128),
  providerRevision: z.string().trim().min(1).max(128),
  publishedAt: date,
  availableAt: date,
  sourceTimestamp: date,
  currencyCode: z.string().length(3).toUpperCase(),
  unitScale: decimal,
  statementScope: z.enum(['consolidated', 'standalone']),
  metrics,
});

const actionSchema = z
  .strictObject({
    providerEventId: z.string().trim().min(1).max(160),
    providerSymbol: z.string().trim().min(1).max(128),
    type: z.enum([
      'split',
      'reverseSplit',
      'bonusShare',
      'cashDividend',
      'rightsIssue',
      'symbolChange',
      'mergerAcquisition',
      'delisting',
    ]),
    announcementAt: date,
    exAt: date.nullable(),
    recordAt: date.nullable(),
    paymentAt: date.nullable(),
    effectiveAt: date,
    availableAt: date,
    sourceTimestamp: date,
    providerRevision: z.string().trim().min(1).max(128),
    factor: decimal.nullable(),
    cashPerShare: decimal.nullable(),
    subscriptionPrice: decimal.nullable(),
    currencyCode: z.string().length(3).toUpperCase().nullable(),
    oldSymbol: z.string().trim().min(1).max(32).nullable(),
    newSymbol: z.string().trim().min(1).max(32).nullable(),
    successorSymbol: z.string().trim().min(1).max(32).nullable(),
  })
  .superRefine((action, context) => {
    if (
      ['split', 'reverseSplit', 'bonusShare', 'rightsIssue'].includes(
        action.type,
      ) &&
      action.factor === null
    )
      context.addIssue({
        code: 'custom',
        message: 'factor is required',
        path: ['factor'],
      });
    if (
      action.type === 'cashDividend' &&
      (action.cashPerShare === null || action.currencyCode === null)
    )
      context.addIssue({
        code: 'custom',
        message: 'dividend cash and currency are required',
        path: ['cashPerShare'],
      });
    if (
      action.type === 'symbolChange' &&
      (action.oldSymbol === null || action.newSymbol === null)
    )
      context.addIssue({
        code: 'custom',
        message: 'symbol change requires both symbols',
        path: ['newSymbol'],
      });
    if (action.availableAt < action.announcementAt)
      context.addIssue({
        code: 'custom',
        message: 'availableAt cannot precede announcement',
        path: ['availableAt'],
      });
  });

export interface FinancialProviderConfiguration {
  readonly code: string;
  readonly baseUrl: string;
  readonly fundamentalsPath: string;
  readonly corporateActionsPath: string;
  readonly credential: ProviderCredentialReference;
  readonly capabilities: FundamentalsProviderCapabilities;
  readonly timeoutMs: number;
  readonly maxAttempts: number;
  readonly baseBackoffMs: number;
}

export class VendorFinancialProviderAdapter implements FundamentalsProvider {
  readonly code: string;

  constructor(
    private readonly configuration: FinancialProviderConfiguration,
    private readonly transport: ProviderHttpTransport,
    private readonly credentials: ProviderCredentialResolver,
  ) {
    this.code = configuration.code;
  }

  getCapabilities(): FundamentalsProviderCapabilities {
    return this.configuration.capabilities;
  }

  async listPeriods(
    providerSymbol: string,
  ): Promise<readonly ProviderFundamentalPeriod[]> {
    const response = await this.request('fundamentals', {
      providerSymbol,
      view: 'periods',
    });
    return this.parse(z.array(periodSchema), response.body);
  }

  async fetchStatements(
    providerSymbol: string,
    periods: readonly ProviderFundamentalPeriod[],
  ): Promise<readonly ProviderFundamentalStatement[]> {
    const response = await this.request('fundamentals', {
      providerSymbol,
      periods: periods
        .map((period) => `${period.fiscalYear}:${period.fiscalPeriod}`)
        .join(','),
    });
    return this.parse(z.array(statementSchema), response.body);
  }

  async fetchCorporateActions(
    providerSymbol: string,
    from: Date,
    to: Date,
  ): Promise<readonly ProviderCorporateAction[]> {
    const response = await this.request('corporateActions', {
      providerSymbol,
      from: from.toISOString(),
      to: to.toISOString(),
    });
    return this.parse(z.array(actionSchema), response.body);
  }

  private async request(
    operation: 'fundamentals' | 'corporateActions',
    query: Readonly<Record<string, string>>,
  ): Promise<ProviderHttpResponse> {
    let credential: string;
    try {
      credential = await this.credentials.resolve(
        this.configuration.credential,
      );
      if (!credential.trim()) throw new Error('credential missing');
    } catch (error: unknown) {
      throw new ProviderContractError(
        'authentication',
        { providerCode: this.code },
        { cause: error },
      );
    }
    let last: ProviderContractError | undefined;
    for (
      let attempt = 1;
      attempt <= this.configuration.maxAttempts;
      attempt++
    ) {
      try {
        const response = await this.transport.request({
          operation:
            operation === 'fundamentals' ? 'instruments' : 'memberships',
          path: new URL(
            operation === 'fundamentals'
              ? this.configuration.fundamentalsPath
              : this.configuration.corporateActionsPath,
            this.configuration.baseUrl,
          ).toString(),
          query,
          credential,
          timeoutMs: this.configuration.timeoutMs,
        });
        if (response.status >= 200 && response.status < 300) return response;
        throw statusError(response.status, this.code);
      } catch (error: unknown) {
        last =
          error instanceof ProviderContractError
            ? error
            : new ProviderContractError(
                error instanceof Error &&
                  ['AbortError', 'TimeoutError'].includes(error.name)
                  ? 'timeout'
                  : 'network',
                { providerCode: this.code },
                { cause: error },
              );
        if (!last.retryable || attempt === this.configuration.maxAttempts)
          throw last;
        await delay(this.configuration.baseBackoffMs * 2 ** (attempt - 1));
      }
    }
    throw last ?? new ProviderContractError('permanentFailure');
  }

  private parse<Output>(schema: z.ZodType<Output>, input: unknown): Output {
    const result = schema.safeParse(input);
    if (!result.success)
      throw new ProviderContractError(
        'invalidPayload',
        { providerCode: this.code },
        { cause: result.error },
      );
    return result.data;
  }
}

function statusError(status: number, providerCode: string) {
  return new ProviderContractError(
    status === 401
      ? 'authentication'
      : status === 403
        ? 'authorization'
        : status === 404
          ? 'notFound'
          : status === 429
            ? 'rateLimit'
            : status >= 500
              ? 'temporaryUnavailable'
              : 'permanentFailure',
    { providerCode },
  );
}
