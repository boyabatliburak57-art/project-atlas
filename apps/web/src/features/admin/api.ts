import { publicEnvironment } from '@/config/env';

const base = publicEnvironment.NEXT_PUBLIC_API_URL;

export interface AdminFlag {
  readonly id: string;
  readonly key: string;
  readonly description: string;
  readonly flagType: string;
  readonly owner: string | null;
  readonly expiresAt: string | null;
}

export interface AdminOverview {
  readonly audit: readonly Record<string, unknown>[];
  readonly backup: Record<string, unknown> | null;
  readonly dataFreshness?: {
    readonly latest_closed_bar_at: string | null;
    readonly latest_financial_at: string | null;
    readonly latest_pattern_at: string | null;
  };
  readonly incidents: readonly Record<string, unknown>[];
  readonly queues: readonly {
    readonly name: string;
    readonly paused: boolean;
    readonly counts: Readonly<Record<string, number>>;
  }[];
  readonly recovery: readonly Record<string, unknown>[];
  readonly releases: readonly Record<string, unknown>[];
}

export interface DataOperationsOverview {
  readonly connections: readonly {
    readonly id: string;
    readonly providerKey: string;
    readonly status: string;
    readonly version: number;
  }[];
  readonly corrections: readonly {
    readonly id: string;
    readonly findingId: string;
    readonly state: string;
    readonly version: number;
    readonly rebuildStatus: string;
  }[];
  readonly findings: readonly {
    readonly id: string;
    readonly findingType: string;
    readonly resourceKey: string;
    readonly severity: string;
    readonly status: string;
    readonly version: number;
  }[];
  readonly runs: readonly {
    readonly id: string;
    readonly capability: string;
    readonly status: string;
  }[];
}

export interface AdminLegalDocument {
  readonly documentType: string;
  readonly id: string;
  readonly locale: string;
  readonly rowVersion: number;
  readonly status: string;
  readonly title: string;
  readonly version: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const body = (await response.json().catch(() => null)) as {
    data?: T;
    error?: { code?: string };
  } | null;
  if (!response.ok)
    throw new Error(body?.error?.code ?? `ADMIN_HTTP_${response.status}`);
  return body?.data as T;
}

export const adminOperationsApi = {
  overview: () => request<AdminOverview>('/admin/operations/overview'),
  dataOperations: () =>
    request<DataOperationsOverview>('/admin/data-operations'),
  legalDocuments: () =>
    request<readonly AdminLegalDocument[]>('/admin/legal/documents'),
  approveLegalDocument: (
    id: string,
    input: {
      confirmation: 'LEGAL_COUNSEL_APPROVED';
      expectedVersion: number;
      legalApprovalReference: string;
      reason: string;
    },
  ) =>
    request(`/admin/legal/documents/${encodeURIComponent(id)}/approve`, {
      body: JSON.stringify(input),
      method: 'POST',
    }),
  publishLegalDocument: (
    id: string,
    input: { effectiveAt: string; expectedVersion: number; reason: string },
  ) =>
    request(`/admin/legal/documents/${encodeURIComponent(id)}/publish`, {
      body: JSON.stringify(input),
      method: 'POST',
    }),
  transitionCorrection: (
    id: string,
    transition: string,
    input: {
      confirmation?: string;
      expectedVersion: number;
      reason: string;
      replayIdempotencyKey?: string;
      targetRevisionId?: string;
    },
  ) =>
    request(
      `/admin/data-operations/corrections/${encodeURIComponent(id)}/${encodeURIComponent(transition)}`,
      { body: JSON.stringify(input), method: 'POST' },
    ),
  flags: () =>
    request<{ expired: AdminFlag[]; items: AdminFlag[] }>(
      '/admin/feature-flags',
    ),
  history: (key: string) =>
    request<{
      flag: AdminFlag;
      versions: readonly {
        enabled: boolean;
        environment: string;
        version: number;
      }[];
    }>(`/admin/feature-flags/${encodeURIComponent(key)}/history`),
  setFlagVersion: (
    key: string,
    input: {
      enabled: boolean;
      environment: 'staging';
      rolloutPercentage: number;
      reason: string;
      expectedVersion: number;
      confirmation: 'CONFIRM_OPERATIONAL_CHANGE';
    },
  ) =>
    request(`/admin/feature-flags/${encodeURIComponent(key)}/versions`, {
      body: JSON.stringify(input),
      method: 'POST',
    }),
  setQueuePaused: (
    queue: string,
    paused: boolean,
    input: { reason: string; expectedVersion: number; confirmation: string },
  ) =>
    request(
      `/admin/operations/queues/${encodeURIComponent(queue)}/${paused ? 'pause' : 'resume'}`,
      { body: JSON.stringify(input), method: 'POST' },
    ),
  setSwitch: (
    key: string,
    enabled: boolean,
    input: { reason: string; expectedVersion: number; confirmation: string },
  ) =>
    request(
      `/admin/maintenance/kill-switches/${encodeURIComponent(key)}/${enabled ? 'enable' : 'disable'}`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    ),
  setMaintenanceBanner: (input: {
    confirmation: string;
    expectedVersion: number;
    message: string;
    reason: string;
  }) =>
    request('/admin/maintenance/banner', {
      body: JSON.stringify(input),
      method: 'POST',
    }),
};
