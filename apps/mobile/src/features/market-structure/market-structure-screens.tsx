import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Text as NativeText,
  TextInput,
  View,
  type TextProps,
} from 'react-native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { palette, spacing, touchTargets } from '@atlas/design-tokens';
import { AppHeader, Badge, DemoBadge, useAtlasTheme } from '@atlas/mobile-ui';

import { SafeAreaScrollScreen } from '../../components/safe-area-scroll-screen';
import { isRuntimeLocalMobileE2EHarness } from '../../config/local-e2e-harness';
import { useAuth } from '../../providers/auth-provider';
import {
  marketMeasureFixtures,
  marketStructureFixturesEnabledAtCompileTime,
  shortSellingFixtures,
} from './market-structure-evidence-data';
import {
  MobileMarketStructureApi,
  type MarketMeasureRow,
  type MeasureType,
} from './market-structure-api';
import {
  capabilityPresentation,
  formatDate,
  marketMeasureAccessibility,
  marketStructureMethodology,
  measureStatusLabels,
  measureTypeLabels,
  qualityPresentation,
} from './market-structure-model';

type ViewName = 'overview' | 'measures' | 'short-selling';
type Relevance = 'all' | 'watchlist' | 'portfolio';

function fixtureEnabled(value: string | string[] | undefined) {
  return (
    marketStructureFixturesEnabledAtCompileTime &&
    isRuntimeLocalMobileE2EHarness() &&
    value === '1'
  );
}

function Text({ style, ...props }: TextProps) {
  const theme = useAtlasTheme();
  return (
    <NativeText {...props} style={[{ color: theme.textPrimary }, style]} />
  );
}

function SecondaryText({ style, ...props }: TextProps) {
  const theme = useAtlasTheme();
  return (
    <NativeText {...props} style={[style, { color: theme.textSecondary }]} />
  );
}

