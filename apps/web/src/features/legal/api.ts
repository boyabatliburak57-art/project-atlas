'use client';

import { publicEnvironment } from '@/config/env';

export interface LegalDocument {
  readonly content: string;
  readonly contentHash: string;
  readonly documentType: string;
  readonly effectiveAt: string;
  readonly id: string;
  readonly locale: string;
  readonly materialChange: boolean;
  readonly title: string;
  readonly version: number;
}

export interface ConsentHistory {
  readonly history: readonly {
    readonly action: 'accepted' | 'withdrawn';
    readonly documentId: string;
    readonly documentType: string;
    readonly documentVersion: number;
    readonly locale: string;
    readonly source: string;
  }[];
  readonly reconsentRequired: readonly {
    readonly documentId: string;
    readonly documentType: string;
    readonly locale: string;
    readonly version: number;
  }[];
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

export const legalApi = {
  documents: () =>
    request<readonly LegalDocument[]>('/legal/documents?locale=tr-TR'),
  history: () => request<ConsentHistory>('/me/consents?locale=tr-TR'),
  consent: (
    documentId: string,
    source: 'registration' | 'onboarding' | 'settings' | 'reconsent',
  ) =>
    request('/legal/consents', {
      body: JSON.stringify({ documentId, locale: 'tr-TR', source }),
      method: 'POST',
    }),
};
