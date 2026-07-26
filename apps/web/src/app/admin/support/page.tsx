'use client';

import { useQuery } from '@tanstack/react-query';

import { AtlasShell } from '../../../features/portfolio/atlas-shell';
import { request } from '../../../features/support/support-api';

interface QueueItem {
  readonly id: string;
  readonly referenceCode: string;
  readonly status: string;
  readonly subject: string;
  readonly type: string;
}

export default function AdminSupportPage() {
  const query = useQuery({
    queryFn: () =>
      request<{ items: readonly QueueItem[] }>('/admin/support/requests'),
    queryKey: ['admin-support'],
  });
  return (
    <AtlasShell>
      <main className="workspace" id="main-content">
        <header className="workspace__header">
          <div>
            <p className="eyebrow">OPERATIONS</p>
            <h1>Destek kuyruğu</h1>
            <p>
              Atama, durum, kullanıcı yanıtı, iç not ve veri düzeltme bağlantısı
              reason, version ve audit ile yönetilir. SLA metadata yalnız admin
              görünümündedir.
            </p>
          </div>
        </header>
        <section className="panel" aria-live="polite">
          <h2>Açık talepler</h2>
          {query.isError ? (
            <p role="alert">Bu yüzey operations_admin rolü gerektirir.</p>
          ) : (
            <ul>
              {query.data?.items.map((item) => (
                <li key={item.id}>
                  <strong>{item.referenceCode}</strong> · {item.type} ·{' '}
                  {item.status} · {item.subject}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </AtlasShell>
  );
}
