import { publicEnvironment } from '@/config/env';

import type {
  Alert,
  MarketSummaryItem,
  Notification,
  NotificationPreferences,
  Watchlist,
} from './types';

const base = publicEnvironment.NEXT_PUBLIC_API_URL;

interface Envelope<T> {
  readonly data: T;
  readonly meta?: { readonly nextCursor?: string | null };
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<Envelope<T>> {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const body = (await response.json().catch(() => null)) as
    | Envelope<T>
    | { error?: { code?: string; message?: string } }
    | null;
  if (!response.ok) {
    const error = body as {
      error?: { code?: string; message?: string };
    } | null;
    throw new Error(
      error?.error?.code ?? error?.error?.message ?? `HTTP_${response.status}`,
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
};