export function MarketStructureScreen({
  initialView = 'overview',
}: {
  initialView?: ViewName;
}) {
  const parameters = useLocalSearchParams<{
    fixture?: string;
    state?: string;
    symbol?: string;
    view?: string;
    theme?: string;
  }>();
  const fixture = fixtureEnabled(parameters.fixture);
  const requested = ['overview', 'measures', 'short-selling'].includes(
    parameters.view ?? '',
  )
    ? (parameters.view as ViewName)
    : initialView;
  const [view, setView] = useState<ViewName>(requested);
  const [type, setType] = useState<MeasureType | undefined>();
  const [relevance, setRelevance] = useState<Relevance>('all');
  const [query, setQuery] = useState(parameters.symbol ?? '');
  const auth = useAuth();
  const api = useMemo(
    () => new MobileMarketStructureApi(auth.client),
    [auth.client],
  );
  const measures = useInfiniteQuery({
    queryKey: ['market-structure', 'measures', type],
    queryFn: ({ pageParam, signal }) =>
      api.measures({
        ...(type ? { type } : {}),
        ...(pageParam ? { cursor: pageParam } : {}),
        signal,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.meta.nextCursor ?? undefined,
    enabled: !fixture && view !== 'short-selling',
  });
  const liveRows =
    measures.data?.pages.flatMap((page) => page.data.items) ?? [];
  const capability =
    parameters.state === 'license-required'
      ? 'LICENSE_REQUIRED'
      : parameters.state === 'not-available'
        ? 'NOT_AVAILABLE'
        : parameters.state === 'provider-required'
          ? 'PROVIDER_REQUIRED'
          : measures.data?.pages[0]?.meta.capability;
  const blocked = capability ? capabilityPresentation(capability) : null;
  const sourceRows = fixture ? marketMeasureFixtures : liveRows;
  const rows = sourceRows.filter((row) => {
    const normalized = query.trim().toLocaleUpperCase('tr-TR');
    const queryMatch =
      normalized.length === 0 ||
      `${row.symbol} ${row.instrumentName}`
        .toLocaleUpperCase('tr-TR')
        .includes(normalized);
    const relevanceMatch =
      relevance === 'all' ||
      (fixture &&
        ((relevance === 'watchlist' &&
          ['ASELS', 'THYAO'].includes(row.symbol)) ||
          (relevance === 'portfolio' && ['ASELS'].includes(row.symbol))));
    return queryMatch && relevanceMatch;
  });
  return (
    <Shell testID={`market-structure-${view}`}>
      <AppHeader title="Piyasa Yapısı" subtitle="Tedbirler · Açığa satış" />
      <LocalNavigation selected={view} onSelect={setView} />
      {fixture ? <DemoBadge /> : null}
      {blocked ? (
        <CapabilityState title={blocked.title} detail={blocked.detail} />
      ) : null}
      {!blocked && measures.isError ? (
        <CapabilityState
          title="Veriye ulaşılamadı"
          detail="Sağlayıcı durumu güvenli biçimde doğrulanamadı. Veri yok sonucu çıkarılamaz."
        />
      ) : null}
      {!blocked && view === 'overview' ? (
        <Overview
          rows={rows}
          fixture={fixture}
          dataStatus={qualityPresentation(
            sourceRows[0]?.quality,
            sourceRows[0]?.deliveryMode,
          )}
          onOpen={setView}
        />
      ) : null}
      {!blocked && view === 'measures' ? (
        <MeasuresView
          query={query}
          setQuery={setQuery}
          type={type}
          setType={setType}
          relevance={relevance}
          setRelevance={setRelevance}
          rows={rows}
          fixture={fixture}
          hasNext={measures.hasNextPage}
          onNext={() => void measures.fetchNextPage()}
        />
      ) : null}
      {!blocked && view === 'short-selling' ? (
        <ShortSellingView
          fixture={fixture}
          providerGated={parameters.state === 'activity-provider-required'}
          symbol={(parameters.symbol ?? 'ASELS').toUpperCase()}
        />
      ) : null}
    </Shell>
  );
}

export function MarketMeasureDetailScreen() {
  const parameters = useLocalSearchParams<{
    fixture?: string;
    revisionId?: string;
    symbol?: string;
    state?: string;
  }>();
  const fixture = fixtureEnabled(parameters.fixture);
  const symbol = (parameters.symbol ?? 'ASELS').toUpperCase();
  const auth = useAuth();
  const api = useMemo(
    () => new MobileMarketStructureApi(auth.client),
    [auth.client],
  );
  const history = useQuery({
    queryKey: ['market-structure', 'history', symbol],
    queryFn: ({ signal }) => api.history(symbol, undefined, signal),
    enabled: !fixture,
  });
  const rows = fixture
    ? marketMeasureFixtures
    : (history.data?.data.items ?? []);
  const selected =
    rows.find((row) => row.revisionId === parameters.revisionId) ??
    rows.find((row) => row.symbol === symbol) ??
    rows[0];
  return (
    <Shell testID="market-measure-detail">
      <AppHeader title={symbol} subtitle="Piyasa yapısı detayı" />
      {fixture ? <DemoBadge /> : null}
      {!selected && !history.isLoading ? (
        <CapabilityState
          title="Dönem için veri yok"
          detail="Bu sonuç, enstrümanda tedbir olmadığı anlamına gelmez."
        />
      ) : null}
      {selected ? <MeasureDetail fixture={fixture} row={selected} /> : null}
      <SectionTitle>Geçmiş</SectionTitle>
      {rows
        .filter((row) => row.symbol === symbol)
        .map((row) => (
          <MeasureRow
            key={row.revisionId}
            row={row}
            fixture={fixture}
            compact
          />
        ))}
      <Panel>
        <Text style={styles.rowTitle}>Metodoloji</Text>
        <SecondaryText style={styles.body}>
          {marketStructureMethodology}
        </SecondaryText>
      </Panel>
    </Shell>
  );
}

export function SymbolMarketStructureSummary({
  symbol,
  fixture,
}: {
  symbol: string;
  fixture: boolean;
}) {
  const auth = useAuth();
  const api = useMemo(
    () => new MobileMarketStructureApi(auth.client),
    [auth.client],
  );
  const active = useQuery({
    queryKey: ['symbol', symbol, 'market-structure'],
    queryFn: ({ signal }) => api.active(symbol, signal),
    enabled: !fixture,
  });
  const rows = fixture
    ? marketMeasureFixtures.filter(
        (row) => row.symbol === symbol && row.status === 'ACTIVE',
      )
    : (active.data?.data.items ?? []);
  const gated =
    !fixture &&
    active.data &&
    !active.data.meta.capability.startsWith('SUPPORTED_');
  return (
    <Panel>
      <Text style={styles.rowTitle}>Piyasa Yapısı</Text>
      {gated ? (
        <SecondaryText style={styles.body}>
          Veri sağlayıcısı gerekli
        </SecondaryText>
      ) : rows.length > 0 ? (
        <Text accessibilityLabel={`${rows.length} aktif tedbir`}>
          Aktif Tedbirler · {rows.length}
        </Text>
      ) : active.isSuccess || fixture ? (
        <SecondaryText style={styles.body}>Tedbir bulunmuyor</SecondaryText>
      ) : (
        <SecondaryText style={styles.body}>
          Veri durumu kontrol ediliyor…
        </SecondaryText>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          router.push(
            `/markets/market-structure/${symbol}${fixture ? '?fixture=1' : ''}` as never,
          )
        }
        style={styles.linkButton}
        testID="company-market-structure"
      >
        <Text>Piyasa Yapısı Detayı ›</Text>
      </Pressable>
    </Panel>
  );
}

export function MarketMeasureEventDetailScreen() {
  const parameters = useLocalSearchParams<{ id: string; fixture?: string }>();
  const fixture = fixtureEnabled(parameters.fixture);
  const auth = useAuth();
  const api = useMemo(
    () => new MobileMarketStructureApi(auth.client),
    [auth.client],
  );
  const query = useQuery({
    queryKey: ['market-structure', 'event', parameters.id],
    queryFn: ({ signal }) => api.event(parameters.id, signal),
    enabled: !fixture,
  });
  const fixtureMeasure = fixture
    ? marketMeasureFixtures.find((row) => row.marketEventId === parameters.id)
    : undefined;
  const event = query.data?.data;
  const symbol = event?.symbol ?? fixtureMeasure?.symbol;
  return (
    <Shell testID="market-measure-event-detail">
      <AppHeader
        title={symbol ?? 'Piyasa Olayı'}
        subtitle="Kurumsal olay detayı"
      />
      {fixture ? <DemoBadge /> : null}
      {!event && !fixtureMeasure && !query.isLoading ? (
        <CapabilityState
          title="Olay kullanılamıyor"
          detail="Canonical piyasa olayı mevcut değil veya gösterim izni bulunmuyor."
        />
      ) : null}
      {event || fixtureMeasure ? (
        <Panel>
          <SecondaryText style={styles.eyebrow}>PİYASA TEDBİRİ</SecondaryText>
          <Text style={styles.rowTitle}>
            {event
              ? eventMeasureTypeLabel(event.attributes.measureType)
              : measureTypeLabels[fixtureMeasure!.measureType]}
          </Text>
          <DataLine
            label="Yayınlandı"
            value={formatDate(
              event?.publishedAt ?? fixtureMeasure!.publishedAt,
            )}
          />
          <DataLine
            label="Kullanılabilir"
            value={formatDate(
              event?.availableAt ?? fixtureMeasure!.availableAt,
            )}
          />
          <DataLine
            label="Yürürlük"
            value={formatDate(
              event?.effectiveAt ?? fixtureMeasure!.effectiveFrom,
            )}
          />
          <DataLine
            label="Kaynak"
            value={event?.provider ?? fixtureMeasure!.provider}
          />
          <SecondaryText style={styles.body}>
            Bu olay canonical MarketEvent kaydının piyasa tedbiri görünümüdür;
            ayrı bir olay kopyası oluşturulmaz.
          </SecondaryText>
        </Panel>
      ) : null}
      {symbol ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push(
              `/symbol/${symbol}${fixture ? '?fixture=1' : ''}` as never,
            )
          }
          style={styles.linkButton}
          testID="market-measure-event-symbol"
        >
          <Text>Şirket detayına git ›</Text>
        </Pressable>
      ) : null}
    </Shell>
  );
}

function eventMeasureTypeLabel(value: unknown) {
  return typeof value === 'string' && value in measureTypeLabels
    ? measureTypeLabels[value as MeasureType]
    : 'Piyasa tedbiri';
}

function Overview({
  rows,
  fixture,
  dataStatus,
  onOpen,
}: {
  rows: readonly MarketMeasureRow[];
  fixture: boolean;
  dataStatus: string;
  onOpen: (view: ViewName) => void;
}) {
  const active = rows.filter((row) => row.status === 'ACTIVE');
  const scheduled = rows.filter((row) => row.status === 'SCHEDULED');
  return (
    <>
      <StatusStrip label="VERİ DURUMU" value={dataStatus} />
      <Panel>
        <SecondaryText style={styles.eyebrow}>
          AKTİF TEDBİRLİ HİSSELER
        </SecondaryText>
        <Text style={styles.heroNumber}>{active.length}</Text>
        <SecondaryText style={styles.body}>
          Son veri kesiminde canonical durumu aktif olan kayıtlar.
        </SecondaryText>
      </Panel>
      <SectionTitle>Şimdi</SectionTitle>
      {active.slice(0, 2).map((row) => (
        <MeasureRow key={row.revisionId} row={row} fixture={fixture} />
      ))}
      {scheduled[0] ? (
        <Panel>
          <SecondaryText style={styles.eyebrow}>
            YAKINDA BAŞLAYACAK
          </SecondaryText>
          <Text style={styles.rowTitle}>
            {scheduled[0].symbol} ·{' '}
            {measureTypeLabels[scheduled[0].measureType]}
          </Text>
          <SecondaryText style={styles.body}>
            Başlangıç {formatDate(scheduled[0].effectiveFrom)}
          </SecondaryText>
        </Panel>
      ) : null}
      <View style={styles.quickGrid}>
        <Quick
          label="Tedbirleri incele"
          detail="Tür, durum ve sembole göre filtrele"
          onPress={() => onOpen('measures')}
        />
        <Quick
          label="Açığa satış"
          detail="Tedbir ile aktiviteyi ayrı görüntüle"
          onPress={() => onOpen('short-selling')}
        />
      </View>
      <Panel>
        <Text style={styles.rowTitle}>Metodoloji</Text>
        <SecondaryText style={styles.body}>
          {marketStructureMethodology}
        </SecondaryText>
      </Panel>
    </>
  );
}

function MeasuresView(props: {
  query: string;
  setQuery: (value: string) => void;
  type: MeasureType | undefined;
  setType: (value: MeasureType | undefined) => void;
  relevance: Relevance;
  setRelevance: (value: Relevance) => void;
  rows: readonly MarketMeasureRow[];
  fixture: boolean;
  hasNext: boolean;
  onNext: () => void;
}) {
  return (
    <>
      <TextInput
        accessibilityLabel="Piyasa yapısında sembol veya şirket ara"
        autoCapitalize="characters"
        onChangeText={props.setQuery}
        placeholder="Sembol veya şirket ara"
        style={styles.input}
        testID="market-structure-search"
        value={props.query}
      />
      {props.fixture ? (
        <Selector
          selected={props.relevance}
          values={['all', 'watchlist', 'portfolio']}
          labels={['Tümü', 'Takip Ettiklerim', 'Portföyüm']}
          onSelect={(value) => props.setRelevance(value as Relevance)}
          prefix="measure-relevance"
        />
      ) : null}
      <Selector
        selected={props.type ?? 'ALL'}
        values={['ALL', 'GROSS_SETTLEMENT', 'SINGLE_PRICE']}
        labels={['Tüm Türler', 'Brüt Takas', 'Tek Fiyat']}
        onSelect={(value) =>
          props.setType(value === 'ALL' ? undefined : (value as MeasureType))
        }
        prefix="measure-type"
      />
      <SectionTitle>Aktif ve dönemsel tedbirler</SectionTitle>
      {props.rows.map((row) => (
        <MeasureRow key={row.revisionId} row={row} fixture={props.fixture} />
      ))}
      {props.rows.length === 0 ? (
        <SecondaryText>Dönem için sonuç bulunamadı.</SecondaryText>
      ) : null}
      {props.hasNext ? (
        <Quick
          label="Daha fazla"
          detail="Sonraki sayfayı yükle"
          onPress={props.onNext}
        />
      ) : null}
    </>
  );
}

function ShortSellingView({
  fixture,
  providerGated,
  symbol,
}: {
  fixture: boolean;
  providerGated: boolean;
  symbol: string;
}) {
  const auth = useAuth();
  const api = useMemo(
    () => new MobileMarketStructureApi(auth.client),
    [auth.client],
  );
  const activity = useQuery({
    queryKey: ['market-structure', 'short-selling', symbol],
    queryFn: ({ signal }) => api.shortSelling(symbol, signal),
    enabled: !fixture && !providerGated,
  });
  const rows = fixture
    ? shortSellingFixtures
    : (activity.data?.data.items ?? []);
  const restriction = marketMeasureFixtures.find(
    (row) =>
      row.symbol === symbol && row.measureType === 'SHORT_SELL_RESTRICTION',
  );
  return (
    <>
      <Panel>
        <SecondaryText style={styles.eyebrow}>TEDBİR</SecondaryText>
        <Text style={styles.rowTitle}>Açığa satış / kredili işlem kısıtı</Text>
        <SecondaryText style={styles.body}>
          {restriction
            ? `${measureStatusLabels[restriction.status]} · ${formatDate(restriction.effectiveFrom)}`
            : 'Kaynak kapsamında doğrulanmış tedbir kaydı yok.'}
        </SecondaryText>
      </Panel>
      <SectionTitle>Açığa satış aktivitesi</SectionTitle>
      {providerGated ? (
        <CapabilityState
          title="Aktivite sağlayıcısı gerekli"
          detail="Kısıt kaydı ile işlem aktivitesi farklı veri kümeleridir. Eksik aktivite sıfır değildir."
        />
      ) : (
        rows.map((row) => (
          <Panel key={row.revisionId}>
            <View style={styles.rowBetween}>
              <Text style={styles.rowTitle}>{row.symbol}</Text>
              <Badge
                label={qualityPresentation(row.quality, row.deliveryMode)}
              />
            </View>
            <DataLine label="İşlem tarihi" value={formatDate(row.tradeDate)} />
            <DataLine
              label="Miktar"
              value={
                row.quantity
                  ? Number(row.quantity).toLocaleString('tr-TR')
                  : '—'
              }
            />
            <DataLine
              label="Tutar"
              value={
                row.value
                  ? `₺${Number(row.value).toLocaleString('tr-TR')}`
                  : '—'
              }
            />
            <DataLine
              label="Hacim payı"
              value={
                row.shareOfTurnover
                  ? `%${(Number(row.shareOfTurnover) * 100).toLocaleString('tr-TR')}`
                  : '—'
              }
            />
          </Panel>
        ))
      )}
      <Panel>
        <SecondaryText style={styles.body}>
          {marketStructureMethodology}
        </SecondaryText>
      </Panel>
    </>
  );
}

function MeasureDetail({
  row,
  fixture,
}: {
  row: MarketMeasureRow;
  fixture: boolean;
}) {
  return (
    <Panel>
      <View style={styles.rowBetween}>
        <Text style={styles.symbol}>{row.symbol}</Text>
        <Badge label={measureStatusLabels[row.status]} />
      </View>
      <Text style={styles.rowTitle}>{measureTypeLabels[row.measureType]}</Text>
      <View accessibilityLabel="Tedbir dönem izi" style={styles.periodRail}>
        <PeriodPoint label="Yayınlandı" value={row.publishedAt} />
        <View style={styles.railLine} />
        <PeriodPoint label="Başlangıç" value={row.effectiveFrom} />
        <View style={styles.railLine} />
        <PeriodPoint label="Bitiş" value={row.effectiveUntil} />
      </View>
      <DataLine label="Kaynak" value={row.provider} />
      <DataLine
        label="Veri durumu"
        value={row.deliveryMode === 'DELAYED' ? 'Gecikmeli' : 'Güncel'}
      />
      {row.status === 'CORRECTED' ? (
        <SecondaryText style={styles.body}>
          Düzeltilmiş kayıt · Önceki sürüm revizyon geçmişinde korunur.
        </SecondaryText>
      ) : null}
      {row.marketEventId ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push(
              `/research/events/market-measure/${row.marketEventId}${fixture ? '?fixture=1' : ''}` as never,
            )
          }
          style={styles.linkButton}
          testID="related-market-event"
        >
          <Text>İlgili Olay ›</Text>
        </Pressable>
      ) : null}
    </Panel>
  );
}

