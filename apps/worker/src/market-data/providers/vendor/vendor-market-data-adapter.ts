import { setTimeout as delay } from 'node:timers/promises';

import { z } from 'zod';

import type {
  FetchBarsRequest,
  MarketDataProviderCapabilities,
  ProviderBarBatch,
  ProviderInstrumentDto,
} from '../contracts';
import { ProviderContractError, type ProviderErrorTaxonomy } from '../errors';
import type { ProviderHealth, ProviderRateLimitState } from '../provider-core';
import {
  providerBarBatchSchema,
  providerInstrumentListSchema,
} from '../schemas';
import type {
  ProductionMarketDataProvider,
  ProviderBenchmarkPoint,
  ProviderCredentialResolver,
  ProviderHttpResponse,
  ProviderHttpTransport,
  ProviderMembership,
  TradingSession,
  VendorMarketDataConfiguration,
} from './contracts';

const sourceMetadata = {
  sourceTimestamp: z.iso.datetime({ offset: true }),
  availableAt: z.iso.datetime({ offset: true }),
  revision: z.string().trim().min(1).max(128),
};

const tradingSessionSchema = z
  .strictObject({
    marketCode: z.string().trim().min(1).max(32),
    sessionDate: z.iso.date(),
    timezone: z.string().trim().min(1).max(64),
    opensAt: z.iso.datetime({ offset: true }).nullable(),
    closesAt: z.iso.datetime({ offset: true }).nullable(),
    status: z.enum(['open', 'holiday']),
    ...sourceMetadata,
  })
  .superRefine((session, context) => {
    if (
      session.status === 'open' &&
      (session.opensAt === null ||
        session.closesAt === null ||
        session.closesAt <= session.opensAt)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'open sessions require an ordered interval',
        path: ['closesAt'],
      });
    }
    if (
      session.status === 'holiday' &&
      (session.opensAt !== null || session.closesAt !== null)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'holiday sessions cannot contain trading hours',
        path: ['opensAt'],
      });
    }
  });

const membershipSchema = z
  .strictObject({
    kind: z.enum(['index', 'sector']),
    code: z.string().trim().min(1).max(64),
    providerSymbol: z.string().trim().min(1).max(64),
    effectiveFrom: z.iso.date(),
    effectiveTo: z.iso.date().nullable(),
    ...sourceMetadata,
  })
  .refine(
    (membership) =>
      membership.effectiveTo === null ||
      membership.effectiveTo >= membership.effectiveFrom,
    { message: 'effectiveTo must not precede effectiveFrom' },
  );

const decimalSchema = z.string().regex(/^[+-]?(?:0|[1-9]\d*)(?:\.\d+)?$/);
const benchmarkSchema = z
  .strictObject({
    benchmarkCode: z.string().trim().min(1).max(64),
    openTime: z.iso.datetime({ offset: true }),
    closeTime: z.iso.datetime({ offset: true }),
    value: decimalSchema,
    adjustment: z.enum(['raw', 'totalReturn']),
    cutoffAt: z.iso.datetime({ offset: true }),
    ...sourceMetadata,
  })
  .refine((point) => point.closeTime > point.openTime, {
    message: 'closeTime must follow openTime',
  });

const healthSchema = z.strictObject({
  status: z.enum(['healthy', 'degraded', 'unavailable']),
  reason: z.enum([
    'none',
    'authentication',
    'rateLimit',
    'latency',
    'network',
    'providerOutage',
  ]),
  checkedAt: z.iso.datetime({ offset: true }),
});

export class VendorMarketDataAdapter implements ProductionMarketDataProvider {
  readonly code: string;
  private rateLimitState: ProviderRateLimitState = {
    limit: null,
    remaining: null,
    resetAt: null,
    retryAfterMs: null,
  };

  constructor(
    private readonly configuration: VendorMarketDataConfiguration,
    private readonly transport: ProviderHttpTransport,
    private readonly credentials: ProviderCredentialResolver,
  ) {
    this.code = configuration.code;
  }

  getCapabilities(): MarketDataProviderCapabilities {
    return this.configuration.capabilities;
  }

  getLicense() {
    return this.configuration.license;
  }

  getRateLimitState(): ProviderRateLimitState {
    return this.rateLimitState;
  }

  async listInstruments(): Promise<readonly ProviderInstrumentDto[]> {
    const response = await this.request('instruments', {});
    return this.parse(providerInstrumentListSchema, response.body);
  }

  async fetchBars(request: FetchBarsRequest): Promise<ProviderBarBatch> {
    const response = await this.request('bars', {
      providerSymbol: request.providerSymbol,
      timeframe: request.timeframe,
      from: request.from.toISOString(),
      to: request.to.toISOString(),
      ...(request.cursor === undefined ? {} : { cursor: request.cursor }),
      ...(request.limit === undefined ? {} : { limit: String(request.limit) }),
    });
    return this.parse(providerBarBatchSchema, response.body);
  }

  async getTradingCalendar(
    marketCode: string,
    from: string,
    to: string,
  ): Promise<readonly TradingSession[]> {
    const response = await this.request('calendar', { marketCode, from, to });
    return this.parse(z.array(tradingSessionSchema), response.body).map(
      (session) => ({
        ...session,
        opensAt: session.opensAt === null ? null : new Date(session.opensAt),
        closesAt: session.closesAt === null ? null : new Date(session.closesAt),
        sourceTimestamp: new Date(session.sourceTimestamp),
        availableAt: new Date(session.availableAt),
      }),
    );
  }

