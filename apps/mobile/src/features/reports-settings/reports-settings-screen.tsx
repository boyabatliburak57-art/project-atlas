import { useState } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { AtlasApiError } from '@atlas/api-client';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  palette,
  radius,
  spacing,
  touchTargets,
  typography,
} from '@atlas/design-tokens';
import { AppHeader, Badge, Button, Card, OfflineState } from '@atlas/mobile-ui';
import {
  helpCategories,
  reportCards,
  surfaceContextLabel,
  supportRows,
} from './reports-settings-evidence-data';
import { useAuth } from '../../providers/auth-provider';
import { SafeAreaScrollScreen } from '../../components/safe-area-scroll-screen';
import { ReportsSettingsApi } from './reports-settings-api';
import { isRuntimeLocalMobileE2EHarness } from '../../config/local-e2e-harness';

type ViewName =
  | 'reports'
  | 'categories'
  | 'portfolio'
  | 'scanner'
  | 'backtest'
  | 'progress'
  | 'ready'
  | 'failed'
  | 'expired'
  | 'share'
  | 'help'
  | 'help-search'
  | 'article'
  | 'methodology'
  | 'legal'
  | 'support-form'
  | 'support-history'
  | 'settings'
  | 'appearance'
  | 'privacy'
  | 'about';

const fixtureEnabled = (value: string | string[] | undefined) =>
  isRuntimeLocalMobileE2EHarness() && value === '1';

export function OperationsScreen({
  initialView,
}: {
  initialView?: ViewName;
} = {}) {
  const params = useLocalSearchParams<{
    fixture?: string;
    view?: ViewName;
    offline?: string;
  }>();
  const fixture = fixtureEnabled(params.fixture);
  const view = params.view ?? initialView ?? 'reports';
  const go = (next: ViewName) =>
    router.replace({
      pathname:
        next === 'methodology'
          ? '/research/methodology'
          : next.startsWith('help') || next === 'article'
            ? '/help'
            : next.startsWith('support')
              ? '/support'
              : ['settings', 'appearance', 'privacy', 'about'].includes(next)
                ? '/settings'
                : '/research/reports',
      params: { fixture: '1', view: next },
    });
  if (fixture && params.offline === '1')
    return (
      <Shell id="operations-offline">
        <AppHeader
          title="Atlas Merkezi"
          subtitle="Salt okunur · önbellek 8 Ağu 18:10"
        />
        <OfflineState />
        <Text style={styles.note}>
          Rapor, destek ve server-backed ayar değişiklikleri çevrimdışıyken
          sıraya alınmaz.
        </Text>
      </Shell>
    );
  if (!fixture) return <LiveReportsSettings initialView={view} />;
  return (
    <Shell id={`operations-${view}`}>
      <AppHeader
        title={titleFor(view)}
        subtitle="Kaynak, sürüm ve gizlilik görünür"
      />
      <Badge label={surfaceContextLabel} />
      <ViewBody view={view} go={go} />
      <Badge label="VoiceOver: NOT_EXECUTED · USER_ACCEPTED_DOCUMENTED_EXCEPTION" />
    </Shell>
  );
}

function Shell({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <SafeAreaScrollScreen contentContainerStyle={styles.screen} testID={id}>
      {children}
    </SafeAreaScrollScreen>
  );
}

function ViewBody({
  view,
  go,
}: {
  view: ViewName;
  go: (next: ViewName) => void;
}) {
  if (view === 'reports') return <Reports go={go} />;
  if (view === 'categories') return <Categories go={go} />;
  if (view === 'portfolio') return <ReportPreview type="Portföy" go={go} />;
  if (view === 'scanner') return <ReportPreview type="Scanner" go={go} />;
  if (view === 'backtest') return <BacktestReport go={go} />;
  if (view === 'progress') return <Progress go={go} />;
  if (view === 'ready') return <Ready go={go} />;
  if (view === 'failed') return <Failed go={go} />;
  if (view === 'expired') return <Expired go={go} />;
  if (view === 'share') return <ShareWarning />;
  if (view === 'help') return <Help go={go} />;
  if (view === 'help-search') return <HelpSearch go={go} />;
  if (view === 'article') return <Article />;
  if (view === 'methodology') return <Methodology />;
  if (view === 'legal') return <Legal />;
  if (view === 'support-form') return <SupportForm go={go} />;
  if (view === 'support-history') return <SupportHistory />;
  if (view === 'settings') return <Settings go={go} />;
  if (view === 'appearance') return <Appearance />;
  if (view === 'privacy') return <Privacy />;
  return <About go={go} />;
}

