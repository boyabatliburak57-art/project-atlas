import type {
  ApiRequest,
  AtlasApiErrorShape,
  ClientContext,
  FetchImplementation,
  SessionCredentialProvider,
} from './contracts';

const SAFE_DEFAULT_MESSAGE = 'The request could not be completed.';
const RETRYABLE_STATUS = new Set([408, 425, 429, 502, 503, 504]);

export class AtlasApiError extends Error implements AtlasApiErrorShape {
  readonly code: string;
  readonly fieldErrors: Readonly<Record<string, readonly string[]>>;
  readonly reasonCode?: string;
  readonly requestId?: string;
  readonly retryAfterMs?: number;
  readonly retryable: boolean;
  readonly safeMessage: string;
  readonly status: number;

  constructor(shape: AtlasApiErrorShape) {
    super(shape.safeMessage);
    this.name = 'AtlasApiError';
    this.status = shape.status;
    this.code = shape.code;
    this.safeMessage = shape.safeMessage;
    this.fieldErrors = shape.fieldErrors;
    this.retryable = shape.retryable;
    if (shape.reasonCode !== undefined) this.reasonCode = shape.reasonCode;
    if (shape.requestId !== undefined) this.requestId = shape.requestId;
    if (shape.retryAfterMs !== undefined)
      this.retryAfterMs = shape.retryAfterMs;
  }
}

export interface AtlasApiClientOptions {
  readonly baseUrl: string;
  readonly context: () => ClientContext;
  readonly credentials: SessionCredentialProvider;
  readonly fetch?: FetchImplementation;
  readonly requestId?: () => string;
}

export class AtlasApiClient {
  private readonly baseUrl: string;
  private readonly fetchImplementation: FetchImplementation;

  constructor(private readonly options: AtlasApiClientOptions) {
    this.baseUrl = validateBaseUrl(options.baseUrl);
    this.fetchImplementation = options.fetch ?? fetch;
  }

  async request<T>(request: ApiRequest): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort('timeout'),
      request.timeoutMs ?? 15_000,
    );
    const linkedAbort = () => controller.abort(request.signal?.reason);
    request.signal?.addEventListener('abort', linkedAbort, { once: true });
    const requestId = this.options.requestId?.() ?? createRequestId();
    try {
      const token =
        request.authentication === 'anonymous'
          ? null
          : await this.options.credentials.getToken();
      if (controller.signal.aborted) throw new Error('request aborted');
      const context = this.options.context();
      const response = await this.fetchImplementation(this.url(request), {
        method: request.method ?? 'GET',
        headers: {
          Accept: 'application/json',
          ...(request.body === undefined
            ? {}
            : { 'Content-Type': 'application/json' }),
          ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
          ...(request.idempotencyKey === undefined
            ? {}
            : { 'Idempotency-Key': request.idempotencyKey }),
          'X-Atlas-Client': 'mobile',
          'X-Atlas-Platform': context.platform,
          'X-Atlas-App-Version': context.appVersion,
          'X-Atlas-Locale': context.locale,
          'X-Atlas-Timezone': context.timezone,
          'X-Request-ID': requestId,
        },
        ...(request.body === undefined
          ? {}
          : { body: JSON.stringify(request.body) }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const error = await mapApiError(response, requestId);
        if (response.status === 401 && request.authentication !== 'anonymous')
          await this.options.credentials.onUnauthorized(error);
        throw error;
      }
      if (response.status === 204) return undefined as T;
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof AtlasApiError) throw error;
      if (controller.signal.aborted) {
        throw new AtlasApiError({
          status: 0,
          code: 'REQUEST_CANCELLED',
          reasonCode:
            controller.signal.reason === 'timeout' ? 'TIMEOUT' : 'ABORTED',
          safeMessage:
            controller.signal.reason === 'timeout'
              ? 'The request timed out.'
              : 'The request was cancelled.',
          fieldErrors: {},
          retryable: controller.signal.reason === 'timeout',
          requestId,
        });
      }
      throw new AtlasApiError({
        status: 0,
        code: 'NETWORK_ERROR',
        reasonCode: 'NETWORK_UNAVAILABLE',
        safeMessage: 'Network connection is unavailable.',
        fieldErrors: {},
        retryable: true,
        requestId,
      });
    } finally {
      clearTimeout(timeout);
      request.signal?.removeEventListener('abort', linkedAbort);
    }
  }

  private url(request: ApiRequest): string {
    if (!request.path.startsWith('/'))
      throw new Error('API path must start with /');
    const url = new URL(`${this.baseUrl}${request.path}`);
    for (const [key, value] of Object.entries(request.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    return url.toString();
  }
}

export async function mapApiError(
  response: Pick<Response, 'headers' | 'json' | 'status'>,
  fallbackRequestId?: string,
): Promise<AtlasApiError> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }
  const record = isRecord(payload) ? payload : {};
  const nested = isRecord(record['error']) ? record['error'] : record;
  const retryAfter = parseRetryAfter(response.headers.get('retry-after'));
  const reasonCode = safeCode(nested['reasonCode']);
  const requestId =
    response.headers.get('x-request-id') ??
    safeCode(nested['requestId']) ??
    fallbackRequestId;
  return new AtlasApiError({
    status: response.status,
    code: safeCode(nested['code']) ?? `HTTP_${String(response.status)}`,
    ...(reasonCode === undefined ? {} : { reasonCode }),
    safeMessage:
      safeMessage(nested['safeMessage']) ??
      safeMessage(nested['message']) ??
      SAFE_DEFAULT_MESSAGE,
    fieldErrors: parseFieldErrors(nested['fieldErrors']),
    retryable: RETRYABLE_STATUS.has(response.status),
    ...(requestId === undefined ? {} : { requestId }),
    ...(retryAfter === undefined ? {} : { retryAfterMs: retryAfter }),
  });
}

export function shouldRetryRequest(
  failureCount: number,
  error: unknown,
): boolean {
  return failureCount < 2 && error instanceof AtlasApiError && error.retryable;
}

function validateBaseUrl(value: string): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol))
    throw new Error('API base URL must use HTTP(S)');
  return value.replace(/\/+$/u, '');
}

function createRequestId(): string {
  return `mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function parseRetryAfter(value: string | null): number | undefined {
  if (value === null) return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1_000 : undefined;
}

function safeCode(value: unknown): string | undefined {
  return typeof value === 'string' && /^[A-Z0-9_.-]{1,96}$/u.test(value)
    ? value
    : undefined;
}

function safeMessage(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 && value.length <= 240
    ? value
    : undefined;
}

function parseFieldErrors(
  value: unknown,
): Readonly<Record<string, readonly string[]>> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, messages]) => Array.isArray(messages))
      .map(([field, messages]) => [
        field,
        (messages as unknown[]).filter(
          (message): message is string =>
            typeof message === 'string' && message.length <= 160,
        ),
      ]),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
