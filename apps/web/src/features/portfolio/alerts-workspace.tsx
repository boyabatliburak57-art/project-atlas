'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { FormEvent, useState } from 'react';

import { AtlasShell, WorkspaceState } from './atlas-shell';
import { portfolioApi } from './api';
import type { Alert } from './types';
import { WorkspaceHeader } from './watchlists-workspace';

type ComposerKind = 'price' | 'saved_scan';

export function AlertsWorkspace() {
  const client = useQueryClient();
  const alerts = useQuery({
    queryKey: ['alerts'],
    queryFn: portfolioApi.alerts,
  });
  const [composer, setComposer] = useState<ComposerKind | null>(null);
  const create = useMutation({
    mutationFn: portfolioApi.createAlert,
    onSuccess: async () => {
      setComposer(null);
      await client.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
  const lifecycle = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'pause' | 'resume' }) =>
      action === 'pause'
        ? portfolioApi.pauseAlert(id)
        : portfolioApi.resumeAlert(id),
    onSuccess: async () => client.invalidateQueries({ queryKey: ['alerts'] }),
  });

  return (
    <AtlasShell>
      <main className="portfolio-main">
        <WorkspaceHeader
          eyebrow="Koşul izleme"
          title="Alarmlar"
          description="Fiyat koşullarını ve kayıtlı tarama eşleşmelerini revision geçmişi korunarak takip edin."
        >
          <button
            className="button ghost"
            type="button"
            onClick={() => setComposer('saved_scan')}
          >
            NewMatch alarmı
          </button>
          <button
            className="button primary"
            type="button"
            onClick={() => setComposer('price')}
          >
            Fiyat alarmı
          </button>
        </WorkspaceHeader>

        {composer !== null && (
          <AlertComposer
            kind={composer}
            pending={create.isPending}
            error={create.error}
            onClose={() => setComposer(null)}
            onSubmit={(input) => create.mutate(input)}
          />
        )}

        <section className="alert-ledger" aria-label="Alarm listesi">
          <div className="ledger-head">
            <span>Alarm / kaynak</span>
            <span>Politika</span>
            <span>Revision</span>
            <span>Durum</span>
            <span className="sr-only">İşlemler</span>
          </div>
          {alerts.isLoading && (
            <WorkspaceState kind="loading">Alarmlar yükleniyor…</WorkspaceState>
          )}
          {alerts.isError && (
            <WorkspaceState kind="error">
              Alarmlar alınamadı. Tekrar deneyin.
            </WorkspaceState>
          )}
          {alerts.data?.length === 0 && (
            <WorkspaceState kind="empty">
              Henüz alarm yok. Bir fiyat seviyesi veya saved scan ile başlayın.
            </WorkspaceState>
          )}
          {alerts.data?.map((alert) => (
            <AlertRow
              key={alert.id}
              alert={alert}
              pending={lifecycle.isPending}
              onLifecycle={(action) =>
                lifecycle.mutate({ id: alert.id, action })
              }
            />
          ))}
        </section>
      </main>
    </AtlasShell>
  );
}

function AlertRow({
  alert,
  pending,
  onLifecycle,
}: {
  readonly alert: Alert;
  readonly pending: boolean;
  readonly onLifecycle: (action: 'pause' | 'resume') => void;
}) {
  const isPrice = alert.revision.source.type === 'instrument_price';
  const threshold = alert.revision.sourceConfiguration.threshold;
  return (
    <article className="ledger-row">
      <div>
        <strong>{alert.name}</strong>
        <small>
          {isPrice
            ? `Fiyat · ${String(threshold)} ₺`
            : 'Saved scan · yeni eşleşme'}
        </small>
      </div>
      <div>
        <span className="data-label">Tekrar</span>
        {policyLabel(alert.revision.repeatPolicy)}
      </div>
      <div>
        <span className="data-label">Sürüm</span>r{alert.currentRevision}
      </div>
      <div>
        <span className={clsx('status-chip', alert.status)}>
          {statusLabel(alert.status)}
        </span>
      </div>
      <div className="row-actions">
        {alert.status === 'active' && (
          <button
            className="text-button"
            type="button"
            disabled={pending}
            onClick={() => onLifecycle('pause')}
            aria-label={`${alert.name} alarmını duraklat`}
          >
            Duraklat
          </button>
        )}
        {alert.status === 'paused' && (
          <button
            className="text-button"
            type="button"
            disabled={pending}
            onClick={() => onLifecycle('resume')}
            aria-label={`${alert.name} alarmını devam ettir`}
          >
            Devam ettir
          </button>
        )}
      </div>
    </article>
  );
}

