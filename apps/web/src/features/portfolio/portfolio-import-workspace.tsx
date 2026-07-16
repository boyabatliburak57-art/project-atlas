'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useState } from 'react';

import { AtlasShell, WorkspaceState } from './atlas-shell';
import { portfolioApi } from './api';
import { errorMessage, idempotencyKey, PortfolioSubnav } from './portfolio-ui';
import type { PortfolioImportJob, PortfolioImportRow } from './types';

export function PortfolioImportWorkspace({
  portfolioId,
}: {
  readonly portfolioId: string;
}) {
  const client = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<PortfolioImportJob | null>(null);
  const [mode, setMode] = useState<'atomic' | 'partial'>('atomic');
  const portfolio = useQuery({
    queryKey: ['portfolios', portfolioId],
    queryFn: () => portfolioApi.portfolio(portfolioId),
    retry: false,
  });
  const preview = useMutation({
    mutationFn: () =>
      portfolioApi.previewImport(portfolioId, file!, idempotencyKey('preview')),
    onSuccess: (value) => {
      setJob(value);
      setMode('atomic');
    },
  });
  const rows = useQuery({
    queryKey: ['portfolios', portfolioId, 'imports', job?.id, 'rows'],
    queryFn: () => portfolioApi.importRows(portfolioId, job!.id),
    enabled: job !== null,
    retry: false,
  });
  const commit = useMutation({
    mutationFn: () =>
      portfolioApi.commitImport(
        portfolioId,
        job!.id,
        mode,
        idempotencyKey('commit'),
      ),
    onSuccess: async (value) => {
      setJob(value);
      await client.invalidateQueries({ queryKey: ['portfolios', portfolioId] });
    },
  });
  useEffect(() => {
    if (job?.status === 'completed') void rows.refetch();
  }, [job?.status]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (file) preview.mutate();
  }
  const atomicBlocked =
    mode === 'atomic' &&
    job !== null &&
    (job.invalidRowCount > 0 || job.duplicateRowCount > 0);
  const actionError = preview.error ?? commit.error;
  return (
    <AtlasShell>
      <main className="portfolio-main import-main">
        <header className="portfolio-page-header compact-heading">
          <div>
            <p className="rail-label">İki aşamalı içe aktarma</p>
            <h1>{portfolio.data?.name ?? 'CSV içe aktar'}</h1>
            <p>
              Dosya önce doğrulanır ve saklanır. Ledger yalnız açık commit
              onayından sonra değişir.
            </p>
          </div>
        </header>
        <PortfolioSubnav portfolioId={portfolioId} />
        {portfolio.isError && (
          <WorkspaceState kind="error">
            {errorMessage(portfolio.error)}
          </WorkspaceState>
        )}

        <form className="import-dropzone" onSubmit={submit}>
          <label htmlFor="portfolio-csv">CSV dosyası seçin</label>
          <p>
            UTF-8, virgül veya noktalı virgül. En fazla 5 MiB ve 10.000 satır.
          </p>
          <input
            id="portfolio-csv"
            name="file"
            type="file"
            accept=".csv,text/csv"
            required
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setJob(null);
            }}
          />
          <div className="import-file-action">
            <span>
              {file
                ? `${file.name} (${formatBytes(file.size)})`
                : 'Dosya seçilmedi'}
            </span>
            <button
              className="button primary"
              disabled={!file || preview.isPending || commit.isPending}
            >
              {preview.isPending ? 'Önizleme hazırlanıyor' : 'CSV önizle'}
            </button>
          </div>
        </form>
        {actionError && (
          <p className="form-error import-error" role="alert">
            {errorMessage(actionError)}
          </p>
        )}

        {job && (
          <section
            className="import-preview"
            aria-labelledby="import-preview-title"
          >
            <div className="section-heading-inline">
              <div>
                <h2 id="import-preview-title">Önizleme sonucu</h2>
                <p>
                  {job.sourceFilename}, {job.encoding.toUpperCase()}, ayraç “
                  {job.delimiter}”
                </p>
              </div>
              <span
                className={`status-chip ${job.status === 'completed' ? 'active' : ''}`}
              >
                {importStatus(job.status)}
              </span>
            </div>
            <dl className="import-counts">
              <div>
                <dt>Toplam</dt>
                <dd>{job.totalRowCount}</dd>
              </div>
              <div>
                <dt>Geçerli</dt>
                <dd>{job.validRowCount}</dd>
              </div>
              <div>
                <dt>Hatalı</dt>
                <dd>{job.invalidRowCount}</dd>
              </div>
              <div>
                <dt>Duplicate</dt>
                <dd>{job.duplicateRowCount}</dd>
              </div>
              <div>
                <dt>Committed</dt>
                <dd>{job.committedRowCount}</dd>
              </div>
            </dl>

            {rows.isLoading && (
              <WorkspaceState kind="loading">
                Satır sonuçları yükleniyor.
              </WorkspaceState>
            )}
            {rows.isError && (
              <WorkspaceState kind="error">
                Satır sonuçları alınamadı.
              </WorkspaceState>
            )}
            {rows.data && <ImportRowsTable rows={rows.data} />}

            {job.status === 'preview_ready' && (
              <div className="import-commit-panel">
                <fieldset>
                  <legend>Commit modu</legend>
                  <label>
                    <input
                      type="radio"
                      name="commitMode"
                      value="atomic"
                      checked={mode === 'atomic'}
                      onChange={() => setMode('atomic')}
                    />
                    <span>
                      <strong>Atomic</strong> Herhangi bir kritik hatada hiçbir
                      işlem yazılmaz.
                    </span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="commitMode"
                      value="partial"
                      checked={mode === 'partial'}
                      onChange={() => setMode('partial')}
                    />
                    <span>
                      <strong>Partial</strong> Yalnız geçerli satırlar yazılır.
                      Bu seçim açık kullanıcı onayıdır.
                    </span>
                  </label>
                </fieldset>
                {atomicBlocked && (
                  <p className="form-error" role="alert">
                    Atomic commit için hatalı ve duplicate satırları düzeltin
                    veya partial modu açıkça seçin.
                  </p>
                )}
                <div className="import-commit-actions">
                  {rows.data?.some(
                    (row) =>
                      row.status === 'invalid' || row.status === 'duplicate',
                  ) && (
                    <button
                      className="button ghost"
                      type="button"
                      onClick={() => downloadErrorReport(job, rows.data ?? [])}
                    >
                      Hata raporunu indir
                    </button>
                  )}
                  <button
                    className="button primary"
                    type="button"
                    disabled={atomicBlocked || commit.isPending}
                    onClick={() => commit.mutate()}
                  >
                    {commit.isPending
                      ? 'Ledger’a yazılıyor'
                      : `${mode === 'atomic' ? 'Atomic' : 'Partial'} commit`}
                  </button>
                </div>
              </div>
            )}
            {job.status === 'completed' && (
              <div className="import-result" role="status">
                <strong>İçe aktarma tamamlandı</strong>
                <p>
                  {job.committedRowCount} işlem ledger’a aktarıldı. Mod:{' '}
                  {job.commitMode}.
                </p>
              </div>
            )}
          </section>
        )}
      </main>
    </AtlasShell>
  );
}

