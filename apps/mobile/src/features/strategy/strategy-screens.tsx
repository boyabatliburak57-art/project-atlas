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
import { radius, spacing, touchTargets } from '@atlas/design-tokens';
import {
  AppHeader,
  Badge,
  Button,
  Card,
  OfflineState,
  ProviderRequiredState,
} from '@atlas/mobile-ui';
import {
  evidenceLabel,
  metricRows,
  strategyCards,
  tradeRows,
} from './strategy-evidence-data';
import { useAuth } from '../../providers/auth-provider';
import { SafeAreaScrollScreen } from '../../components/safe-area-scroll-screen';

type ViewName =
  | 'lab'
  | 'empty'
  | 'card'
  | 'builder'
  | 'rules'
  | 'validation'
  | 'config'
  | 'provider'
  | 'progress'
  | 'result'
  | 'equity'
  | 'drawdown'
  | 'metrics'
  | 'not-evaluable'
  | 'trades'
  | 'trade-detail'
  | 'benchmark'
  | 'quality'
  | 'experiments'
  | 'rerun';
const fixtureEnabled = (value: string | string[] | undefined) =>
  __DEV__ && value === '1';

export function StrategyLabScreen({
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
  const view = params.view ?? initialView ?? 'lab';
  const go = (next: ViewName) =>
    router.replace({
      pathname:
        next === 'experiments' ||
        [
          'config',
          'provider',
          'progress',
          'result',
          'equity',
          'drawdown',
          'metrics',
          'not-evaluable',
          'trades',
          'trade-detail',
          'benchmark',
          'quality',
          'rerun',
        ].includes(next)
          ? '/research/backtests'
          : '/research/strategies',
      params: { fixture: '1', view: next },
    });
  if (params.offline === '1')
    return (
      <Shell id="strategy-offline">
        <AppHeader
          title="Strategy Lab"
          subtitle="Salt okunur · önbellek 31 Tem 18:10"
        />
        <OfflineState />
        <Text style={styles.note}>
          Çevrimdışıyken strateji değiştirilemez veya backtest başlatılamaz.
        </Text>
      </Shell>
    );
  if (!fixture) return <LiveStrategyLab />;
  if (view === 'provider')
    return (
      <Shell id="strategy-provider-required">
        <AppHeader
          title="Strategy Lab"
          subtitle="Araştırma ve geçmiş veri analizi"
        />
        <ProviderRequiredState />
        <Text style={styles.note}>
          Backtest yürütmek için tarihsel piyasa ve benchmark veri kaynağı
          gerekir. Sahte üretim sonucu oluşturulmaz.
        </Text>
      </Shell>
    );
  return (
    <Shell id={`strategy-${view}`}>
      <AppHeader
        title="Strategy Lab"
        subtitle="Geçmiş veri araştırması · yatırım tavsiyesi değildir"
      />
      <Badge label={evidenceLabel} />
      {view === 'lab' ? <Lab go={go} /> : null}
      {view === 'empty' ? <Empty go={go} /> : null}
      {view === 'card' ? <StrategyCardView go={go} /> : null}
      {view === 'builder' ? <Builder go={go} /> : null}
      {view === 'rules' ? <RuleEditor go={go} /> : null}
      {view === 'validation' ? <Validation go={go} /> : null}
      {view === 'config' ? <Configuration go={go} /> : null}
      {view === 'progress' ? <Progress go={go} /> : null}
      {view === 'result' ? <Result go={go} /> : null}
      {view === 'equity' ? <Curve kind="Equity" go={go} /> : null}
      {view === 'drawdown' ? <Curve kind="Drawdown" go={go} /> : null}
      {view === 'metrics' ? <Metrics /> : null}
      {view === 'not-evaluable' ? <NotEvaluable /> : null}
      {view === 'trades' ? <Trades go={go} /> : null}
      {view === 'trade-detail' ? <TradeDetail /> : null}
      {view === 'benchmark' ? <Benchmark /> : null}
      {view === 'quality' ? <Quality /> : null}
      {view === 'experiments' ? <Experiments go={go} /> : null}
      {view === 'rerun' ? <Rerun /> : null}
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
function Action({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.action}
    >
      <Text style={styles.actionText}>{label}</Text>
      <Text>›</Text>
    </Pressable>
  );
}
function Lab({ go }: { go: (v: ViewName) => void }) {
  return (
    <>
      <View style={styles.rail}>
        <Text style={styles.railEyebrow}>ARAŞTIRMA AKIŞI</Text>
        <Text style={styles.railText}>
          Kural → Revision → Backtest → Karşılaştırma
        </Text>
      </View>
      <Section title="Stratejilerim">
        {strategyCards.map((s) => (
          <Pressable
            key={s.name}
            accessibilityLabel={`${s.name}, revision ${s.revision}, ${s.status}`}
            onPress={() => go('card')}
            style={styles.strategy}
          >
            <View>
              <Text style={styles.strategyTitle}>{s.name}</Text>
              <Text style={styles.meta}>
                rev {s.revision} · {s.universe} · {s.rules} kural
              </Text>
            </View>
            <Badge label={s.status} />
          </Pressable>
        ))}
      </Section>
      <Button label="Strateji oluştur" onPress={() => go('builder')} />
      <Section title="Çalışma alanı">
        <Action label="Son backtest sonucu" onPress={() => go('result')} />
        <Action label="Deneyler" onPress={() => go('experiments')} />
        <Action
          label="Metodoloji ve veri durumu"
          onPress={() => go('quality')}
        />
      </Section>
    </>
  );
}
function Empty({ go }: { go: (v: ViewName) => void }) {
  return (
    <Card>
      <Text style={styles.hero}>Henüz strateji yok</Text>
      <Text style={styles.note}>
        Versioned kurallarla bir araştırma stratejisi oluştur. Uygulama emir
        iletmez.
      </Text>
      <Button label="Strateji oluştur" onPress={() => go('builder')} />
    </Card>
  );
}
function StrategyCardView({ go }: { go: (v: ViewName) => void }) {
  return (
    <>
      <Card>
        <Text style={styles.eyebrow}>STRATEJİ · REVISION 4</Text>
        <Text style={styles.hero}>Trend ve hacim araştırması</Text>
        <Text style={styles.note}>
          BIST 100 · Günlük · 6 kural · Engine v2.4
        </Text>
      </Card>
      <Section title="Revision zinciri">
        <Text style={styles.timeline}>● rev 4 · Hacim eşiği güncellendi</Text>
        <Text style={styles.timeline}>│ rev 3 · Çıkış kuralı eklendi</Text>
        <Text style={styles.timeline}>○ rev 2 · Tarihsel sonuçlara bağlı</Text>
      </Section>
      <Button label="Yeni revision oluştur" onPress={() => go('builder')} />
      <Button label="Backtest yapılandır" onPress={() => go('config')} />
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
        style={styles.input}
      />
    </View>
  );
}
function Builder({ go }: { go: (v: ViewName) => void }) {
  return (
    <>
      <Text style={styles.hero}>Strateji oluştur</Text>
      <Field label="Strateji adı" value="Trend ve hacim araştırması" />
      <Field label="Evren" value="BIST 100" />
      <Section title="Kurallar">
        <Action label="Giriş koşulları · 4" onPress={() => go('rules')} />
        <Action label="Çıkış koşulları · 2" onPress={() => go('rules')} />
      </Section>
      <Text style={styles.note}>
        Equal weight · maks. 10 pozisyon · Komisyon 10 bps · Slippage 5 bps
      </Text>
      <Button label="Stratejiyi kaydet" onPress={() => go('card')} />
      <Button
        label="Kaydet ve backtest yapılandır"
        onPress={() => go('config')}
      />
    </>
  );
}
function RuleEditor({ go }: { go: (v: ViewName) => void }) {
  return (
    <>
      <Text style={styles.hero}>Giriş kuralları</Text>
      <View accessibilityLabel="Tüm koşullar doğru olmalı" style={styles.group}>
        <Badge label="AND" />
        <Text style={styles.rule}>RSI(14) ≥ 55</Text>
        <Text style={styles.rule}>Kapanış, SMA(200) üzerinde</Text>
        <View style={styles.nested}>
          <Badge label="OR" />
          <Text style={styles.rule}>Hacim ortalamanın üzerinde</Text>
          <Text style={styles.rule}>Trend pattern confirmed</Text>
        </View>
      </View>
      <Button label="Kural ekle" onPress={() => go('rules')} />
      <Button label="Kuralları uygula" onPress={() => go('builder')} />
    </>
  );
}
function Validation({ go }: { go: (v: ViewName) => void }) {
  return (
    <>
      <Text style={styles.hero}>Yapılandırmayı gözden geçir</Text>
      <View accessibilityRole="alert" style={styles.error}>
        <Text style={styles.errorTitle}>BACKTEST_PERIOD_INVALID</Text>
        <Text>Başlangıç tarihi bitiş tarihinden önce olmalı.</Text>
      </View>
      <Field label="Başlangıç" value="01.01.2026" />
      <Field label="Bitiş" value="01.01.2025" />
      <Button label="Düzelt ve devam et" onPress={() => go('config')} />
    </>
  );
}
function Configuration({ go }: { go: (v: ViewName) => void }) {
  return (
    <>
      <Text style={styles.hero}>Backtest yapılandır</Text>
      <Text style={styles.meta}>Strategy rev 4 · point-in-time mode</Text>
      <Field label="Tarih aralığı" value="01.01.2023 — 31.07.2026" />
      <Field label="Başlangıç sermayesi" value="100.000,00 TRY" />
      <Field label="Benchmark" value="BIST 100" />
      <View style={styles.grid}>
        <Mini label="Komisyon" value="10 bps" />
        <Mini label="Slippage" value="5 bps" />
        <Mini label="Fiyat modu" value="Split adjusted" />
        <Mini label="Maks. pozisyon" value="10" />
      </View>
      <Text style={styles.method}>
        availableAt policy · point-in-time universe · historical calendar ·
        methodology v2
      </Text>
      <Button label="Backtest çalıştır" onPress={() => go('progress')} />
    </>
  );
}
function Progress({ go }: { go: (v: ViewName) => void }) {
  return (
    <>
      <Text style={styles.hero}>Backtest çalışıyor</Text>
      <View style={styles.rail}>
        <Text style={styles.railEyebrow}>RUN BT-2048 · REV 4</Text>
        <Text style={styles.railText}>
          ● Kuyruklandı{`\n`}● Doğrulandı{`\n`}◉ Sinyaller değerlendiriliyor ·
          %68{`\n`}○ Sonuç kaydı
        </Text>
      </View>
      <View accessibilityLabel="İlerleme yüzde 68" style={styles.progress}>
        <View style={styles.progressFill} />
      </View>
      <Text style={styles.note}>
        842 / 1.238 seans · 31 işlem · 00:18 · data cutoff 31 Tem 2026
      </Text>
      <Button label="Çalışmayı iptal et" onPress={() => go('lab')} />
      <Button
        label="Deterministic sonucu incele"
        onPress={() => go('result')}
      />
    </>
  );
}
function Result({ go }: { go: (v: ViewName) => void }) {
  return (
    <>
      <Text style={styles.eyebrow}>BACKTEST SONUCU · REV 4</Text>
      <Text style={styles.hero}>Trend ve hacim araştırması</Text>
      <Card>
        <Text style={styles.heroValue}>+%18,40</Text>
        <Text style={styles.meta}>
          Toplam getiri · BIST 100 +%12,10 · fazla getiri +%6,30
        </Text>
      </Card>
      <View style={styles.grid}>
        <Mini label="Final değer" value="₺118.400" />
        <Mini label="İşlem" value="42" />
        <Mini label="Dönem" value="3,6 yıl" />
        <Mini label="Cutoff" value="31 Tem" />
      </View>
      <Section title="Sonucu incele">
        <Action label="Equity curve" onPress={() => go('equity')} />
        <Action label="Drawdown curve" onPress={() => go('drawdown')} />
        <Action label="Tüm metrikler" onPress={() => go('metrics')} />
        <Action label="İşlem geçmişi" onPress={() => go('trades')} />
        <Action label="Veri kalitesi" onPress={() => go('quality')} />
      </Section>
      <Disclosure />
      <Button label="Deneyi tekrar çalıştır" onPress={() => go('rerun')} />
    </>
  );
}
function Curve({
  kind,
  go,
}: {
  kind: 'Equity' | 'Drawdown';
  go: (v: ViewName) => void;
}) {
  const draw = kind === 'Drawdown';
  return (
    <>
      <Text style={styles.hero}>
        {kind === 'Equity' ? 'Equity curve' : 'Drawdown curve'}
      </Text>
      <View
        accessibilityLabel={
          draw
            ? 'Drawdown özeti, maksimum eksi yüzde 9,31'
            : 'Equity özeti, başlangıç 100 bin, son 118 bin 400'
        }
        style={styles.chart}
      >
        <Text style={styles.axis}>
          {draw ? '0% ─────────────' : '₺120K ───────────'}
        </Text>
        <Text style={draw ? styles.drawLine : styles.chartLine}>
          {draw ? '╲__╱╲____╱' : '╱╲__╱╲___╱╲'}
        </Text>
        <Text style={styles.axis}>
          {draw ? '-9,31% · trough 18 Mar' : '2023          2026'}
        </Text>
      </View>
      <Text style={styles.note}>
        {draw
          ? 'Peak 04 Oca · Trough 18 Mar · Recovery 22 Haz'
          : 'Strateji +%18,40 · Benchmark +%12,10 · eksik gün interpolate edilmez'}
      </Text>
      <Button label="Seçili noktayı incele" onPress={() => go('result')} />
    </>
  );
}
function Metrics() {
  return (
    <>
      <Text style={styles.hero}>Performans ve risk metrikleri</Text>
      <View style={styles.metricGrid}>
        {metricRows.map(([label, value]) => (
          <View
            accessibilityLabel={`${label}: ${value}`}
            key={label}
            style={styles.metric}
          >
            <Text style={styles.eyebrow}>{label}</Text>
            <Text style={styles.metricValue}>{value}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.method}>
        Annualization 252 · risksiz oran %0 açık varsayım · gross turnover /
        average equity · methodology v2
      </Text>
      <Disclosure />
    </>
  );
}
function NotEvaluable() {
  return (
    <>
      <Text style={styles.hero}>Metrik değerlendirilemedi</Text>
      <View accessibilityRole="alert" style={styles.warning}>
        <Text style={styles.errorTitle}>NOT_EVALUABLE</Text>
        <Text>Sortino · NO_DOWNSIDE_OBSERVATIONS</Text>
        <Text>Calmar · ZERO_DRAWDOWN</Text>
        <Text>Benchmark beta · BENCHMARK_REQUIRED</Text>
      </View>
      <Text style={styles.note}>
        Eksik sonuç 0 veya NaN olarak gösterilmez.
      </Text>
    </>
  );
}
function Trades({ go }: { go: (v: ViewName) => void }) {
  return (
    <>
      <Text style={styles.hero}>İşlem geçmişi</Text>
      <Text style={styles.meta}>42 kayıt · cursor pagination · sayfa 1</Text>
      {tradeRows.map((t) => (
        <Pressable
          accessibilityRole="button"
          key={t.id}
          onPress={() => go('trade-detail')}
          style={styles.action}
        >
          <View>
            <Text style={styles.strategyTitle}>{t.symbol}</Text>
            <Text style={styles.meta}>
              {t.entry} → {t.exit}
            </Text>
          </View>
          <Text
            style={t.result.startsWith('+') ? styles.positive : styles.negative}
          >
            {t.result}
          </Text>
        </Pressable>
      ))}
      <Button label="Sonraki sayfa" onPress={() => go('trades')} />
    </>
  );
}
function TradeDetail() {
  return (
    <>
      <Text style={styles.hero}>THYAO · işlem detayı</Text>
      <View style={styles.grid}>
        <Mini label="Giriş" value="12 Oca · ₺242,40" />
        <Mini label="Çıkış" value="28 Oca · ₺258,10" />
        <Mini label="Net P/L" value="+₺1.248,20" />
        <Mini label="Süre" value="12 seans" />
      </View>
      <Section title="Kural kanıtı">
        <Text style={styles.rule}>Entry R-14 · RSI 58,2 ≥ 55</Text>
        <Text style={styles.rule}>Exit R-21 · close crosses below EMA(20)</Text>
      </Section>
      <Text style={styles.method}>
        Komisyon ₺42 · slippage ₺18 · data cutoff 31 Tem · historical simulation
      </Text>
    </>
  );
}
function Benchmark() {
  return (
    <>
      <Text style={styles.hero}>Benchmark karşılaştırması</Text>
      <View style={styles.grid}>
        <Mini label="Strateji" value="+%18,40" />
        <Mini label="BIST 100" value="+%12,10" />
        <Mini label="Fazla getiri" value="+%6,30" />
        <Mini label="Tracking error" value="%7,20" />
      </View>
      <Text style={styles.method}>
        Aynı aralık · aynı normalizasyon · exact-date intersection ·
        forward-fill yok
      </Text>
      <Disclosure />
    </>
  );
}
function Quality() {
  return (
    <>
      <Text style={styles.hero}>Veri kalitesi ve reproducibility</Text>
      {[
        'Point-in-time universe · PASS',
        'Fundamentals availableAt · PASS',
        'Delisted coverage · PASS',
        'Corporate actions · split-adjusted',
        'Missing sessions · 2 · PARTIAL',
        'Dataset revision · ds-2026.07.31',
        'Engine · 2.4.0 · Methodology · v2',
      ].map((x) => (
        <View key={x} style={styles.quality}>
          <Text>{x}</Text>
        </View>
      ))}
      <Text style={styles.note}>
        Future constituent veya restatement bilgisi değerlendirme zamanından
        önce kullanılamaz.
      </Text>
    </>
  );
}
function Experiments({ go }: { go: (v: ViewName) => void }) {
  return (
    <>
      <Text style={styles.hero}>Deney karşılaştırması</Text>
      <Text style={styles.note}>
        12 bounded kombinasyon · kullanıcı seçili sıralama: Sharpe ·
        “winner/best” etiketi yok
      </Text>
      {[
        ['RSI 50 · SMA 100', '+%12,4', '0,64'],
        ['RSI 55 · SMA 200', '+%18,4', '0,72'],
        ['RSI 60 · SMA 200', '+%9,8', '0,51'],
      ].map((row) => (
        <View key={row[0]} style={styles.strategy}>
          <Text style={styles.strategyTitle}>{row[0]}</Text>
          <Text>
            {row[1]} · Sharpe {row[2]}
          </Text>
        </View>
      ))}
      <Button label="Yeni bounded deney oluştur" onPress={() => go('config')} />
      <Button label="Tekrar çalıştır" onPress={() => go('rerun')} />
    </>
  );
}
function Rerun() {
  const [exact, setExact] = useState(false);
  return (
    <>
      <Text style={styles.hero}>Tekrar çalıştır</Text>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: !exact }}
        onPress={() => setExact(false)}
        style={styles.choice}
      >
        <Text style={styles.strategyTitle}>
          Aynı config · güncel kullanılabilir veri
        </Text>
        <Text style={styles.note}>
          Yeni dataset revision ile yeni run üretir.
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: exact }}
        onPress={() => setExact(true)}
        style={styles.choice}
      >
        <Text style={styles.strategyTitle}>Tarihsel exact reproduction</Text>
        <Text style={styles.note}>
          Strategy rev 4 · dataset ds-2026.07.31 · engine 2.4.0 · seed 1042
        </Text>
      </Pressable>
      <Button label="Yeni run oluştur" onPress={() => undefined} />
    </>
  );
}
function Mini({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.mini}>
      <Text style={styles.eyebrow}>{label}</Text>
      <Text style={styles.miniValue}>{value}</Text>
    </View>
  );
}
function Disclosure() {
  return (
    <Text
      accessibilityLabel="Geçmiş performans gelecekteki sonuçları garanti etmez"
      style={styles.disclosure}
    >
      Geçmiş performans gelecekteki sonuçları garanti etmez. Sonuçlar komisyon,
      slippage, veri kapsamı ve metodoloji varsayımlarına bağlı tarihsel
      simülasyondur.
    </Text>
  );
}

