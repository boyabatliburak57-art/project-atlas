import { useMemo, useState } from 'react';
import { Link, router, useLocalSearchParams } from 'expo-router';
import {
  FlatList,
  PanResponder,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  chartColors,
  lightTheme,
  radius,
  spacing,
  touchTargets,
} from '@atlas/design-tokens';
import { formatPercent, formatTry } from '@atlas/financial-formatting';
import {
  AppHeader,
  Badge,
  Card,
  ChartAccessibilitySummary,
  DataFreshnessBadge,
  DemoBadge,
  FinancialChange,
  ProviderRequiredState,
} from '@atlas/mobile-ui';
import {
  chartSeries,
  dataDisclosure,
  symbolItems,
} from './market-evidence-data';
import {
  breadthPercent,
  canSearch,
  normalizeSearchQuery,
  safeSharePayload,
  summarizeChart,
  supportedTimeframes,
  validateIndicators,
  type IndicatorSelection,
  type OhlcvPoint,
  type Timeframe,
} from './market-model';

function evidenceEnabled(value: string | string[] | undefined) {
  return __DEV__ && value === '1';
}

function Screen({
  children,
  testID,
}: {
  children: React.ReactNode;
  testID: string;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      refreshControl={undefined}
      testID={testID}
    >
      {children}
    </ScrollView>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function DeferredFeature({ title, task }: { title: string; task: string }) {
  return (
    <Card>
      <Text style={styles.cardTitle}>{title}</Text>
      <Badge label={`NOT_IMPLEMENTED · ${task}`} />
    </Card>
  );
}

export function MarketOverviewScreen() {
  const parameters = useLocalSearchParams<{
    fixture?: string;
    state?: string;
  }>();
  const fixture = evidenceEnabled(parameters.fixture);
  if (!fixture)
    return (
      <Screen testID="market-overview-provider-required">
        <AppHeader title="Piyasa Özeti" subtitle="BIST · Sağlayıcı kontrollü" />
        <ProviderRequiredState />
        <DataFreshnessBadge status="unavailable" />
        <DeferredFeature title="İzleme listesi özeti" task="TASK-100F" />
        <DeferredFeature title="Aktif alarmlar" task="TASK-100F" />
        <DeferredFeature title="Portföy özeti" task="TASK-100G" />
      </Screen>
    );
  const partial = parameters.state === 'partial';
  return (
    <Screen testID="market-overview">
      <AppHeader title="Piyasa Özeti" subtitle="BIST · Europe/Istanbul" />
      <DemoBadge />
      <DataFreshnessBadge
        status={partial ? 'partial' : 'demo'}
        timestamp="31 Tem 2026 · 18:10"
      />
      <Card>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.eyebrow}>PİYASA DURUMU</Text>
            <Text style={styles.cardTitle}>Kapalı</Text>
          </View>
          <Badge label="MARKET_CLOSED" />
        </View>
        <Text style={styles.muted}>
          Son seans 18:10 · Sonraki seans sağlayıcı takvimine bağlı
        </Text>
      </Card>
      <Card>
        <Text style={styles.eyebrow}>ANA ENDEKS</Text>
        <Text style={styles.heroNumber}>10.742,30</Text>
        <FinancialChange value={0.0126} />
        <MiniLine points={chartSeries.slice(-18)} />
        <Text style={styles.muted}>
          Açılış 10.621 · Yüksek 10.781 · Düşük 10.588
        </Text>
      </Card>
      <SectionTitle>Piyasa genişliği</SectionTitle>
      <Breadth advancing={317} unchanged={42} declining={181} excluded={23} />
      <SectionTitle>Öne çıkanlar</SectionTitle>
      <MoverList items={symbolItems} />
      <SectionTitle>Sektör performansı</SectionTitle>
      <Sector name="Teknoloji" value={0.0214} width="86%" />
      <Sector name="Ulaştırma" value={0.0108} width="64%" />
      <Sector name="Banka" value={-0.0061} width="35%" />
      {partial ? <Badge label="PARTIAL · 2 SECTION UNAVAILABLE" /> : null}
      <DeferredFeature title="İzleme listesi ve alarmlar" task="TASK-100F" />
      <DeferredFeature title="Portföy riski" task="TASK-100G" />
      <Card>
        <Text style={styles.cardTitle}>Metodoloji</Text>
        <Text style={styles.muted}>
          Genişlik yalnız değerlendirilebilir BIST evreni üzerinden hesaplanır.
          Eksik veri düşüş olarak sayılmaz. Bu ekran yatırım tavsiyesi değildir.
        </Text>
      </Card>
    </Screen>
  );
}

export function MarketsScreen() {
  const parameters = useLocalSearchParams<{ fixture?: string; tab?: string }>();
  const initialTab = ['Overview', 'Indices', 'Sectors', 'Movers'].includes(
    parameters.tab ?? '',
  )
    ? (parameters.tab as 'Overview' | 'Indices' | 'Sectors' | 'Movers')
    : 'Overview';
  const [tab, setTab] = useState<'Overview' | 'Indices' | 'Sectors' | 'Movers'>(
    initialTab,
  );
  const fixture = evidenceEnabled(parameters.fixture);
  return (
    <Screen testID="markets-screen">
      <AppHeader title="Piyasalar" subtitle="Filtrele · Sırala · Metodoloji" />
      <View accessibilityRole="tablist" style={styles.tabs}>
        {(['Overview', 'Indices', 'Sectors', 'Movers'] as const).map((item) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === item }}
            key={item}
            onPress={() => setTab(item)}
            style={[styles.tab, tab === item && styles.tabActive]}
            testID={`markets-tab-${item.toLowerCase()}`}
          >
            <Text style={tab === item ? styles.tabTextActive : styles.tabText}>
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
      {!fixture ? <ProviderRequiredState /> : null}
      {fixture ? <DemoBadge /> : null}
      {fixture && tab === 'Overview' ? (
        <Breadth advancing={317} unchanged={42} declining={181} excluded={23} />
      ) : null}
      {fixture && tab === 'Indices' ? (
        <>
          <IndexRow name="BIST 100" value="10.742,30" change={0.0126} />
          <IndexRow name="BIST 30" value="11.631,72" change={0.0091} />
          <IndexRow name="BIST Banka" value="15.208,11" change={-0.0061} />
        </>
      ) : null}
      {fixture && tab === 'Sectors' ? (
        <Card>
          <Sector name="Teknoloji" value={0.0214} width="86%" />
          <Sector name="Ulaştırma" value={0.0108} width="64%" />
          <Sector name="Banka" value={-0.0061} width="35%" />
        </Card>
      ) : null}
      {fixture && tab === 'Movers' ? <MoverList items={symbolItems} /> : null}
    </Screen>
  );
}

export function GlobalSearchScreen() {
  const parameters = useLocalSearchParams<{
    fixture?: string;
    q?: string;
    state?: string;
  }>();
  const fixture = evidenceEnabled(parameters.fixture);
  const [query, setQuery] = useState(parameters.q ?? '');
  const normalized = normalizeSearchQuery(query);
  const results =
    fixture && canSearch(normalized)
      ? symbolItems.filter((item) =>
          `${item.symbol} ${item.company}`
            .toLocaleLowerCase('tr-TR')
            .includes(normalized.toLocaleLowerCase('tr-TR')),
        )
      : [];
  return (
    <View style={styles.searchScreen} testID="global-search">
      <AppHeader title="Ara" subtitle="Sembol, şirket, endeks veya sektör" />
      <View style={styles.searchBox}>
        <TextInput
          accessibilityLabel="Global sembol araması"
          autoCapitalize="characters"
          onChangeText={setQuery}
          placeholder="Örn. THYAO veya Türk Hava"
          style={styles.searchInput}
          testID="symbol-search-input"
          value={query}
        />
        {query ? (
          <Pressable
            accessibilityLabel="Aramayı temizle"
            accessibilityRole="button"
            onPress={() => setQuery('')}
            style={styles.clear}
          >
            <Text>Temizle</Text>
          </Pressable>
        ) : null}
      </View>
      {!fixture ? <ProviderRequiredState /> : <DemoBadge />}
      {fixture && !canSearch(normalized) ? (
        <Text style={styles.muted}>Aramak için en az 2 karakter girin.</Text>
      ) : null}
      {fixture && canSearch(normalized) && results.length === 0 ? (
        <Text accessibilityRole="alert">Sonuç bulunamadı.</Text>
      ) : null}
      <FlatList
        data={results}
        keyExtractor={(item) => item.symbol}
        renderItem={({ item }) => (
          <Pressable
            accessibilityHint="Sembol detayını açar"
            accessibilityLabel={`${item.symbol}, ${item.company}, ${item.sector}`}
            accessibilityRole="button"
            onPress={() => router.push(`/symbol/${item.symbol}?fixture=1`)}
            style={styles.result}
            testID={`search-result-${item.symbol}`}
          >
            <View>
              <Text style={styles.cardTitle}>{item.symbol}</Text>
              <Text style={styles.muted}>
                {item.company} · {item.sector}
              </Text>
            </View>
            <Text>›</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

export function SymbolDetailScreen() {
  const parameters = useLocalSearchParams<{
    symbol?: string;
    fixture?: string;
    tab?: string;
  }>();
  const symbol =
    typeof parameters.symbol === 'string'
      ? parameters.symbol.toUpperCase()
      : '—';
  const fixture = evidenceEnabled(parameters.fixture);
  const initialTab = [
    'Overview',
    'Financials',
    'Patterns',
    'Insights',
    'Company',
  ].includes(parameters.tab ?? '')
    ? (parameters.tab as
        | 'Overview'
        | 'Financials'
        | 'Patterns'
        | 'Insights'
        | 'Company')
    : 'Overview';
  const [tab, setTab] = useState<
    'Overview' | 'Financials' | 'Patterns' | 'Insights' | 'Company'
  >(initialTab);
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const [indicators, setIndicators] = useState<readonly IndicatorSelection[]>(
    [],
  );
  if (!fixture)
    return (
      <Screen testID="symbol-provider-required">
        <AppHeader title={symbol} subtitle="Sembol detayı" />
        <ProviderRequiredState />
      </Screen>
    );
  const company =
    symbolItems.find((item) => item.symbol === symbol)?.company ??
    'BIST Enstrümanı';
  const share = () =>
    Share.share({
      message: safeSharePayload({
        symbol,
        company,
        deepLink: `atlas://symbol/${symbol}`,
      }),
    });
  return (
    <Screen testID="symbol-detail">
      <Pressable
        accessibilityRole="button"
        onPress={() => router.back()}
        style={styles.back}
      >
        <Text>‹ Geri</Text>
      </Pressable>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.symbol}>{symbol}</Text>
          <Text style={styles.muted}>{company} · BIST</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => void share()}
          style={styles.back}
        >
          <Text>Paylaş</Text>
        </Pressable>
      </View>
      <DemoBadge />
      <DataFreshnessBadge status="demo" timestamp="31 Tem 2026 · 18:10" />
      <Text style={styles.heroNumber}>{formatTry(312.5)}</Text>
      <FinancialChange value={0.0184} />
      <NativeFinancialChart points={chartSeries} timeframe={timeframe} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pills}
      >
        {supportedTimeframes.map((item) => (
          <Pill
            key={item}
            label={item}
            selected={timeframe === item}
            onPress={() => setTimeframe(item)}
          />
        ))}
      </ScrollView>
      <Card>
        <Text style={styles.cardTitle}>İndikatörler</Text>
        <View style={styles.pills}>
          {(['SMA', 'EMA', 'BOLLINGER', 'RSI', 'MACD', 'VOLUME'] as const).map(
            (code) => (
              <Pill
                key={code}
                label={code}
                selected={indicators.some((item) => item.code === code)}
                onPress={() =>
                  setIndicators((current) =>
                    validateIndicators(
                      current.some((item) => item.code === code)
                        ? current.filter((item) => item.code !== code)
                        : [
                            ...current,
                            ...(['SMA', 'EMA', 'BOLLINGER', 'RSI'].includes(
                              code,
                            )
                              ? [{ code, period: 14 }]
                              : [{ code }]),
                          ],
                    ),
                  )
                }
              />
            ),
          )}
        </View>
        <Text style={styles.muted}>
          Backend authoritative · En fazla 6 · Yetersiz veri sıfır gösterilmez.
        </Text>
      </Card>
      <View accessibilityRole="tablist" style={styles.tabs}>
        {(
          ['Overview', 'Financials', 'Patterns', 'Insights', 'Company'] as const
        ).map((item) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === item }}
            key={item}
            onPress={() => setTab(item)}
            style={[styles.tab, tab === item && styles.tabActive]}
          >
            <Text style={tab === item ? styles.tabTextActive : styles.tabText}>
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
      {tab === 'Overview' ? <Overview /> : null}
      {tab === 'Financials' ? <Fundamentals /> : null}
      {tab === 'Patterns' ? <Patterns /> : null}
      {tab === 'Insights' ? <Insights /> : null}
      {tab === 'Company' ? <Company symbol={symbol} company={company} /> : null}
      <DeferredFeature
        title="İzleme listesine ekle / Alarm oluştur"
        task="TASK-100F"
      />
    </Screen>
  );
}

function NativeFinancialChart({
  points,
  timeframe,
}: {
  points: readonly OhlcvPoint[];
  timeframe: Timeframe;
}) {
  const summary = useMemo(() => summarizeChart(points), [points]);
  const [selected, setSelected] = useState(points.length - 1);
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gesture) =>
          setSelected(
            Math.max(
              0,
              Math.min(
                points.length - 1,
                Math.round((gesture.moveX / 360) * points.length),
              ),
            ),
          ),
      }),
    [points.length],
  );
  if (!summary) return <ProviderRequiredState />;
  const range = Math.max(1, summary.highest - summary.lowest);
  const point = points[selected]!;
  return (
    <Card>
      <View style={styles.rowBetween}>
        <Text style={styles.cardTitle}>Fiyat grafiği · {timeframe}</Text>
        <Badge label="RAW" />
      </View>
      <View
        accessibilityLabel="Mum grafik etkileşim alanı"
        style={styles.chart}
        {...responder.panHandlers}
      >
        {points.map((bar, index) => {
          const x = (index / points.length) * 320;
          const high = ((summary.highest - bar.high) / range) * 130;
          const bodyTop =
            ((summary.highest - Math.max(bar.open, bar.close)) / range) * 130;
          const bodyHeight = Math.max(
            3,
            (Math.abs(bar.close - bar.open) / range) * 130,
          );
          const color =
            bar.close >= bar.open ? chartColors.positive : chartColors.negative;
          return (
            <View key={bar.time} style={[styles.candleSlot, { left: x }]}>
              <View
                style={[
                  styles.wick,
                  {
                    backgroundColor: color,
                    top: high,
                    height: Math.max(4, ((bar.high - bar.low) / range) * 130),
                  },
                ]}
              />
              <View
                style={[
                  styles.body,
                  { backgroundColor: color, top: bodyTop, height: bodyHeight },
                ]}
              />
              <View
                style={[
                  styles.volume,
                  { height: Math.max(3, bar.volume / 35000) },
                ]}
              />
            </View>
          );
        })}
        <View
          style={[
            styles.crosshair,
            { left: `${(selected / points.length) * 100}%` },
          ]}
        />
      </View>
      <Text style={styles.tooltip}>
        {new Date(point.time).toLocaleDateString('tr-TR')} · A{' '}
        {point.open.toFixed(2)} · Y {point.high.toFixed(2)} · D{' '}
        {point.low.toFixed(2)} · K {point.close.toFixed(2)} · H{' '}
        {point.volume.toLocaleString('tr-TR')}
      </Text>
      <View style={styles.pills}>
        <Pill
          label="Önceki veri noktası"
          onPress={() => setSelected((value) => Math.max(0, value - 1))}
        />
        <Pill
          label="Sonraki veri noktası"
          onPress={() =>
            setSelected((value) => Math.min(points.length - 1, value + 1))
          }
        />
      </View>
      <ChartAccessibilitySummary
        summary={`${points.length} veri noktası. İlk ${summary.first.toFixed(2)}, son ${summary.last.toFixed(2)}, değişim yüzde ${summary.changePercent.toFixed(2)}, en yüksek ${summary.highest.toFixed(2)}, en düşük ${summary.lowest.toFixed(2)}. ${dataDisclosure}`}
      />
    </Card>
  );
}