function titleFor(view: ViewName): string {
  if (view.startsWith('help') || view === 'article') return 'Yardım Merkezi';
  if (view.startsWith('support')) return 'Destek';
  if (['settings', 'appearance', 'privacy', 'about'].includes(view))
    return 'Ayarlar';
  if (view === 'methodology') return 'Metodoloji';
  if (view === 'legal') return 'Yasal Belgeler';
  return 'Raporlar';
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </View>
  );
}
function Action({
  label,
  onPress,
  value,
}: {
  label: string;
  onPress: () => void;
  value?: string;
}) {
  return (
    <Pressable
      accessibilityLabel={`${label}${value ? `, ${value}` : ''}`}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.action}
    >
      <View>
        <Text style={styles.actionText}>{label}</Text>
        {value ? <Text style={styles.meta}>{value}</Text> : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}
function MetadataRail({
  rows,
}: {
  rows: readonly (readonly [string, string])[];
}) {
  return (
    <View style={styles.rail}>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.railRow}>
          <Text style={styles.railLabel}>{label}</Text>
          <Text style={styles.railValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function Reports({ go }: { go: (v: ViewName) => void }) {
  return (
    <>
      <View style={styles.heroPanel}>
        <Text style={styles.eyebrow}>BELGE OMURGASI</Text>
        <Text style={styles.hero}>Analizi kaynağıyla birlikte sakla.</Text>
        <Text style={styles.note}>
          Her rapor cutoff, revision, methodology ve expiry bilgisi taşır.
        </Text>
      </View>
      <Section title="Son raporlar">
        {reportCards.map((report) => (
          <Pressable
            key={report.title}
            accessibilityRole="button"
            onPress={() =>
              go(report.status === 'generating' ? 'progress' : 'ready')
            }
            style={styles.reportCard}
          >
            <View style={styles.reportMark} />
            <View style={styles.reportBody}>
              <Text style={styles.cardTitle}>{report.title}</Text>
              <Text style={styles.meta}>
                {report.type} · cutoff {report.cutoff}
              </Text>
            </View>
            <Badge label={report.status} />
          </Pressable>
        ))}
      </Section>
      <Button label="Rapor oluştur" onPress={() => go('categories')} />
      <Section title="Bilgi ve hesap">
        <Action label="Yardım Merkezi" onPress={() => go('help')} />
        <Action label="Metodoloji Merkezi" onPress={() => go('methodology')} />
        <Action label="Destek" onPress={() => go('support-form')} />
        <Action label="Ayarlar" onPress={() => go('settings')} />
      </Section>
    </>
  );
}
function Categories({ go }: { go: (v: ViewName) => void }) {
  return (
    <>
      <Text style={styles.hero}>Rapor türü seç</Text>
      <Action
        label="Portföy özeti"
        value="PDF / CSV · report-v1"
        onPress={() => go('portfolio')}
      />
      <Action
        label="Scanner koşumu"
        value="PDF / CSV · okunabilir koşullar"
        onPress={() => go('scanner')}
      />
      <Action
        label="Backtest sonucu"
        value="PDF / CSV · methodology dahil"
        onPress={() => go('backtest')}
      />
      <Action
        label="Deney karşılaştırması"
        value="Nötr karşılaştırma"
        onPress={() => go('backtest')}
      />
      <Text style={styles.note}>
        JSON internal sözleşmedir; kullanıcı yüzeyinde gösterilmez.
      </Text>
    </>
  );
}
function ReportPreview({
  type,
  go,
}: {
  type: 'Portföy' | 'Scanner';
  go: (v: ViewName) => void;
}) {
  const scanner = type === 'Scanner';
  return (
    <>
      <MetadataRail
        rows={
          scanner
            ? [
                ['Kaynak', 'Momentum taraması · rev 4'],
                ['Evren', 'BIST 100'],
                ['Cutoff', '8 Ağu 18:10'],
                ['Durum', 'PROVIDER_REQUIRED'],
              ]
            : [
                ['Kaynak', 'Uzun vadeli portföy'],
                ['Dönem', 'YTD'],
                ['Cutoff', '8 Ağu 18:10'],
                ['Gizlilik', 'Bakiyeler maskeli'],
              ]
        }
      />
      <Section title={scanner ? 'Okunabilir koşullar' : 'Bölümler'}>
        <Text style={styles.rowText}>
          {scanner
            ? 'RSI(14) 30 üzerinde · Hacim 20 günlük ortalama üzerinde'
            : 'Özet · Pozisyonlar · Nakit · Performans · Risk · Veri kalitesi'}
        </Text>
      </Section>
      <Text style={styles.warning}>
        {scanner
          ? 'Provider olmadan gerçek sonuç satırı oluşturulmaz.'
          : 'Eksik piyasa değeri 0 gösterilmez; PROVIDER_REQUIRED olarak işaretlenir.'}
      </Text>
      <Button label="Rapor oluştur" onPress={() => go('progress')} />
    </>
  );
}
function BacktestReport({ go }: { go: (v: ViewName) => void }) {
  return (
    <>
      <MetadataRail
        rows={[
          ['Strateji', 'Trend ve hacim · rev 4'],
          ['Dataset', 'snapshot-2026-07'],
          ['Engine', 'v2.4'],
          ['Cutoff', '31 Tem 18:10'],
        ]}
      />
      <Section title="Metrikler">
        <Metric label="Yıllıklandırılmış getiri" value="%18,4" />
        <Metric label="Volatilite" value="%21,2" />
        <Metric label="Sharpe / Sortino / Calmar" value="0,71 / 0,96 / 0,54" />
        <Metric label="Expectancy / Turnover" value="₺124 / %168" />
      </Section>
      <Text style={styles.warning}>
        Geçmiş performans gelecekteki sonuçları garanti etmez. Point-in-time ve
        maliyet varsayımları rapora eklenir.
      </Text>
      <Button label="Backtest raporu oluştur" onPress={() => go('progress')} />
    </>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.meta}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}
function Progress({ go }: { go: (v: ViewName) => void }) {
  return (
    <>
      <Card>
        <Text style={styles.eyebrow}>REPORT WORKER · GENERATING</Text>
        <Text style={styles.hero}>Rapor hazırlanıyor</Text>
        <View
          accessibilityLabel="İlerleme yüzde 68"
          accessibilityRole="progressbar"
          style={styles.progress}
        >
          <View style={styles.progressFill} />
        </View>
        <Text style={styles.note}>
          Kaynak doğrulama tamamlandı · artifact checksum bekleniyor
        </Text>
      </Card>
      <MetadataRail
        rows={[
          ['Job', 'reports.generate.v1'],
          ['Retry', 'bounded exponential'],
          ['Expiry', '7 gün'],
          ['Polling', 'terminal state’te durur'],
        ]}
      />
      <Button label="Hazır raporu aç" onPress={() => go('ready')} />
    </>
  );
}
function Ready({ go }: { go: (v: ViewName) => void }) {
  return (
    <>
      <Badge label="READY · OWNER VERIFIED" />
      <MetadataRail
        rows={[
          ['Report ID', 'RPT-8A31'],
          ['Generated', '8 Ağu 18:14'],
          ['Cutoff', '8 Ağu 18:10'],
          ['Format', 'CSV · 84 KB'],
          ['Checksum', 'SHA-256 doğrulandı'],
          ['Expires', '15 Ağu 18:14'],
        ]}
      />
      <Section title="İçerik">
        <Text style={styles.rowText}>
          Özet · Veri kalitesi · Metodoloji · Açıklamalar
        </Text>
      </Section>
      <Button
        label="Güvenli indirme bağlantısı oluştur"
        onPress={() => go('share')}
      />
      <Button label="Paylaşımı gözden geçir" onPress={() => go('share')} />
    </>
  );
}
function Expired({ go }: { go: (v: ViewName) => void }) {
  return (
    <Card>
      <Badge label="EXPIRED" />
      <Text style={styles.hero}>Dosyanın süresi doldu</Text>
      <Text style={styles.note}>
        Önbellekteki eski bağlantı tekrar açılmaz. Kaynak hâlâ erişilebilirse
        yeni artifact oluşturulur.
      </Text>
      <Button label="Raporu yeniden oluştur" onPress={() => go('progress')} />
    </Card>
  );
}
function Failed({ go }: { go: (v: ViewName) => void }) {
  return (
    <Card>
      <Badge label="FAILED · SAFE_REASON" />
      <Text style={styles.hero}>Rapor oluşturulamadı</Text>
      <Text style={styles.note}>
        Güvenli neden: REPORT_GENERATION_UNAVAILABLE · request ID RQ-8A31.
        Worker veya provider ayrıntısı kullanıcıya gösterilmez.
      </Text>
      <Button label="Güvenle yeniden dene" onPress={() => go('progress')} />
    </Card>
  );
}
function ShareWarning() {
  return (
    <>
      <Card>
        <Text style={styles.eyebrow}>AÇIK KULLANICI EYLEMİ</Text>
        <Text style={styles.hero}>Hassas raporu paylaş?</Text>
        <Text style={styles.warning}>
          Dosya portföy ve performans bilgisi içerebilir. Token, kalıcı signed
          URL veya raw provider payload paylaşılmaz.
        </Text>
      </Card>
      <Button label="Sistem paylaşım sayfasını aç" onPress={() => undefined} />
      <Button label="Vazgeç" onPress={() => router.back()} />
    </>
  );
}

function Help({ go }: { go: (v: ViewName) => void }) {
  return (
    <>
      <Button label="Yardımda ara" onPress={() => go('help-search')} />
      <Section title="Kategoriler">
        {helpCategories.map((category) => (
          <Action
            key={category}
            label={category}
            onPress={() => go('article')}
          />
        ))}
      </Section>
      <Action
        label="Destek talebi oluştur"
        onPress={() => go('support-form')}
      />
    </>
  );
}
function HelpSearch({ go }: { go: (v: ViewName) => void }) {
  const [query, setQuery] = useState('veri tazeliği');
  return (
    <>
      <TextInput
        accessibilityLabel="Yardımda ara"
        autoCapitalize="none"
        onChangeText={setQuery}
        style={styles.input}
        value={query}
      />
      <Text style={styles.meta}>
        NFKC normalized · bounded · debounce 300 ms
      </Text>
      <Action
        label="Veri neden gecikmeli görünüyor?"
        value="Piyasa verisi · v3"
        onPress={() => go('article')}
      />
      <Button label="Aramayı temizle" onPress={() => setQuery('')} />
    </>
  );
}
function Article() {
  return (
    <>
      <Text style={styles.hero}>Veri tazeliğini anlama</Text>
      <MetadataRail
        rows={[
          ['Sürüm', '3'],
          ['Güncellendi', '2 Ağu 2026'],
          ['Dil', 'tr-TR'],
          ['Kaynak', 'Atlas Help Registry'],
        ]}
      />
      <Text style={styles.body}>
        AVAILABLE, DELAYED, STALE, PARTIAL ve PROVIDER_REQUIRED durumları
        birbirinden ayrılır. Cihaz saati veri kesim zamanı olarak kullanılmaz.
      </Text>
      <Section title="İlgili içerikler">
        <Text style={styles.rowText}>
          Piyasa seansları · Provider durumu · Methodology
        </Text>
      </Section>
    </>
  );
}
function Methodology() {
  return (
    <>
      <Text style={styles.hero}>Hesapların nasıl yapıldığını gör.</Text>
      {[
        'Piyasa verisi ve tazelik',
        'Scanner ve indikatörler',
        'Portföy maliyet yöntemi',
        'Performans ve risk',
        'Backtesting ve benchmark',
        'Corporate actions ve veri kalitesi',
      ].map((item, index) => (
        <Card key={item}>
          <Text style={styles.eyebrow}>METHODOLOGY V{index + 1}</Text>
          <Text style={styles.cardTitle}>{item}</Text>
          <Text style={styles.note}>
            Varsayımlar, sınırlamalar, effectiveAt ve ilgili özellikler
          </Text>
        </Card>
      ))}
    </>
  );
}
function Legal() {
  return (
    <>
      <Badge label="LEGAL_REVIEW_REQUIRED · NOT_FOR_PRODUCTION_PUBLICATION" />
      {[
        'Kullanım Koşulları',
        'Gizlilik Bildirimi',
        'Yatırım Riski Açıklaması',
        'Veri Kaynağı ve Metodoloji',
        'Kabul Edilebilir Kullanım',
        'Hesap ve Veri Bildirimleri',
      ].map((item) => (
        <Card key={item}>
          <Text style={styles.cardTitle}>{item}</Text>
          <Text style={styles.meta}>
            tr-TR · version draft-1 · review required
          </Text>
        </Card>
      ))}
    </>
  );
}

function SupportForm({ go }: { go: (v: ViewName) => void }) {
  const [subject, setSubject] = useState('Rapor veri kesim zamanı');
  return (
    <>
      <Text style={styles.hero}>Destek talebi oluştur</Text>
      <Field label="Kategori" value="Rapor" />
      <View>
        <Text style={styles.label}>Konu</Text>
        <TextInput
          accessibilityLabel="Konu"
          onChangeText={setSubject}
          style={styles.input}
          value={subject}
        />
      </View>
      <Field
        label="Açıklama"
        value="Raporun veri kesim zamanını doğrulamak istiyorum."
      />
      <Card>
        <Text style={styles.cardTitle}>Tanılama bilgilerini ekle</Text>
        <Text style={styles.note}>
          Yalnız açık onayla app/build, OS, ekran, request ID ve safe reason
          eklenir. Finansal değerler ve tokenlar eklenmez.
        </Text>
      </Card>
      <Button label="Talebi gönder" onPress={() => go('support-history')} />
      <Text style={styles.note}>E-posta bildirimi: SANDBOX_INTEGRATION</Text>
    </>
  );
}
function Field({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        defaultValue={value}
        multiline={label === 'Açıklama'}
        style={[styles.input, label === 'Açıklama' && styles.multiline]}
      />
    </View>
  );
}
function SupportHistory() {
  return (
    <>
      <Section title="Taleplerim">
        {supportRows.map((row) => (
          <Card key={row.code}>
            <View style={styles.between}>
              <View>
                <Text style={styles.cardTitle}>{row.subject}</Text>
                <Text style={styles.meta}>
                  {row.code} · {row.date}
                </Text>
              </View>
              <Badge label={row.status} />
            </View>
          </Card>
        ))}
      </Section>
      <Text style={styles.note}>
        Owner-scoped cursor pagination · internal support notes kullanıcıya
        gösterilmez.
      </Text>
    </>
  );
}

function Settings({ go }: { go: (v: ViewName) => void }) {
  return (
    <>
      {(
        [
          ['Hesap', 'Doğrulandı · invitation/admin managed'],
          ['Görünüm', 'Sistem · reduced motion'],
          ['Piyasa ve Veri', 'BIST · Europe/Istanbul'],
          ['Bildirimler', 'Push ayrı sistem izni'],
          ['Portföy', 'Gizlilik modu'],
          ['Strategy Lab', 'Yeni koşum varsayılanları'],
          ['Gizlilik', 'Tanılama ve veri hakları'],
          ['Güvenlik', 'Biyometrik kilit'],
          ['Metodoloji', 'Standart ayrıntı'],
          ['Yardım ve Destek', 'Taleplerim'],
          ['Yasal', 'Review required'],
          ['Hakkında', 'Atlas iOS'],
        ] as const
      ).map(([label, value]) => (
        <Action
          key={label}
          label={label}
          value={value}
          onPress={() =>
            label === 'Görünüm'
              ? go('appearance')
              : label === 'Gizlilik'
                ? go('privacy')
                : label === 'Yasal'
                  ? go('legal')
                  : label === 'Metodoloji'
                    ? go('methodology')
                    : label === 'Yardım ve Destek'
                      ? go('help')
                      : go('about')
          }
        />
      ))}
    </>
  );
}
function ToggleRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      accessibilityLabel={`${label}, ${value}`}
      accessibilityRole="switch"
      style={styles.toggle}
    >
      <View>
        <Text style={styles.actionText}>{label}</Text>
        <Text style={styles.meta}>{value}</Text>
      </View>
      <View style={styles.togglePill}>
        <View style={styles.toggleDot} />
      </View>
    </View>
  );
}
function Appearance() {
  return (
    <>
      <Badge label="SERVER_BACKED · EXPECTED VERSION 8" />
      <ToggleRow label="Sistem teması" value="Seçili" />
      <ToggleRow label="Açık tema" value="Seçili değil" />
      <ToggleRow label="Koyu tema" value="Seçili değil" />
      <ToggleRow label="Azaltılmış hareket" value="Sistem ayarını izle" />
      <ToggleRow label="Kompakt görünüm" value="Kapalı" />
      <Text style={styles.note}>
        Optimistic update hata durumunda rollback yapar; version conflict
        sessizce ezilmez.
      </Text>
    </>
  );
}
function Privacy() {
  return (
    <>
      <ToggleRow label="Portföy bakiyelerini gizle" value="Açık" />
      <ToggleRow label="Tanılama paylaşımı" value="Kapalı" />
      <Action label="Son aramaları temizle" onPress={() => undefined} />
      <Action label="Demo veriyi sıfırla" onPress={() => undefined} />
      <Card>
        <Text style={styles.cardTitle}>Kişisel veri dışa aktarma</Text>
        <Text style={styles.note}>
          Backend capability mevcut · request, ready ve expired durumları
          owner-scoped.
        </Text>
        <Button
          label="Dışa aktarma talebini gözden geçir"
          onPress={() => undefined}
        />
      </Card>
      <Card>
        <Text style={styles.cardTitle}>Hesap silme talebi</Text>
        <Text style={styles.warning}>
          Re-auth zorunlu. Legal hold varsa atlanmaz; mobil doğrudan hard-delete
          yapmaz.
        </Text>
        <Button label="Silme talebi hakkında bilgi" onPress={() => undefined} />
      </Card>
    </>
  );
}
function About({ go }: { go: (v: ViewName) => void }) {
  return (
    <>
      <View style={styles.heroPanel}>
        <Text style={styles.eyebrow}>ATLAS</Text>
        <Text style={styles.hero}>Finansal araştırma, kayıt ve analiz.</Text>
      </View>
      <MetadataRail
        rows={[
          ['Sürüm', '1.0.0'],
          ['Build', '100I'],
          ['Platform', 'iOS · iPhone'],
          ['Ortam', 'Production-safe'],
          ['Provider', 'Veri kaynağı şu anda kullanılamıyor'],
        ]}
      />
      <Action label="Metodoloji" onPress={() => go('methodology')} />
      <Action label="Yasal belgeler" onPress={() => go('legal')} />
      <Action label="Destek" onPress={() => go('support-form')} />
      <Text style={styles.note}>
        Provider anahtarı, API hostu, auth config veya internal altyapı bilgisi
        gösterilmez.
      </Text>
    </>
  );
}

const productionHelp = [
  ['Başlangıç', 'Atlas kayıt, izleme ve araştırma aracıdır.'],
  [
    'Piyasa verisi',
    'Kullanılabilirlik ve veri kesim zamanı her ekranda belirtilir.',
  ],
  ['Portföy', 'Portföy kayıtları broker hesabı veya emir oluşturmaz.'],
  [
    'Strategy Lab',
    'Backtest geçmiş simülasyondur; gelecekteki sonucu garanti etmez.',
  ],
  ['Raporlar', 'Raporlar owner-scoped kaynak, methodology ve expiry taşır.'],
  [
    'Gizlilik',
    'Hassas veri telemetry, bildirim ve tanılama içeriğine eklenmez.',
  ],
] as const;

function liveError(error: unknown): string {
  return error instanceof AtlasApiError
    ? `${error.safeMessage}${error.requestId ? ` · ${error.requestId}` : ''}`
    : 'İstek tamamlanamadı.';
}

function LiveReportsSettings({ initialView }: { initialView: ViewName }) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const api = new ReportsSettingsApi(auth.client);
  const owner =
    'session' in auth.state ? auth.state.session.userId : 'anonymous';
  const initialSection =
    initialView.startsWith('help') || initialView === 'article'
      ? 'help'
      : initialView.startsWith('support')
        ? 'support'
        : ['settings', 'appearance', 'privacy', 'about'].includes(initialView)
          ? 'settings'
          : 'reports';
  const [section, setSection] = useState<
    'reports' | 'help' | 'support' | 'settings'
  >(initialSection);
  const [reportType, setReportType] = useState<
    | 'portfolio'
    | 'scanner'
    | 'backtest'
    | 'experiment_matrix'
    | 'account_security'
  >('account_security');
  const [sourceId, setSourceId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [helpQuery, setHelpQuery] = useState('');
  const reports = useInfiniteQuery({
    queryKey: ['private', owner, 'reports'],
    queryFn: ({ pageParam, signal }) => api.listReports(pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.data.nextCursor ?? undefined,
  });
  const support = useInfiniteQuery({
    queryKey: ['private', owner, 'support-requests'],
    queryFn: ({ pageParam, signal }) =>
      api.listSupportRequests(pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.data.nextCursor ?? undefined,
  });
  const preferences = useQuery({
    queryKey: ['private', owner, 'preferences'],
    queryFn: () => auth.preferencesApi.get(),
  });
  const createReport = useMutation({
    mutationFn: () =>
      api.createReport({
        reportType,
        ...(reportType === 'account_security'
          ? {}
          : { sourceId: sourceId.trim() }),
        format: 'pdf',
        idempotencyKey: `mobile-report-${owner}-${Date.now()}`,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['private', owner, 'reports'],
      }),
  });
  const createSupport = useMutation({
    mutationFn: () =>
      api.createSupportRequest({
        type: 'other',
        subject: subject.trim(),
        description: description.trim(),
      }),
    onSuccess: () => {
      setSubject('');
      setDescription('');
      void queryClient.invalidateQueries({
        queryKey: ['private', owner, 'support-requests'],
      });
    },
  });
  const marketPreference = useMutation({
    mutationFn: () => {
      const current = preferences.data;
      if (!current) throw new Error('PREFERENCES_NOT_READY');
      return auth.preferencesApi.update(current.version, {
        defaultTimeframe: current.defaultTimeframe === '1d' ? '1w' : '1d',
      });
    },
    onSuccess: (value) =>
      queryClient.setQueryData(['private', owner, 'preferences'], value),
  });
  const filteredHelp = productionHelp.filter(([title, body]) =>
    `${title} ${body}`
      .toLocaleLowerCase('tr-TR')
      .includes(helpQuery.trim().toLocaleLowerCase('tr-TR')),
  );
  return (
    <Shell id="operations-production">
      <AppHeader
        title="Atlas Merkezi"
        subtitle="Raporlar · Yardım · Destek · Ayarlar"
      />
      <Button
        label="Research'e dön"
        onPress={() => router.replace('/(tabs)/research')}
      />
      <View style={styles.pills}>
        {(['reports', 'help', 'support', 'settings'] as const).map((item) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: section === item }}
            key={item}
            onPress={() => setSection(item)}
            style={[styles.pill, section === item && styles.pillActive]}
          >
            <Text>{item}</Text>
          </Pressable>
        ))}
      </View>
      {section === 'reports' ? (
        <>
          <Section title="Rapor oluştur">
            <Text style={styles.note}>Rapor türü: {reportType}</Text>
            <View style={styles.pills}>
              {(
                [
                  'account_security',
                  'portfolio',
                  'scanner',
                  'backtest',
                  'experiment_matrix',
                ] as const
              ).map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setReportType(type)}
                  style={styles.pill}
                >
                  <Text>{type}</Text>
                </Pressable>
              ))}
            </View>
            {reportType !== 'account_security' ? (
              <TextInput
                accessibilityLabel="Rapor kaynak kimliği"
                autoCapitalize="none"
                onChangeText={setSourceId}
                placeholder="Sahibi olduğun kaynak ID"
                style={styles.input}
                value={sourceId}
              />
            ) : null}
            <Button
              disabled={
                createReport.isPending ||
                (reportType !== 'account_security' &&
                  sourceId.trim().length === 0)
              }
              label={createReport.isPending ? 'Üretiliyor…' : 'Rapor oluştur'}
              onPress={() => createReport.mutate()}
            />
            {createReport.isError ? (
              <Text style={styles.errorText}>
                {liveError(createReport.error)}
              </Text>
            ) : null}
          </Section>
          <Section title="Raporlarım">
            {reports.data?.pages
              .flatMap((page) => page.data.items)
              .map((report) => (
                <Card key={report.id}>
                  <View style={styles.row}>
                    <Text style={styles.cardTitle}>{report.reportType}</Text>
                    <Badge label={report.status.toUpperCase()} />
                  </View>
                  <Text style={styles.meta}>
                    Cutoff {report.dataCutoffAt} · Expiry {report.expiresAt}
                  </Text>
                  {report.status === 'ready' ? (
                    <Text style={styles.note}>
                      Güvenli indirme ve paylaşım için dosya sahipliği yeniden
                      doğrulanır.
                    </Text>
                  ) : null}
                </Card>
              ))}
            {reports.hasNextPage ? (
              <Button
                label="Daha fazla rapor"
                onPress={() => void reports.fetchNextPage()}
              />
            ) : null}
          </Section>
        </>
      ) : null}
      {section === 'help' ? (
        <>
          <TextInput
            accessibilityLabel="Yardımda ara"
            maxLength={120}
            onChangeText={setHelpQuery}
            placeholder="Yardımda ara"
            style={styles.input}
            value={helpQuery}
          />
          {filteredHelp.map(([title, body]) => (
            <Card key={title}>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.note}>{body}</Text>
            </Card>
          ))}
          <Card>
            <Text style={styles.cardTitle}>Yasal inceleme durumu</Text>
            <Badge label="LEGAL_REVIEW_REQUIRED" />
            <Text style={styles.note}>
              Belgeler production yayını için onaylanmış veya final olarak
              gösterilmez.
            </Text>
          </Card>
        </>
      ) : null}
      {section === 'support' ? (
        <>
          <TextInput
            accessibilityLabel="Destek konusu"
            maxLength={160}
            onChangeText={setSubject}
            placeholder="Konu"
            style={styles.input}
            value={subject}
          />
          <TextInput
            accessibilityLabel="Destek açıklaması"
            maxLength={8000}
            multiline
            onChangeText={setDescription}
            placeholder="Açıklama"
            style={[styles.input, styles.largeInput]}
            value={description}
          />
          <Button
            disabled={
              subject.trim().length < 4 ||
              description.trim().length < 8 ||
              createSupport.isPending
            }
            label="Destek talebi oluştur"
            onPress={() => createSupport.mutate()}
          />
          {createSupport.isError ? (
            <Text style={styles.errorText}>
              {liveError(createSupport.error)}
            </Text>
          ) : null}
          {support.data?.pages
            .flatMap((page) => page.data.items)
            .map((request) => (
              <Card key={request.id}>
                <Text style={styles.cardTitle}>{request.subject}</Text>
                <Text>
                  {request.type} · {request.status}
                </Text>
                <Text style={styles.meta}>{request.updatedAt}</Text>
              </Card>
            ))}
          {support.hasNextPage ? (
            <Button
              label="Daha fazla talep"
              onPress={() => void support.fetchNextPage()}
            />
          ) : null}
          <Badge label="TRANSACTIONAL_EMAIL: SANDBOX_INTEGRATION" />
        </>
      ) : null}
      {section === 'settings' ? (
        <>
          <Card>
            <Text style={styles.cardTitle}>Hesap</Text>
            <Text style={styles.note}>
              Oturum owner-scoped SecureStore ile korunur.
            </Text>
          </Card>
          <Card>
            <Text style={styles.cardTitle}>Görünüm</Text>
            <Text style={styles.note}>
              Tema ve Reduced Motion sistem erişilebilirlik ayarlarını izler.
            </Text>
          </Card>
          <Card>
            <Text style={styles.cardTitle}>Piyasa ve veri</Text>
            <Text>
              {preferences.data?.defaultMarket ?? '—'} ·{' '}
              {preferences.data?.defaultBenchmark ?? 'PROVIDER_REQUIRED'} ·{' '}
              {preferences.data?.defaultTimeframe ?? '—'}
            </Text>
            <Button
              label="Varsayılan zaman aralığını değiştir"
              onPress={() => marketPreference.mutate()}
            />
          </Card>
          <Card>
            <Text style={styles.cardTitle}>Gizlilik ve güvenlik</Text>
            <Text style={styles.note}>
              Bakiyeleri gizleme, app lock ve yerel cache temizleme mevcut
              güvenlik yüzeylerine bağlıdır.
            </Text>
          </Card>
          <Button label="Çıkış yap" onPress={() => void auth.logout()} />
        </>
      ) : null}
    </Shell>
  );
}

