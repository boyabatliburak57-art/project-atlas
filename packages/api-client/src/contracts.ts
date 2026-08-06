export interface AtlasApiErrorShape {
  readonly status: number;
  readonly code: string;
  readonly reasonCode?: string;
  readonly safeMessage: string;
  readonly fieldErrors: Readonly<Record<string, readonly string[]>>;
  readonly retryable: boolean;
  readonly requestId?: string;
  readonly retryAfterMs?: number;
}

export interface AtlasResponse<T> {
  readonly data: T;
  readonly meta: Readonly<Record<string, unknown>>;
}

export interface CursorPage<T> {
  readonly data: {
    readonly items: readonly T[];
  };
  readonly meta: {
    readonly nextCursor?: string | null;
    readonly [key: string]: unknown;
  };
}

export interface ClientContext {
  readonly appVersion: string;
  readonly locale: string;
  readonly platform: 'android' | 'ios';
  readonly timezone: string;
}

export interface SessionCredentialProvider {
  getToken(): Promise<string | null>;
  onUnauthorized(error: AtlasApiErrorShape): Promise<void>;
}

export interface ApiRequest {
  readonly body?: unknown;
  readonly method?: 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';
  readonly path: string;
  readonly query?: Readonly<
    Record<string, boolean | number | string | undefined>
  >;
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
}

export type FetchImplementation = typeof fetch;
