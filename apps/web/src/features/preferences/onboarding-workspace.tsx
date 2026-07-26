'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { AtlasShell, WorkspaceState } from '../portfolio/atlas-shell';
import { LegalConsentPanel } from '../legal/legal-center';
import { preferencesApi, type UserPreferences } from './api';

const steps = [
  [
    'disclosure',
    'Atlas ne yapar?',
    'Atlas yatırım tavsiyesi vermez; araştırma ve karar desteği sağlar.',
  ],
  [
    'marketLocaleTimezone',
    'Piyasa ve yerel ayarlar',
    'Dil, saat dilimi ve sayı gösterimini seçin.',
  ],
  [
    'benchmark',
    'Karşılaştırma ölçütü',
    'Portföy ve araştırma için varsayılan benchmark belirleyin.',
  ],
  [
    'watchlist',
    'İlk izleme listeniz',
    'Takip etmek istediğiniz sembolleri daha sonra ekleyebilirsiniz.',
  ],
  [
    'scannerPreset',
    'Tarama başlangıcı',
    'Hazır tarama seçimi isteğe bağlıdır.',
  ],
  [
    'notifications',
    'Bildirim tercihleri',
    'In-app bildirimler açık kalır; e-mail isteğe bağlıdır.',
  ],
  [
    'demoData',
    'Demo veri',
    'İsteğe bağlı örnek veriler ürün akışını keşfetmenize yardım eder.',
  ],
  [
    'summary',
    'Hazırsınız',
    'Tercihlerinizi kaydedip onboarding akışını tamamlayın.',
  ],
] as const;

export function OnboardingWorkspace() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['user-preferences'],
    queryFn: preferencesApi.get,
  });
  const [index, setIndex] = useState(0);
  const [demoData, setDemoData] = useState(false);
  const save = useMutation({
    mutationFn: preferencesApi.patch,
    onSuccess: (data) => client.setQueryData(['user-preferences'], data),
  });
  const complete = useMutation({
    mutationFn: ({ version }: { version: number }) =>
      preferencesApi.complete(version, demoData),
    onSuccess: (data) => client.setQueryData(['user-preferences'], data),
  });
  const reset = useMutation({
    mutationFn: preferencesApi.reset,
    onSuccess: (data) => {
      client.setQueryData(['user-preferences'], data);
      setIndex(0);
    },
  });
  const preference = query.data;
  const [code, title, description] = steps[index]!;

  function persist(status: 'in_progress' | 'skipped') {
    if (!preference) return;
    const completedSteps = steps.slice(0, index).map(([step]) => step);
    save.mutate({
      expectedVersion: preference.version,
      onboarding: {
        status,
        currentStep: code,
        completedSteps,
        demoDataRequested: demoData,
        completedAt: null,
      },
    });
  }

  return (
    <AtlasShell>
      <main className="onboarding-main">
        <header className="onboarding-header">
          <p className="admin-kicker">Kurulum · {index + 1}/8</p>
          <h1>Atlas’ı çalışma biçiminize göre ayarlayın.</h1>
          <p>
            İlerlemeniz backend’de saklanır; akışı atlayabilir, sürdürebilir
            veya sıfırlayabilirsiniz.
          </p>
        </header>
        {query.isLoading && (
          <WorkspaceState kind="loading">Tercihler yükleniyor…</WorkspaceState>
        )}
        {query.isError && (
          <WorkspaceState kind="error">Tercihler alınamadı.</WorkspaceState>
        )}
        {preference && (
          <section
            className="onboarding-panel"
            aria-labelledby="onboarding-step-title"
          >
            <div aria-live="polite">
              <p className="rail-label">{code}</p>
              <h2 id="onboarding-step-title">{title}</h2>
              <p>{description}</p>
            </div>
            <StepFields
              step={code}
              value={preference}
              demoData={demoData}
              setDemoData={setDemoData}
            />
            {code === 'disclosure' && <LegalConsentPanel source="onboarding" />}
            {save.error && (
              <p role="alert">Kaydedilemedi: {save.error.message}</p>
            )}
            {complete.isSuccess && <p role="status">Onboarding tamamlandı.</p>}
            <div className="onboarding-actions">
              <button
                disabled={index === 0}
                onClick={() => setIndex((value) => value - 1)}
              >
                Geri
              </button>
              <button
                onClick={() => {
                  persist('skipped');
                  setIndex(7);
                }}
              >
                Şimdilik atla
              </button>
              {index < 7 ? (
                <button
                  className="button primary"
                  onClick={() => {
                    persist('in_progress');
                    setIndex((value) => value + 1);
                  }}
                >
                  Devam et
                </button>
              ) : (
                <button
                  className="button primary"
                  onClick={() =>
                    complete.mutate({ version: preference.version })
                  }
                >
                  Kurulumu tamamla
                </button>
              )}
              <button onClick={() => reset.mutate(preference.version)}>
                Sıfırla
              </button>
            </div>
          </section>
        )}
      </main>
    </AtlasShell>
  );
}

function StepFields({
  step,
  value,
  demoData,
  setDemoData,
}: {
  readonly step: string;
  readonly value: UserPreferences;
  readonly demoData: boolean;
  readonly setDemoData: (value: boolean) => void;
}) {
  if (step === 'marketLocaleTimezone')
    return (
      <div className="onboarding-fields">
        <label>
          Dil
          <select defaultValue={value.locale}>
            <option value="tr-TR">Türkçe</option>
            <option value="en-US">English</option>
          </select>
        </label>
        <label>
          Saat dilimi
          <select defaultValue={value.timezone}>
            <option>Europe/Istanbul</option>
            <option>UTC</option>
          </select>
        </label>
      </div>
    );
  if (step === 'benchmark')
    return (
      <label className="onboarding-fields">
        Benchmark
        <select defaultValue={value.defaultBenchmark}>
          <option>XU100</option>
          <option>XU030</option>
        </select>
      </label>
    );
  if (step === 'notifications')
    return (
      <fieldset className="onboarding-fields">
        <legend>Kanallar</legend>
        <label>
          <input type="checkbox" defaultChecked /> In-app
        </label>
        <label>
          <input
            type="checkbox"
            defaultChecked={value.notificationChannels.includes('email')}
          />{' '}
          E-mail
        </label>
      </fieldset>
    );
  if (step === 'demoData')
    return (
      <label className="onboarding-fields">
        <input
          type="checkbox"
          checked={demoData}
          onChange={(event) => setDemoData(event.target.checked)}
        />{' '}
        Demo veriyi hazırla
      </label>
    );
  return null;
}
