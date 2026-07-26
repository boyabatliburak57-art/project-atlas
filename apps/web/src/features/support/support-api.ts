import { publicEnvironment } from '@/config/env';

export interface SupportRequest {
  readonly id: string;
  readonly referenceCode: string;
  readonly status: string;
  readonly subject: string;
  readonly type: string;
  readonly version: number;
  readonly timeline: readonly {
    readonly id: string;
    readonly kind: string;
    readonly message: string | null;
  }[];
}

export const supportApi = {
  create: (input: unknown) =>
    request<SupportRequest>('/support/requests', {
      body: JSON.stringify(input),
      method: 'POST',
    }),
  list: () =>
    request<{ items: readonly SupportRequest[] }>('/support/requests'),
};

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(
    `${publicEnvironment.NEXT_PUBLIC_API_URL}${path}`,
    {
      ...init,
      headers: { 'content-type': 'application/json', ...init?.headers },
    },
  );
  const body = (await response.json()) as {
    data?: T;
    error?: { code?: string };
  };
  if (!response.ok)
    throw new Error(body.error?.code ?? `HTTP_${response.status}`);
  return body.data as T;
}