function AlertComposer({
  kind,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  readonly kind: ComposerKind;
  readonly pending: boolean;
  readonly error: Error | null;
  readonly onClose: () => void;
  readonly onSubmit: (input: Readonly<Record<string, unknown>>) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const channels =
      data.get('email') === 'on' ? ['in_app', 'email'] : ['in_app'];
    if (kind === 'price') {
      onSubmit({
        name: field(data, 'name'),
        source: {
          type: 'instrument_price',
          instrumentId: field(data, 'instrumentId'),
        },
        triggerPolicy: 'thresholdCrossed',
        repeatPolicy: 'afterReset',
        timeframe: '1d',
        evaluationMode: 'closed_bar',
        channels,
        sourceConfiguration: {
          operator: field(data, 'operator'),
          threshold: Number(data.get('threshold')),
        },
      });
      return;
    }
    onSubmit({
      name: field(data, 'name'),
      source: {
        type: 'saved_scan',
        savedScanId: field(data, 'savedScanId'),
        savedScanRevision: Number(data.get('savedScanRevision')),
      },
      triggerPolicy: 'newMatch',
      repeatPolicy: 'everyNewMatch',
      timeframe: '1d',
      evaluationMode: 'closed_bar',
      channels,
      sourceConfiguration: {},
    });
  }
  return (
    <form className="alert-composer" onSubmit={submit}>
      <div className="composer-title">
        <div>
          <p className="rail-label">Yeni alarm</p>
          <h2>{kind === 'price' ? 'Fiyat eşiği' : 'Saved scan newMatch'}</h2>
        </div>
        <button className="text-button" type="button" onClick={onClose}>
          Kapat
        </button>
      </div>
      <div className="composer-grid">
        <label>
          <span>Alarm adı</span>
          <input
            name="name"
            required
            maxLength={160}
            placeholder={
              kind === 'price' ? 'THYAO fiyat eşiği' : 'Yeni RSI eşleşmeleri'
            }
          />
        </label>
        {kind === 'price' ? (
          <>
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
              <span>Koşul</span>
              <select name="operator" defaultValue="GTE">
                <option value="GTE">Fiyat ≥</option>
                <option value="LTE">Fiyat ≤</option>
                <option value="GT">Fiyat &gt;</option>
                <option value="LT">Fiyat &lt;</option>
              </select>
            </label>
            <label>
              <span>Eşik (₺)</span>
              <input
                name="threshold"
                required
                type="number"
                min="0"
                step="0.01"
              />
            </label>
          </>
        ) : (
          <>
            <label>
              <span>Saved scan kimliği</span>
              <input
                name="savedScanId"
                required
                pattern="[0-9a-fA-F-]{36}"
                placeholder="Saved scan UUID"
              />
            </label>
            <label>
              <span>Saved scan revision</span>
              <input
                name="savedScanRevision"
                required
                type="number"
                min="1"
                defaultValue="1"
              />
            </label>
          </>
        )}
        <label className="check-field">
          <input type="checkbox" name="email" />
          <span>E-mail kanalını da kullan</span>
        </label>
      </div>
      <div className="composer-actions">
        <p>In-app bildirim her zaman açıktır.</p>
        <button className="button primary" disabled={pending}>
          {pending ? 'Oluşturuluyor…' : 'Alarm oluştur'}
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          Alarm oluşturulamadı: {error.message}
        </p>
      )}
    </form>
  );
}

function statusLabel(status: Alert['status']) {
  return {
    active: 'Aktif',
    paused: 'Duraklatıldı',
    invalid: 'Geçersiz',
    deleted: 'Silindi',
  }[status];
}
function policyLabel(policy: string) {
  return (
    (
      {
        afterReset: 'Reset sonrası',
        everyNewMatch: 'Her yeni eşleşme',
        once: 'Bir kez',
        oncePerClosedBar: 'Her kapanan bar',
        oncePerDay: 'Günde bir',
      } as Record<string, string>
    )[policy] ?? policy
  );
}

function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
}
