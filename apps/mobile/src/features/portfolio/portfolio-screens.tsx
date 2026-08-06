import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
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
  environmentNotice,
  portfolios,
  positions,
  transactions,
} from './portfolio-evidence-data';
import { maskFinancialValue } from './portfolio-model';

type ViewName =
  | 'overview'
  | 'provider'
  | 'empty'
  | 'selector'
  | 'create'
  | 'positions'
  | 'position-provider'
  | 'position'
  | 'buy'
  | 'sell'
  | 'validation'
  | 'transactions'
  | 'performance'
  | 'benchmark'
  | 'allocation'
  | 'sector'
  | 'risk'
  | 'risk-empty'
  | 'quality'
  | 'privacy'
  | 'cash'
  | 'dividend'
  | 'conflict';
const enabled = (value: string | string[] | undefined) =>
  __DEV__ && value === '1';

export function PortfolioScreen() {
  const params = useLocalSearchParams<{
    fixture?: string;
    view?: ViewName;
    offline?: string;
  }>();
  const fixture = enabled(params.fixture);
  const view = params.view ?? 'overview';
  const [hidden, setHidden] = useState(view === 'privacy');
  const go = (next: ViewName) =>
    router.replace({
      pathname: '/portfolio-risk',
      params: { fixture: '1', view: next },
    });
  if (params.offline === '1')
    return (
      <Shell id="portfolio-offline">
        <AppHeader
          title="Portföy"
          subtitle="Salt okunur · son hesaplama 31 Tem 18:10"
        />
        <OfflineState />
        <Text style={styles.note}>
          Çevrimdışıyken işlem ve portföy değişikliği yapılmaz.
        </Text>
      </Shell>
    );
  if (!fixture || view === 'provider')
    return (
      <Shell id="portfolio-provider-required">
        <AppHeader title="Portföy" subtitle="Kayıt, izleme ve risk analizi" />
        <ProviderRequiredState />
        <Text style={styles.note}>
          Piyasa değeri ve gerçekleşmemiş kâr/zarar sağlayıcı olmadan
          gösterilmez.
        </Text>
        <Button label="Kayıtlı veriyi incele" onPress={() => go('positions')} />
      </Shell>
    );
  return (
    <Shell id={`portfolio-${view}`}>
      <AppHeader
        title="Portföy ve Risk"
        subtitle="İşlem yürütmez · yatırım tavsiyesi vermez"
      />
      <Badge label={environmentNotice} />
      <PrivacyBand hidden={hidden} onChange={setHidden} />
      {view === 'overview' ? <Overview hidden={hidden} go={go} /> : null}
      {view === 'empty' ? <Empty go={go} /> : null}
      {view === 'selector' ? <Selector go={go} /> : null}
      {view === 'create' || view === 'conflict' ? (
        <PortfolioForm conflict={view === 'conflict'} go={go} />
      ) : null}
      {view === 'positions' || view === 'position-provider' ? (
        <Positions provider={view === 'position-provider'} go={go} />
      ) : null}
      {view === 'position' ? <PositionDetail go={go} /> : null}
      {view === 'buy' ||
      view === 'sell' ||
      view === 'validation' ||
      view === 'cash' ||
      view === 'dividend' ? (
        <TransactionForm kind={view} invalid={view === 'validation'} go={go} />
      ) : null}
      {view === 'transactions' ? <Transactions /> : null}
      {view === 'performance' ? <Performance go={go} /> : null}
      {view === 'benchmark' ? <Benchmark /> : null}
      {view === 'allocation' || view === 'sector' ? (
        <Allocation sector={view === 'sector'} />
      ) : null}
      {view === 'risk' || view === 'risk-empty' ? (
        <Risk unavailable={view === 'risk-empty'} go={go} />
      ) : null}
      {view === 'quality' ? <Quality /> : null}
      {view === 'privacy' ? <PrivacyInfo /> : null}
    </Shell>
  );
}