function MeasureRow({
  row,
  fixture,
  compact = false,
}: {
  row: MarketMeasureRow;
  fixture: boolean;
  compact?: boolean;
}) {
  const theme = useAtlasTheme();
  return (
    <Pressable
      accessibilityLabel={marketMeasureAccessibility(row)}
      accessibilityRole="button"
      onPress={() =>
        router.push(
          `/markets/market-structure/${row.symbol}?${fixture ? 'fixture=1&' : ''}revisionId=${row.revisionId}` as never,
        )
      }
      style={[styles.measureRow, { borderBottomColor: theme.border }]}
      testID={`measure-row-${row.symbol}-${row.status.toLowerCase()}`}
    >
      <View style={styles.rowIdentity}>
        <View style={styles.symbolLine}>
          <Text style={styles.rowTitle}>{row.symbol}</Text>
          <Badge label={measureStatusLabels[row.status]} />
        </View>
        <SecondaryText style={styles.body}>
          {measureTypeLabels[row.measureType]}
        </SecondaryText>
        {!compact ? (
          <SecondaryText style={styles.dateLine}>
            Başlangıç {formatDate(row.effectiveFrom)} · Bitiş{' '}
            {row.effectiveUntil
              ? formatDate(row.effectiveUntil)
              : 'Belirtilmedi'}
          </SecondaryText>
        ) : null}
      </View>
      <Text>›</Text>
    </Pressable>
  );
}

