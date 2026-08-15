import { useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  Linking,
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  radius,
  spacing,
  touchTargets,
  typography,
} from '@atlas/design-tokens';
import {
  AppHeader,
  AtlasText,
  Badge,
  Button,
  DataFreshnessBadge,
  DemoBadge,
  OfflineState,
  ProviderRequiredState,
  useAtlasTheme,
} from '@atlas/mobile-ui';

import { SafeAreaScrollScreen } from '../../components/safe-area-scroll-screen';
import { useAuth } from '../../providers/auth-provider';
import {
  MobileEventsApi,
  type EventCategory,
  type KapEventDetail,
  type KapEventSummary,
} from './events-api';
import {
  eventFixtureLabel,
  eventFixtures,
  eventFixturesEnabledAtCompileTime,
} from './events-evidence-data';
import {
  categoryLabels,
  eventAccessibilityLabel,
  featuredCategories,
  safeSourceUrl,
} from './events-model';
import { isRuntimeLocalMobileE2EHarness } from '../../config/local-e2e-harness';

const isFixture = (value: string | string[] | undefined) =>
  (__DEV__ || isRuntimeLocalMobileE2EHarness()) &&
  eventFixturesEnabledAtCompileTime &&
  value === '1';

export function EventsFeedScreen() {
  const parameters = useLocalSearchParams<{
    fixture?: string;
    view?: string;
    category?: EventCategory;
    symbol?: string;
    id?: string;
  }>();
  const fixture = isFixture(parameters.fixture);
  if (fixture && parameters.id) {
    router.replace(`/research/events/${parameters.id}?fixture=1` as never);
    return null;
  }
  return fixture ? (
    <FixtureFeed
      key={`${parameters.view ?? 'latest'}:${parameters.category ?? 'all'}:${parameters.symbol ?? 'all'}`}
      view={parameters.view}
      category={parameters.category}
      symbol={parameters.symbol}
    />
  ) : (
    <LiveFeed />
  );
}

