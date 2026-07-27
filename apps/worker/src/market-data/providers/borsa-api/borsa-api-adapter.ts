import type { CacheBackend } from '@atlas/domain';
import BorsaAPI from 'borsa-api';

import type {
  FetchBarsRequest,
  MarketDataProviderCapabilities,
  ProviderBarBatch,
  RawMarketDataProviderAdapter,
} from '../contracts';
import { ProviderError } from '../errors';

const SYMBOL_PATTERN = /^[A-Z0-9]{2,12}$/u;
const QUALITY_FLAGS = [
  'SOURCE_TIMESTAMP_UNAVAILABLE',
  'DELAYED',
  'UNOFFICIAL_SOURCE',
] as const;

export const BORSA_API_PROVIDER_METADATA = Object.freeze({
  id: 'borsa-api',
  integrationStatus: 'SANDBOX_INTEGRATION',
  officialExchangeFeed: false,
  delayedData: true,
  commercialDisplayApproved: false,
  redistributionApproved: false,
  productionEligible: false,
  credentialRequired: false,
  displayName: 'borsa-api / üçüncü taraf gecikmeli veri',
});

export interface BorsaApiClient {
  getStock(symbol: string): Promise<unknown>;
  getIndex(symbol?: string): Promise<unknown>;
  getHistoricalData(
    symbol: string,
    options: {
      interval: '1d' | '1wk' | '1mo';
      period1: Date;
      period2: Date;
    },
  ): Promise<unknown>;
}

export interface BorsaApiAdapterOptions {
  readonly client?: BorsaApiClient;
  readonly cache?: CacheBackend;
  readonly timeoutMs?: number;
  readonly maxConcurrency?: number;
  readonly requestsPerSecond?: number;
  readonly maxAttempts?: number;
  readonly now?: () => Date;
  readonly sleep?: (milliseconds: number) => Promise<void>;
}

interface HistoricalQuote {
  readonly date: Date | string;
  readonly open: number | null;
  readonly high: number | null;
  readonly low: number | null;
  readonly close: number | null;
  readonly adjClose?: number | undefined;
  readonly volume: number | null;
}

interface HistoricalPayload {
  readonly meta: { readonly symbol: string };
  readonly quotes: readonly HistoricalQuote[];
}

export class BorsaApiAdapter implements RawMarketDataProviderAdapter {
  readonly code = BORSA_API_PROVIDER_METADATA.id;
  private readonly client: BorsaApiClient;
  private readonly cache: CacheBackend | undefined;
  private readonly maxConcurrency: number;
  private readonly requestsPerSecond: number;
  private readonly maxAttempts: number;
  private readonly now: () => Date;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private active = 0;
  private readonly waiters: Array<() => void> = [];
  private lastRequestAt = 0;

  constructor(options: BorsaApiAdapterOptions = {}) {
    this.client =
      options.client ??
      new BorsaAPI({
        timeout: options.timeoutMs ?? 10_000,
        useMockData: false,
        useRealData: true,
      });
    this.cache = options.cache;
    this.maxConcurrency = options.maxConcurrency ?? 2;
    this.requestsPerSecond = options.requestsPerSecond ?? 1;
    this.maxAttempts = options.maxAttempts ?? 3;
    this.now = options.now ?? (() => new Date());
    this.sleep =
      options.sleep ??
      ((milliseconds) =>
        new Promise((resolve) => setTimeout(resolve, milliseconds)));
  }

  getCapabilities(): MarketDataProviderCapabilities {
    return {
      supportedTimeframes: ['1d', '1w', '1mo'],
      dataMode: 'delayed',
      historicalDepthDays: null,
      supportsCorporateActions: false,
      supportsFundamentals: false,
      supportsPagination: false,
      rateLimit: { requests: this.requestsPerSecond, intervalMs: 1_000 },
    };
  }

  listInstruments(): Promise<readonly []> {
    // borsa-api's popular list is not an authoritative instrument master.
    return Promise.resolve([]);
  }

