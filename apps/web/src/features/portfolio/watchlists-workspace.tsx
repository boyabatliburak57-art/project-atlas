'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { FormEvent, useEffect, useState } from 'react';

import { AtlasShell, WorkspaceState } from './atlas-shell';
import { portfolioApi } from './api';

export function WatchlistsWorkspace() {
  const client = useQueryClient();
  const watchlists = useQuery({
    queryKey: ['watchlists'],
    queryFn: portfolioApi.watchlists,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (selectedId === null && watchlists.data?.[0])
      setSelectedId(watchlists.data[0].id);
  }, [selectedId, watchlists.data]);

  const selected = watchlists.data?.find(({ id }) => id === selectedId) ?? null;
  const summary = useQuery({
    queryKey: ['watchlists', selectedId, 'summary'],
    queryFn: () => portfolioApi.marketSummary(selectedId!),
    enabled: selectedId !== null,
  });
  const create = useMutation({
    mutationFn: portfolioApi.createWatchlist,
    onSuccess: async (item) => {
      setSelectedId(item.id);
      setCreateOpen(false);
      await client.invalidateQueries({ queryKey: ['watchlists'] });
    },
  });
  const addItem = useMutation({
    mutationFn: (input: { instrumentId: string; note?: string }) =>
      portfolioApi.addWatchlistItem(selectedId!, input),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['watchlists'] }),
        client.invalidateQueries({
          queryKey: ['watchlists', selectedId, 'summary'],
        }),
      ]);
    },
  });

  return (
    <AtlasShell>
      <main className="portfolio-main">
        <WorkspaceHeader
          eyebrow="İzleme evreni"
          title="Watchlist’ler"
          description="Takip ettiğiniz BIST sembollerini, veri tazeliğini ve aktif alarm yükünü tek yerde yönetin."
        >
          <button
            className="button primary"
            type="button"
            onClick={() => setCreateOpen((value) => !value)}
            aria-expanded={createOpen}
          >
            Yeni watchlist
          </button>
        </WorkspaceHeader>

        {createOpen && (
          <CreateWatchlistForm
            pending={create.isPending}
            error={create.error}
            onSubmit={(input) => create.mutate(input)}
          />
        )}

        <div className="portfolio-split">
          <aside className="portfolio-index" aria-label="Watchlist listesi">
            <p className="rail-label">
              Listeler / {watchlists.data?.length ?? 0}
            </p>
            {watchlists.isLoading && (
              <WorkspaceState kind="loading">
                Watchlist’ler yükleniyor…
              </WorkspaceState>
            )}
            {watchlists.isError && (
              <WorkspaceState kind="error">
                Watchlist’ler alınamadı. API bağlantısını kontrol edin.
              </WorkspaceState>
            )}
            {watchlists.data?.length === 0 && (
              <WorkspaceState kind="empty">
                İlk listenizi oluşturarak başlayın.
              </WorkspaceState>
            )}
            {watchlists.data?.map((item) => (
              <button
                key={item.id}
                className={clsx(
                  'index-row',
                  item.id === selectedId && 'selected',
                )}
                type="button"
                onClick={() => setSelectedId(item.id)}
              >
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.items.length} sembol</small>
                </span>
                <span className="row-arrow" aria-hidden="true">
                  →
                </span>
              </button>
            ))}
          </aside>

          <section className="portfolio-detail" aria-live="polite">
            {selected === null ? (
              <WorkspaceState kind="empty">
                Detayını görmek için bir watchlist seçin.
              </WorkspaceState>
            ) : (
              <>
                <div className="detail-heading">
                  <div>
                    <p className="rail-label">Aktif liste</p>
                    <h2>{selected.name}</h2>
                    <p>
                      {selected.description ??
                        'Bu liste için açıklama eklenmemiş.'}
                    </p>
                  </div>
                  <span className="status-chip active">Aktif</span>
                </div>
                <AddSymbolForm
                  pending={addItem.isPending}
                  error={addItem.error}
                  onSubmit={(input) => addItem.mutate(input)}
                />
                <div className="market-table-wrap">
                  {summary.isLoading && (
                    <WorkspaceState kind="loading">
                      Piyasa özeti hazırlanıyor…
                    </WorkspaceState>
                  )}
                  {summary.isError && (
                    <WorkspaceState kind="error">
                      Piyasa özeti alınamadı.
                    </WorkspaceState>
                  )}
                  {summary.data?.length === 0 && (
                    <WorkspaceState kind="empty">
                      Henüz sembol yok. Enstrüman kimliğiyle ilk sembolü
                      ekleyin.
                    </WorkspaceState>
                  )}
                  {summary.data && summary.data.length > 0 && (
                    <table className="market-table">
                      <thead>
                        <tr>
                          <th>Sembol</th>
                          <th>Son fiyat</th>
                          <th>Günlük</th>
                          <th>Veri</th>
                          <th>Alarm</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.data.map((item) => (
                          <tr key={item.instrumentId}>
                            <td>
                              <strong>{item.symbol}</strong>
                              <small>{item.company}</small>
                            </td>
                            <td>{formatPrice(item.lastPrice)}</td>
                            <td
                              className={
                                Number(item.dailyChangePercent) >= 0
                                  ? 'positive'
                                  : 'negative'
                              }
                            >
                              {formatPercent(item.dailyChangePercent)}
                            </td>
                            <td>
                              <span
                                className={clsx(
                                  'freshness',
                                  item.stale && 'stale',
                                )}
                              >
                                {item.stale ? 'Gecikmiş' : 'Güncel'}
                              </span>
                            </td>
                            <td>{item.activeAlertCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </AtlasShell>
  );
}

function CreateWatchlistForm({
  pending,
  error,
  onSubmit,
}: {
  readonly pending: boolean;
  readonly error: Error | null;
  readonly onSubmit: (input: { name: string; description?: string }) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSubmit({
      name: field(data, 'name'),
      description: field(data, 'description'),
    });
  }
  return (
    <form className="inline-composer" onSubmit={submit}>
      <label>
        <span>Liste adı</span>
        <input
          name="name"
          required
          maxLength={160}
          placeholder="Örn. Ana takip"
        />
      </label>
      <label>
        <span>Açıklama</span>
        <input name="description" maxLength={4000} placeholder="İsteğe bağlı" />
      </label>
      <button className="button primary" disabled={pending}>
        {pending ? 'Oluşturuluyor…' : 'Watchlist oluştur'}
      </button>
      {error && (
        <p className="form-error" role="alert">
          Watchlist oluşturulamadı: {error.message}
        </p>
      )}
    </form>
  );
}

function AddSymbolForm({
  pending,
  error,
  onSubmit,
}: {
  readonly pending: boolean;
  readonly error: Error | null;
  readonly onSubmit: (input: { instrumentId: string; note?: string }) => void;
}) {
  const [key, setKey] = useState(0);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const note = field(data, 'note');
    onSubmit({
      instrumentId: field(data, 'instrumentId'),
      ...(note.length === 0 ? {} : { note }),
    });
    setKey((value) => value + 1);
  }
  return (
    <form className="symbol-composer" key={key} onSubmit={submit}>
      <label>
        <span>Enstrüman kimliği</span>
        <input
          name="instrumentId"
          required
          pattern="[0-9a-fA-F-]{36}"
          placeholder="BIST instrument UUID"
        />
      </label>
      <label>
        <span>Not</span>
        <input
          name="note"
          maxLength={500}
          placeholder="İsteğe bağlı kısa not"
        />
      </label>
      <button className="button ghost" disabled={pending}>
        {pending ? 'Ekleniyor…' : 'Sembol ekle'}
      </button>
      {error && (
        <p className="form-error" role="alert">
          Sembol eklenemedi: {error.message}
        </p>
      )}
    </form>
  );
}

export function WorkspaceHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly children?: React.ReactNode;
}) {
  return (
    <header className="portfolio-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </header>
  );
}

function formatPrice(value: string | null) {
  return value === null
    ? '—'
    : `${Number(value).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`;
}
function formatPercent(value: string | null) {
  return value === null
    ? '—'
    : `${Number(value) >= 0 ? '+' : ''}${Number(value).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}%`;
}

function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
}
