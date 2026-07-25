'use client';

import { useEffect, useState } from 'react';

import { createFormatters } from '../localization';
import { SafeMetadata } from '../trust/safe-metadata';
import { reportsApi, type GeneratedReport } from './api';

const reportFormatters = createFormatters();

function formatDate(value: string) {
  return reportFormatters.dateTime(value);
}

const types = [
  ['portfolio', 'Portföy'],
  ['scanner', 'Tarama'],
  ['alert_history', 'Alarm geçmişi'],
  ['backtest', 'Backtest'],
  ['experiment_matrix', 'Deney matrisi'],
  ['account_security', 'Hesap ve güvenlik'],
] as const;

export function ReportCenter() {
  const [items, setItems] = useState<readonly GeneratedReport[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [reportType, setReportType] = useState('account_security');
  const [sourceId, setSourceId] = useState('');
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [status, setStatus] = useState('Raporlar yükleniyor');

  async function load(next?: string) {
    try {
      const page = await reportsApi.list(next);
      setItems((current) =>
        next === undefined ? page.items : [...current, ...page.items],
      );
      setCursor(page.nextCursor);
      setStatus(
        page.items.length === 0 && next === undefined
          ? 'Henüz rapor yok'
          : 'Raporlar güncel',
      );
    } catch {
      setStatus('Raporlar yüklenemedi');
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function generate() {
    setStatus('Rapor oluşturuluyor');
    try {
      const created = await reportsApi.create({
        reportType,
        format,
        ...(reportType === 'account_security'
          ? {}
          : { sourceId: sourceId.trim() }),
      });
      setItems((current) => [
        created,
        ...current.filter(({ id }) => id !== created.id),
      ]);
      setStatus('Rapor hazır');
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `Rapor oluşturulamadı: ${error.message}`
          : 'Rapor oluşturulamadı',
      );
    }
  }

  async function download(report: GeneratedReport) {
    try {
      const link = await reportsApi.downloadLink(report.id);
      window.location.assign(link.downloadUrl);
    } catch {
      setStatus('İndirme bağlantısı oluşturulamadı');
    }
  }

  async function remove(report: GeneratedReport) {
    if (!window.confirm('Bu raporu kalıcı olarak kaldırmak istiyor musunuz?'))
      return;
    try {
      await reportsApi.remove(report.id);
      setItems((current) => current.filter(({ id }) => id !== report.id));
      setStatus('Rapor silindi');
    } catch {
      setStatus('Rapor silinemedi');
    }
  }

  return (
    <section className="report-center">
      <header>
        <p className="eyebrow">Unified report center</p>
        <h1>Raporlar</h1>
        <p>
          Veri kesim zamanı, metodoloji, kaynak revision’ları ve uyarılarıyla
          yeniden üretilebilir dışa aktarımlar.
        </p>
      </header>

      <fieldset className="report-builder">
        <legend>Yeni rapor</legend>
        <label>
          Rapor türü
          <select
            onChange={(event) => setReportType(event.target.value)}
            value={reportType}
          >
            {types.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {reportType === 'account_security' ? null : (
          <label>
            Kaynak kimliği
            <input
              autoComplete="off"
              onChange={(event) => setSourceId(event.target.value)}
              placeholder="UUID"
              value={sourceId}
            />
          </label>
        )}
        <label>
          Dosya biçimi
          <select
            onChange={(event) =>
              setFormat(event.target.value as 'csv' | 'json')
            }
            value={format}
          >
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </select>
        </label>
        <button onClick={() => void generate()} type="button">
          Rapor oluştur
        </button>
      </fieldset>

      <p aria-live="polite">{status}</p>
      <ol className="report-list">
        {items.map((report) => (
          <li key={report.id}>
            <div>
              <strong>{labelFor(report.reportType)}</strong>
              <span className={`report-status report-${report.status}`}>
                {report.status}
              </span>
              <small>
                Veri kesimi: {formatDate(report.dataCutoffAt)} · Süre sonu:{' '}
                {formatDate(report.expiresAt)}
              </small>
            </div>
            <details>
              <summary>Metodoloji ve uyarılar</summary>
              <SafeMetadata metadata={report.methodology} />
              <p>Kaynak revizyonları</p>
              <SafeMetadata metadata={report.sourceRevisions} />
              <p>
                Uyarılar:{' '}
                {report.warnings.length === 0
                  ? 'Uyarı yok'
                  : report.warnings.join(', ')}
              </p>
            </details>
            <div className="report-actions">
              {report.status === 'ready' ? (
                <button onClick={() => void download(report)} type="button">
                  İndir
                </button>
              ) : null}
              {['queued', 'running'].includes(report.status) ? (
                <button
                  onClick={() =>
                    void reportsApi
                      .cancel(report.id)
                      .then(() => void load())
                      .catch(() => setStatus('Rapor iptal edilemedi'))
                  }
                  type="button"
                >
                  İptal et
                </button>
              ) : null}
              <button onClick={() => void remove(report)} type="button">
                Sil
              </button>
            </div>
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

function labelFor(type: string) {
  return types.find(([value]) => value === type)?.[1] ?? type;
}
