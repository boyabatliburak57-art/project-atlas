'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AtlasShell, WorkspaceState } from '../portfolio/atlas-shell';
import { legalApi, type LegalDocument } from './api';

const labels: Readonly<Record<string, string>> = {
  acceptableUsePolicy: 'Kabul Edilebilir Kullanım Politikası',
  accountDeletionDataExportNotice: 'Hesap Silme ve Veri Dışa Aktarma Bildirimi',
  cookieConsentNotice: 'Çerez ve Onay Bildirimi',
  dataSourceMethodologyNotice: 'Veri Kaynağı ve Metodoloji Bildirimi',
  investmentRiskDisclosure: 'Yatırım Riski Açıklaması',
  privacyNotice: 'Gizlilik Bildirimi',
  termsOfUse: 'Kullanım Koşulları',
};

export function LegalCenter() {
  return (
    <AtlasShell>
      <main className="trust-center">
        <header className="trust-heading">
          <p className="eyebrow">Hukuki belgeler ve onay geçmişi</p>
          <h1>Geçerli belge sürümlerini ve verdiğiniz onayları inceleyin.</h1>
          <p>
            Yalnız hukuk incelemesi tamamlanmış ve yürürlüğe girmiş sürümler bu
            alanda yayımlanır.
          </p>
        </header>
        <LegalConsentPanel source="settings" />
      </main>
    </AtlasShell>
  );
}

export function LegalConsentPanel({
  source,
}: {
  readonly source: 'onboarding' | 'settings';
}) {
  const client = useQueryClient();
  const documents = useQuery({
    queryFn: legalApi.documents,
    queryKey: ['legal-documents', 'tr-TR'],
  });
  const history = useQuery({
    queryFn: legalApi.history,
    queryKey: ['legal-consents', 'tr-TR'],
  });
  const consent = useMutation({
    mutationFn: ({
      documentId,
      reconsent,
    }: {
      documentId: string;
      reconsent: boolean;
    }) => legalApi.consent(documentId, reconsent ? 'reconsent' : source),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ['legal-consents', 'tr-TR'] }),
  });

  if (documents.isLoading || history.isLoading)
    return <WorkspaceState kind="loading">Belgeler yükleniyor…</WorkspaceState>;
  if (documents.isError || history.isError)
    return (
      <WorkspaceState kind="error">
        Hukuki belge ve onay bilgileri alınamadı.
      </WorkspaceState>
    );
  if (documents.data?.length === 0)
    return (
      <aside
        aria-labelledby="legal-unavailable-title"
        className="legal-review-note"
      >
        <strong id="legal-unavailable-title">LEGAL_REVIEW_REQUIRED</strong>
        <p>NOT_FOR_PRODUCTION_PUBLICATION</p>
      </aside>
    );

  const accepted = new Set(
    history.data?.history
      .filter(({ action }) => action === 'accepted')
      .map(({ documentId }) => documentId),
  );
  const reconsent = new Set(
    history.data?.reconsentRequired.map(({ documentId }) => documentId),
  );

  return (
    <section aria-label="Yayımlanmış hukuki belgeler">
      {(documents.data ?? []).map((document) => (
        <DocumentEntry
          accepted={accepted.has(document.id)}
          document={document}
          key={document.id}
          onConsent={() =>
            consent.mutate({
              documentId: document.id,
              reconsent: reconsent.has(document.id),
            })
          }
          pending={consent.isPending}
          reconsent={reconsent.has(document.id)}
        />
      ))}
      {consent.isError && <p role="alert">Onay kaydedilemedi.</p>}
      {consent.isSuccess && <p role="status">Onay geçmişi güncellendi.</p>}
    </section>
  );
}

function DocumentEntry({
  accepted,
  document,
  onConsent,
  pending,
  reconsent,
}: {
  readonly accepted: boolean;
  readonly document: LegalDocument;
  readonly onConsent: () => void;
  readonly pending: boolean;
  readonly reconsent: boolean;
}) {
  return (
    <article className="trust-section">
      <header>
        <p className="eyebrow">
          {labels[document.documentType] ?? document.documentType}
        </p>
        <h2>{document.title}</h2>
        <p>
          Sürüm {document.version} · {document.locale} · Yürürlük:{' '}
          {new Date(document.effectiveAt).toLocaleDateString('tr-TR')}
        </p>
      </header>
      <p className="legal-document-content">{document.content}</p>
      <button
        className="button primary"
        disabled={(accepted && !reconsent) || pending}
        onClick={onConsent}
        type="button"
      >
        {reconsent
          ? 'Yeni sürümü onayla'
          : accepted
            ? 'Onaylandı'
            : 'Okudum ve onaylıyorum'}
      </button>
    </article>
  );
}