function ImportRowsTable({
  rows,
}: {
  readonly rows: readonly PortfolioImportRow[];
}) {
  return (
    <div className="market-table-wrap">
      <table className="market-table import-table">
        <thead>
          <tr>
            <th>Satır</th>
            <th>Durum</th>
            <th>İşlem</th>
            <th>Sembol</th>
            <th>Tarih</th>
            <th>Hata</th>
            <th>Duplicate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.rowNumber}
              className={row.status === 'invalid' ? 'not-evaluable' : undefined}
            >
              <td>{row.rowNumber}</td>
              <td>
                <span
                  className={`status-chip ${row.status === 'valid' || row.status === 'committed' ? 'active' : 'paused'}`}
                >
                  {rowStatus(row.status)}
                </span>
              </td>
              <td>{row.rawData.transactionType || 'Veri yok'}</td>
              <td>{row.rawData.symbol || 'Nakit'}</td>
              <td>{row.rawData.tradeDate || 'Veri yok'}</td>
              <td>
                {row.validationErrors.map((error) => error.code).join(', ') ||
                  'Yok'}
              </td>
              <td>{row.duplicateOfTransactionId ?? 'Yok'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function downloadErrorReport(
  job: PortfolioImportJob,
  rows: readonly PortfolioImportRow[],
) {
  const headers = [
    'rowNumber',
    'status',
    'transactionType',
    'symbol',
    'tradeDate',
    'errors',
    'duplicateOfTransactionId',
  ];
  const lines = rows
    .filter((row) => row.status === 'invalid' || row.status === 'duplicate')
    .map((row) => [
      row.rowNumber,
      row.status,
      row.rawData.transactionType,
      row.rawData.symbol,
      row.rawData.tradeDate,
      row.validationErrors.map((error) => error.code).join('|'),
      row.duplicateOfTransactionId,
    ]);
  const csv = [headers, ...lines]
    .map((line) => line.map(safeCsvCell).join(','))
    .join('\r\n');
  const url = URL.createObjectURL(
    new Blob([csv], { type: 'text/csv;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `${job.sourceFilename.replace(/\.csv$/iu, '')}-errors.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function safeCsvCell(value: unknown) {
  const raw =
    value == null
      ? ''
      : typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean' ||
          typeof value === 'bigint'
        ? `${value}`
        : (JSON.stringify(value) ?? '');
  const protectedValue = /^[=+\-@]/u.test(raw) ? `'${raw}` : raw;
  return /[",\r\n;]/u.test(protectedValue)
    ? `"${protectedValue.replaceAll('"', '""')}"`
    : protectedValue;
}

function importStatus(status: PortfolioImportJob['status']) {
  return {
    uploaded: 'Yüklendi',
    validating: 'Doğrulanıyor',
    preview_ready: 'Önizleme hazır',
    committing: 'Commit ediliyor',
    completed: 'Tamamlandı',
    failed: 'Başarısız',
    cancelled: 'İptal edildi',
  }[status];
}
function rowStatus(status: PortfolioImportRow['status']) {
  return {
    valid: 'Geçerli',
    invalid: 'Hatalı',
    duplicate: 'Duplicate',
    committed: 'Committed',
    skipped: 'Atlandı',
  }[status];
}
function formatBytes(value: number) {
  return value < 1024
    ? `${value} bayt`
    : `${(value / 1024).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} KiB`;
}
