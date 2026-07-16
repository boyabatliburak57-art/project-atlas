import { publicEnvironment } from '@/config/env';

import type {
  Alert,
  MarketSummaryItem,
  Notification,
  NotificationPreferences,
  Portfolio,
  PortfolioImportJob,
  PortfolioImportRow,
  PortfolioPerformance,
  PortfolioRisk,
  PortfolioTransaction,
  PortfolioTransactionType,
  PortfolioValuation,
  PositionProjection,
  Watchlist,
} from './types';

const base = publicEnvironment.NEXT_PUBLIC_API_URL;

interface Envelope<T> {
  readonly data: T;
  readonly meta?: {
    readonly nextCursor?: string | null;
    readonly replayed?: boolean;
  };
}

export class PortfolioApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(code);
    this.name = 'PortfolioApiError';
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<Envelope<T>> {
  const multipart = init?.body instanceof FormData;
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      ...(multipart ? {} : { 'Content-Type': 'application/json' }),
      ...init?.headers,
    },
  });
  const body = (await response.json().catch(() => null)) as
    | Envelope<T>
    | { error?: { code?: string; message?: string } }
    | null;
  if (!response.ok) {
    const error = body as {
      error?: { code?: string; message?: string };
    } | null;
    throw new PortfolioApiError(
      error?.error?.code ?? error?.error?.message ?? `HTTP_${response.status}`,
      response.status,
      error?.error,
    );
  }
  return body as Envelope<T>;
}

