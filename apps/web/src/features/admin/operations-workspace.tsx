'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { AtlasShell, WorkspaceState } from '../portfolio/atlas-shell';
import {
  adminOperationsApi,
  type AdminFlag,
  type AdminLegalDocument,
} from './api';

const killSwitchKeys = new Set([
  'scanner.new-runs.disabled',
  'alerts.evaluation.disabled',
  'notifications.email-delivery.disabled',
  'portfolios.imports.disabled',
  'backtests.creation.disabled',
  'experiments.creation.disabled',
  'exports.disabled',
  'fundamentals.refresh.disabled',
  'patterns.refresh.disabled',
]);

export function OperationsWorkspace() {
  const queryClient = useQueryClient();
  const overview = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: adminOperationsApi.overview,
    retry: false,
  });
  const flags = useQuery({
    queryKey: ['admin', 'flags'],
    queryFn: adminOperationsApi.flags,
    retry: false,
  });
  const dataOperations = useQuery({
    queryKey: ['admin', 'data-operations'],
    queryFn: adminOperationsApi.dataOperations,
    retry: false,
  });
  const legalDocuments = useQuery({
    queryFn: adminOperationsApi.legalDocuments,
    queryKey: ['admin', 'legal-documents'],
    retry: false,
  });
  const [reason, setReason] = useState('Controlled incident mitigation');
  const [confirmation, setConfirmation] = useState('');
  const [bannerMessage, setBannerMessage] = useState('');
  const [bannerConfirmation, setBannerConfirmation] = useState('');
  const [queueConfirmation, setQueueConfirmation] = useState('');
  const [rolloutPercentage, setRolloutPercentage] = useState(10);
  const [legalApprovalReference, setLegalApprovalReference] = useState('');
  const [legalConfirmation, setLegalConfirmation] = useState('');
  const mutation = useMutation({
    mutationFn: async ({
      flag,
      enabled,
    }: {
      flag: AdminFlag;
      enabled: boolean;
    }) => {
      const history = await adminOperationsApi.history(flag.key);
      const latest = history.versions[0];
      return adminOperationsApi.setSwitch(flag.key, enabled, {
        confirmation,
        expectedVersion: latest?.version ?? 0,
        reason,
      });
    },
    onSuccess: async () => {
      setConfirmation('');
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });
  const bannerMutation = useMutation({
    mutationFn: async () => {
      const history = await adminOperationsApi
        .history('maintenance.banner')
        .catch(() => null);
      return adminOperationsApi.setMaintenanceBanner({
        confirmation: bannerConfirmation,
        expectedVersion: history?.versions[0]?.version ?? 0,
        message: bannerMessage,
        reason,
      });
    },
    onSuccess: async () => {
      setBannerConfirmation('');
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });
  const queueMutation = useMutation({
    mutationFn: (queue: { name: string; paused: boolean }) =>
      adminOperationsApi.setQueuePaused(queue.name, !queue.paused, {
        confirmation: queueConfirmation,
        expectedVersion: Number(queue.paused),
        reason,
      }),
    onSuccess: async () => {
      setQueueConfirmation('');
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });
  const rolloutMutation = useMutation({
    mutationFn: async (flag: AdminFlag) => {
      const history = await adminOperationsApi.history(flag.key);
      return adminOperationsApi.setFlagVersion(flag.key, {
        confirmation: 'CONFIRM_OPERATIONAL_CHANGE',
        enabled: rolloutPercentage > 0,
        environment: 'staging',
        expectedVersion: history.versions[0]?.version ?? 0,
        reason,
        rolloutPercentage,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  });
  const legalMutation = useMutation({
    mutationFn: (document: AdminLegalDocument) =>
      document.status === 'approved'
        ? adminOperationsApi.publishLegalDocument(document.id, {
            effectiveAt: new Date().toISOString(),
            expectedVersion: document.rowVersion,
            reason,
          })
        : adminOperationsApi.approveLegalDocument(document.id, {
            confirmation: legalConfirmation as 'LEGAL_COUNSEL_APPROVED',
            expectedVersion: document.rowVersion,
            legalApprovalReference,
            reason,
          }),
    onSuccess: async () => {
      setLegalConfirmation('');
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'legal-documents'],
      });
    },
  });
  const [correctionConfirmation, setCorrectionConfirmation] = useState('');
  const correctionMutation = useMutation({
    mutationFn: (correction: { id: string; version: number; state: string }) =>
      adminOperationsApi.transitionCorrection(
        correction.id,
        correction.state === 'open' ? 'investigating' : 'approved',
        {
          expectedVersion: correction.version,
          reason,
          ...(correctionConfirmation
            ? { confirmation: correctionConfirmation }
            : {}),
        },
      ),
    onSuccess: async () => {
      setCorrectionConfirmation('');
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'data-operations'],
      });
    },
  });

  return (
    <AtlasShell>
      <main className="admin-operations" id="main-content">
        <header className="admin-heading">
          <p className="admin-kicker">OPERATIONS CONTROL</p>
          <h1>Platform durumu ve güvenli müdahale.</h1>
          <p>
            Yalnız allowlist içindeki operasyonlar çalışır. Her değişiklik
            neden, sürüm ve aktör bilgisiyle audit kaydı üretir.
          </p>
        </header>

        {(overview.isLoading || flags.isLoading) && (
          <WorkspaceState kind="loading">
            Operasyon durumu yükleniyor.
          </WorkspaceState>
        )}
        {(overview.isError || flags.isError) && (
          <WorkspaceState kind="error">
            Admin yetkisi gerekli veya operasyon servisi kullanılamıyor.
          </WorkspaceState>
        )}

        {overview.data && flags.data && (
          <>
            <section
              aria-labelledby="platform-health"
              className="admin-section"
            >
              <h2 id="platform-health">Platform health</h2>
              <div className="admin-metric-grid">
                <Metric
                  label="Queue"
                  value={String(overview.data.queues.length)}
                />
                <Metric
                  label="Paused"
                  value={String(
                    overview.data.queues.filter((queue) => queue.paused).length,
                  )}
                />
                <Metric
                  label="Releases"
                  value={String(overview.data.releases.length)}
                />
                <Metric
                  label="Incidents"
                  value={String(overview.data.incidents.length)}
                />
              </div>
            </section>

            <section aria-labelledby="queues" className="admin-section">
              <h2 id="queues">Queue status</h2>
              <label>
                Queue confirmation
                <input
                  value={queueConfirmation}
                  onChange={(event) => setQueueConfirmation(event.target.value)}
                  placeholder="PAUSE_SCANNER_QUEUE"
                />
              </label>
              <div
                className="admin-table"
                role="table"
                aria-label="Queue status"
              >
                {overview.data.queues.map((queue) => (
                  <div className="admin-row" role="row" key={queue.name}>
                    <strong role="cell">{queue.name}</strong>
                    <span role="cell">
                      {queue.paused ? 'Paused' : 'Running'}
                    </span>
                    <span role="cell">Waiting {queue.counts.waiting ?? 0}</span>
                    <span role="cell">Failed {queue.counts.failed ?? 0}</span>
                    <button
                      disabled={queueMutation.isPending}
                      onClick={() => queueMutation.mutate(queue)}
                      type="button"
                    >
                      {queue.paused ? 'Resume queue' : 'Pause queue'}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section aria-labelledby="kill-switches" className="admin-section">
              <h2 id="kill-switches">Feature flags ve kill switches</h2>
              <div className="admin-confirmation">
                <label>
                  Reason
                  <input
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </label>
                <label>
                  Confirmation
                  <input
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    placeholder="ENABLE_KILL_SWITCH"
                  />
                </label>
              </div>
              <div
                className="admin-table"
                role="table"
                aria-label="Kill switches"
              >
                {flags.data.items.map((flag) => (
                  <div
                    className="admin-row admin-flag-row"
                    role="row"
                    key={flag.key}
                  >
                    <span role="cell">
                      <strong>{flag.key}</strong>
                      <small>
                        {flag.flagType} / {flag.owner ?? 'Unowned'}
                      </small>
                    </span>
                    {killSwitchKeys.has(flag.key) ? (
                      <>
                        <button
                          disabled={mutation.isPending}
                          onClick={() =>
                            mutation.mutate({ flag, enabled: true })
                          }
                          type="button"
                        >
                          Enable
                        </button>
                        <button
                          disabled={mutation.isPending}
                          onClick={() =>
                            mutation.mutate({ flag, enabled: false })
                          }
                          type="button"
                        >
                          Disable
                        </button>
                      </>
                    ) : (
                      <span role="cell">Versioned flag</span>
                    )}
                  </div>
                ))}
              </div>
              <label>
                Rollout percentage
                <input
                  aria-label="Rollout percentage"
                  max={100}
                  min={0}
                  onChange={(event) =>
                    setRolloutPercentage(Number(event.target.value))
                  }
                  type="number"
                  value={rolloutPercentage}
                />
              </label>
              {flags.data.items
                .filter((flag) => flag.flagType === 'release')
                .map((flag) => (
                  <button
                    disabled={rolloutMutation.isPending}
                    key={flag.key}
                    onClick={() => rolloutMutation.mutate(flag)}
                    type="button"
                  >
                    Update {flag.key} rollout
                  </button>
                ))}
              {flags.data.expired.length > 0 && (
                <p className="admin-warning" role="alert">
                  {flags.data.expired.length} expired flag requires review.
                </p>
              )}
              {(mutation.isError || rolloutMutation.isError) && (
                <p className="admin-warning" role="alert">
                  Operational change rejected.
                </p>
              )}
            </section>

            <section
              aria-labelledby="recovery"
              className="admin-section admin-summary-grid"
            >
              <div>
                <h2 id="recovery">Recovery drill status</h2>
                <p>{overview.data.recovery.length} drill record visible.</p>
              </div>
              <div>
                <h2>Release status</h2>
                <p>{overview.data.releases.length} release record visible.</p>
              </div>
              <div>
                <h2>Incident timeline</h2>
                <p>{overview.data.incidents.length} incident record visible.</p>
              </div>
              <div>
                <h2>Operational audit</h2>
                <p>{overview.data.audit.length} recent audit record visible.</p>
              </div>
              <div>
                <h2>Data freshness</h2>
                <p>
                  Closed bar{' '}
                  {overview.data.dataFreshness?.latest_closed_bar_at ??
                    'notEvaluable'}
                  . Provider payloads remain hidden.
                </p>
              </div>
              <div>
                <h2>Maintenance banner</h2>
                <label>
                  Message
                  <input
                    value={bannerMessage}
                    onChange={(event) => setBannerMessage(event.target.value)}
                  />
                </label>
                <label>
                  Confirmation
                  <input
                    value={bannerConfirmation}
                    onChange={(event) =>
                      setBannerConfirmation(event.target.value)
                    }
                    placeholder="SET_MAINTENANCE_BANNER"
                  />
                </label>
                <button
                  disabled={bannerMutation.isPending || !bannerMessage}
                  onClick={() => bannerMutation.mutate()}
                  type="button"
                >
                  Publish banner
                </button>
              </div>
            </section>

            <section
              aria-labelledby="data-operations"
              className="admin-section"
            >
              <h2 id="data-operations">Data reconciliation</h2>
              {dataOperations.isLoading && (
                <p aria-live="polite">Data-quality state loading.</p>
              )}
              {dataOperations.isError && (
                <p className="admin-warning" role="alert">
                  Data operations are unavailable.
                </p>
              )}
              {dataOperations.data && (
                <>
                  <div className="admin-metric-grid">
                    <Metric
                      label="Providers"
                      value={String(dataOperations.data.connections.length)}
                    />
                    <Metric
                      label="Open findings"
                      value={String(
                        dataOperations.data.findings.filter(
                          (finding) => finding.status !== 'resolved',
                        ).length,
                      )}
                    />
                    <Metric
                      label="Corrections"
                      value={String(dataOperations.data.corrections.length)}
                    />
                    <Metric
                      label="Ingestion runs"
                      value={String(dataOperations.data.runs.length)}
                    />
                  </div>
                  <label>
                    Correction confirmation
                    <input
                      value={correctionConfirmation}
                      onChange={(event) =>
                        setCorrectionConfirmation(event.target.value)
                      }
                      placeholder="QUEUE_CONTROLLED_REPLAY"
                    />
                  </label>
                  <div
                    aria-label="Data correction requests"
                    className="admin-table"
                    role="table"
                  >
                    {dataOperations.data.corrections.map((correction) => (
                      <div className="admin-row" key={correction.id} role="row">
                        <strong role="cell">{correction.state}</strong>
                        <span role="cell">
                          Read model {correction.rebuildStatus}
                        </span>
                        <button
                          disabled={
                            correctionMutation.isPending ||
                            !['open', 'investigating'].includes(
                              correction.state,
                            )
                          }
                          onClick={() => correctionMutation.mutate(correction)}
                          type="button"
                        >
                          {correction.state === 'open'
                            ? 'Start investigation'
                            : 'Approve correction'}
                        </button>
                      </div>
                    ))}
                  </div>
                  {correctionMutation.isError && (
                    <p className="admin-warning" role="alert">
                      Correction update rejected due to authorization,
                      confirmation or version conflict.
                    </p>
                  )}
                </>
              )}
            </section>
            <section
              aria-labelledby="legal-documents"
              className="admin-section"
            >
              <h2 id="legal-documents">Legal document publishing</h2>
              <p>
                Approval requires external counsel evidence. Placeholder
                documents cannot be approved or published.
              </p>
              <label>
                Legal approval reference
                <input
                  onChange={(event) =>
                    setLegalApprovalReference(event.target.value)
                  }
                  value={legalApprovalReference}
                />
              </label>
              <label>
                Approval confirmation
                <input
                  onChange={(event) => setLegalConfirmation(event.target.value)}
                  placeholder="LEGAL_COUNSEL_APPROVED"
                  value={legalConfirmation}
                />
              </label>
              {legalDocuments.isLoading && (
                <p aria-live="polite">Legal documents loading.</p>
              )}
              {legalDocuments.isError && (
                <p className="admin-warning" role="alert">
                  Legal document administration is unavailable.
                </p>
              )}
              <div
                aria-label="Legal document versions"
                className="admin-table"
                role="table"
              >
                {legalDocuments.data?.map((document) => (
                  <div className="admin-row" key={document.id} role="row">
                    <strong role="cell">{document.title}</strong>
                    <span role="cell">
                      v{document.version} · {document.locale} ·{' '}
                      {document.status}
                    </span>
                    <button
                      disabled={
                        legalMutation.isPending ||
                        !['draft', 'legalReviewRequired', 'approved'].includes(
                          document.status,
                        ) ||
                        (document.status !== 'approved' &&
                          (legalConfirmation !== 'LEGAL_COUNSEL_APPROVED' ||
                            legalApprovalReference.length < 8))
                      }
                      onClick={() => legalMutation.mutate(document)}
                      type="button"
                    >
                      {document.status === 'approved'
                        ? 'Publish reviewed version'
                        : 'Record counsel approval'}
                    </button>
                  </div>
                ))}
              </div>
              {legalMutation.isError && (
                <p className="admin-warning" role="alert">
                  Legal document update rejected due to review evidence,
                  authorization or version conflict.
                </p>
              )}
            </section>
          </>
        )}
      </main>
    </AtlasShell>
  );
}

function Metric({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="admin-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
