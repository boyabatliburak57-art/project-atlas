'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AtlasShell, WorkspaceState } from './atlas-shell';
import { portfolioApi } from './api';
import type { Notification } from './types';
import { WorkspaceHeader } from './watchlists-workspace';

export function NotificationsWorkspace() {
  const client = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const notifications = useQuery({
    queryKey: ['notifications', { unreadOnly }],
    queryFn: () => portfolioApi.notifications(unreadOnly),
    refetchInterval: 5_000,
  });
  useEffect(() => {
    if (notifications.dataUpdatedAt > 0) {
      void client.invalidateQueries({
        queryKey: ['notifications', 'unread-count'],
      });
    }
  }, [client, notifications.dataUpdatedAt]);
  const changeRead = useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) =>
      read
        ? portfolioApi.readNotification(id)
        : portfolioApi.unreadNotification(id),
    onSuccess: invalidateNotifications(client),
  });
  const markAll = useMutation({
    mutationFn: portfolioApi.markAllRead,
    onSuccess: invalidateNotifications(client),
  });

  return (
    <AtlasShell>
      <main className="portfolio-main notifications-main">
        <WorkspaceHeader
          eyebrow="Teslimat merkezi"
          title="Bildirimler"
          description="Alarm tetiklerini, veri zamanını ve okundu durumunu kronolojik bir akışta izleyin."
        >
          <Link className="button ghost" href="/notification-preferences">
            Tercihler
          </Link>
          <button
            className="button primary"
            type="button"
            disabled={markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            Tümünü okundu yap
          </button>
        </WorkspaceHeader>
        <div className="notification-toolbar">
          <label className="switch-field">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(event) => setUnreadOnly(event.target.checked)}
            />
            <span>Yalnız okunmamış</span>
          </label>
          <span>{notifications.data?.length ?? 0} kayıt</span>
        </div>
        <section
          className="notification-feed"
          aria-label="Bildirim akışı"
          aria-live="polite"
        >
          {notifications.isLoading && (
            <WorkspaceState kind="loading">
              Bildirimler yükleniyor…
            </WorkspaceState>
          )}
          {notifications.isError && (
            <WorkspaceState kind="error">Bildirimler alınamadı.</WorkspaceState>
          )}
          {notifications.data?.length === 0 && (
            <WorkspaceState kind="empty">
              Bu görünümde bildirim yok.
            </WorkspaceState>
          )}
          {notifications.data?.map((item) => (
            <NotificationRow
              key={item.id}
              item={item}
              pending={changeRead.isPending}
              onRead={(read) => changeRead.mutate({ id: item.id, read })}
            />
          ))}
        </section>
      </main>
    </AtlasShell>
  );
}

function NotificationRow({
  item,
  pending,
  onRead,
}: {
  readonly item: Notification;
  readonly pending: boolean;
  readonly onRead: (read: boolean) => void;
}) {
  const unread = item.readAt === null;
  const symbol =
    typeof item.metadata.symbol === 'string' ? item.metadata.symbol : null;
  return (
    <article className={clsx('notification-row', unread && 'unread')}>
      <div className="timeline-mark">
        <span aria-hidden="true" />
        <time dateTime={item.occurredAt}>{formatTime(item.occurredAt)}</time>
      </div>
      <div className="notification-copy">
        <div>
          <span className="notification-type">{typeLabel(item.type)}</span>
          {symbol && <span className="symbol-chip">{symbol}</span>}
        </div>
        <h2>{item.title}</h2>
        <p>{item.body}</p>
      </div>
      <div className="notification-action">
        {unread ? (
          <button
            className="text-button"
            type="button"
            disabled={pending}
            onClick={() => onRead(true)}
            aria-label={`${item.title} bildirimini okundu yap`}
          >
            Okundu yap
          </button>
        ) : (
          <button
            className="text-button"
            type="button"
            disabled={pending}
            onClick={() => onRead(false)}
            aria-label={`${item.title} bildirimini okunmadı yap`}
          >
            Okunmadı yap
          </button>
        )}
      </div>
    </article>
  );
}

function invalidateNotifications(client: ReturnType<typeof useQueryClient>) {
  return async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['notifications'] }),
      client.invalidateQueries({ queryKey: ['notifications', 'unread-count'] }),
    ]);
  };
}

function typeLabel(type: string) {
  return (
    (
      {
        alertTriggered: 'Alarm tetiklendi',
        alertDeliveryFailed: 'Teslimat sorunu',
        dataStaleWarning: 'Veri uyarısı',
        scanCompleted: 'Tarama tamamlandı',
        systemAnnouncement: 'Sistem',
        security: 'Güvenlik',
      } as Record<string, string>
    )[type] ?? type
  );
}
function formatTime(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
