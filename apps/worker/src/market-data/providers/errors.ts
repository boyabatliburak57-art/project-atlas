export const PROVIDER_ERROR_CODES = [
  'PROVIDER_AUTHENTICATION_FAILED',
  'PROVIDER_INVALID_SYMBOL_MAPPING',
  'PROVIDER_MALFORMED_RESPONSE',
  'PROVIDER_NOT_REGISTERED',
  'PROVIDER_RATE_LIMITED',
  'PROVIDER_TIMEOUT',
  'PROVIDER_UNAVAILABLE',
  'PROVIDER_UNSUPPORTED_TIMEFRAME',
] as const;

export type ProviderErrorCode = (typeof PROVIDER_ERROR_CODES)[number];

export const PROVIDER_ERROR_TAXONOMY = [
  'authentication',
  'authorization',
  'rateLimit',
  'timeout',
  'network',
  'invalidPayload',
  'unsupportedCapability',
  'notFound',
  'temporaryUnavailable',
  'permanentFailure',
] as const;

export type ProviderErrorTaxonomy = (typeof PROVIDER_ERROR_TAXONOMY)[number];

const RETRYABLE_TAXONOMY: ReadonlySet<ProviderErrorTaxonomy> = new Set([
  'rateLimit',
  'timeout',
  'network',
  'temporaryUnavailable',
]);

const SAFE_TAXONOMY_MESSAGES: Record<ProviderErrorTaxonomy, string> = {
  authentication: 'Provider authentication failed',
  authorization: 'Provider authorization failed',
  rateLimit: 'Provider rate limit was reached',
  timeout: 'Provider request timed out',
  network: 'Provider network request failed',
  invalidPayload: 'Provider returned an invalid response',
  unsupportedCapability: 'Provider capability is not available',
  notFound: 'Provider resource was not found',
  temporaryUnavailable: 'Provider is temporarily unavailable',
  permanentFailure: 'Provider operation failed permanently',
};

export class ProviderContractError extends Error {
  override readonly name = 'ProviderContractError';
  readonly retryable: boolean;

  constructor(
    readonly taxonomy: ProviderErrorTaxonomy,
    readonly context: {
      readonly providerCode?: string | undefined;
      readonly capability?: string | undefined;
      readonly retryAfterMs?: number | undefined;
    } = {},
    options?: ErrorOptions,
  ) {
    super(SAFE_TAXONOMY_MESSAGES[taxonomy], options);
    this.retryable = RETRYABLE_TAXONOMY.has(taxonomy);
  }
}

export function retryPolicyForProviderError(error: ProviderContractError): {
  readonly retryable: boolean;
  readonly retryAfterMs: number | null;
} {
  return {
    retryable: error.retryable,
    retryAfterMs:
      error.taxonomy === 'rateLimit'
        ? (error.context.retryAfterMs ?? null)
        : null,
  };
}

const RETRYABLE_ERROR_CODES: ReadonlySet<ProviderErrorCode> = new Set([
  'PROVIDER_RATE_LIMITED',
  'PROVIDER_TIMEOUT',
  'PROVIDER_UNAVAILABLE',
]);

const SAFE_MESSAGES: Record<ProviderErrorCode, string> = {
  PROVIDER_AUTHENTICATION_FAILED: 'Provider authentication failed',
  PROVIDER_INVALID_SYMBOL_MAPPING: 'Provider symbol mapping is invalid',
  PROVIDER_MALFORMED_RESPONSE: 'Provider returned an invalid response',
  PROVIDER_NOT_REGISTERED: 'Market data provider is not registered',
  PROVIDER_RATE_LIMITED: 'Provider rate limit was reached',
  PROVIDER_TIMEOUT: 'Provider request timed out',
  PROVIDER_UNAVAILABLE: 'Market data provider is unavailable',
  PROVIDER_UNSUPPORTED_TIMEFRAME: 'Provider does not support the timeframe',
};

export class ProviderError extends Error {
  override readonly name = 'ProviderError';
  readonly retryable: boolean;

  constructor(
    readonly code: ProviderErrorCode,
    options?: ErrorOptions,
  ) {
    super(SAFE_MESSAGES[code], options);
    this.retryable = RETRYABLE_ERROR_CODES.has(code);
  }
}
