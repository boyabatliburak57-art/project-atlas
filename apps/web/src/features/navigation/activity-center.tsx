'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { navigationApi, type ActivityItem } from './api';

export function ActivityCenter() {
  const [items, setItems] = useState<readonly ActivityItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState('Etkinlikler yükleniyor');

  async function load(next?: string) {
    try {
      const page = await navigationApi.activity(next);
      setItems((current) =>
        next === undefined ? page.items : [...current, ...page.items],
      );
      setCursor(page.nextCursor);
      setState(
        page.items.length === 0 && next === undefined
          ? 'Henüz etkinlik yok'
          : 'Etkinlikler güncel',
      );
    } catch {
      setState('Etkinlikler yüklenemedi');
    }
  }
  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="activity-center">
      <header>
        <p className="eyebrow">Activity center</p>
        <h1>Son etkinlikler</h1>
        <p>Tarama, alarm, portföy ve araştırma işlerinin güvenli özeti.</p>
      </header>
      <p aria-live="polite">{state}</p>
      <ol>
        {items.map((item) => (
          <li key={item.id}>
            <span className={`activity-status activity-${item.status}`}>
              {item.status}
            </span>
            <div>
              <strong>{item.summary}</strong>
              <small>
                {new Intl.DateTimeFormat('tr-TR', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(item.occurredAt))}
              </small>
            </div>
            {item.sourceId === null ? null : (
              <Link href={sourceHref(item)}>Aç</Link>
            )}
          </li>
        ))}
      </ol>
      {cursor === null ? null : (
        <button onClick={() => void load(cursor)} type="button">
          Daha fazla yükle
        </button>
      )}
    </section>
  );
}

function sourceHref(item: ActivityItem): string {
  const roots: Record<string, string> = {
    scan: '/scanner/runs',
    portfolio: '/portfolios',
    backtest: '/backtests',
    experiment: '/experiments',
    alert: '/alerts',
  };
  return `${roots[item.sourceType] ?? '/activity'}/${item.sourceId}`;
}