function Shell({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <ScrollView contentContainerStyle={styles.screen} testID={id}>
      {children}
    </ScrollView>
  );
}
function PrivacyBand({
  hidden,
  onChange,
}: {
  hidden: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.privacy}>
      <View>
        <Text style={styles.eyebrow}>MAHREMİYET ŞERİDİ</Text>
        <Text style={styles.privacyText}>
          {hidden ? 'Finansal değerler gizli' : 'Finansal değerler görünür'}
        </Text>
      </View>
      <Switch
        accessibilityLabel="Portföy değerlerini gizle"
        onValueChange={onChange}
        value={hidden}
      />
    </View>
  );
}
function Metric({
  label,
  value,
  hidden = false,
  status,
}: {
  label: string;
  value: string;
  hidden?: boolean;
  status?: string;
}) {
  const masked = maskFinancialValue(hidden, value);
  return (
    <View
      accessibilityLabel={`${label}: ${masked.accessibility}`}
      style={styles.metric}
    >
      <Text style={styles.eyebrow}>{label}</Text>
      <Text style={styles.metricValue}>{masked.visual}</Text>
      {status ? <Text style={styles.status}>{status}</Text> : null}
    </View>
  );
}
function Overview({
  hidden,
  go,
}: {
  hidden: boolean;
  go: (v: ViewName) => void;
}) {
  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => go('selector')}
        style={styles.selector}
      >
        <View>
          <Text style={styles.eyebrow}>SEÇİLİ PORTFÖY</Text>
          <Text style={styles.heroTitle}>Uzun Vadeli</Text>
        </View>
        <Text>Değiştir ›</Text>
      </Pressable>
      <Card>
        <Text style={styles.eyebrow}>
          31 TEM 2026 · 18:10 · GECİKMELİ TEST VERİSİ
        </Text>
        <Text
          accessibilityLabel={
            maskFinancialValue(hidden, '₺146.820,40').accessibility
          }
          style={styles.heroValue}
        >
          {maskFinancialValue(hidden, '₺146.820,40').visual}
        </Text>
        <Text style={styles.positive}>
          Toplam kâr/zarar +₺12.480,20 · +%9,29
        </Text>
      </Card>
      <View style={styles.grid}>
        <Metric hidden={hidden} label="NET YATIRILAN" value="₺134.340,20" />
        <Metric hidden={hidden} label="NAKİT" value="₺18.620,00" />
        <Metric hidden={hidden} label="GERÇEKLEŞMİŞ" value="+₺7.088,20" />
        <Metric hidden={hidden} label="GERÇEKLEŞMEMİŞ" value="+₺5.392,00" />
      </View>
      <Section title="Analiz defteri">
        <Action label="Pozisyonlar" onPress={() => go('positions')} />
        <Action label="Performans" onPress={() => go('performance')} />
        <Action label="Dağılım" onPress={() => go('allocation')} />
        <Action label="Risk özeti" onPress={() => go('risk')} />
        <Action label="Veri kalitesi" onPress={() => go('quality')} />
      </Section>
      <Section title="Kayıt ekle">
        <Action label="Alış kaydı ekle" onPress={() => go('buy')} />
        <Action label="Satış kaydı ekle" onPress={() => go('sell')} />
        <Action label="Nakit hareketi ekle" onPress={() => go('cash')} />
        <Action label="Temettü kaydı ekle" onPress={() => go('dividend')} />
      </Section>
      <Text style={styles.method}>
        Methodology v3 · Nakit akışları getiri değildir · Broker/emir iletimi
        yoktur.
      </Text>
    </>
  );
}
function Empty({ go }: { go: (v: ViewName) => void }) {
  return (
    <Card>
      <Text style={styles.heroTitle}>Henüz portföy yok</Text>
      <Text style={styles.note}>
        İşlemlerini kaydetmek ve veri mevcut olduğunda risk görünümünü kullanmak
        için bir analiz portföyü oluştur.
      </Text>
      <Button label="Portföy oluştur" onPress={() => go('create')} />
    </Card>
  );
}
function Selector({ go }: { go: (v: ViewName) => void }) {
  return (
    <>
      <Text style={styles.sectionTitle}>Portföy seç</Text>
      {portfolios.map((p) => (
        <Pressable
          accessibilityRole="button"
          key={p.id}
          onPress={() => go('overview')}
          style={styles.row}
        >
          <View>
            <Text style={styles.rowTitle}>{p.name}</Text>
            <Text>
              {p.currency} · {p.positions} pozisyon
            </Text>
          </View>
          {p.demo ? <Badge label="DEMO" /> : <Text>Varsayılan</Text>}
        </Pressable>
      ))}
      <Button label="Yeni portföy" onPress={() => go('create')} />
    </>
  );
}
function PortfolioForm({
  conflict,
  go,
}: {
  conflict: boolean;
  go: (v: ViewName) => void;
}) {
  return (
    <>
      <Text style={styles.sectionTitle}>Portföy oluştur</Text>
      {conflict ? (
        <Card>
          <Text accessibilityRole="alert" style={styles.danger}>
            PORTFOLIO_VERSION_CONFLICT
          </Text>
          <Text>
            Başka bir değişiklik kaydedildi. Son veriyi yükleyip yeniden
            deneyin.
          </Text>
        </Card>
      ) : null}
      <Field label="Portföy adı" value="Uzun Vadeli" />
      <Field label="Açıklama" value="BIST kayıt ve risk analizi" />
      <Field label="Baz para birimi" value="TRY" />
      <Field
        label="Varsayılan benchmark"
        value="BIST 100 · PROVIDER_REQUIRED"
      />
      <Button label="Portföyü kaydet" onPress={() => go('overview')} />
    </>
  );
}
function Positions({
  provider,
  go,
}: {
  provider: boolean;
  go: (v: ViewName) => void;
}) {
  return (
    <>
      <Text style={styles.sectionTitle}>Pozisyonlar · cursor page 1/2</Text>
      {positions.map((p) => (
        <Pressable
          accessibilityRole="button"
          key={p.id}
          onPress={() => go('position')}
          style={styles.row}
        >
          <View>
            <Text style={styles.rowTitle}>{p.symbol}</Text>
            <Text style={styles.note}>
              {p.company} · {p.quantity} adet · Ort. ₺{p.averageCost}
            </Text>
          </View>
          {provider ? (
            <Badge label="PROVIDER_REQUIRED" />
          ) : (
            <View>
              <Text
                style={p.pnl.startsWith('+') ? styles.positive : styles.danger}
              >
                {p.pnl}
              </Text>
              <Text>{p.weight}</Text>
            </View>
          )}
        </Pressable>
      ))}
      <Text style={styles.method}>
        Stable sort: symbol + instrumentId · duplicate/missing position: 0
      </Text>
    </>
  );
}
function PositionDetail({ go }: { go: (v: ViewName) => void }) {
  return (
    <>
      <Text style={styles.heroTitle}>THYAO</Text>
      <Text>Türk Hava Yolları · 120 adet</Text>
      <View style={styles.grid}>
        <Metric label="ORT. MALİYET" value="₺281,40" />
        <Metric label="TOPLAM MALİYET" value="₺33.768,00" />
        <Metric label="GERÇEKLEŞMİŞ" value="+₺2.180,00" />
        <Metric label="AĞIRLIK" value="%31,2" />
      </View>
      <Card>
        <Text style={styles.eyebrow}>CORPORATE ACTION</Text>
        <Text>Provider eksik · manual review required</Text>
      </Card>
      <Button label="Alış kaydı ekle" onPress={() => go('buy')} />
      <Button label="Satış kaydı ekle" onPress={() => go('sell')} />
      <Button
        label="Sembol detayını aç"
        onPress={() => router.push('/symbol/THYAO?fixture=1')}
      />
    </>
  );
}
function Field({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={styles.input}
        value={value}
      />
    </View>
  );
}
function TransactionForm({
  kind,
  invalid,
  go,
}: {
  kind: ViewName;
  invalid: boolean;
  go: (v: ViewName) => void;
}) {
  const title =
    kind === 'sell'
      ? 'Satış kaydı ekle'
      : kind === 'cash'
        ? 'Nakit hareketi ekle'
        : kind === 'dividend'
          ? 'Temettü kaydı ekle'
          : 'Alış kaydı ekle';
  return (
    <>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Card>
        <Text style={styles.note}>
          Bu işlem piyasaya iletilmez; yalnız muhasebe ve analiz kaydı
          oluşturur.
        </Text>
      </Card>
      {kind !== 'cash' ? <Field label="Sembol" value="THYAO" /> : null}
      <Field
        label={kind === 'cash' || kind === 'dividend' ? 'Tutar' : 'Miktar'}
        value={invalid ? '0' : kind === 'cash' ? '25000,00' : '10'}
      />
      {kind === 'buy' || kind === 'sell' ? (
        <Field label="Birim fiyat" value="281,40" />
      ) : null}
      <Field label="İşlem tarihi" value="31.07.2026" />
      {invalid ? (
        <Text accessibilityRole="alert" style={styles.danger}>
          Miktar sıfırdan büyük olmalıdır · TRANSACTION_BOUNDS
        </Text>
      ) : null}
      <Button
        label="Kaydı oluştur"
        onPress={() => go(invalid ? 'validation' : 'transactions')}
      />
    </>
  );
}
function Transactions() {
  return (
    <>
      <Text style={styles.sectionTitle}>İşlem geçmişi</Text>
      {transactions.map((t) => (
        <View key={t.id} style={styles.row}>
          <View>
            <Text style={styles.rowTitle}>{t.label}</Text>
            <Text>{t.amount}</Text>
          </View>
          <Badge label={t.status.toUpperCase()} />
        </View>
      ))}
      <Text style={styles.method}>
        Posted kayıtlar doğrudan silinmez; correction/reversal audit izi
        korunur.
      </Text>
    </>
  );
}
function Performance({ go }: { go: (v: ViewName) => void }) {
  return (
    <>
      <Text style={styles.sectionTitle}>Performans</Text>
      <View
        accessibilityLabel="Portföy performans grafiği: 1 ay, yüzde 3,8 artış"
        style={styles.chart}
      >
        <Text style={styles.chartLine}>╱╲__╱╲___╱╲╱╲</Text>
        <Text>Portföy değeri · Net yatırılan sermaye</Text>
      </View>
      <View style={styles.actions}>
        {['1A', '3A', 'YTD', '1Y'].map((x) => (
          <Badge key={x} label={x} />
        ))}
      </View>
      <Card>
        <Text>Nakit yatırma ve çekme performans kazancı/kaybı sayılmaz.</Text>
      </Card>
      <Button
        label="Benchmark karşılaştırması"
        onPress={() => go('benchmark')}
      />
    </>
  );
}
function Benchmark() {
  return (
    <>
      <Text style={styles.sectionTitle}>Benchmark karşılaştırması</Text>
      <ProviderRequiredState />
      <Badge label="BENCHMARK_UNAVAILABLE" />
      <Text style={styles.note}>
        BIST 100 serisi uydurulmaz. Aynı dönem, baz tarih, takvim ve para birimi
        doğrulanmadan kıyaslama yapılmaz.
      </Text>
    </>
  );
}
function Allocation({ sector }: { sector: boolean }) {
  const rows: readonly (readonly [string, string])[] = sector
    ? [
        ['Ulaştırma', '%31,2'],
        ['Savunma', '%22,8'],
        ['Enerji', '%18,4'],
        ['Sınıflandırılmamış', '%27,6'],
      ]
    : [
        ['THYAO', '%31,2'],
        ['ASELS', '%22,8'],
        ['TUPRS', '%18,4'],
        ['Nakit', '%12,7'],
      ];
  return (
    <>
      <Text style={styles.sectionTitle}>
        {sector ? 'Sektör dağılımı' : 'Varlık dağılımı'}
      </Text>
      <View
        accessibilityLabel={`${sector ? 'Sektör' : 'Varlık'} dağılımı erişilebilir özeti`}
      >
        <Card>
          {rows.map(([name, value], i) => (
            <View key={name} style={styles.allocation}>
              <Text>
                {i + 1}. {name}
              </Text>
              <Text style={styles.rowTitle}>{value}</Text>
            </View>
          ))}
        </Card>
      </View>
      {sector ? (
        <Badge label="PARTIAL · 1 UNCLASSIFIED" />
      ) : (
        <Badge label="COST_BASED_ALLOCATION" />
      )}
    </>
  );
}
function Risk({
  unavailable,
  go,
}: {
  unavailable: boolean;
  go: (v: ViewName) => void;
}) {
  return (
    <>
      <Text style={styles.sectionTitle}>Risk özeti</Text>
      <View style={styles.grid}>
        <Metric
          label="EN BÜYÜK POZİSYON"
          value="%31,2"
          status="Methodology threshold"
        />
        <Metric label="TOP 3 AĞIRLIK" value="%72,4" />
        <Metric
          label="VOLATİLİTE"
          value={unavailable ? '—' : '%18,6'}
          status={unavailable ? 'NOT_EVALUABLE' : '252 gözlem'}
        />
        <Metric
          label="MAX DRAWDOWN"
          value={unavailable ? '—' : '−%12,4'}
          status={unavailable ? 'NOT_EVALUABLE' : 'Peak → trough'}
        />
        <Metric label="BETA" value="—" status="BENCHMARK_REQUIRED" />
        <Metric label="VaR" value="—" status="CAPABILITY_UNAVAILABLE" />
      </View>
      <Text style={styles.method}>
        Risk metrikleri kaybı garanti etmez ve yatırım tavsiyesi değildir.
      </Text>
      <Button label="Veri kalitesini incele" onPress={() => go('quality')} />
    </>
  );
}
function Quality() {
  const issues: readonly (readonly [string, string, string])[] = [
    ['Eksik piyasa değerleri', '3', 'Provider bağlantısını bekle'],
    ['Eksik maliyet bilgisi', '1', 'İşlem kaydını gözden geçir'],
    ['Sınıflandırılmamış araç', '1', 'Sembol eşleşmesini kontrol et'],
    ['Corporate action pending', '1', 'Manuel inceleme gerekli'],
  ];
  return (
    <>
      <Text style={styles.sectionTitle}>Veri kalitesi</Text>
      {issues.map(([name, count, action]) => (
        <Card key={name}>
          <View style={styles.rowBetween}>
            <Text style={styles.rowTitle}>{name}</Text>
            <Badge label={count} />
          </View>
          <Text>{action}</Text>
        </Card>
      ))}
    </>
  );
}
function PrivacyInfo() {
  return (
    <Card>
      <Text style={styles.sectionTitle}>Bakiyeler gizli</Text>
      <Text accessibilityLabel="Finansal değer gizli">
        Ekran okuyucu gerçek tutarı okumaz. Telemetry ve paylaşım payload’ına
        portföy değeri eklenmez.
      </Text>
    </Card>
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
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.actions}>{children}</View>
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
    </Pressable>
  );
}