type ApiEnvelope<T> = {
  readonly data: T;
  readonly meta?: { readonly nextCursor?: string | null };
};
type StrategyResource = {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly currentRevision: number;
  readonly updatedAt: string;
};
type BacktestResource = {
  readonly id: string;
  readonly strategyId: string;
  readonly strategyRevision: number;
  readonly status: string;
  readonly submittedAt?: string;
  readonly completedAt?: string | null;
  readonly progress?: Readonly<Record<string, unknown>>;
};
type ExperimentResource = {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly strategyRevision: number;
  readonly createdAt: string;
};

function strategyError(error: unknown): string {
  return error instanceof AtlasApiError
    ? `${error.safeMessage}${error.requestId ? ` · ${error.requestId}` : ''}`
    : 'Araştırma isteği tamamlanamadı.';
}

function asObject(value: unknown): Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : {};
}

function strategyValue(value: unknown): string {
  if (value === null || value === undefined) return 'NOT_EVALUABLE';
  if (typeof value === 'string' || typeof value === 'number')
    return String(value);
  if (typeof value === 'boolean') return value ? 'Evet' : 'Hayır';
  if (Array.isArray(value)) return `${value.length} kayıt`;
  return 'Detay mevcut';
}

function defaultStrategyDefinition(): Readonly<Record<string, unknown>> {
  const universe = {
    market: 'BIST',
    statuses: ['active'],
    indexCodes: [],
    sectorIds: [],
  };
  const rule = (operator: 'GT' | 'LT') => ({
    version: 1,
    universe,
    root: {
      type: 'group',
      nodeId: `${operator}-root`,
      operator: 'AND',
      children: [
        {
          type: 'condition',
          nodeId: `${operator}-condition`,
          operator,
          left: { type: 'priceField', field: 'close', timeframe: '1d' },
          right: { type: 'constantNumber', value: 10 },
        },
      ],
    },
  });
  return {
    schemaVersion: 1,
    baseTimeframe: '1d',
    entryRule: rule('GT'),
    exitRule: rule('LT'),
    filterRule: null,
    parameters: [],
    positionSizing: { type: 'equalWeight' },
    riskControls: {
      maxPositionWeight: 20,
      maxConcurrentPositions: 5,
      allowShort: false,
      allowLeverage: false,
      allowNegativeCash: false,
    },
    executionPolicy: {
      code: 'closed_bar_next_open',
      version: 'next-open-v1',
      signalBarPolicy: 'closed_only',
      higherTimeframeBarPolicy: 'closed_only',
      missingBarPolicy: 'skip_fill',
    },
    costPolicy: {
      code: 'cost_free',
      version: 'cost-free-v1',
      explicitlyAccepted: true,
    },
    dataIntegrityPolicy: {
      universePolicy: 'point_in_time',
      fundamentalAvailabilityPolicy: 'publication_and_revision',
      corporateActionPolicyVersion: 'actions-v1',
      adjustmentMode: 'raw',
    },
    benchmarkCode: null,
  };
}

