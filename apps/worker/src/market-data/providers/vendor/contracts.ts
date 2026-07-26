import type {
  FetchBarsRequest,
  MarketDataProviderCapabilities,
  ProviderBarBatch,
  ProviderInstrumentDto,
  RawMarketDataProviderAdapter,
} from '../contracts';
import type {
  ProviderCredentialReference,
  ProviderHealth,
  ProviderLicenseMetadata,
  ProviderRateLimitState,
} from '../provider-core';

export interface ProviderHttpRequest {
  readonly operation:
    | 'health'
    | 'instruments'
    | 'bars'
    | 'calendar'
    | 'memberships'
    | 'benchmarks';
  readonly path: string;
  readonly query: Readonly<Record<string, string>>;
  readonly credential: string;
  readonly timeoutMs: number;
}

export interface ProviderHttpResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string | undefined>>;
  readonly body: unknown;
}

export interface ProviderHttpTransport {
  request(request: ProviderHttpRequest): Promise<ProviderHttpResponse>;
}

export interface ProviderCredentialResolver {
  resolve(reference: ProviderCredentialReference): Promise<string>;
}

export interface ProviderEndpointMap {
  readonly health: string;
  readonly instruments: string;
  readonly bars: string;
  readonly calendar: string;
  readonly memberships: string;
  readonly benchmarks: string;
}

export interface VendorMarketDataConfiguration {
  readonly code: string;
  readonly baseUrl: string;
  readonly endpoints: ProviderEndpointMap;
  readonly credential: ProviderCredentialReference;
  readonly capabilities: MarketDataProviderCapabilities;
  readonly license: ProviderLicenseMetadata;
  readonly timeoutMs: number;
  readonly maxAttempts: number;
  readonly baseBackoffMs: number;
}

export interface TradingSession {
  readonly marketCode: string;
  readonly sessionDate: string;
  readonly timezone: string;
  readonly opensAt: Date | null;
  readonly closesAt: Date | null;
  readonly status: 'open' | 'holiday';
  readonly sourceTimestamp: Date;
  readonly availableAt: Date;
  readonly revision: string;
}

export interface ProviderMembership {
  readonly kind: 'index' | 'sector';
  readonly code: string;
  readonly providerSymbol: string;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly sourceTimestamp: Date;
  readonly availableAt: Date;
  readonly revision: string;
}

export interface ProviderBenchmarkPoint {
  readonly benchmarkCode: string;
  readonly openTime: Date;
  readonly closeTime: Date;
  readonly value: string;
  readonly adjustment: 'raw' | 'totalReturn';
  readonly cutoffAt: Date;
  readonly sourceTimestamp: Date;
  readonly availableAt: Date;
  readonly revision: string;
}

export interface ProductionMarketDataProvider extends RawMarketDataProviderAdapter {
  getCapabilities(): MarketDataProviderCapabilities;
  listInstruments(): Promise<readonly ProviderInstrumentDto[]>;
  fetchBars(request: FetchBarsRequest): Promise<ProviderBarBatch>;
  getTradingCalendar(
    marketCode: string,
    from: string,
    to: string,
  ): Promise<readonly TradingSession[]>;
  getMemberships(
    providerSymbol?: string,
  ): Promise<readonly ProviderMembership[]>;
  getBenchmarkSeries(
    benchmarkCode: string,
    from: Date,
    to: Date,
  ): Promise<readonly ProviderBenchmarkPoint[]>;
  getHealth(): Promise<ProviderHealth>;
  getRateLimitState(): ProviderRateLimitState;
  getLicense(): ProviderLicenseMetadata;
}