  async health(): Promise<{
    readonly status: 'healthy' | 'unavailable';
    readonly checkedAt: Date;
  }> {
    try {
      await this.fetchQuote('THYAO');
      return { status: 'healthy', checkedAt: this.now() };
    } catch {
      return { status: 'unavailable', checkedAt: this.now() };
    }
  }

  async fetchQuote(symbol: string): Promise<unknown> {
    const normalized = normalizeBorsaSymbol(symbol);
    return this.cached(this.cacheKey('quote', normalized, 'quote'), 300, () =>
      this.execute(() => this.client.getStock(normalized)),
    );
  }

  async fetchIndexSnapshot(symbol: string): Promise<unknown> {
    const normalized = normalizeBorsaSymbol(symbol);
    return this.cached(this.cacheKey('quote', normalized, 'index'), 300, () =>
      this.execute(() => this.client.getIndex(normalized)),
    );
  }

  async fetchBars(request: FetchBarsRequest): Promise<ProviderBarBatch> {
    const symbol = normalizeBorsaSymbol(request.providerSymbol);
    const interval = mapInterval(request.timeframe);
    const key = this.cacheKey(
      'bars',
      symbol,
      request.timeframe,
      request.from,
      request.to,
    );
    const payload = await this.cached(key, 21_600, () =>
      this.execute(() =>
        this.client.getHistoricalData(symbol, {
          interval,
          period1: request.from,
          period2: request.to,
        }),
      ),
    );
    return mapHistoricalPayload(payload, symbol, request.timeframe, this.now());
  }

  private cacheKey(
    operation: string,
    symbol: string,
    interval: string,
    from?: Date,
    to?: Date,
  ): string {
    return [
      'atlas',
      'market-data',
      'v1',
      this.code,
      operation,
      symbol,
      interval,
      from?.toISOString() ?? 'latest',
      to?.toISOString() ?? 'latest',
    ].join(':');
  }

  private async cached<T>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.cache?.get(key);
    if (cached !== null && cached !== undefined) {
      return JSON.parse(cached, reviveDates) as T;
    }
    const value = await loader();
    await this.cache?.set(key, JSON.stringify(value), ttlSeconds);
    return value;
  }

  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    let last: ProviderError | undefined;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      await this.acquire();
      try {
        await this.throttle();
        return await operation();
      } catch (error: unknown) {
        last = classifyBorsaApiError(error);
        if (!last.retryable || attempt === this.maxAttempts) throw last;
        await this.sleep(Math.min(250 * 2 ** (attempt - 1), 2_000));
      } finally {
        this.release();
      }
    }
    throw last ?? new ProviderError('PROVIDER_UNAVAILABLE');
  }

  private async acquire(): Promise<void> {
    if (this.active < this.maxConcurrency) {
      this.active += 1;
      return;
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
    this.active += 1;
  }

  private release(): void {
    this.active -= 1;
    this.waiters.shift()?.();
  }

  private async throttle(): Promise<void> {
    const minimumGap = 1_000 / this.requestsPerSecond;
    const wait = Math.max(0, this.lastRequestAt + minimumGap - Date.now());
    if (wait > 0) await this.sleep(wait);
    this.lastRequestAt = Date.now();
  }
}

export function normalizeBorsaSymbol(input: string): string {
  const normalized = input
    .trim()
    .toUpperCase()
    .replace(/(?:\.IS)+$/u, '');
  if (!SYMBOL_PATTERN.test(normalized)) {
    throw new ProviderError('PROVIDER_INVALID_SYMBOL_MAPPING');
  }
  return normalized;
}

