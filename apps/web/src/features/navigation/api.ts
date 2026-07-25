'use client';

import { publicEnvironment } from '@/config/env';

export interface SearchItem {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly subtitle: string | null;
  readonly href: string;
  readonly highlight: readonly {
    readonly text: string;
    readonly matched: boolean;
  }[];
}

export interface ActivityItem {
  readonly id: string;
  readonly eventType: string;
  readonly sourceType: string;
  readonly sourceId: string | null;
  readonly status: string;
  readonly occurredAt: string;
  readonly summary: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(
    `${publicEnvironment.NEXT_PUBLIC_API_URL}${path}`,
    { headers: { accept: 'application/json' } },
  );
  const body = (await response.json()) as {
    data?: T;
    error?: { code?: string };
  };
  if (!response.ok)
    throw new Error(body.error?.code ?? `HTTP_${response.status}`);
  return body.data as T;
}

export const navigationApi = {
  search: (query: string, cursor?: string) =>
    get<{ items: readonly SearchItem[]; nextCursor: string | null }>(
      `/search?${new URLSearchParams({
        q: query,
        limit: '10',
        ...(cursor === undefined ? {} : { cursor }),
      }).toString()}`,
    ),
  activity: (cursor?: string) =>
    get<{ items: readonly ActivityItem[]; nextCursor: string | null }>(
      `/activity?${new URLSearchParams({
        limit: '20',
        ...(cursor === undefined ? {} : { cursor }),
      }).toString()}`,
    ),
};