function LiveFeed() {
  const auth = useAuth();
  const api = useMemo(() => new MobileEventsApi(auth.client), [auth.client]);
  const [category, setCategory] = useState<EventCategory | undefined>();
  const [relevance, setRelevance] = useState<
    'WATCHLIST' | 'PORTFOLIO' | undefined
  >();
  const [search, setSearch] = useState('');
  const query = useInfiniteQuery({
    queryKey: ['kap-events', category, relevance, search],
    queryFn: ({ pageParam, signal }) =>
      api.feed({
        ...(category ? { category } : {}),
        ...(relevance ? { relevance } : {}),
        ...(search.length >= 2 ? { q: search } : {}),
        ...(pageParam ? { cursor: pageParam } : {}),
        signal,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
  });
  const items = query.data?.pages.flatMap((page) => page.data.items) ?? [];
  const meta = query.data?.pages[0]?.meta;
  return (
    <EventsShell>
      <FeedControls
        category={category}
        relevance={relevance}
        search={search}
        onCategory={setCategory}
        onRelevance={setRelevance}
        onSearch={setSearch}
      />
      {query.isLoading ? <AtlasText>Bildirimler yükleniyor…</AtlasText> : null}
      {query.isError ||
      (meta?.providerState && !meta.providerState.startsWith('SUPPORTED_')) ? (
        <ProviderRequiredState />
      ) : null}
      {meta?.providerState?.startsWith('SUPPORTED_') ? (
        <DataFreshnessBadge
          status={
            meta.freshness === 'CURRENT'
              ? 'live'
              : meta.freshness === 'STALE'
                ? 'stale'
                : 'delayed'
          }
        />
      ) : null}
      <EventList items={items} />
      {query.hasNextPage ? (
        <Button
          label="Daha fazla"
          onPress={() => void query.fetchNextPage()}
          testID="kap-load-more"
        />
      ) : null}
    </EventsShell>
  );
}

function FixtureFeed({
  view,
  category,
  symbol,
}: {
  view: string | undefined;
  category: EventCategory | undefined;
  symbol: string | undefined;
}) {
  const theme = useAtlasTheme();
  const [search, setSearch] = useState(
    view === 'search' ? 'kâr' : view === 'search-empty' ? 'bulunamayan' : '',
  );
  const [selectedCategory, setSelectedCategory] = useState<
    EventCategory | undefined
  >(category);
  const [relevance, setRelevance] = useState<
    'WATCHLIST' | 'PORTFOLIO' | undefined
  >(
    view === 'watchlist'
      ? 'WATCHLIST'
      : view === 'portfolio'
        ? 'PORTFOLIO'
        : undefined,
  );
  if (view === 'provider-required')
    return (
      <EventsShell>
        <ProviderRequiredState />
      </EventsShell>
    );
  if (view === 'offline')
    return (
      <EventsShell>
        <OfflineState />
        <AtlasText role="bodySmall">
          13 Ağu 15:02 itibarıyla önbelleğe alınmış bildirimler gösteriliyor.
        </AtlasText>
        <EventList items={eventFixtures.slice(0, 2)} fixture />
      </EventsShell>
    );
  const normalized = search.trim().toLocaleLowerCase('tr-TR');
  const items = eventFixtures.filter(
    (event) =>
      (!selectedCategory || event.category === selectedCategory) &&
      (!symbol ||
        event.instruments.some(
          (item) => item.symbol === symbol.toUpperCase(),
        )) &&
      (!relevance ||
        event.relevance === 'BOTH' ||
        event.relevance === `${relevance}_RELEVANT`) &&
      (!normalized ||
        `${event.title} ${event.instruments[0]?.symbol ?? ''}`
          .toLocaleLowerCase('tr-TR')
          .includes(normalized)),
  );
  return (
    <EventsShell>
      <DemoBadge />
      <Text
        accessibilityLabel="Test verisi"
        style={[styles.fixtureLabel, { color: theme.textSecondary }]}
      >
        {eventFixtureLabel}
      </Text>
      <FeedControls
        category={selectedCategory}
        relevance={relevance}
        search={search}
        onCategory={setSelectedCategory}
        onRelevance={setRelevance}
        onSearch={setSearch}
      />
      <DataFreshnessBadge status="delayed" timestamp="13 Ağu 2026 · 15:01" />
      {items.length ? <EventList items={items} fixture /> : <EmptySearch />}
      {view === 'pagination' ? (
        <Button
          label="Daha fazla"
          onPress={() => undefined}
          testID="kap-load-more"
        />
      ) : null}
    </EventsShell>
  );
}

function EventsShell({ children }: { children: React.ReactNode }) {
  const theme = useAtlasTheme();
  return (
    <SafeAreaScrollScreen
      contentContainerStyle={[
        styles.screen,
        { backgroundColor: theme.background },
      ]}
      testID="events-screen"
    >
      <AppHeader
        title="Şirket Olayları"
        subtitle="KAP bildirimleri · Kaynak ve düzeltme izli"
      />
      <View style={[styles.intro, { borderLeftColor: theme.primary }]}>
        <Text style={[styles.eyebrow, { color: theme.primary }]}>
          RESEARCH / EVENTS
        </Text>
        <AtlasText role="titleMedium">Şirketler bugün ne açıkladı?</AtlasText>
        <Text style={[styles.introCopy, { color: theme.textSecondary }]}>
          Bildirimin kaynağını, yayın zamanını ve düzeltme zincirini tek akışta
          inceleyin.
        </Text>
      </View>
      {children}
    </SafeAreaScrollScreen>
  );
}

function FeedControls({
  category,
  relevance,
  search,
  onCategory,
  onRelevance,
  onSearch,
}: {
  category: EventCategory | undefined;
  relevance: 'WATCHLIST' | 'PORTFOLIO' | undefined;
  search: string;
  onCategory: (value: EventCategory | undefined) => void;
  onRelevance: (value: 'WATCHLIST' | 'PORTFOLIO' | undefined) => void;
  onSearch: (value: string) => void;
}) {
  const theme = useAtlasTheme();
  return (
    <View style={styles.controls}>
      <TextInput
        accessibilityLabel="KAP bildirimi ara"
        autoCapitalize="none"
        onChangeText={onSearch}
        placeholder="Bildirim, şirket veya sembol ara"
        placeholderTextColor={theme.textMuted}
        style={[
          styles.search,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            color: theme.textPrimary,
          },
        ]}
        testID="kap-search"
        value={search}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        <FilterChip
          label="Tümü"
          selected={!category}
          onPress={() => onCategory(undefined)}
        />
        {featuredCategories.map((item) => (
          <FilterChip
            key={item}
            label={categoryLabels[item]}
            selected={category === item}
            onPress={() => onCategory(item)}
          />
        ))}
      </ScrollView>
      <View style={styles.relevanceRow}>
        <FilterChip
          label="Tüm şirketler"
          selected={!relevance}
          onPress={() => onRelevance(undefined)}
        />
        <FilterChip
          label="Takip listem"
          selected={relevance === 'WATCHLIST'}
          onPress={() => onRelevance('WATCHLIST')}
        />
        <FilterChip
          label="Portföyüm"
          selected={relevance === 'PORTFOLIO'}
          onPress={() => onRelevance('PORTFOLIO')}
        />
      </View>
    </View>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useAtlasTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: selected ? theme.primary : theme.border,
          backgroundColor: selected ? theme.surfaceSecondary : theme.surface,
        },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          { color: selected ? theme.primary : theme.textSecondary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function EventList({
  items,
  fixture = false,
}: {
  items: readonly KapEventSummary[];
  fixture?: boolean;
}) {
  return (
    <View accessibilityLabel="KAP bildirimleri" style={styles.list}>
      {items.map((event) => (
        <EventRow event={event} fixture={fixture} key={event.id} />
      ))}
    </View>
  );
}

function EventRow({
  event,
  fixture,
}: {
  event: KapEventSummary;
  fixture: boolean;
}) {
  const theme = useAtlasTheme();
  const symbol = event.instruments[0]?.symbol ?? '—';
  const company = event.companies[0]?.name ?? 'Eşleşmemiş şirket';
  return (
    <Pressable
      accessibilityLabel={eventAccessibilityLabel(event)}
      accessibilityRole="button"
      onPress={() =>
        router.push(
          `/research/events/${event.id}${fixture ? '?fixture=1' : ''}` as never,
        )
      }
      style={({ pressed }) => [
        styles.eventRow,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          borderLeftColor: theme.primary,
        },
        pressed && styles.pressed,
      ]}
      testID={`event-${event.id}`}
    >
      <View style={styles.eventTop}>
        <Text style={[styles.symbol, { color: theme.textPrimary }]}>
          {symbol}
        </Text>
        <Text style={[styles.time, { color: theme.textSecondary }]}>15:00</Text>
      </View>
      <Text
        numberOfLines={1}
        style={[styles.company, { color: theme.textSecondary }]}
      >
        {company}
      </Text>
      <Text style={[styles.eventTitle, { color: theme.textPrimary }]}>
        {event.title}
      </Text>
      <View style={styles.badges}>
        <Badge label={categoryLabels[event.category]} />
        {event.corrected ? <Badge label="DÜZELTİLMİŞ" /> : null}
        {event.relevance !== 'NONE' ? (
          <Badge
            label={
              event.relevance === 'BOTH'
                ? 'TAKİP + PORTFÖY'
                : event.relevance === 'WATCHLIST_RELEVANT'
                  ? 'TAKİP LİSTEM'
                  : 'PORTFÖYÜM'
            }
          />
        ) : null}
      </View>
      <Text style={[styles.sourceLine, { color: theme.textMuted }]}>
        KAP kaynağı · {new Date(event.publishedAt).toLocaleDateString('tr-TR')}{' '}
        · ›
      </Text>
    </Pressable>
  );
}

function EmptySearch() {
  return (
    <View accessibilityRole="summary" style={styles.empty}>
      <AtlasText role="titleSmall">Sonuç bulunamadı</AtlasText>
      <AtlasText role="bodySmall">
        Arama yalnızca izin verilen başlık, şirket ve sembol alanlarında
        yapılır.
      </AtlasText>
    </View>
  );
}

export function EventDetailScreen() {
  const parameters = useLocalSearchParams<{
    id: string;
    fixture?: string;
    view?: string;
  }>();
  const fixture = isFixture(parameters.fixture);
  const auth = useAuth();
  const api = useMemo(() => new MobileEventsApi(auth.client), [auth.client]);
  const query = useQuery({
    queryKey: ['kap-event', parameters.id],
    queryFn: ({ signal }) => api.detail(parameters.id, signal),
    enabled: !fixture,
  });
  const event = fixture
    ? (eventFixtures.find((item) => item.id === parameters.id) ??
      eventFixtures[0])
    : query.data?.data;
  if (!event)
    return (
      <SafeAreaScrollScreen contentContainerStyle={styles.screen}>
        {query.isLoading ? (
          <AtlasText>Bildirim yükleniyor…</AtlasText>
        ) : (
          <ProviderRequiredState />
        )}
      </SafeAreaScrollScreen>
    );
  return (
    <EventDetail
      event={event}
      fixture={fixture}
      showHistory={parameters.view === 'history'}
    />
  );
}

function EventDetail({
  event,
  fixture,
  showHistory,
}: {
  event: KapEventDetail;
  fixture: boolean;
  showHistory: boolean;
}) {
  const theme = useAtlasTheme();
  const [history, setHistory] = useState(showHistory);
  const scrollViewRef = useRef<ScrollView>(null);
  const historyAnchorApplied = useRef(false);
  const source = safeSourceUrl(event.source.reference)
    ? event.source.reference
    : null;
  return (
    <SafeAreaScrollScreen
      key={event.id}
      contentContainerStyle={[
        styles.screen,
        { backgroundColor: theme.background },
      ]}
      scrollViewRef={scrollViewRef}
      testID="event-detail-screen"
    >
      <AppHeader
        title={event.instruments[0]?.symbol ?? 'Bildirim'}
        subtitle="Kurumsal olay detayı"
      />
      {fixture ? <DemoBadge /> : null}
      <View
        style={[
          styles.detailHero,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            borderLeftColor: theme.primary,
          },
        ]}
      >
        <Text style={[styles.eyebrow, { color: theme.primary }]}>
          {categoryLabels[event.category].toUpperCase()}
        </Text>
        <AtlasText role="titleLarge">{event.title}</AtlasText>
        <Text style={[styles.company, { color: theme.textSecondary }]}>
          {event.companies
            .map((item) => item.name)
            .filter(Boolean)
            .join(' · ')}
        </Text>
        <View style={styles.badges}>
          {event.corrected ? (
            <Badge label="DÜZELTİLMİŞ BİLDİRİM" />
          ) : (
            <Badge label="AKTİF" />
          )}
          <Badge
            label={
              event.source.deliveryMode === 'LIVE' ? 'GÜNCEL' : 'GECİKMELİ'
            }
          />
          {event.relevance === 'BOTH' ? (
            <Badge label="TAKİP + PORTFÖY" />
          ) : null}
          {event.relevance === 'WATCHLIST_RELEVANT' ? (
            <Badge label="TAKİP LİSTEM" />
          ) : null}
          {event.relevance === 'PORTFOLIO_RELEVANT' ? (
            <Badge label="PORTFÖYÜM" />
          ) : null}
        </View>
      </View>
      <DetailSection title="Zaman ve dönem">
        <DetailLine
          label="Yayımlandı"
          value={formatTimestamp(event.publishedAt)}
        />
        <DetailLine
          label="Kullanılabilir"
          value={formatTimestamp(event.availableAt)}
        />
        <DetailLine
          label="Raporlama dönemi"
          value={event.reportingPeriod ?? 'Mevcut değil'}
        />
      </DetailSection>
      {event.summary ? (
        <DetailSection title="Kaynak özeti">
          <AtlasText>{event.summary}</AtlasText>
        </DetailSection>
      ) : (
        <DetailSection title="İçerik">
          <AtlasText>
            Kaynak yalnızca başlık ve harici belge sağlıyor. Atlas özet
            üretmedi.
          </AtlasText>
        </DetailSection>
      )}
      {Object.keys(event.attributes).length ? (
        <DetailSection title="Doğrulanmış alanlar">
          {Object.entries(event.attributes)
            .filter(
              ([, value]) =>
                value !== null &&
                !Array.isArray(value) &&
                typeof value !== 'object',
            )
            .map(([key, value]) => (
              <DetailLine key={key} label={key} value={String(value)} />
            ))}
        </DetailSection>
      ) : null}
      {event.attachments.length ? (
        <DetailSection title="Ekler">
          {event.attachments.map((attachment, index) => (
            <Pressable
              accessibilityRole="link"
              key={`${attachment.title ?? 'Ek'}-${index}`}
              onPress={() =>
                attachment.sourceUrl && safeSourceUrl(attachment.sourceUrl)
                  ? void Linking.openURL(attachment.sourceUrl)
                  : undefined
              }
              style={styles.attachment}
              testID={`event-attachment-${index}`}
            >
              <AtlasText role="labelLarge">
                {attachment.title ?? 'Kaynak eki'}
              </AtlasText>
              <AtlasText role="bodySmall">
                {attachment.mimeType ?? 'Tür bilinmiyor'}
                {attachment.sizeBytes
                  ? ` · ${Math.round(attachment.sizeBytes / 1024)} KB`
                  : ''}
              </AtlasText>
            </Pressable>
          ))}
        </DetailSection>
      ) : null}
      {event.corrected ? (
        <View
          onLayout={(layoutEvent: LayoutChangeEvent) => {
            if (!showHistory || historyAnchorApplied.current) return;
            historyAnchorApplied.current = true;
            scrollViewRef.current?.scrollTo({
              animated: false,
              y: Math.max(0, layoutEvent.nativeEvent.layout.y - spacing[16]),
            });
          }}
        >
          <DetailSection title="Düzeltme zinciri">
            <AtlasText>
              Bu sürüm önceki bildirimi düzeltir; tarihsel sürüm korunur.
            </AtlasText>
            <Button
              label={history ? 'Sürüm geçmişini gizle' : 'Önceki sürüm'}
              onPress={() => setHistory((value) => !value)}
              testID="revision-history"
            />
            {history ? (
              <View style={[styles.history, { borderColor: theme.border }]}>
                <Badge label="SÜRÜM 1 · SUPERSEDED" />
                <AtlasText role="bodySmall">
                  Önceki bildirim · 13 Ağu 2026 14:58
                </AtlasText>
              </View>
            ) : null}
          </DetailSection>
        </View>
      ) : null}
      <DetailSection title="Kaynak ve metodoloji">
        <DetailLine label="Veri kümesi" value={event.source.dataset} />
        <DetailLine label="Kalite" value={event.source.quality} />
        <DetailLine label="Lisans" value={event.source.licenseClass} />
        <DetailLine
          label="Sağlayıcı zamanı"
          value={formatTimestamp(event.source.sourceTimestamp)}
        />
        {source ? (
          <Button
            label="Asli kaynakta aç"
            onPress={() => void Linking.openURL(source)}
            testID="event-source"
          />
        ) : (
          <Badge label="GEÇERSİZ KAYNAK BAĞLANTISI" />
        )}
      </DetailSection>
      <Button
        label="Şirket detayına git"
        onPress={() =>
          router.push(
            `/symbol/${event.instruments[0]?.symbol ?? ''}${fixture ? '?fixture=1' : ''}` as never,
          )
        }
        testID="event-company"
      />
    </SafeAreaScrollScreen>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const theme = useAtlasTheme();
  return (
    <View
      style={[
        styles.detailSection,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <AtlasText accessibilityRole="header" role="titleSmall">
        {title}
      </AtlasText>
      {children}
    </View>
  );
}
function DetailLine({ label, value }: { label: string; value: string }) {
  const theme = useAtlasTheme();
  return (
    <View style={[styles.detailLine, { borderBottomColor: theme.border }]}>
      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.detailValue, { color: theme.textPrimary }]}>
        {value}
      </Text>
    </View>
  );
}
function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Istanbul',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  screen: { gap: spacing[16], padding: spacing[16] },
  intro: {
    borderLeftWidth: 3,
    gap: spacing[4],
    paddingLeft: spacing[12],
    paddingVertical: spacing[8],
  },
  eyebrow: { ...typography.styles.labelSmall, letterSpacing: 1.2 },
  introCopy: { ...typography.styles.bodySmall },
  fixtureLabel: { fontSize: 9, opacity: 0.55 },
  controls: { gap: spacing[12] },
  search: {
    borderRadius: radius.button,
    borderWidth: 1,
    minHeight: touchTargets.minimum,
    paddingHorizontal: spacing[16],
    ...typography.styles.bodyMedium,
  },
  chips: { gap: spacing[8] },
  relevanceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] },
  chip: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing[12],
  },
  chipText: { ...typography.styles.labelSmall },
  list: { gap: spacing[8] },
  eventRow: {
    borderRadius: radius.medium,
    borderWidth: 1,
    borderLeftWidth: 3,
    gap: spacing[4],
    padding: spacing[12],
  },
  eventTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  symbol: { ...typography.styles.financialSmall },
  time: { ...typography.styles.labelSmall, fontVariant: ['tabular-nums'] },
  company: { ...typography.styles.bodySmall },
  eventTitle: { ...typography.styles.labelLarge },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
    marginTop: spacing[4],
  },
  sourceLine: { ...typography.styles.labelSmall, marginTop: spacing[4] },
  pressed: { opacity: 0.72 },
  empty: { gap: spacing[8], paddingVertical: spacing[32] },
  detailHero: {
    borderRadius: radius.medium,
    borderWidth: 1,
    borderLeftWidth: 4,
    gap: spacing[8],
    padding: spacing[16],
  },
  detailSection: {
    borderRadius: radius.medium,
    borderWidth: 1,
    gap: spacing[12],
    padding: spacing[16],
  },
  detailLine: {
    alignItems: 'flex-start',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing[16],
    justifyContent: 'space-between',
    paddingBottom: spacing[8],
  },
  detailLabel: { ...typography.styles.bodySmall, flex: 1 },
  detailValue: {
    ...typography.styles.labelMedium,
    flex: 1.4,
    textAlign: 'right',
  },
  attachment: { minHeight: touchTargets.minimum, justifyContent: 'center' },
  history: { borderLeftWidth: 2, gap: spacing[8], paddingLeft: spacing[12] },
});