const styles = StyleSheet.create({
  errorText: { color: '#9D2828', ...typography.styles.bodyMedium },
  largeInput: { minHeight: 120, textAlignVertical: 'top' },
  pill: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radius.full,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: touchTargets.minimum,
    paddingHorizontal: spacing[12],
  },
  pillActive: { borderColor: palette.primary600, borderWidth: 2 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  action: {
    alignItems: 'center',
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    minHeight: touchTargets.minimum,
    paddingVertical: spacing[12],
  },
  actionText: {
    color: palette.textPrimary,
    ...typography.styles.bodyLarge,
    fontWeight: '700',
  },
  between: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  body: {
    color: palette.textPrimary,
    ...typography.styles.bodyLarge,
    lineHeight: 24,
  },
  cardTitle: { color: palette.textPrimary, ...typography.styles.titleSmall },
  chevron: { color: palette.primary600, fontSize: 24 },
  eyebrow: {
    color: palette.primary600,
    letterSpacing: 1.4,
    ...typography.styles.labelSmall,
  },
  hero: { color: palette.navy900, ...typography.styles.titleLarge },
  heroPanel: {
    backgroundColor: '#EAF3FF',
    borderLeftColor: palette.primary600,
    borderLeftWidth: 4,
    borderRadius: radius.card,
    gap: spacing[8],
    padding: spacing[20],
  },
  input: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radius.button,
    borderWidth: 1,
    color: palette.textPrimary,
    minHeight: touchTargets.minimum,
    padding: spacing[12],
    ...typography.styles.bodyLarge,
  },
  label: {
    color: palette.textSecondary,
    marginBottom: spacing[4],
    ...typography.styles.labelMedium,
  },
  meta: { color: palette.textMuted, ...typography.styles.bodySmall },
  metric: {
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
    gap: spacing[4],
    paddingVertical: spacing[12],
  },
  metricValue: {
    color: palette.navy900,
    fontVariant: ['tabular-nums'],
    ...typography.styles.titleMedium,
  },
  multiline: { minHeight: 104, textAlignVertical: 'top' },
  note: {
    color: palette.textSecondary,
    ...typography.styles.bodyMedium,
    lineHeight: 20,
  },
  progress: {
    backgroundColor: palette.border,
    borderRadius: radius.full,
    height: 10,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: palette.primary600,
    height: 10,
    width: '68%',
  },
  rail: {
    borderLeftColor: palette.primary600,
    borderLeftWidth: 3,
    gap: spacing[12],
    paddingLeft: spacing[16],
  },
  railLabel: {
    color: palette.textMuted,
    textTransform: 'uppercase',
    ...typography.styles.labelSmall,
  },
  railRow: { gap: spacing[2] },
  railValue: {
    color: palette.textPrimary,
    fontVariant: ['tabular-nums'],
    ...typography.styles.bodyLarge,
  },
  reportBody: { flex: 1, gap: spacing[4] },
  reportCard: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[12],
    minHeight: 76,
    padding: spacing[12],
  },
  reportMark: {
    alignSelf: 'stretch',
    backgroundColor: palette.primary600,
    borderRadius: radius.full,
    width: 4,
  },
  rowText: { color: palette.textPrimary, ...typography.styles.bodyMedium },
  screen: {
    backgroundColor: palette.background,
    flexGrow: 1,
    gap: spacing[16],
    padding: spacing[20],
    paddingBottom: spacing[48],
    paddingTop: 64,
  },
  section: { gap: spacing[8] },
  sectionTitle: { color: palette.navy900, ...typography.styles.titleMedium },
  toggle: {
    alignItems: 'center',
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    minHeight: touchTargets.minimum,
    paddingVertical: spacing[12],
  },
  toggleDot: {
    backgroundColor: palette.surface,
    borderRadius: 9,
    height: 18,
    marginLeft: 20,
    width: 18,
  },
  togglePill: {
    backgroundColor: palette.primary600,
    borderRadius: radius.full,
    padding: 3,
    width: 44,
  },
  warning: {
    backgroundColor: '#FFF4D6',
    borderRadius: radius.card,
    color: '#6D4C00',
    padding: spacing[12],
    ...typography.styles.bodyMedium,
    lineHeight: 20,
  },
});
