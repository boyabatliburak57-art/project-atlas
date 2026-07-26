'use client';

import { publicEnvironment } from '@/config/env';

export interface DemoResource {
  readonly disclaimer: string;
  readonly id: string;
  readonly isDemo: true;
  readonly label: string;
  readonly ownerUserId: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly resourceType: string;
}

async function request<T>(init?: RequestInit): Promise<T> {
  const response = await fetch(
    `${publicEnvironment.NEXT_PUBLIC_API_URL}/me/demo`,
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

export const demoApi = {
  create: () => request<readonly DemoResource[]>({ method: 'POST' }),
  list: () => request<readonly DemoResource[]>(),
  reset: () => request<{ removed: number }>({ method: 'DELETE' }),
};
