'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { AtlasShell } from '../portfolio/atlas-shell';
import { supportApi } from './support-api';

const types = [
  ['bugReport', 'Hata bildirimi'],
  ['featureFeedback', 'Özellik geri bildirimi'],
  ['dataIssue', 'Veri sorunu'],
  ['accountSupport', 'Hesap desteği'],
  ['securitySupport', 'Güvenlik desteği'],
  ['other', 'Diğer'],
] as const;

export function SupportWorkspace() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['support'], queryFn: supportApi.list });
  const [type, setType] = useState('bugReport');
  const mutation = useMutation({
    mutationFn: supportApi.create,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['support'] });
    },
  });

  return (
    <AtlasShell>
      <main className="workspace" id="main-content">
        <header className="workspace__header">
          <div>
            <p className="eyebrow">DESTEK &amp; HESAP</p>
            <h1>Destek talepleri</h1>
            <p>
              Talebiniz için takip edilebilir bir referans ve correlation ID
              oluşturulur. Güvenlik taleplerinin hassas içeriği aktivite
              özetlerine eklenmez.
            </p>
          </div>
          <Link href="/help/hesap-guvenlik">Hesap ve güvenlik yardımı</Link>
        </header>

        <section className="panel" aria-labelledby="support-create-title">
          <h2 id="support-create-title">Yeni talep</h2>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const common = {
                description: form.get('description'),
                subject: form.get('subject'),
                type,
              };
              mutation.mutate(
                type === 'dataIssue'
                  ? {
                      ...common,
                      dataIssue: {
                        dataType: form.get('dataType'),
                        dateFrom: form.get('dateFrom'),
                        dateTo: form.get('dateTo'),
                        expected: form.get('expected'),
                        observed: form.get('observed'),
                        symbol: form.get('symbol'),
                        timeframe: form.get('timeframe'),
                      },
                    }
                  : common,
              );
            }}
          >
            <label>
              Talep türü
              <select
                name="type"
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                {types.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Konu
              <input name="subject" required minLength={4} maxLength={160} />
            </label>
            <label>
              Açıklama
              <textarea
                name="description"
                required
                minLength={8}
                maxLength={8000}
              />
            </label>
            {type === 'dataIssue' && <DataIssueFields />}
            <fieldset>
              <legend>Güvenli attachment</legend>
              <p>
                PNG, JPEG veya PDF; en fazla 5 MB. Dosya object storage’a
                server-generated anahtarla alınır ve malware taramasından
                geçmeden indirilemez.
              </p>
              <input
                aria-label="Attachment"
                type="file"
                accept="image/png,image/jpeg,application/pdf"
              />
            </fieldset>
            <button disabled={mutation.isPending} type="submit">
              {mutation.isPending ? 'Gönderiliyor…' : 'Talep oluştur'}
            </button>
            {mutation.isError && (
              <p role="alert">Talep güvenli biçimde oluşturulamadı.</p>
            )}
          </form>
        </section>

        <section className="panel" aria-labelledby="support-list-title">
          <h2 id="support-list-title">Taleplerim</h2>
          {query.data?.items.length ? (
            <ul>
              {query.data.items.map((item) => (
                <li key={item.id}>
                  <strong>{item.subject}</strong> · {item.referenceCode} ·{' '}
                  {item.status}
                </li>
              ))}
            </ul>
          ) : (
            <p>Henüz destek talebiniz yok.</p>
          )}
        </section>

        <AccountLifecycle />
      </main>
    </AtlasShell>
  );
}

function DataIssueFields() {
  return (
    <fieldset>
      <legend>Veri sorunu ayrıntıları</legend>
      <label>
        Sembol <input name="symbol" required maxLength={32} />
      </label>
      <label>
        Zaman aralığı <input name="timeframe" required maxLength={16} />
      </label>
      <label>
        Başlangıç <input name="dateFrom" type="date" required />
      </label>
      <label>
        Bitiş <input name="dateTo" type="date" required />
      </label>
      <label>
        Veri türü
        <select name="dataType">
          <option value="ohlcv">OHLCV</option>
          <option value="fundamentals">Finansallar</option>
          <option value="corporateAction">Kurumsal aksiyon</option>
          <option value="benchmark">Benchmark</option>
          <option value="other">Diğer</option>
        </select>
      </label>
      <label>
        Beklenen <textarea name="expected" required maxLength={4000} />
      </label>
      <label>
        Gözlenen <textarea name="observed" required maxLength={4000} />
      </label>
    </fieldset>
  );
}

function AccountLifecycle() {
  return (
    <section className="panel" aria-labelledby="account-lifecycle-title">
      <h2 id="account-lifecycle-title">Hesap yaşam döngüsü</h2>
      <p>
        Veri export’u kullanıcıya ait taşınabilir raporu üretir. Hesap silme
        güvenlik doğrulaması, geri alınabilir grace period, iptal seçeneği,
        purge durumu ve bildirim aşamalarını içerir.
      </p>
      <nav aria-label="Hesap yaşam döngüsü işlemleri">
        <Link href="/reports">Veri export’u iste</Link>{' '}
        <Link href="/legal">Silme ve export bildirimini incele</Link>{' '}
        <Link href="/help/hesap-guvenlik">Güvenlik yardımı</Link>
      </nav>
      <button type="button">Hesap silme talebi başlat</button>
      <p>
        Silme talebi gönderilmeden önce yeniden kimlik doğrulama ve açık onay
        istenir. Grace period içinde iptal edilebilir.
      </p>
    </section>
  );
}
