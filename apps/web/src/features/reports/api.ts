'use client';

import { publicEnvironment } from '@/config/env';

export interface GeneratedReport {
  readonly id: string;
  readonly reportType: string;
  readonly sourceType: string;
  readonly sourceId: string | null;
  readonly status: string;
  readonly contentType: string | null;
  readonly byteSize: number | null;
  readonly methodology: Readonly<Record<string, unknown>>;
  readonly sourceRevisions: Readonly<Record<string, unknown>>;
  readonly warnings: readonly string[];
  readonly dataCutoffAt: string;
  readonly generatedAt: string | null;
  readonly expiresAt: string;
  readonly createdAt: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
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

export const reportsApi = {
  list: (cursor?: string) =>
    request<{
      items: readonly GeneratedReport[];
      nextCursor: string | null;
    }>(
      `/reports?${new URLSearchParams({
        limit: '20',
        ...(cursor === undefined ? {} : { cursor }),
      }).toString()}`,
    ),
  create: (input: {
    reportType: string;
    sourceId?: string;
    format: 'csv' | 'json';
  }) =>
    request<GeneratedReport>('/reports', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  remove: (id: string) =>
    request<{ id: string; deleted: boolean }>(`/reports/${id}`, {
      method: 'DELETE',
    }),
  cancel: (id: string) =>
    request<GeneratedReport>(`/reports/${id}/cancel`, { method: 'POST' }),
  downloadLink: async (id: string) => {
    const link = await request<{
      downloadUrl: string;
      expiresAt: string;
      filename: string;
    }>(`/reports/${id}/download`);
    return {
      ...link,
      downloadUrl: link.downloadUrl.startsWith('/api/v1/')
        ? `${new URL(publicEnvironment.NEXT_PUBLIC_API_URL).origin}${link.downloadUrl}`
        : link.downloadUrl,
    };
  },
};