function Breadth({
  advancing,
  unchanged,
  declining,
  excluded,
}: {
  advancing: number;
  unchanged: number;
  declining: number;
  excluded: number;
}) {
  const percent = breadthPercent(advancing, unchanged, declining);
  return (
    <View testID="market-breadth-evidence">
      <Card>
        <Text style={styles.cardTitle}>
          Değerlendirilen {advancing + unchanged + declining}
        </Text>
        <Text>
          ▲ Yükselen {advancing} · — Değişmeyen {unchanged} · ▼ Düşen{' '}
          {declining}
        </Text>
        <Text style={styles.muted}>
          Değerlendirilemeyen {excluded} · Yükselen oranı{' '}
          {formatPercent(percent)}
        </Text>
      </Card>
    </View>
  );
}
function MoverList({
  items,
}: {
  items: readonly (typeof symbolItems)[number][];
}) {
  return (
    <Card>
      {items.map((item) => (
        <Link
          asChild
          href={{
            pathname: '/symbol/[symbol]',
            params: { fixture: '1', symbol: item.symbol },
          }}
          key={item.symbol}
        >
          <Pressable
            accessibilityLabel={`Mover ${item.symbol}`}
            accessibilityRole="button"
            style={styles.result}
            testID={`mover-${item.symbol}`}
          >
            <View>
              <Text style={styles.cardTitle}>{item.symbol}</Text>
              <Text style={styles.muted}>{item.company}</Text>
            </View>
            <FinancialChange value={item.change} />
          </Pressable>
        </Link>
      ))}
    </Card>
  );
}
function Sector({
  name,
  value,
  width,
}: {
  name: string;
  value: number;
  width: `${number}%`;
}) {
  return (
    <View style={styles.sector}>
      <View style={styles.rowBetween}>
        <Text>{name}</Text>
        <FinancialChange value={value} />
      </View>
      <View style={[styles.sectorBar, { width }]} />
    </View>
  );
}
function IndexRow({
  name,
  value,
  change,
}: {
  name: string;
  value: string;
  change: number;
}) {
  return (
    <Card>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.cardTitle}>{name}</Text>
          <Text style={styles.heroSmall}>{value}</Text>
        </View>
        <FinancialChange value={change} />
      </View>
      <DataFreshnessBadge status="demo" />
    </Card>
  );
}
function MiniLine({ points }: { points: readonly OhlcvPoint[] }) {
  const min = Math.min(...points.map((p) => p.close));
  const max = Math.max(...points.map((p) => p.close));
  return (
    <View style={styles.mini}>
      {points.map((point) => (
        <View
          key={point.time}
          style={[
            styles.miniBar,
            { height: 8 + ((point.close - min) / Math.max(1, max - min)) * 42 },
          ]}
        />
      ))}
    </View>
  );
}
function Pill({
  label,
  selected = false,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.pill, selected && styles.pillActive]}
    >
      <Text style={selected ? styles.tabTextActive : styles.tabText}>
        {label}
      </Text>
    </Pressable>
  );
}
function Overview() {
  return (
    <Card>
      <Text style={styles.cardTitle}>Temel göstergeler</Text>
      <Text>Açılış 307,40 · Yüksek 315,80 · Düşük 305,20</Text>
      <Text>Önceki kapanış 306,85 · Hacim 5.412.300</Text>
      <Text style={styles.muted}>
        Piyasa değeri, F/K ve temettü verileri capability-aware gösterilir.
      </Text>
    </Card>
  );
}
function Fundamentals() {
  return (
    <View testID="fundamentals-evidence">
      <Card>
        <Text style={styles.cardTitle}>Finansallar</Text>
        <Badge label={dataDisclosure} />
        <Text>Gelir · 2026/06 · TRY milyon · Yayın 30 Tem 2026</Text>
        <Text>Net kâr · Revizyon yok · availableAt 31 Tem 2026</Text>
        <Text style={styles.muted}>
          Production’da fundamentals provider yoksa PROVIDER_REQUIRED
          gösterilir.
        </Text>
      </Card>
    </View>
  );
}
function Patterns() {
  return (
    <View testID="patterns-evidence">
      <Card>
        <Text style={styles.cardTitle}>Teknik formasyonlar</Text>
        <Badge label="CANDIDATE · NOT_EVALUABLE" />
        <Text>Yükselen kanal adayı · Tespit 30 Tem 2026</Text>
        <Text style={styles.muted}>
          No-look-ahead: sonuç yalnız data cutoff öncesindeki bilgilerle
          değerlendirilir. Yatırım tavsiyesi değildir.
        </Text>
      </Card>
    </View>
  );
}
function Insights() {
  return (
    <View testID="insights-evidence">
      <Card>
        <Text style={styles.cardTitle}>Araştırma ve metodoloji</Text>
        <Text>Kaynaklı içerik bulunmuyor.</Text>
        <Text style={styles.muted}>
          Sahte haber, AI önerisi veya kaynaksız yorum üretilmez.
        </Text>
      </Card>
    </View>
  );
}
function Company({ symbol, company }: { symbol: string; company: string }) {
  return (
    <View testID="company-evidence">
      <Card>
        <Text style={styles.cardTitle}>{company}</Text>
        <Text>{symbol} · BIST · Aktif enstrüman</Text>
        <Text>
          Sektör ve endeks üyelikleri provider metadata’sına bağlıdır.
        </Text>
        <Text style={styles.muted}>
          Kaynak: Instrument Master · Son güncelleme 31 Tem 2026
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  back: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: touchTargets.minimum,
    paddingHorizontal: spacing[8],
  },
  body: { position: 'absolute', width: 6 },
  candleSlot: { bottom: 24, position: 'absolute', top: 0, width: 7 },
  cardTitle: { color: lightTheme.textPrimary, fontSize: 17, fontWeight: '700' },
  chart: {
    backgroundColor: '#F4F7FB',
    borderRadius: radius.medium,
    height: 190,
    overflow: 'hidden',
    position: 'relative',
  },
  clear: {
    justifyContent: 'center',
    minHeight: touchTargets.minimum,
    paddingHorizontal: spacing[8],
  },
  crosshair: {
    backgroundColor: lightTheme.primary,
    height: '100%',
    opacity: 0.35,
    position: 'absolute',
    top: 0,
    width: 1,
  },
  eyebrow: {
    color: lightTheme.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  heroNumber: {
    color: lightTheme.textPrimary,
    fontSize: 30,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  heroSmall: { fontSize: 20, fontVariant: ['tabular-nums'], fontWeight: '700' },
  mini: { alignItems: 'flex-end', flexDirection: 'row', gap: 3, height: 54 },
  miniBar: { backgroundColor: chartColors.primary, borderRadius: 2, flex: 1 },
  muted: { color: lightTheme.textSecondary, fontSize: 13, lineHeight: 19 },
  pill: {
    borderColor: lightTheme.border,
    borderRadius: radius.full,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: touchTargets.minimum,
    paddingHorizontal: spacing[12],
  },
  pillActive: { backgroundColor: lightTheme.primary },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] },
  result: {
    alignItems: 'center',
    borderBottomColor: lightTheme.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 64,
    paddingVertical: spacing[8],
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  screen: {
    backgroundColor: lightTheme.background,
    gap: spacing[16],
    padding: spacing[16],
    paddingBottom: 96,
  },
  searchBox: {
    backgroundColor: lightTheme.surface,
    borderColor: lightTheme.border,
    borderRadius: radius.button,
    borderWidth: 1,
    flexDirection: 'row',
  },
  searchInput: {
    color: lightTheme.textPrimary,
    flex: 1,
    minHeight: touchTargets.minimum,
    paddingHorizontal: spacing[12],
  },
  searchScreen: {
    backgroundColor: lightTheme.background,
    flex: 1,
    gap: spacing[16],
    padding: spacing[16],
  },
  sectionTitle: {
    color: lightTheme.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  sector: { gap: spacing[4], paddingVertical: spacing[8] },
  sectorBar: {
    backgroundColor: lightTheme.primary,
    borderRadius: 4,
    height: 6,
  },
  symbol: { fontSize: 28, fontWeight: '800' },
  tab: {
    alignItems: 'center',
    borderRadius: radius.full,
    justifyContent: 'center',
    minHeight: touchTargets.minimum,
    paddingHorizontal: spacing[12],
  },
  tabActive: { backgroundColor: lightTheme.primary },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[4] },
  tabText: { color: lightTheme.textPrimary, fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: '#fff', fontSize: 12, fontWeight: '700' },
  tooltip: {
    color: lightTheme.textSecondary,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  volume: {
    backgroundColor: chartColors.volume,
    bottom: 0,
    left: 1,
    opacity: 0.4,
    position: 'absolute',
    width: 5,
  },
  wick: { left: 3, position: 'absolute', width: 1 },
});
