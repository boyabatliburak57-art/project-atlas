'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent } from 'react';

import { AtlasShell, WorkspaceState } from './atlas-shell';
import { portfolioApi } from './api';
import type { NotificationPreferences } from './types';
import { WorkspaceHeader } from './watchlists-workspace';

export function PreferencesWorkspace() {
  const client = useQueryClient();
  const preferences = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: portfolioApi.preferences,
  });
  const save = useMutation({
    mutationFn: portfolioApi.savePreferences,
    onSuccess: async () =>
      client.invalidateQueries({ queryKey: ['notification-preferences'] }),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const quiet = data.get('quietHoursEnabled') === 'on';
    save.mutate({
      timezone: field(data, 'timezone'),
      locale: field(data, 'locale'),
      emailAlertsEnabled: data.get('emailAlertsEnabled') === 'on',
      dailyDigestEnabled: data.get('dailyDigestEnabled') === 'on',
      scanCompletionEnabled: data.get('scanCompletionEnabled') === 'on',
      quietHoursEnabled: quiet,
      quietHoursStartMinute: quiet
        ? timeToMinute(field(data, 'quietHoursStart'))
        : null,
      quietHoursEndMinute: quiet
        ? timeToMinute(field(data, 'quietHoursEnd'))
        : null,
      throttleMinutes: Number(data.get('throttleMinutes')),
    });
  }

  return (
    <AtlasShell>
      <main className="portfolio-main preferences-main">
        <WorkspaceHeader
          eyebrow="Teslimat politikası"
          title="Bildirim tercihleri"
          description="Saat dilimini, sessiz saatleri ve hangi olayların e-mail kanalına çıkacağını belirleyin."
        />
        {preferences.isLoading && (
          <WorkspaceState kind="loading">Tercihler yükleniyor…</WorkspaceState>
        )}
        {preferences.isError && (
          <WorkspaceState kind="error">Tercihler alınamadı.</WorkspaceState>
        )}
        {preferences.data && (
          <PreferencesForm
            key={JSON.stringify(preferences.data)}
            value={preferences.data}
            pending={save.isPending}
            saved={save.isSuccess}
            error={save.error}
            onSubmit={submit}
          />
        )}
      </main>
    </AtlasShell>
  );
}

function PreferencesForm({
  value,
  pending,
  saved,
  error,
  onSubmit,
}: {
  readonly value: NotificationPreferences;
  readonly pending: boolean;
  readonly saved: boolean;
  readonly error: Error | null;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="preferences-form" onSubmit={onSubmit}>
      <section>
        <div className="preference-intro">
          <p className="rail-label">01 / Yerel zaman</p>
          <h2>Zaman ve dil</h2>
          <p>Sessiz saatler bu saat diliminde hesaplanır.</p>
        </div>
        <div className="preference-fields">
          <label>
            <span>Saat dilimi</span>
            <select name="timezone" defaultValue={value.timezone}>
              <option value="Europe/Istanbul">Europe/Istanbul</option>
              <option value="UTC">UTC</option>
              <option value="Europe/London">Europe/London</option>
              <option value="America/New_York">America/New_York</option>
            </select>
          </label>
          <label>
            <span>Dil</span>
            <select name="locale" defaultValue={value.locale}>
              <option value="tr-TR">Türkçe</option>
              <option value="en-US">English</option>
            </select>
          </label>
        </div>
      </section>
      <section>
        <div className="preference-intro">
          <p className="rail-label">02 / Kanallar</p>
          <h2>Teslimatlar</h2>
          <p>In-app alarm bildirimleri kapatılamaz.</p>
        </div>
        <div className="preference-fields checks">
          <Check
            name="emailAlertsEnabled"
            label="Alarm e-mailleri"
            checked={value.emailAlertsEnabled}
          />
          <Check
            name="dailyDigestEnabled"
            label="Günlük özet"
            checked={value.dailyDigestEnabled}
          />
          <Check
            name="scanCompletionEnabled"
            label="Tarama tamamlandı bildirimi"
            checked={value.scanCompletionEnabled}
          />
        </div>
      </section>
      <section>
        <div className="preference-intro">
          <p className="rail-label">03 / Odak</p>
          <h2>Sessiz saatler</h2>
          <p>
            Dış teslimatlar ertelenir; in-app kayıtlar görünmeye devam eder.
          </p>
        </div>
        <div className="preference-fields">
          <Check
            name="quietHoursEnabled"
            label="Sessiz saatleri etkinleştir"
            checked={value.quietHoursEnabled}
          />
          <div className="time-pair">
            <label>
              <span>Başlangıç</span>
              <input
                name="quietHoursStart"
                type="time"
                defaultValue={minuteToTime(value.quietHoursStartMinute ?? 1320)}
              />
            </label>
            <label>
              <span>Bitiş</span>
              <input
                name="quietHoursEnd"
                type="time"
                defaultValue={minuteToTime(value.quietHoursEndMinute ?? 480)}
              />
            </label>
          </div>
          <label>
            <span>Throttle (dakika)</span>
            <input
              name="throttleMinutes"
              type="number"
              min="0"
              max="1440"
              defaultValue={value.throttleMinutes}
            />
          </label>
        </div>
      </section>
      <div className="preference-submit">
        <div aria-live="polite">
          {saved && !pending && (
            <span className="save-success">Tercihler kaydedildi.</span>
          )}
          {error && (
            <span className="form-error">Kaydedilemedi: {error.message}</span>
          )}
        </div>
        <button className="button primary" disabled={pending}>
          {pending ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}
        </button>
      </div>
    </form>
  );
}

function Check({
  name,
  label,
  checked,
}: {
  readonly name: string;
  readonly label: string;
  readonly checked: boolean;
}) {
  return (
    <label className="switch-field">
      <input name={name} type="checkbox" defaultChecked={checked} />
      <span>{label}</span>
    </label>
  );
}
function minuteToTime(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}
function timeToMinute(value: string) {
  const [hours = '0', minutes = '0'] = value.split(':');
  return Number(hours) * 60 + Number(minutes);
}

function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
}
