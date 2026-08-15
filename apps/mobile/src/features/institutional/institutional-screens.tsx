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
import { useQuery } from '@tanstack/react-query';
import { palette, spacing, touchTargets } from '@atlas/design-tokens';
import {
  AppHeader,
  Badge,
  DemoBadge,
  PartialDataBanner,
  ProviderRequiredState,
  useAtlasTheme,
} from '@atlas/mobile-ui';

import { SafeAreaScrollScreen } from '../../components/safe-area-scroll-screen';
import { isRuntimeLocalMobileE2EHarness } from '../../config/local-e2e-harness';
import { useAuth } from '../../providers/auth-provider';
import {
  flowRows,
  institutionalFixturesEnabledAtCompileTime,
  institutions,
  settlementRows,
} from './institutional-evidence-data';
import {
  MobileInstitutionalApi,
  type InstitutionalFlowRow,
  type SettlementRow,
} from './institutional-api';
import {
  flowAccessibility,
  flowDirection,
  formatCompactTry,
  isForeignAvailable,
  moneyFlowMethodology,
  settlementAccessibility,
} from './institutional-model';

type Period = '1D' | '5D' | '20D';
type InstitutionalView = 'overview' | 'akd' | 'takas' | 'institutions';

function fixtureEnabled(value: string | string[] | undefined) {
  return (
    institutionalFixturesEnabledAtCompileTime &&
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

export function InstitutionalScreen({
  initialView = 'overview',
}: {
  initialView?: InstitutionalView;
}) {
  const parameters = useLocalSearchParams<{
    fixture?: string;
    view?: string;
    state?: string;
    symbol?: string;
    period?: string;
  }>();
  const fixture = fixtureEnabled(parameters.fixture);
  const requested = ['overview', 'akd', 'takas', 'institutions'].includes(
    parameters.view ?? '',
  )
    ? (parameters.view as InstitutionalView)
    : initialView;
  const [view, setView] = useState<InstitutionalView>(requested);
  const [period, setPeriod] = useState<Period>(
    ['1D', '5D', '20D'].includes(parameters.period ?? '')
      ? (parameters.period as Period)
      : '1D',
  );
  const auth = useAuth();
  const api = useMemo(
    () => new MobileInstitutionalApi(auth.client),
    [auth.client],
  );
  const overview = useQuery({
    queryKey: ['institutional', 'overview', period],
    queryFn: ({ signal }) => api.overview(period, signal),
    enabled: !fixture && view === 'overview',
  });
  const symbol = (parameters.symbol ?? 'ASELS').toUpperCase();
  const flows = useQuery({
    queryKey: ['institutional', 'flow', symbol, period],
    queryFn: ({ signal }) => api.flow(symbol, period, 'NET_BUY', signal),
    enabled: !fixture && view === 'akd',
  });
  const settlement = useQuery({
    queryKey: ['institutional', 'settlement', symbol],
    queryFn: ({ signal }) => api.settlement(symbol, 'HOLDING', signal),
    enabled: !fixture && view === 'takas',
  });
  const providerState = parameters.state === 'provider-required';
  const activeMeta =
    view === 'overview'
      ? overview.data?.meta
      : view === 'akd'
        ? flows.data?.meta
        : view === 'takas'
          ? settlement.data?.meta
          : undefined;
  const capabilityBlocked =
    !fixture &&
    activeMeta !== undefined &&
    !activeMeta.providerState.startsWith('SUPPORTED_');
  return (
    <Shell testID={`institutional-${view}`}>
      <AppHeader title="Kurumsal" subtitle="AKD · Takas · Kurumlar" />
      <LocalNavigation selected={view} onSelect={setView} />
      {providerState || capabilityBlocked ? <ProviderRequiredState /> : null}
      {!providerState && !capabilityBlocked && fixture ? <DemoBadge /> : null}
      {!providerState &&
      !capabilityBlocked &&
      fixture &&
      parameters.state === 'partial' ? (
        <PartialDataBanner />
      ) : null}
      {!providerState && !capabilityBlocked && view === 'overview' ? (
        <Overview
          fixture={fixture}
          live={overview.data?.data}
          loading={overview.isLoading}
          onOpen={setView}
        />
      ) : null}
      {!providerState && !capabilityBlocked && view === 'akd' ? (
        <AkdView
          fixture={fixture}
          live={flows.data?.data.items}
          period={period}
          setPeriod={setPeriod}
          symbol={symbol}
          state={parameters.state}
        />
      ) : null}
      {!providerState && !capabilityBlocked && view === 'takas' ? (
        <SettlementView
          fixture={fixture}
          live={settlement.data?.data.items}
          symbol={symbol}
          state={parameters.state}
        />
      ) : null}
      {!providerState && !capabilityBlocked && view === 'institutions' ? (
        <InstitutionsView fixture={fixture} />
      ) : null}
    </Shell>
  );
}

export function InstitutionDetailScreen() {
  const parameters = useLocalSearchParams<{
    id?: string;
    fixture?: string;
    state?: string;
  }>();
  const fixture = fixtureEnabled(parameters.fixture);
  const selected =
    institutions.find((item) => item.id === parameters.id) ?? institutions[0];
  const auth = useAuth();
  const api = useMemo(
    () => new MobileInstitutionalApi(auth.client),
    [auth.client],
  );
  const live = useQuery({
    queryKey: ['institution', parameters.id],
    queryFn: ({ signal }) => api.institution(parameters.id ?? '', '5D', signal),
    enabled: !fixture && Boolean(parameters.id),
  });
  const institution = fixture ? selected : live.data?.data.institution;
  const rows = fixture ? flowRows : (live.data?.data.flows ?? []);
  if (!fixture && live.isLoading) {
    return (
      <Shell testID="institution-detail-loading">
        <AppHeader title="Kurum" subtitle="Kanonik kurum profili" />
        <Text>Kurum veri durumu kontrol ediliyor…</Text>
      </Shell>
    );
  }
  if (
    !fixture &&
    live.data &&
    !live.data.meta.providerState.startsWith('SUPPORTED_')
  ) {
    return (
      <Shell testID="institution-detail-provider-required">
        <AppHeader title="Kurum" subtitle="Kanonik kurum profili" />
        <ProviderRequiredState />
      </Shell>
    );
  }
  return (
    <Shell testID="institution-detail">
      <AppHeader
        title={institution?.shortName ?? institution?.canonicalName ?? 'Kurum'}
        subtitle="Kanonik kurum profili"
      />
      {fixture ? <DemoBadge /> : null}
      <StatusStrip label="5 işlem günü" value="DELAYED · 13 Ağu 2026" />
      <Panel>
        <SecondaryText style={styles.eyebrow}>NET KURUMSAL AKIŞ</SecondaryText>
        <FlowValue value={rows[0]?.netValue ?? null} />
        <SecondaryText style={styles.muted}>
          Kapsanan semboller · gerçek işlem günleri
        </SecondaryText>
      </Panel>
      <SectionTitle>En çok alınanlar</SectionTitle>
      {rows
        .filter((row) => Number(row.netValue ?? 0) >= 0)
        .map((row) => (
          <FlowRow
            key={`buy-${row.institutionId}`}
            row={row}
            label="ASELS"
            symbol="ASELS"
          />
        ))}
      <SectionTitle>En çok satılanlar</SectionTitle>
      {rows
        .filter((row) => Number(row.netValue ?? 0) < 0)
        .map((row) => (
          <FlowRow
            key={`sell-${row.institutionId}`}
            row={row}
            label="THYAO"
            symbol="THYAO"
          />
        ))}
      <SectionTitle>Akış geçmişi</SectionTitle>
      <TrendStrip values={[18, 28, 24, 39, 54]} />
      <Methodology />
    </Shell>
  );
}

function Overview({
  fixture,
  live,
  loading,
  onOpen,
}: {
  fixture: boolean;
  live?:
    | {
        topBuyers: readonly InstitutionalFlowRow[];
        topSellers: readonly InstitutionalFlowRow[];
      }
    | undefined;
  loading: boolean;
  onOpen: (view: InstitutionalView) => void;
}) {
  const buyers = fixture
    ? flowRows.filter((row) => Number(row.netValue ?? 0) > 0)
    : (live?.topBuyers ?? []);
  const sellers = fixture
    ? flowRows.filter((row) => Number(row.netValue ?? 0) < 0)
    : (live?.topSellers ?? []);
  if (!fixture && loading)
    return <Text>Kurumsal veri durumu kontrol ediliyor…</Text>;
  if (!fixture && !live) return <ProviderRequiredState />;
  return (
    <>
      <StatusStrip label="VERİ DURUMU" value="GECİKMELİ · 13 Ağu 2026 18:10" />
      {fixture ? (
        <Panel>
          <SecondaryText style={styles.eyebrow}>
            PİYASA NET KURUMSAL AKIŞI
          </SecondaryText>
          <FlowValue value="463200000" />
          <SecondaryText style={styles.muted}>
            82 kurum · kısmi kapsama · kaynak metodolojisi
          </SecondaryText>
        </Panel>
      ) : null}
      <SectionTitle>En yüksek net alıcı</SectionTitle>
      {buyers.slice(0, 2).map((row) => (
        <FlowRow key={row.institutionId} row={row} />
      ))}
      <SectionTitle>En yüksek net satıcı</SectionTitle>
      {sellers.slice(0, 2).map((row) => (
        <FlowRow key={row.institutionId} row={row} />
      ))}
      <View style={styles.quickGrid}>
        <Quick
          label="AKD"
          detail="Kim alıp satıyor?"
          onPress={() => onOpen('akd')}
          testID="institutional-open-akd"
        />
        <Quick
          label="Takas"
          detail="Paylar kimde?"
          onPress={() => onOpen('takas')}
          testID="institutional-open-takas"
        />
        <Quick
          label="Kurumlar"
          detail="Kurum hareketleri"
          onPress={() => onOpen('institutions')}
          testID="institutional-open-institutions"
        />
      </View>
    </>
  );
}

function AkdView({
  fixture,
  live,
  period,
  setPeriod,
  symbol,
  state,
}: {
  fixture: boolean;
  live?: readonly InstitutionalFlowRow[] | undefined;
  period: Period;
  setPeriod: (period: Period) => void;
  symbol: string;
  state?: string | undefined;
}) {
  const [mode, setMode] = useState<'BUYERS' | 'SELLERS' | 'ALL'>(
    state === 'sellers' ? 'SELLERS' : state === 'all' ? 'ALL' : 'BUYERS',
  );
  const rows = fixture ? flowRows : (live ?? []);
  if (!fixture && live === undefined) return <ProviderRequiredState />;
  const visible =
    mode === 'BUYERS'
      ? rows.filter((row) => Number(row.netValue ?? 0) >= 0)
      : mode === 'SELLERS'
        ? rows.filter((row) => Number(row.netValue ?? 0) < 0)
        : rows;
  return (
    <>
      <StatusStrip
        label={`İŞLEM TARİHİ · ${symbol}`}
        value="13 Ağu 2026 · GECİKMELİ"
      />
      <SecondaryText style={styles.explainer}>
        AKD işlem akışını gösterir: kim alıp satıyor?
      </SecondaryText>
      <Selector
        values={['1D', '5D', '20D']}
        selected={period}
        onSelect={(value) => setPeriod(value as Period)}
        prefix="period"
      />
      {fixture ? (
        <Panel>
          <SecondaryText style={styles.eyebrow}>
            NET KURUMSAL AKIŞ
          </SecondaryText>
          <FlowValue value="463200000" />
          <SecondaryText style={styles.muted}>
            Alış ₺1,84 mr · Satış ₺1,38 mr
          </SecondaryText>
        </Panel>
      ) : null}
      <Selector
        values={['BUYERS', 'SELLERS', 'ALL']}
        labels={['Alıcılar', 'Satıcılar', 'Tümü']}
        selected={mode}
        onSelect={(value) => setMode(value as typeof mode)}
        prefix="akd"
      />
      {visible.map((row) => (
        <FlowRow key={row.institutionId} row={row} />
      ))}
      {state === 'history' ? (
        <>
          <SectionTitle>Akış geçmişi</SectionTitle>
          <TrendStrip values={[16, 31, 22, 47, 63]} />
        </>
      ) : null}
      <Methodology />
    </>
  );
}

function SettlementView({
  fixture,
  live,
  symbol,
  state,
}: {
  fixture: boolean;
  live?: readonly SettlementRow[] | undefined;
  symbol: string;
  state?: string | undefined;
}) {
  const rows = fixture ? settlementRows : (live ?? []);
  const [mode, setMode] = useState<'HOLDING' | 'INCREASE' | 'DECREASE'>(
    state === 'change' ? 'INCREASE' : 'HOLDING',
  );
  if (!fixture && live === undefined) return <ProviderRequiredState />;
  const sorted = [...rows].sort((a, b) =>
    mode === 'HOLDING'
      ? Number(b.holdingQuantity ?? -Infinity) -
        Number(a.holdingQuantity ?? -Infinity)
      : mode === 'INCREASE'
        ? Number(b.changeQuantity ?? -Infinity) -
          Number(a.changeQuantity ?? -Infinity)
        : Number(a.changeQuantity ?? Infinity) -
          Number(b.changeQuantity ?? Infinity),
  );
  const foreignAvailable = isForeignAvailable(rows);
  return (
    <>
      <StatusStrip
        label={`TAKAS TARİHİ · ${symbol}`}
        value="15 Ağu 2026 · T+2"
      />
      <SecondaryText style={styles.explainer}>
        Takas saklama dağılımını gösterir: paylar kimde tutuluyor?
      </SecondaryText>
      <Selector
        values={['HOLDING', 'INCREASE', 'DECREASE']}
        labels={['En büyük', 'Artış', 'Azalış']}
        selected={mode}
        onSelect={(value) => setMode(value as typeof mode)}
        prefix="takas"
      />
      {sorted.map((row) => (
        <SettlementRowView key={row.institutionId} row={row} />
      ))}
      {state === 'trend' ? (
        <>
          <SectionTitle>Takas payı trendi</SectionTitle>
          <TrendStrip values={[42, 39, 46, 51, 58]} />
        </>
      ) : null}
      {state === 'foreign' ? (
        <Panel>
          <SecondaryText style={styles.eyebrow}>YABANCI TAKAS</SecondaryText>
          {foreignAvailable ? (
            <>
              <Text style={styles.heroValue}>%21,3</Text>
              <SecondaryText style={styles.muted}>
                Kaynak sınıflandırması · dönem değişimi +%0,8
              </SecondaryText>
            </>
          ) : (
            <SecondaryText style={styles.muted}>
              Yabancı sınıflandırması sağlayıcı tarafından sunulmuyor.
            </SecondaryText>
          )}
        </Panel>
      ) : null}
    </>
  );
}

function InstitutionsView({ fixture }: { fixture: boolean }) {
  const [query, setQuery] = useState('');
  const theme = useAtlasTheme();
  if (!fixture) return <ProviderRequiredState />;
  const rows = institutions.filter((item) =>
    `${item.canonicalName} ${item.code ?? ''}`
      .toLocaleLowerCase('tr-TR')
      .includes(query.toLocaleLowerCase('tr-TR')),
  );
  return (
    <>
      <TextInput
        accessibilityLabel="Kurum ara"
        onChangeText={setQuery}
        placeholder="Kurum adı veya kodu"
        placeholderTextColor={theme.textMuted}
        style={[
          styles.input,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            color: theme.textPrimary,
          },
        ]}
        testID="institution-search-input"
        value={query}
      />
      {rows.map((item) => (
        <Pressable
          accessibilityRole="button"
          key={item.id}
          onPress={() =>
            router.push(
              `/markets/institutional/institutions/${item.id}?fixture=1` as never,
            )
          }
          style={[styles.row, { borderBottomColor: theme.border }]}
          testID={`institution-${item.code}`}
        >
          <View>
            <Text style={styles.rowTitle}>{item.canonicalName}</Text>
            <SecondaryText style={styles.muted}>
              {item.code} · {item.type}
            </SecondaryText>
          </View>
          <Text>›</Text>
        </Pressable>
      ))}
    </>
  );
}

function LocalNavigation({
  selected,
  onSelect,
}: {
  selected: InstitutionalView;
  onSelect: (value: InstitutionalView) => void;
}) {
  return (
    <Selector
      values={['overview', 'akd', 'takas', 'institutions']}
      labels={['Özet', 'AKD', 'Takas', 'Kurumlar']}
      selected={selected}
      onSelect={(value) => onSelect(value as InstitutionalView)}
      prefix="institutional-tab"
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
  labels?: readonly string[];
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
          testID={`${prefix}-${value.toLowerCase()}`}
        >
          <Text
            style={
              value === selected
                ? styles.segmentTextActive
                : { ...styles.segmentText, color: theme.textSecondary }
            }
          >
            {labels?.[index] ?? value}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
function FlowRow({
  row,
  label,
  symbol,
}: {
  row: InstitutionalFlowRow;
  label?: string;
  symbol?: string;
}) {
  const theme = useAtlasTheme();
  const direction = flowDirection(row.netValue);
  return (
    <Pressable
      accessibilityLabel={flowAccessibility(row)}
      accessibilityRole="button"
      onPress={() =>
        router.push(
          (symbol
            ? `/symbol/${symbol}?fixture=1`
            : `/markets/institutional/institutions/${row.institutionId}?fixture=1`) as never,
        )
      }
      style={[styles.row, { borderBottomColor: theme.border }]}
      testID={`flow-row-${row.code ?? row.institutionId}`}
    >
      <View style={styles.rowIdentity}>
        <Text style={styles.rowTitle}>{label ?? row.institutionName}</Text>
        <SecondaryText style={styles.muted}>
          {row.code ?? 'Kurum'} · {direction.label}
        </SecondaryText>
      </View>
      <Text
        style={[
          styles.numeric,
          {
            color:
              Number(row.netValue ?? 0) < 0
                ? theme.financial.negative
                : theme.financial.positive,
          },
        ]}
      >
        {formatCompactTry(row.netValue)}
      </Text>
    </Pressable>
  );
}
function SettlementRowView({ row }: { row: SettlementRow }) {
  const theme = useAtlasTheme();
  return (
    <View
      accessibilityLabel={settlementAccessibility(row)}
      style={[styles.row, { borderBottomColor: theme.border }]}
      testID={`settlement-row-${row.code ?? row.institutionId}`}
    >
      <View style={styles.rowIdentity}>
        <Text style={styles.rowTitle}>{row.institutionName}</Text>
        <SecondaryText style={styles.muted}>
          {row.residency === 'UNKNOWN' ? 'Sınıflandırılmamış' : row.residency}
        </SecondaryText>
      </View>
      <View style={styles.right}>
        <Text style={styles.numeric}>
          {row.holdingRatio === null
            ? '—'
            : `%${(Number(row.holdingRatio) * 100).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}`}
        </Text>
        <SecondaryText style={styles.muted}>
          {row.changeRatio === null
            ? 'Değişim yok'
            : `${Number(row.changeRatio) >= 0 ? '▲' : '▼'} %${Math.abs(Number(row.changeRatio) * 100).toLocaleString('tr-TR')}`}
        </SecondaryText>
      </View>
    </View>
  );
}
function FlowValue({ value }: { value: string | null }) {
  const direction = flowDirection(value);
  const theme = useAtlasTheme();
  return (
    <View>
      <Text
        accessibilityLabel={`${direction.label}, ${formatCompactTry(value)}`}
        style={[
          styles.heroValue,
          {
            color:
              Number(value ?? 0) < 0
                ? theme.financial.negative
                : theme.financial.positive,
          },
        ]}
      >
        {formatCompactTry(value)}
      </Text>
      <SecondaryText style={styles.direction}>
        {direction.sign} {direction.label}
      </SecondaryText>
    </View>
  );
}
function StatusStrip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.status}>
      <SecondaryText style={styles.eyebrow}>{label}</SecondaryText>
      <Badge label={value} />
    </View>
  );
}
function Quick({
  label,
  detail,
  onPress,
  testID,
}: {
  label: string;
  detail: string;
  onPress: () => void;
  testID: string;
}) {
  const theme = useAtlasTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.quick, { borderColor: theme.border }]}
      testID={testID}
    >
      <Text style={styles.rowTitle}>{label}</Text>
      <SecondaryText style={styles.muted}>{detail}</SecondaryText>
    </Pressable>
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
function TrendStrip({ values }: { values: readonly number[] }) {
  return (
    <View
      accessibilityLabel={`Beş dönem trendi: ${values.join(', ')}`}
      style={styles.trend}
    >
      {values.map((value, index) => (
        <View
          key={`${value}-${index}`}
          style={[styles.trendBar, { height: value }]}
        />
      ))}
    </View>
  );
}
function Methodology() {
  return (
    <Panel>
      <Text style={styles.rowTitle}>Metodoloji</Text>
      <SecondaryText style={styles.muted}>{moneyFlowMethodology}</SecondaryText>
      <SecondaryText style={styles.muted}>
        AKD işlem tarihini, Takas ise takas tarihini kullanır.
      </SecondaryText>
    </Panel>
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
  segmentText: {
    color: palette.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: palette.textInverse,
    fontSize: 12,
    fontWeight: '700',
  },
  status: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: palette.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  panel: {
    borderRadius: 14,
    borderWidth: 1,
    gap: spacing[8],
    padding: spacing[16],
  },
  heroValue: { fontSize: 30, fontVariant: ['tabular-nums'], fontWeight: '700' },
  direction: { color: palette.textSecondary, fontSize: 13, fontWeight: '600' },
  positive: { color: palette.positive700 },
  negative: { color: palette.negative700 },
  muted: { color: palette.textSecondary, fontSize: 13, lineHeight: 19 },
  explainer: { color: palette.textSecondary, fontSize: 13, lineHeight: 19 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: spacing[4] },
  row: {
    alignItems: 'center',
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
    paddingVertical: spacing[8],
  },
  rowIdentity: { flex: 1, paddingRight: spacing[8] },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  numeric: { fontSize: 15, fontVariant: ['tabular-nums'], fontWeight: '700' },
  right: { alignItems: 'flex-end' },
  quickGrid: { gap: spacing[8] },
  quick: {
    borderColor: palette.border,
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
  trend: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing[8],
    height: 72,
    paddingHorizontal: spacing[8],
  },
  trendBar: {
    backgroundColor: palette.primary600,
    borderRadius: 3,
    flex: 1,
    minHeight: 4,
  },
});
