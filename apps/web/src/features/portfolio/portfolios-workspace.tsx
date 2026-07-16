'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { FormEvent, useState } from 'react';

import { AtlasShell, WorkspaceState } from './atlas-shell';
import { portfolioApi } from './api';
import {
  errorMessage,
  formatDateTime,
  formatMoney,
  formatPercent,
  signedTone,
} from './portfolio-ui';
import type { Portfolio } from './types';
import { WorkspaceHeader } from './watchlists-workspace';

export function PortfoliosWorkspace() {
  const client = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const portfolios = useQuery({
    queryKey: ['portfolios', 'all'],
    queryFn: () => portfolioApi.portfolios(true),
  });
  const create = useMutation({
    mutationFn: portfolioApi.createPortfolio,
    onSuccess: async () => {
      setShowCreate(false);
      await client.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });
  const remove = useMutation({
    mutationFn: portfolioApi.deletePortfolio,
    onSuccess: () => client.invalidateQueries({ queryKey: ['portfolios'] }),
  });
  const restore = useMutation({
    mutationFn: portfolioApi.restorePortfolio,
    onSuccess: () => client.invalidateQueries({ queryKey: ['portfolios'] }),
  });

  return (
    <AtlasShell>
      <main className="portfolio-main portfolio-list-main">
        <WorkspaceHeader
          eyebrow="Portföy yönetimi"
          title="Portföyler"
          description="Ledger tabanlı pozisyonlarınızı, değerleme zamanını ve veri kalitesini birlikte izleyin."
        >
          <button
            className="button primary"
            type="button"
            aria-expanded={showCreate}
            onClick={() => setShowCreate((value) => !value)}
          >
            Yeni portföy
          </button>
        </WorkspaceHeader>

        {showCreate && (
          <CreatePortfolioForm
            pending={create.isPending}
            error={create.error}
            onSubmit={(input) => create.mutate(input)}
          />
        )}

        <section aria-label="Portföy listesi" className="portfolio-ledger-list">
          <div className="portfolio-list-head" aria-hidden="true">
            <span>Portföy</span>
            <span>Toplam değer</span>
            <span>Günlük değişim</span>
            <span>Data cutoff</span>
            <span>Durum</span>
            <span>İşlem</span>
          </div>
          {portfolios.isLoading && (
            <WorkspaceState kind="loading">
              Portföyler yükleniyor.
            </WorkspaceState>
          )}
          {portfolios.isError && (
            <WorkspaceState kind="error">
              Portföyler alınamadı. API bağlantısını kontrol edin.
            </WorkspaceState>
          )}
          {portfolios.data?.length === 0 && (
            <WorkspaceState kind="empty">
              Henüz portföy yok. İlk portföyünüzü oluşturarak başlayın.
            </WorkspaceState>
          )}
          {portfolios.data?.map((portfolio) => (
            <PortfolioListRow
              key={portfolio.id}
              portfolio={portfolio}
              pending={remove.isPending || restore.isPending}
              onDelete={() => remove.mutate(portfolio.id)}
              onRestore={() => restore.mutate(portfolio.id)}
            />
          ))}
        </section>
        {(remove.error || restore.error) && (
          <p className="form-error" role="alert">
            {errorMessage(remove.error ?? restore.error)}
          </p>
        )}
      </main>
    </AtlasShell>
  );
}

function PortfolioListRow({
  portfolio,
  pending,
  onDelete,
  onRestore,
}: {
  readonly portfolio: Portfolio;
  readonly pending: boolean;
  readonly onDelete: () => void;
  readonly onRestore: () => void;
}) {
  const enabled = portfolio.status !== 'deleted';
  const valuation = useQuery({
    queryKey: ['portfolios', portfolio.id, 'valuation'],
    queryFn: () => portfolioApi.valuation(portfolio.id),
    enabled,
    retry: false,
  });
  const performance = useQuery({
    queryKey: ['portfolios', portfolio.id, 'performance'],
    queryFn: () => portfolioApi.performance(portfolio.id),
    enabled,
    retry: false,
  });
  const series = performance.data?.dailyValueSeries ?? [];
  const last = series.at(-1);
  const previous = series.at(-2);
  const dailyChange =
    last && previous && Number(previous.value) !== 0
      ? String(Number(last.value) / Number(previous.value) - 1)
      : null;
  return (
    <article className="portfolio-list-row">
      <div className="portfolio-list-identity">
        {enabled ? (
          <Link href={`/portfolios/${portfolio.id}`}>{portfolio.name}</Link>
        ) : (
          <strong>{portfolio.name}</strong>
        )}
        <small>{portfolio.description ?? 'Açıklama eklenmemiş'}</small>
      </div>
      <strong>
        {valuation.isLoading
          ? 'Yükleniyor'
          : formatMoney(valuation.data?.totalValue)}
      </strong>
      <span className={signedTone(dailyChange)}>
        {dailyChange === null ? 'Hesaplanamadı' : formatPercent(dailyChange)}
      </span>
      <time dateTime={valuation.data?.dataCutoffAt}>
        {formatDateTime(valuation.data?.dataCutoffAt)}
      </time>
      <span className={`status-chip ${enabled ? 'active' : 'paused'}`}>
        {enabled ? 'Aktif' : 'Silindi'}
      </span>
      <button
        className="text-button"
        type="button"
        disabled={pending}
        onClick={enabled ? onDelete : onRestore}
      >
        {enabled ? 'Sil' : 'Geri yükle'}
      </button>
    </article>
  );
}

function CreatePortfolioForm({
  pending,
  error,
  onSubmit,
}: {
  readonly pending: boolean;
  readonly error: Error | null;
  readonly onSubmit: (input: {
    name: string;
    description?: string;
    defaultBenchmarkCode?: string;
  }) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const description = formField(data, 'description');
    onSubmit({
      name: formField(data, 'name'),
      ...(description ? { description } : {}),
      defaultBenchmarkCode: formField(data, 'benchmark') || 'XU100',
    });
  }
  return (
    <form className="portfolio-create-form" onSubmit={submit}>
      <label>
        <span>Portföy adı</span>
        <input name="name" required maxLength={200} autoComplete="off" />
      </label>
      <label>
        <span>Açıklama</span>
        <input name="description" maxLength={4000} />
      </label>
      <label>
        <span>Benchmark</span>
        <select name="benchmark" defaultValue="XU100">
          <option value="XU100">BIST 100</option>
          <option value="XU030">BIST 30</option>
        </select>
      </label>
      <button className="button primary" disabled={pending}>
        {pending ? 'Oluşturuluyor' : 'Portföy oluştur'}
      </button>
      {error && (
        <p className="form-error" role="alert">
          {errorMessage(error)}
        </p>
      )}
    </form>
  );
}

function formField(data: FormData, name: string) {
  const value = data.get(name);
  return typeof value === 'string' ? value.trim() : '';
}