  async getMemberships(
    providerSymbol?: string,
  ): Promise<readonly ProviderMembership[]> {
    const response = await this.request('memberships', {
      ...(providerSymbol === undefined ? {} : { providerSymbol }),
    });
    return this.parse(z.array(membershipSchema), response.body).map(
      (membership) => ({
        ...membership,
        sourceTimestamp: new Date(membership.sourceTimestamp),
        availableAt: new Date(membership.availableAt),
      }),
    );
  }

  async getBenchmarkSeries(
    benchmarkCode: string,
    from: Date,
    to: Date,
  ): Promise<readonly ProviderBenchmarkPoint[]> {
    const response = await this.request('benchmarks', {
      benchmarkCode,
      from: from.toISOString(),
      to: to.toISOString(),
    });
    return this.parse(z.array(benchmarkSchema), response.body).map((point) => ({
      ...point,
      openTime: new Date(point.openTime),
      closeTime: new Date(point.closeTime),
      cutoffAt: new Date(point.cutoffAt),
      sourceTimestamp: new Date(point.sourceTimestamp),
      availableAt: new Date(point.availableAt),
    }));
  }

  async getHealth(): Promise<ProviderHealth> {
    try {
      const response = await this.request('health', {});
      const health = this.parse(healthSchema, response.body);
      return { ...health, checkedAt: new Date(health.checkedAt) };
    } catch (error: unknown) {
      if (error instanceof ProviderContractError) {
        return {
          status: 'unavailable',
          checkedAt: new Date(),
          reason:
            error.taxonomy === 'authentication'
              ? 'authentication'
              : error.taxonomy === 'rateLimit'
                ? 'rateLimit'
                : error.taxonomy === 'network' || error.taxonomy === 'timeout'
                  ? 'network'
                  : 'providerOutage',
        };
      }
      throw error;
    }
  }

  private async request(
    operation:
      | 'health'
      | 'instruments'
      | 'bars'
      | 'calendar'
      | 'memberships'
      | 'benchmarks',
    query: Readonly<Record<string, string>>,
  ): Promise<ProviderHttpResponse> {
    const credential = await this.resolveCredential();
    let lastError: ProviderContractError | undefined;

    for (
      let attempt = 1;
      attempt <= this.configuration.maxAttempts;
      attempt++
    ) {
      try {
        const response = await this.transport.request({
          operation,
          path: new URL(
            this.configuration.endpoints[operation],
            this.configuration.baseUrl,
          ).toString(),
          query,
          credential,
          timeoutMs: this.configuration.timeoutMs,
        });
        this.captureRateLimit(response);
        if (response.status >= 200 && response.status < 300) return response;
        throw this.responseError(response);
      } catch (error: unknown) {
        lastError = normalizeTransportError(error);
        if (
          !lastError.retryable ||
          attempt === this.configuration.maxAttempts
        ) {
          throw lastError;
        }
        const waitMs =
          lastError.context.retryAfterMs ??
          this.configuration.baseBackoffMs * 2 ** (attempt - 1);
        await delay(waitMs);
      }
    }
    throw lastError ?? new ProviderContractError('permanentFailure');
  }

  private async resolveCredential(): Promise<string> {
    try {
      const credential = await this.credentials.resolve(
        this.configuration.credential,
      );
      if (credential.trim() === '') {
        throw new Error('credential unavailable');
      }
      return credential;
    } catch (error: unknown) {
      throw new ProviderContractError(
        'authentication',
        { providerCode: this.code },
        { cause: error },
      );
    }
  }

  private captureRateLimit(response: ProviderHttpResponse): void {
    const limit = parseIntegerHeader(response.headers['x-ratelimit-limit']);
    const remaining = parseIntegerHeader(
      response.headers['x-ratelimit-remaining'],
    );
    const resetSeconds = parseIntegerHeader(
      response.headers['x-ratelimit-reset'],
    );
    const retryAfterSeconds = parseIntegerHeader(
      response.headers['retry-after'],
    );
    this.rateLimitState = {
      limit,
      remaining,
      resetAt: resetSeconds === null ? null : new Date(resetSeconds * 1000),
      retryAfterMs:
        retryAfterSeconds === null ? null : retryAfterSeconds * 1000,
    };
  }

  private responseError(response: ProviderHttpResponse): ProviderContractError {
    const retryAfter = this.rateLimitState.retryAfterMs ?? undefined;
    const taxonomy: ProviderErrorTaxonomy =
      response.status === 401
        ? 'authentication'
        : response.status === 403
          ? 'authorization'
          : response.status === 404
            ? 'notFound'
            : response.status === 429
              ? 'rateLimit'
              : response.status >= 500
                ? 'temporaryUnavailable'
                : 'permanentFailure';
    return new ProviderContractError(taxonomy, {
      providerCode: this.code,
      ...(retryAfter === undefined ? {} : { retryAfterMs: retryAfter }),
    });
  }

  private parse<Output>(schema: z.ZodType<Output>, input: unknown): Output {
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      throw new ProviderContractError(
        'invalidPayload',
        { providerCode: this.code },
        { cause: parsed.error },
      );
    }
    return parsed.data;
  }
}

function parseIntegerHeader(value: string | undefined): number | null {
  if (value === undefined || !/^\d+$/.test(value)) return null;
  return Number.parseInt(value, 10);
}

function normalizeTransportError(error: unknown): ProviderContractError {
  if (error instanceof ProviderContractError) return error;
  if (
    error instanceof Error &&
    (error.name === 'AbortError' || error.name === 'TimeoutError')
  ) {
    return new ProviderContractError('timeout', {}, { cause: error });
  }
  return new ProviderContractError('network', {}, { cause: error });
}