const colors = {
  navy: '#07182B',
  blue: '#176BCE',
  cyan: '#47C7D4',
  ink: '#102238',
  muted: '#617083',
  line: '#D6E1EC',
  surface: '#F7FAFD',
  good: '#087A55',
  bad: '#B4233B',
};
const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.surface,
    gap: spacing[16],
    minHeight: '100%',
    padding: spacing[24],
    paddingBottom: 120,
  },
  privacy: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: radius.large,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing[16],
  },
  privacyText: { color: 'white', fontSize: 15, fontWeight: '700' },
  eyebrow: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  selector: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: touchTargets.minimum,
    paddingVertical: spacing[8],
  },
  heroTitle: { color: colors.ink, fontSize: 23, fontWeight: '800' },
  heroValue: {
    color: colors.navy,
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1,
  },
  positive: { color: colors.good, fontWeight: '800' },
  danger: { color: colors.bad, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] },
  metric: {
    backgroundColor: 'white',
    borderColor: colors.line,
    borderRadius: radius.medium,
    borderWidth: 1,
    minHeight: 92,
    padding: spacing[16],
    width: '48%',
  },
  metricValue: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
    marginTop: spacing[4],
  },
  status: { color: colors.muted, fontSize: 11, marginTop: spacing[4] },
  sectionTitle: {
    color: colors.navy,
    fontSize: 19,
    fontWeight: '800',
    marginTop: spacing[8],
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] },
  action: {
    alignItems: 'center',
    backgroundColor: '#E5F0FC',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: touchTargets.minimum,
    paddingHorizontal: spacing[16],
  },
  actionText: { color: colors.blue, fontWeight: '700' },
  method: {
    borderLeftColor: colors.cyan,
    borderLeftWidth: 3,
    color: colors.muted,
    lineHeight: 20,
    paddingLeft: spacing[8],
  },
  note: { color: colors.muted, lineHeight: 20 },
  row: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 72,
    padding: spacing[16],
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  label: { color: colors.ink, fontWeight: '700', marginBottom: spacing[4] },
  input: {
    backgroundColor: 'white',
    borderColor: colors.line,
    borderRadius: radius.medium,
    borderWidth: 1,
    minHeight: touchTargets.minimum,
    paddingHorizontal: spacing[16],
  },
  chart: {
    backgroundColor: colors.navy,
    borderRadius: radius.large,
    minHeight: 190,
    padding: spacing[24],
  },
  chartLine: {
    color: colors.cyan,
    fontSize: 33,
    letterSpacing: 2,
    marginVertical: spacing[32],
  },
  allocation: {
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[16],
  },
});