export const portfolioApi = {
  watchlists: async () =>
    (await request<{ items: Watchlist[] }>('/watchlists?limit=100')).data.items,
  watchlist: async (id: string) =>
    (await request<Watchlist>(`/watchlists/${id}`)).data,
  createWatchlist: async (input: { name: string; description?: string }) =>
    (
      await request<Watchlist>('/watchlists', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    ).data,
  addWatchlistItem: async (
    id: string,
    input: { instrumentId: string; note?: string; tags?: string[] },
  ) =>
    (
      await request<Watchlist>(`/watchlists/${id}/items`, {
        method: 'POST',
        body: JSON.stringify(input),
      })
    ).data,
  marketSummary: async (id: string) =>
    (
      await request<{ watchlistId: string; items: MarketSummaryItem[] }>(
        `/watchlists/${id}/market-summary?limit=100`,
      )
    ).data.items,

  alerts: async () => (await request<Alert[]>('/alerts?limit=100')).data,
  createAlert: async (input: Readonly<Record<string, unknown>>) =>
    (
      await request<Alert>('/alerts', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    ).data,
  pauseAlert: async (id: string) =>
    (
      await request<Alert>(`/alerts/${id}/pause`, {
        method: 'POST',
        body: '{}',
      })
    ).data,
  resumeAlert: async (id: string) =>
    (
      await request<Alert>(`/alerts/${id}/resume`, {
        method: 'POST',
        body: '{}',
      })
    ).data,

  notifications: async (unreadOnly: boolean) =>
    (
      await request<Notification[]>(
        `/notifications?limit=100${unreadOnly ? '&unread=true' : ''}`,
      )
    ).data,
  unreadCount: async () =>
    (await request<{ unreadCount: number }>('/notifications/unread-count')).data
      .unreadCount,
  readNotification: async (id: string) =>
    (
      await request<Notification>(`/notifications/${id}/read`, {
        method: 'POST',
        body: '{}',
      })
    ).data,
  unreadNotification: async (id: string) =>
    (
      await request<Notification>(`/notifications/${id}/unread`, {
        method: 'POST',
        body: '{}',
      })
    ).data,
  markAllRead: async () =>
    (
      await request<{ updatedCount: number }>('/notifications/mark-all-read', {
        method: 'POST',
        body: '{}',
      })
    ).data,
  preferences: async () =>
    (await request<NotificationPreferences>('/notification-preferences')).data,
  savePreferences: async (input: NotificationPreferences) =>
    (
      await request<NotificationPreferences>('/notification-preferences', {
        method: 'PUT',
        body: JSON.stringify(input),
      })
    ).data,

  portfolios: async (includeDeleted = false) =>
    (
      await request<{ items: Portfolio[] }>(
        `/portfolios?limit=100&includeDeleted=${includeDeleted}`,
      )
    ).data.items,
  portfolio: async (id: string) =>
    (await request<Portfolio>(`/portfolios/${id}`)).data,
  createPortfolio: async (input: {
    readonly name: string;
    readonly description?: string;
    readonly defaultBenchmarkCode?: string;
  }) =>
    (
      await request<Portfolio>('/portfolios', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    ).data,
  deletePortfolio: async (id: string) =>
    (
      await request<Portfolio>(`/portfolios/${id}`, {
        method: 'DELETE',
      })
    ).data,
  restorePortfolio: async (id: string) =>
    (
      await request<Portfolio>(`/portfolios/${id}/restore`, {
        method: 'POST',
        body: '{}',
      })
    ).data,
  positions: async (id: string) =>
    (
      await request<{ items: PositionProjection[] }>(
        `/portfolios/${id}/positions`,
      )
    ).data.items,
  valuation: async (id: string) =>
    (await request<PortfolioValuation>(`/portfolios/${id}/valuation`)).data,
  performance: async (id: string) =>
    (await request<PortfolioPerformance>(`/portfolios/${id}/performance`)).data,
  risk: async (id: string) =>
    (await request<PortfolioRisk>(`/portfolios/${id}/risk`)).data,
  recalculate: async (id: string, key: string) =>
    (
      await request<{
        portfolioId: string;
        ledgerVersion: number;
        status: 'completed';
      }>(`/portfolios/${id}/recalculate`, {
        method: 'POST',
        headers: { 'Idempotency-Key': key },
        body: '{}',
      })
    ).data,
  transactions: async (id: string) =>
    (
      await request<{ items: PortfolioTransaction[] }>(
        `/portfolios/${id}/transactions?limit=100`,
      )
    ).data.items,
  createTransaction: async (
    portfolioId: string,
    key: string,
    input: {
      readonly type: PortfolioTransactionType;
      readonly instrumentId?: string | null;
      readonly tradeAt: string;
      readonly quantity?: string | null;
      readonly unitPrice?: string | null;
      readonly fee?: string;
      readonly tax?: string;
      readonly cashAmount?: string | null;
      readonly externalReference?: string | null;
      readonly adjustmentReason?: string | null;
      readonly note?: string | null;
    },
  ) =>
    (
      await request<PortfolioTransaction>(
        `/portfolios/${portfolioId}/transactions`,
        {
          method: 'POST',
          headers: { 'Idempotency-Key': key },
          body: JSON.stringify(input),
        },
      )
    ).data,
  postTransaction: async (
    portfolioId: string,
    transactionId: string,
    key: string,
  ) =>
    (
      await request<PortfolioTransaction>(
        `/portfolios/${portfolioId}/transactions/${transactionId}/post`,
        {
          method: 'POST',
          headers: { 'Idempotency-Key': key },
          body: '{}',
        },
      )
    ).data,
  reverseTransaction: async (
    portfolioId: string,
    transactionId: string,
    key: string,
  ) =>
    (
      await request<PortfolioTransaction>(
        `/portfolios/${portfolioId}/transactions/${transactionId}/reverse`,
        {
          method: 'POST',
          headers: { 'Idempotency-Key': key },
          body: '{}',
        },
      )
    ).data,
  previewImport: async (portfolioId: string, file: File, key: string) => {
    const body = new FormData();
    body.set('file', file);
    return (
      await request<PortfolioImportJob>(`/portfolios/${portfolioId}/imports`, {
        method: 'POST',
        headers: { 'Idempotency-Key': key },
        body,
      })
    ).data;
  },
  importRows: async (portfolioId: string, jobId: string) =>
    (
      await request<{ items: PortfolioImportRow[] }>(
        `/portfolios/${portfolioId}/imports/${jobId}/rows?limit=500`,
      )
    ).data.items,
  commitImport: async (
    portfolioId: string,
    jobId: string,
    mode: 'atomic' | 'partial',
    key: string,
  ) =>
    (
      await request<PortfolioImportJob>(
        `/portfolios/${portfolioId}/imports/${jobId}/commit`,
        {
          method: 'POST',
          headers: { 'Idempotency-Key': key },
          body: JSON.stringify({ mode }),
        },
      )
    ).data,
};

export function portfolioExportUrl(
  portfolioId: string,
  resource: 'transactions' | 'positions' | 'performance',
) {
  return `${base}/portfolios/${portfolioId}/exports/${resource}`;
}