function LiveStrategyLab() {
  const { client, state } = useAuth();
  const queryClient = useQueryClient();
  const owner = 'session' in state ? state.session.userId : 'anonymous';
  const [name, setName] = useState('');
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const strategies = useQuery({
    queryKey: ['private', owner, 'strategies'],
    queryFn: () =>
      client.request<
        ApiEnvelope<{ readonly items: readonly StrategyResource[] }>
      >({
        path: '/strategies',
      }),
  });
  const backtests = useInfiniteQuery({
    queryKey: ['private', owner, 'backtests'],
    queryFn: ({ pageParam }) =>
      client.request<
        ApiEnvelope<{ readonly items: readonly BacktestResource[] }>
      >({
        path: '/backtests',
        query: { limit: 50, cursor: pageParam },
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.meta?.nextCursor ?? undefined,
  });
  const experiments = useQuery({
    queryKey: ['private', owner, 'experiments'],
    queryFn: () =>
      client.request<
        ApiEnvelope<{ readonly items: readonly ExperimentResource[] }>
      >({
        path: '/experiments',
      }),
  });
  const runs = backtests.data?.pages.flatMap((page) => page.data.items) ?? [];
  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? runs[0];
  const summary = useQuery({
    queryKey: ['private', owner, 'backtest', selectedRun?.id, 'summary'],
    queryFn: () =>
      client.request<ApiEnvelope<Record<string, unknown>>>({
        path: `/backtests/${selectedRun?.id ?? ''}/summary`,
      }),
    enabled: selectedRun?.status === 'completed',
  });
  const series = useQuery({
    queryKey: ['private', owner, 'backtest', selectedRun?.id, 'series'],
    queryFn: () =>
      client.request<ApiEnvelope<{ readonly items: readonly unknown[] }>>({
        path: `/backtests/${selectedRun?.id ?? ''}/series?type=equity&limit=1000`,
      }),
    enabled: selectedRun?.status === 'completed',
  });
  const trades = useInfiniteQuery({
    queryKey: ['private', owner, 'backtest', selectedRun?.id, 'trades'],
    queryFn: ({ pageParam }) =>
      client.request<
        ApiEnvelope<{ readonly items: readonly Record<string, unknown>[] }>
      >({
        path: `/backtests/${selectedRun?.id ?? ''}/trades`,
        query: { limit: 50, cursor: pageParam },
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.meta?.nextCursor ?? undefined,
    enabled: selectedRun?.status === 'completed',
  });
  const create = useMutation({
    mutationFn: () =>
      client.request<ApiEnvelope<StrategyResource>>({
        method: 'POST',
        path: '/strategies',
        body: {
          name: name.trim(),
          description: 'Mobil Strategy Lab araştırma stratejisi',
          definition: defaultStrategyDefinition(),
          status: 'validated',
        },
      }),
    onSuccess: () => {
      setName('');
      void queryClient.invalidateQueries({
        queryKey: ['private', owner, 'strategies'],
      });
    },
  });
  const firstError = strategies.error ?? backtests.error ?? experiments.error;
  return (
    <Shell id="strategy-production">
      <AppHeader
        title="Strategy Lab"
        subtitle="Geçmiş veri araştırması · yatırım tavsiyesi değildir"
      />
      <Button
        label="Research'e dön"
        onPress={() => router.replace('/(tabs)/research')}
      />
      <Card>
        <Text style={styles.note}>
          Geçmiş performans gelecekteki sonuçları garanti etmez.
        </Text>
      </Card>
      {firstError ? (
        <Text style={styles.error}>{strategyError(firstError)}</Text>
      ) : null}
      <Section title="Stratejilerim">
        <TextInput
          accessibilityLabel="Strateji adı"
          maxLength={160}
          onChangeText={setName}
          placeholder="Yeni strateji adı"
          style={styles.input}
          value={name}
        />
        <Button
          disabled={name.trim().length === 0 || create.isPending}
          label="Stratejiyi kaydet"
          onPress={() => create.mutate()}
        />
        {create.isError ? (
          <Text style={styles.error}>{strategyError(create.error)}</Text>
        ) : null}
        {strategies.data?.data.items.map((strategy) => (
          <Card key={strategy.id}>
            <View style={styles.strategy}>
              <Text style={styles.strategyTitle}>{strategy.name}</Text>
              <Badge label={strategy.status.toUpperCase()} />
            </View>
            <Text>
              Revision {strategy.currentRevision} · {strategy.updatedAt}
            </Text>
          </Card>
        ))}
      </Section>
      <Section title="Backtest koşumları">
        {runs.map((run) => (
          <Pressable
            key={run.id}
            onPress={() => setSelectedRunId(run.id)}
            style={styles.action}
          >
            <View>
              <Text style={styles.strategyTitle}>{run.status}</Text>
              <Text style={styles.meta}>
                Revision {run.strategyRevision} · {run.submittedAt ?? '—'}
              </Text>
            </View>
            <Badge label={run.id === selectedRun?.id ? 'SEÇİLİ' : 'AÇ'} />
          </Pressable>
        ))}
        {backtests.hasNextPage ? (
          <Button
            label="Daha fazla koşum"
            onPress={() => void backtests.fetchNextPage()}
          />
        ) : null}
        <ProviderRequiredState />
        <Text style={styles.note}>
          Yeni backtest yalnız point-in-time dataset ve benchmark capability'si
          mevcutsa backend worker'a gönderilir.
        </Text>
      </Section>
      {selectedRun ? (
        <Section title="Sonuç ve yeniden üretilebilirlik">
          <Card>
            <Text style={styles.strategyTitle}>{selectedRun.status}</Text>
            {Object.entries(asObject(summary.data?.data)).map(
              ([key, value]) => (
                <Text key={key} style={styles.meta}>
                  {key}: {strategyValue(value)}
                </Text>
              ),
            )}
            <Text style={styles.meta}>
              Equity observations:{' '}
              {series.data?.data.items.length ?? 'NOT_EVALUABLE'}
            </Text>
          </Card>
          <Card>
            <Text style={styles.strategyTitle}>Trade history</Text>
            {trades.data?.pages
              .flatMap((page) => page.data.items)
              .map((trade, index) => (
                <Text
                  key={strategyValue(trade.id ?? index)}
                  style={styles.meta}
                >
                  {Object.entries(trade)
                    .slice(0, 7)
                    .map(([key, value]) => `${key}: ${strategyValue(value)}`)
                    .join(' · ')}
                </Text>
              ))}
            {trades.hasNextPage ? (
              <Button
                label="Daha fazla trade kaydı"
                onPress={() => void trades.fetchNextPage()}
              />
            ) : null}
          </Card>
        </Section>
      ) : null}
      <Section title="Deneyler">
        {experiments.data?.data.items.map((experiment) => (
          <Card key={experiment.id}>
            <Text style={styles.strategyTitle}>{experiment.name}</Text>
            <Text style={styles.meta}>
              {experiment.status} · revision {experiment.strategyRevision} ·{' '}
              {experiment.createdAt}
            </Text>
          </Card>
        ))}
      </Section>
    </Shell>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F2F5F9',
    gap: spacing[4],
    minHeight: '100%',
    padding: spacing[4],
    paddingTop: 64,
  },
  section: { gap: spacing[2] },
  sectionTitle: { color: '#10253F', fontSize: 18, fontWeight: '800' },
  hero: {
    color: '#0B1F36',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  heroValue: { color: '#0B1F36', fontSize: 34, fontWeight: '800' },
  eyebrow: {
    color: '#52667D',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  note: { color: '#52667D', fontSize: 14, lineHeight: 21 },
  meta: { color: '#64758A', fontSize: 12 },
  method: {
    backgroundColor: '#E6ECF3',
    borderRadius: radius.medium,
    color: '#344A62',
    fontSize: 12,
    lineHeight: 18,
    padding: spacing[12],
  },
  rail: {
    backgroundColor: '#102A46',
    borderLeftColor: '#55B5FF',
    borderLeftWidth: 4,
    borderRadius: radius.medium,
    gap: spacing[2],
    padding: spacing[4],
  },
  railEyebrow: {
    color: '#8CCFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  railText: { color: 'white', fontSize: 17, fontWeight: '700', lineHeight: 28 },
  strategy: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderColor: '#D9E2EC',
    borderRadius: radius.medium,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    minHeight: touchTargets.minimum,
    padding: spacing[12],
  },
  strategyTitle: { color: '#10253F', fontSize: 15, fontWeight: '700' },
  action: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderBottomColor: '#D9E2EC',
    borderBottomWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    minHeight: touchTargets.minimum,
    padding: spacing[12],
  },
  actionText: { color: '#173D67', fontSize: 15, fontWeight: '700' },
  timeline: { color: '#344A62', fontSize: 14, lineHeight: 25 },
  label: { color: '#344A62', fontSize: 13, fontWeight: '700', marginBottom: 5 },
  input: {
    backgroundColor: 'white',
    borderColor: '#C7D3E0',
    borderRadius: radius.medium,
    borderWidth: 1,
    fontSize: 15,
    minHeight: touchTargets.minimum,
    paddingHorizontal: spacing[12],
  },
  group: {
    backgroundColor: 'white',
    borderColor: '#AFC2D6',
    borderRadius: radius.medium,
    borderWidth: 1,
    gap: spacing[2],
    padding: spacing[12],
  },
  nested: {
    borderLeftColor: '#55B5FF',
    borderLeftWidth: 3,
    gap: spacing[2],
    marginLeft: spacing[12],
    paddingLeft: spacing[12],
  },
  rule: {
    backgroundColor: '#EDF3F8',
    borderRadius: radius.small,
    color: '#243B53',
    fontSize: 14,
    padding: spacing[12],
  },
  error: {
    backgroundColor: '#FCE8E6',
    borderColor: '#D25B4A',
    borderRadius: radius.medium,
    borderWidth: 1,
    gap: spacing[4],
    padding: spacing[12],
  },
  warning: {
    backgroundColor: '#FFF3D6',
    borderColor: '#C88719',
    borderRadius: radius.medium,
    borderWidth: 1,
    gap: spacing[2],
    padding: spacing[4],
  },
  errorTitle: { color: '#8B2E23', fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  mini: {
    backgroundColor: 'white',
    borderRadius: radius.medium,
    minWidth: '47%',
    padding: spacing[12],
  },
  miniValue: {
    color: '#10253F',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  progress: {
    backgroundColor: '#CFD9E4',
    borderRadius: 8,
    height: 12,
    overflow: 'hidden',
  },
  progressFill: { backgroundColor: '#2587D8', height: 12, width: '68%' },
  chart: {
    backgroundColor: '#0D2239',
    borderRadius: radius.large,
    gap: spacing[12],
    minHeight: 230,
    justifyContent: 'center',
    padding: spacing[4],
  },
  axis: { color: '#93A9BF', fontSize: 12 },
  chartLine: { color: '#66C2FF', fontSize: 30, letterSpacing: 5 },
  drawLine: { color: '#F2A65A', fontSize: 30, letterSpacing: 5 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  metric: {
    backgroundColor: 'white',
    borderRadius: radius.medium,
    minWidth: '47%',
    padding: spacing[12],
  },
  metricValue: {
    color: '#10253F',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 6,
  },
  positive: { color: '#147A55', fontWeight: '800' },
  negative: { color: '#B33A2B', fontWeight: '800' },
  quality: {
    backgroundColor: 'white',
    borderLeftColor: '#4A90C9',
    borderLeftWidth: 3,
    padding: spacing[12],
  },
  choice: {
    backgroundColor: 'white',
    borderColor: '#AFC2D6',
    borderRadius: radius.medium,
    borderWidth: 1,
    minHeight: 72,
    padding: spacing[12],
  },
  disclosure: {
    backgroundColor: '#FFF4D8',
    borderRadius: radius.medium,
    color: '#604812',
    fontSize: 13,
    lineHeight: 19,
    padding: spacing[12],
  },
});