function LocalNavigation({
  selected,
  onSelect,
}: {
  selected: ViewName;
  onSelect: (value: ViewName) => void;
}) {
  return (
    <Selector
      selected={selected}
      values={['overview', 'measures', 'short-selling']}
      labels={['Özet', 'Tedbirler', 'Açığa Satış']}
      onSelect={(value) => onSelect(value as ViewName)}
      prefix="market-structure-tab"
    />
  );
}

function Selector({
  values,
  labels,
  selected,
  onSelect,
  prefix,
}: {
  values: readonly string[];
  labels: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
  prefix: string;
}) {
  const theme = useAtlasTheme();
  return (
    <View accessibilityRole="tablist" style={styles.selector}>
      {values.map((value, index) => (
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: value === selected }}
          key={value}
          onPress={() => onSelect(value)}
          style={[
            styles.segment,
            value === selected && { backgroundColor: theme.primary },
          ]}
          testID={`${prefix}-${value}`}
        >
          <Text
            style={
              value === selected
                ? styles.segmentTextActive
                : { ...styles.segmentText, color: theme.textSecondary }
            }
          >
            {labels[index]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function PeriodPoint({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <View style={styles.periodPoint}>
      <View style={styles.periodDot} />
      <View>
        <SecondaryText style={styles.eyebrow}>
          {label.toLocaleUpperCase('tr-TR')}
        </SecondaryText>
        <Text style={styles.numeric}>
          {value ? formatDate(value) : 'Belirtilmedi'}
        </Text>
      </View>
    </View>
  );
}
function DataLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rowBetween}>
      <SecondaryText style={styles.body}>{label}</SecondaryText>
      <Text style={styles.numeric}>{value}</Text>
    </View>
  );
}
function StatusStrip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rowBetween}>
      <SecondaryText style={styles.eyebrow}>{label}</SecondaryText>
      <Badge label={value} />
    </View>
  );
}
function Quick({
  label,
  detail,
  onPress,
}: {
  label: string;
  detail: string;
  onPress: () => void;
}) {
  const theme = useAtlasTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.quick, { borderColor: theme.border }]}
    >
      <Text style={styles.rowTitle}>{label}</Text>
      <SecondaryText style={styles.body}>{detail}</SecondaryText>
    </Pressable>
  );
}
function CapabilityState({ title, detail }: { title: string; detail: string }) {
  return (
    <Panel>
      <Badge label="VERİ DURUMU" />
      <Text accessibilityRole="alert" style={styles.rowTitle}>
        {title}
      </Text>
      <SecondaryText style={styles.body}>{detail}</SecondaryText>
    </Panel>
  );
}
function Panel({ children }: { children: React.ReactNode }) {
  const theme = useAtlasTheme();
  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      {children}
    </View>
  );
}
function SectionTitle({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" style={styles.sectionTitle}>
      {children}
    </Text>
  );
}
function Shell({
  children,
  testID,
}: {
  children: React.ReactNode;
  testID: string;
}) {
  const theme = useAtlasTheme();
  return (
    <SafeAreaScrollScreen
      contentContainerStyle={[
        styles.screen,
        { backgroundColor: theme.background },
      ]}
      testID={testID}
    >
      {children}
    </SafeAreaScrollScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, gap: spacing[16], padding: spacing[16] },
  selector: { flexDirection: 'row', gap: spacing[4] },
  segment: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    justifyContent: 'center',
    minHeight: touchTargets.minimum,
    paddingHorizontal: spacing[4],
  },
  segmentText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  segmentTextActive: {
    color: palette.textInverse,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  panel: {
    borderRadius: 14,
    borderWidth: 1,
    gap: spacing[8],
    padding: spacing[16],
  },
  quickGrid: { gap: spacing[8] },
  quick: {
    borderRadius: 12,
    borderWidth: 1,
    minHeight: touchTargets.minimum,
    padding: spacing[12],
  },
  input: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: touchTargets.minimum,
    paddingHorizontal: spacing[12],
  },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 0.7 },
  heroNumber: {
    fontSize: 36,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginTop: spacing[4] },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  body: { fontSize: 13, lineHeight: 19 },
  dateLine: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    marginTop: spacing[4],
  },
  numeric: { fontSize: 13, fontVariant: ['tabular-nums'], fontWeight: '600' },
  symbol: { fontSize: 24, fontVariant: ['tabular-nums'], fontWeight: '700' },
  measureRow: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 76,
    paddingVertical: spacing[8],
  },
  rowIdentity: { flex: 1, paddingRight: spacing[8] },
  symbolLine: { alignItems: 'center', flexDirection: 'row', gap: spacing[8] },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[8],
  },
  periodRail: {
    gap: spacing[4],
    marginVertical: spacing[8],
    paddingLeft: spacing[4],
  },
  periodPoint: { alignItems: 'center', flexDirection: 'row', gap: spacing[12] },
  periodDot: {
    backgroundColor: palette.primary600,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  railLine: {
    backgroundColor: palette.border,
    height: 18,
    marginLeft: 4,
    width: 2,
  },
  linkButton: { justifyContent: 'center', minHeight: touchTargets.minimum },
});