export function classifyBorsaApiError(error: unknown): ProviderError {
  if (error instanceof ProviderError) return error;
  const record = error as {
    code?: unknown;
    status?: unknown;
    response?: { status?: unknown };
    message?: unknown;
    cause?: unknown;
  };
  const message =
    typeof record?.message === 'string' ? record.message.toLowerCase() : '';
  const status = record?.response?.status ?? record?.status;
  const code = record?.code;
  if (
    status === 429 ||
    message.includes('429') ||
    message.includes('rate limit')
  )
    return new ProviderError('PROVIDER_RATE_LIMITED', { cause: error });
  if (
    code === 'ETIMEDOUT' ||
    code === 'ECONNABORTED' ||
    message.includes('timeout')
  )
    return new ProviderError('PROVIDER_TIMEOUT', { cause: error });
  if (
    code === 'ENOTFOUND' ||
    code === 'ECONNRESET' ||
    code === 'EAI_AGAIN' ||
    message.includes('network')
  )
    return new ProviderError('PROVIDER_UNAVAILABLE', { cause: error });
  if (
    status === 404 ||
    message.includes('not found') ||
    message.includes('bulunamadı')
  )
    return new ProviderError('PROVIDER_INVALID_SYMBOL_MAPPING', {
      cause: error,
    });
  return new ProviderError('PROVIDER_UNAVAILABLE', { cause: error });
}

function mapHistoricalPayload(
  input: unknown,
  symbol: string,
  timeframe: FetchBarsRequest['timeframe'],
  receivedAt: Date,
): ProviderBarBatch {
  const payload = input as Partial<HistoricalPayload>;
  if (
    payload === null ||
    typeof payload !== 'object' ||
    !Array.isArray(payload.quotes)
  ) {
    throw new ProviderError('PROVIDER_MALFORMED_RESPONSE');
  }
  const quotes = payload.quotes as readonly HistoricalQuote[];
  const bars = quotes
    .filter((quote) => !isEmptyQuotePlaceholder(quote))
    .map((quote) => {
      const sessionDate = new Date(quote.date);
      const closeTime = nextBarBoundary(sessionDate, timeframe);
      if (
        quote.open === null ||
        quote.high === null ||
        quote.low === null ||
        quote.close === null ||
        quote.volume === null
      ) {
        throw new ProviderError('PROVIDER_MALFORMED_RESPONSE');
      }
      const numbers = [
        quote.open,
        quote.high,
        quote.low,
        quote.close,
        quote.volume,
        ...(quote.adjClose === undefined ? [] : [quote.adjClose]),
      ];
      if (
        !numbers.every(Number.isFinite) ||
        quote.volume < 0 ||
        quote.high < Math.max(quote.open, quote.close, quote.low) ||
        quote.low > Math.min(quote.open, quote.close, quote.high)
      ) {
        throw new ProviderError('PROVIDER_MALFORMED_RESPONSE');
      }
      return {
        providerSymbol: symbol,
        timeframe,
        openTime: sessionDate,
        closeTime,
        open: String(quote.open),
        high: String(quote.high),
        low: String(quote.low),
        close: String(quote.close),
        ...(quote.adjClose === undefined
          ? {}
          : { adjustedClose: String(quote.adjClose) }),
        volume: String(quote.volume),
        isClosed: true,
        availableAt: receivedAt,
        receivedAt,
        providerRevision: `received-${receivedAt.toISOString()}`,
        qualityFlags: QUALITY_FLAGS,
      };
    });
  return { bars };
}

function isEmptyQuotePlaceholder(quote: HistoricalQuote): boolean {
  return (
    quote.open === null &&
    quote.high === null &&
    quote.low === null &&
    quote.close === null &&
    quote.volume === null
  );
}

function mapInterval(
  timeframe: FetchBarsRequest['timeframe'],
): '1d' | '1wk' | '1mo' {
  if (timeframe === '1d') return '1d';
  if (timeframe === '1w') return '1wk';
  if (timeframe === '1mo') return '1mo';
  throw new ProviderError('PROVIDER_UNSUPPORTED_TIMEFRAME');
}

function nextBarBoundary(date: Date, timeframe: FetchBarsRequest['timeframe']) {
  const result = new Date(date);
  if (timeframe === '1d') result.setUTCDate(result.getUTCDate() + 1);
  else if (timeframe === '1w') result.setUTCDate(result.getUTCDate() + 7);
  else result.setUTCMonth(result.getUTCMonth() + 1);
  return result;
}

function reviveDates(_key: string, value: unknown): unknown {
  if (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/u.test(value)
  )
    return new Date(value);
  return value;
}
