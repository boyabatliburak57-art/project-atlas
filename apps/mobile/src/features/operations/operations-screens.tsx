import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AtlasApiError } from '@atlas/api-client';
import { Link, router, useLocalSearchParams } from 'expo-router';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  lightTheme,
  radius,
  spacing,
  touchTargets,
} from '@atlas/design-tokens';
import {
  AppHeader,
  Badge,
  Button,
  Card,
  OfflineState,
  ProviderRequiredState,
} from '@atlas/mobile-ui';
import {
  alertItems,
  environmentNotice,
  savedScans,
  scanResults,
  watchlistSymbols,
} from './operations-evidence-data';
import { useAuth } from '../../providers/auth-provider';
import { SafeAreaScrollScreen } from '../../components/safe-area-scroll-screen';
import { isRuntimeLocalMobileE2EHarness } from '../../config/local-e2e-harness';

type ScannerView =
  | 'saved'
  | 'provider'
  | 'presets'
  | 'builder'
  | 'validation'
  | 'progress'
  | 'results'
  | 'matched'
  | 'history';
type OperationsView =
  | 'lists'
  | 'detail'
  | 'provider'
  | 'alert-active'
  | 'alert-triggered'
  | 'alert-create'
  | 'preferences'
  | 'push'
  | 'denied'
  | 'notifications'
  | 'quiet';

function evidenceEnabled(value: string | string[] | undefined) {
  return isRuntimeLocalMobileE2EHarness() && value === '1';
}
function Screen({
  children,
  testID,
}: {
  children: React.ReactNode;
  testID: string;
}) {
  return (
    <SafeAreaScrollScreen contentContainerStyle={styles.screen} testID={testID}>
      {children}
    </SafeAreaScrollScreen>
  );
}
function Disclosure() {
  return environmentNotice ? <Badge label={environmentNotice} /> : null;
}
function TabStrip({
  items,
  active,
  onSelect,
}: {
  items: readonly string[];
  active: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View accessibilityRole="tablist" style={styles.tabs}>
      {items.map((item) => (
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: item === active }}
          key={item}
          onPress={() => onSelect(item)}
          style={[styles.tab, item === active && styles.tabActive]}
        >
          <Text style={item === active ? styles.tabTextActive : styles.tabText}>
            {item}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
function Action({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.action}
      testID={testID}
    >
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

export function ScannerScreen({
  initialView,
}: {
  initialView?: ScannerView;
} = {}) {
  const params = useLocalSearchParams<{
    fixture?: string;
    view?: ScannerView;
    offline?: string;
  }>();
  const fixture = evidenceEnabled(params.fixture);
  const view = params.view ?? initialView ?? 'saved';
  const navigate = (next: ScannerView) =>
    router.replace({
      pathname: '/radar/scanner',
      params: { fixture: '1', view: next },
    });
  if (params.offline === '1')
    return (
      <Screen testID="scanner-offline">
        <AppHeader title="Scanner" subtitle="Salt okunur önbellek" />
        <OfflineState />
      </Screen>
    );
  if (!fixture) return <LiveScannerScreen />;
  if (view === 'provider')
    return (
      <Screen testID="scanner-provider-required">
        <AppHeader
          title="Scanner"
          subtitle="Kuralları kaydet, sağlayıcı geldiğinde çalıştır"
        />
        <ProviderRequiredState />
        <Text style={styles.muted}>
          Scan execution kapalıdır; sahte sonuç üretilmez.
        </Text>
        <Button label="Saved scans" onPress={() => navigate('saved')} />
      </Screen>
    );
  return (
    <Screen testID={`scanner-${view}`}>
      <AppHeader
        title="Scanner"
        subtitle="Versioned AST · provider-authoritative execution"
      />
      <Disclosure />
      <TabStrip
        active={
          view === 'history'
            ? 'History'
            : view === 'builder' || view === 'validation'
              ? 'Create'
              : 'Saved Scans'
        }
        items={['Saved Scans', 'Create', 'History']}
        onSelect={(item) =>
          navigate(
            item === 'Create'
              ? 'builder'
              : item === 'History'
                ? 'history'
                : 'saved',
          )
        }
      />
      {view === 'saved' ? <SavedScans onNavigate={navigate} /> : null}
      {view === 'presets' ? <Presets onNavigate={navigate} /> : null}
      {view === 'builder' || view === 'validation' ? (
        <ScanBuilder invalid={view === 'validation'} onNavigate={navigate} />
      ) : null}
      {view === 'progress' ? <ScanProgress onNavigate={navigate} /> : null}
      {view === 'results' || view === 'matched' ? (
        <ScanResults matched={view === 'matched'} />
      ) : null}
      {view === 'history' ? <ScanHistory onNavigate={navigate} /> : null}
    </Screen>
  );
}

function SavedScans({
  onNavigate,
}: {
  onNavigate: (view: ScannerView) => void;
}) {
  return (
    <View testID="saved-scans-list">
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Kayıtlı taramalar</Text>
        <Action label="Presetler" onPress={() => onNavigate('presets')} />
      </View>
      {savedScans.map((scan) => (
        <Card key={scan.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{scan.name}</Text>
            <Badge label={scan.status.toUpperCase()} />
          </View>
          <Text style={styles.muted}>
            Revision {scan.revision} · BIST · 1D · {scan.conditions} koşul
          </Text>
          <Text>Son koşum: 31 Tem 2026 · Veri cutoff 18:10</Text>
          <View style={styles.actions}>
            <Action label="Düzenle" onPress={() => onNavigate('builder')} />
            <Action
              label="Çalıştır"
              onPress={() => onNavigate('progress')}
              testID="run-scan"
            />
          </View>
        </Card>
      ))}
      <Button
        label="Yeni tarama oluştur"
        onPress={() => onNavigate('presets')}
      />
    </View>
  );
}
function Presets({ onNavigate }: { onNavigate: (view: ScannerView) => void }) {
  const presets = [
    ['Momentum', 'Price · RSI · moving average', true],
    ['Breakout', 'Close · volume · confirmation', true],
    ['Value', 'Fundamentals provider gerekli', false],
    ['Dividend', 'Corporate-actions provider gerekli', false],
  ] as const;
  return (
    <View testID="scanner-presets">
      <Text style={styles.sectionTitle}>Versioned preset catalog</Text>
      {presets.map(([name, detail, available]) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !available }}
          disabled={!available}
          key={name}
          onPress={() => onNavigate('builder')}
          style={[styles.ledgerRow, !available && styles.disabled]}
          testID={`preset-${name.toLowerCase()}`}
        >
          <Text style={styles.cardTitle}>{name}</Text>
          <Text style={styles.muted}>{detail}</Text>
          <Badge label={available ? 'AVAILABLE · v1' : 'PROVIDER_REQUIRED'} />
        </Pressable>
      ))}
    </View>
  );
}
function ScanBuilder({
  invalid,
  onNavigate,
}: {
  invalid: boolean;
  onNavigate: (view: ScannerView) => void;
}) {
  const [combinator, setCombinator] = useState<'AND' | 'OR'>('AND');
  return (
    <View testID="scan-builder">
      <Text style={styles.sectionTitle}>Yeni tarama</Text>
      <TextInput
        accessibilityLabel="Tarama adı"
        placeholder="Tarama adı"
        style={styles.input}
      />
      <Text style={styles.eyebrow}>UNIVERSE</Text>
      <View style={styles.chips}>
        {['BIST', 'BIST 100', '1D', 'Limit 50'].map((label) => (
          <Badge key={label} label={label} />
        ))}
      </View>
      <View style={styles.rowBetween}>
        <Text style={styles.eyebrow}>CONDITION GROUP</Text>
        <Action
          label={combinator}
          onPress={() => setCombinator(combinator === 'AND' ? 'OR' : 'AND')}
          testID="toggle-combinator"
        />
      </View>
      <Condition label="RSI(14)" operator=">" value="55" />
      <Condition label="Close" operator="crosses above" value="SMA(200)" />
      <Action
        label="+ Koşul ekle"
        onPress={() => undefined}
        testID="add-condition"
      />
      {invalid ? (
        <View
          accessibilityRole="alert"
          style={styles.validation}
          testID="builder-validation-error"
        >
          <Text style={styles.validationTitle}>Koşul doğrulanamadı</Text>
          <Text>
            Empty condition group · alan ve operator allowlist zorunludur.
          </Text>
        </View>
      ) : (
        <Text style={styles.muted}>
          AST v1 · Derinlik 1/4 · Koşul 2/25 · Raw expression kabul edilmez.
        </Text>
      )}
      <View style={styles.actions}>
        <Action
          label="Kaydet"
          onPress={() => onNavigate('saved')}
          testID="save-scan"
        />
        <Action
          label="Kaydet ve çalıştır"
          onPress={() => onNavigate('progress')}
        />
      </View>
    </View>
  );
}
function Condition({
  label,
  operator,
  testID,
  value,
}: {
  label: string;
  operator: string;
  testID?: string;
  value: string;
}) {
  return (
    <View
      accessibilityLabel={`${label} ${operator} ${value}`}
      style={styles.condition}
      testID={testID}
    >
      <Badge label={label} />
      <Text>{operator}</Text>
      <Badge label={value} />
    </View>
  );
}
function ScanProgress({
  onNavigate,
}: {
  onNavigate: (view: ScannerView) => void;
}) {
  return (
    <View testID="scan-progress">
      <Text style={styles.sectionTitle}>Momentum takibi</Text>
      <Badge label="RUNNING · QUEUED WORKER" />
      <View
        accessibilityLabel="İlerleme yüzde 68"
        accessibilityRole="progressbar"
        style={styles.progressTrack}
      >
        <View style={[styles.progressFill, { width: '68%' }]} />
      </View>
      <Text style={styles.metric}>367 / 540 değerlendirildi</Text>
      <Text>14 eşleşme · 8,4 sn · Data cutoff 18:10</Text>
      <Text style={styles.muted}>
        Arka planda kontrollü devam eder; terminal durumda polling durur.
      </Text>
      <View style={styles.actions}>
        <Action
          label="İptal"
          onPress={() => onNavigate('history')}
          testID="cancel-scan"
        />
        <Action label="Sonuçları aç" onPress={() => onNavigate('results')} />
      </View>
    </View>
  );
}
function ScanResults({ matched }: { matched: boolean }) {
  return (
    <View testID={matched ? 'matched-conditions' : 'scan-results'}>
      <Text style={styles.sectionTitle}>14 eşleşme</Text>
      <Text style={styles.muted}>
        Revision 4 · BIST · cutoff 31 Tem 18:10 · Cursor page 1
      </Text>
      {scanResults.map((result) => (
        <Link
          href={`/symbol/${result.symbol}?fixture=1`}
          asChild
          key={result.symbol}
        >
          <Pressable
            accessibilityRole="button"
            style={styles.ledgerRow}
            testID={`scan-result-${result.symbol}`}
          >
            <View style={styles.rowBetween}>
              <Text style={styles.symbol}>{result.symbol}</Text>
              <Badge label="MATCHED" />
            </View>
            <Text>{result.company}</Text>
            <Text style={styles.reason}>{result.reason}</Text>
            {matched ? (
              <Text style={styles.muted}>
                conditionId c-14 · observed 62,4 · threshold 55 · evaluation
                18:10
              </Text>
            ) : null}
          </Pressable>
        </Link>
      ))}
      <Action
        label="Sonraki cursor sayfası"
        onPress={() => undefined}
        testID="results-next-page"
      />
      <View style={styles.actions}>
        <Action
          label="İzleme listesine ekle"
          onPress={() => router.push('/radar/watchlists?fixture=1&view=detail')}
        />
        <Action
          label="Alarm oluştur"
          onPress={() =>
            router.push('/radar/alerts?fixture=1&view=alert-create')
          }
        />
      </View>
    </View>
  );
}
function ScanHistory({
  onNavigate,
}: {
  onNavigate: (view: ScannerView) => void;
}) {
  return (
    <View testID="scan-history">
      <Text style={styles.sectionTitle}>Koşum geçmişi</Text>
      {[
        'COMPLETED · 14 sonuç · 8,4 sn',
        'CANCELLED · 203/540',
        'PROVIDER_REQUIRED · çalıştırılmadı',
      ].map((item, index) => (
        <Pressable
          key={item}
          onPress={() => index === 0 && onNavigate('results')}
          style={styles.timelineRow}
        >
          <View style={styles.timelineDot} />
          <View>
            <Text style={styles.cardTitle}>Momentum · r4</Text>
            <Text
              testID={
                item.startsWith('CANCELLED') ? 'history-cancelled' : undefined
              }
            >
              {item}
            </Text>
            <Text style={styles.muted}>31 Tem 2026 · cutoff kayıtlı</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

export function WatchlistsAlertsScreen({
  initialView,
}: {
  initialView?: OperationsView;
} = {}) {
  const params = useLocalSearchParams<{
    fixture?: string;
    view?: OperationsView;
  }>();
  const fixture = evidenceEnabled(params.fixture);
  const view = params.view ?? initialView ?? 'lists';
  const navigate = (next: OperationsView) =>
    router.replace({
      pathname: '/radar/watchlists',
      params: { fixture: '1', view: next },
    });
  if (!fixture)
    return (
      <LiveOperationsScreen
        initialSection={
          view === 'notifications'
            ? 'activity'
            : view.startsWith('alert')
              ? 'alerts'
              : 'lists'
        }
      />
    );
  return (
    <Screen testID={`operations-${view}`}>
      <AppHeader
        title="İzleme listeleri ve alarmlar"
        subtitle="Owner-scoped · version-aware"
      />
      <Disclosure />
      <TabStrip
        active={
          view.startsWith('alert')
            ? 'Alerts'
            : view === 'notifications'
              ? 'Activity'
              : 'My Lists'
        }
        items={['My Lists', 'Alerts', 'Activity']}
        onSelect={(item) =>
          navigate(
            item === 'Alerts'
              ? 'alert-active'
              : item === 'Activity'
                ? 'notifications'
                : 'lists',
          )
        }
      />
      {view === 'lists' ? <WatchlistList onNavigate={navigate} /> : null}
      {view === 'detail' || view === 'provider' ? (
        <WatchlistDetail provider={view === 'provider'} onNavigate={navigate} />
      ) : null}
      {view === 'alert-active' || view === 'alert-triggered' ? (
        <AlertList
          triggered={view === 'alert-triggered'}
          onNavigate={navigate}
        />
      ) : null}
      {view === 'alert-create' ? <AlertBuilder onNavigate={navigate} /> : null}
      {view === 'preferences' || view === 'quiet' ? (
        <NotificationPreferences
          quiet={view === 'quiet'}
          onNavigate={navigate}
        />
      ) : null}
      {view === 'push' || view === 'denied' ? (
        <PushPermission denied={view === 'denied'} onNavigate={navigate} />
      ) : null}
      {view === 'notifications' ? <NotificationCenter /> : null}
    </Screen>
  );
}
function WatchlistList({
  onNavigate,
}: {
  onNavigate: (view: OperationsView) => void;
}) {
  return (
    <View testID="watchlist-list">
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Listelerim</Text>
        <Action label="Yeni liste" onPress={() => onNavigate('detail')} />
      </View>
      {[
        ['BIST çekirdek', 12],
        ['Araştırma', 7],
      ].map(([name, count]) => (
        <Pressable
          key={String(name)}
          onPress={() => onNavigate('detail')}
          style={styles.ledgerRow}
        >
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{name}</Text>
            <Badge label={`${count} SYMBOL`} />
          </View>
          <Text style={styles.muted}>
            Private · Updated 31 Tem 18:10 · Version 3
          </Text>
        </Pressable>
      ))}
      <View style={styles.actions}>
        <Action
          label="Bildirim tercihleri"
          onPress={() => onNavigate('preferences')}
        />
        <Action label="Push ayarları" onPress={() => onNavigate('push')} />
      </View>
    </View>
  );
}
function WatchlistDetail({
  provider,
  onNavigate,
}: {
  provider: boolean;
  onNavigate: (view: OperationsView) => void;
}) {
  return (
    <View testID="watchlist-detail">
      <Text style={styles.sectionTitle}>BIST çekirdek</Text>
      <View style={styles.rowBetween} testID="watchlist-version-contract">
        <Text style={styles.muted}>3 sembol</Text>
        <Text style={styles.muted} testID="watchlist-private">
          Private
        </Text>
        <Text style={styles.muted}>expectedVersion 3</Text>
      </View>
      {provider ? <ProviderRequiredState /> : null}
      <FlatList
        data={watchlistSymbols}
        keyExtractor={(item) => item.symbol}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.ledgerRow}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.symbol}>{item.symbol}</Text>
                <Text>{item.company}</Text>
              </View>
              <Badge label={provider ? 'PROVIDER_REQUIRED' : 'METADATA_ONLY'} />
            </View>
            <Text style={styles.muted}>
              Fiyat alanı sahte değerle doldurulmaz.
            </Text>
          </View>
        )}
      />
      <View style={styles.actions}>
        <Action
          label="Sembol ekle"
          onPress={() => undefined}
          testID="watchlist-add-symbol"
        />
        <Action
          label="Alarm oluştur"
          onPress={() => onNavigate('alert-create')}
        />
      </View>
    </View>
  );
}
function AlertList({
  triggered,
  onNavigate,
}: {
  triggered: boolean;
  onNavigate: (view: OperationsView) => void;
}) {
  return (
    <View testID={triggered ? 'alerts-triggered' : 'alerts-active'}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {triggered ? 'Tetiklenenler' : 'Aktif alarmlar'}
        </Text>
        <Action
          label={triggered ? 'Aktif' : 'Geçmiş'}
          onPress={() =>
            onNavigate(triggered ? 'alert-active' : 'alert-triggered')
          }
        />
      </View>
      {alertItems
        .filter((item) => !triggered || item.state === 'triggered')
        .map((item) => (
          <View key={item.id} style={styles.ledgerRow}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Badge label={item.state.toUpperCase()} />
            </View>
            <Text>{item.type} · server-authoritative crossing/evaluation</Text>
            <Text style={styles.muted}>
              Last evaluated 18:10 · Push + in-app · no raw rule AST
            </Text>
          </View>
        ))}
      <Action label="Yeni alarm" onPress={() => onNavigate('alert-create')} />
    </View>
  );
}
function AlertBuilder({
  onNavigate,
}: {
  onNavigate: (view: OperationsView) => void;
}) {
  const [type, setType] = useState('PRICE');
  return (
    <View testID="alert-builder">
      <Text style={styles.sectionTitle}>Alarm oluştur</Text>
      <View style={styles.chips}>
        {['PRICE', 'INDICATOR', 'SAVED_SCAN'].map((value) => (
          <Pressable
            key={value}
            onPress={() => setType(value)}
            style={[styles.tab, type === value && styles.tabActive]}
          >
            <Text
              style={type === value ? styles.tabTextActive : styles.tabText}
            >
              {value}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        accessibilityLabel="Eşik"
        keyboardType="decimal-pad"
        placeholder="Eşik"
        style={styles.input}
      />
      <Condition
        label={
          type === 'INDICATOR'
            ? 'RSI(14)'
            : type === 'SAVED_SCAN'
              ? 'Momentum r4'
              : 'THYAO'
        }
        operator="crosses above"
        {...(type === 'SAVED_SCAN'
          ? { testID: 'saved-scan-alert-condition' }
          : {})}
        value={type === 'PRICE' ? '320 TRY' : 'threshold'}
      />
      <Text style={styles.muted} testID="alert-provider-contract">
        Crossing mobile client’ta hesaplanmaz. Provider yoksa evaluation
        PROVIDER_REQUIRED kalır.
      </Text>
      <View style={styles.actions}>
        <Action
          label="Kaydet"
          onPress={() => onNavigate('alert-active')}
          testID="save-alert"
        />
        <Action label="Geçmiş" onPress={() => onNavigate('alert-triggered')} />
      </View>
    </View>
  );
}
function NotificationPreferences({
  quiet,
  onNavigate,
}: {
  quiet: boolean;
  onNavigate: (view: OperationsView) => void;
}) {
  const [push, setPush] = useState(true);
  const [digest, setDigest] = useState(false);
  return (
    <View testID={quiet ? 'quiet-hours' : 'notification-preferences'}>
      <Text style={styles.sectionTitle}>Bildirim tercihleri</Text>
      <Preference label="Uygulama içi" value />
      <Preference label="Push" value={push} onChange={setPush} />
      <Preference label="Günlük özet" value={digest} onChange={setDigest} />
      <Preference label="Güvenlik bildirimleri" value disabled />
      <Card>
        <Text style={styles.cardTitle}>E-posta</Text>
        <Badge label="SANDBOX_INTEGRATION" />
      </Card>
      <Card>
        <Text style={styles.cardTitle}>Sessiz saatler</Text>
        <Text>23:00–07:00 · Europe/Istanbul · gece aralığı</Text>
        <Text style={styles.muted}>
          Güvenlik bildirimleri ertelenmez; event zamanı ve dedup key korunur.
        </Text>
      </Card>
      {quiet ? (
        <Badge label="OVERNIGHT · TIMEZONE_AWARE · SECURITY_EXCEPTION" />
      ) : (
        <Action
          label="Sessiz saatleri düzenle"
          onPress={() => onNavigate('quiet')}
        />
      )}
    </View>
  );
}
function Preference({
  label,
  value,
  disabled = false,
  onChange,
}: {
  label: string;
  value: boolean;
  disabled?: boolean;
  onChange?: (value: boolean) => void;
}) {
  return (
    <View style={styles.preference}>
      <Text style={styles.cardTitle}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        disabled={disabled}
        onValueChange={onChange}
        value={value}
      />
    </View>
  );
}
function PushPermission({
  denied,
  onNavigate,
}: {
  denied: boolean;
  onNavigate: (view: OperationsView) => void;
}) {
  return (
    <View testID={denied ? 'push-denied' : 'push-prepermission'}>
      <Text style={styles.sectionTitle}>
        {denied ? 'Push izni kapalı' : 'Önemli gelişmeleri takip et'}
      </Text>
      <Text>
        {denied
          ? 'İzin yeniden sorulmaz. Sistem Ayarları bağlantısını kullanabilirsiniz.'
          : 'Alarm tetiklenmeleri ve tarama tamamlanmaları için güvenli, sınırlı bildirim alın.'}
      </Text>
      <Badge label={denied ? 'DENIED' : 'NOT_DETERMINED'} />
      <Text style={styles.muted}>
        Token ekranda, logda veya telemetry’de gösterilmez. Canlı APNs delivery
        doğrulanmamıştır.
      </Text>
      <View style={styles.actions}>
        <Action
          label={denied ? 'Ayarları aç' : 'İzin ver'}
          onPress={() => onNavigate(denied ? 'preferences' : 'notifications')}
          testID="request-push-permission"
        />
        <Action label="Şimdi değil" onPress={() => onNavigate('denied')} />
      </View>
    </View>
  );
}
function NotificationCenter() {
  return (
    <View testID="notification-center">
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Aktivite</Text>
        <Badge label="2 UNREAD" />
      </View>
      {[
        ['SCAN_COMPLETED', 'Momentum taraması tamamlandı'],
        ['ALERT_TRIGGERED', 'Bir alarm koşulu oluştu'],
        ['PUSH_PERMISSION_CHANGED', 'Push tercihi güncellendi'],
      ].map(([type, title], index) => (
        <View key={type} style={styles.timelineRow}>
          <View
            style={[styles.timelineDot, index > 1 && styles.timelineRead]}
          />
          <View>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.muted}>{type} · güvenli özet · 18:10</Text>
          </View>
        </View>
      ))}
      <Action
        label="Tümünü okundu işaretle"
        onPress={() => undefined}
        testID="mark-all-read"
      />
    </View>
  );
}

type ApiEnvelope<T> = {
  readonly data: T;
  readonly meta?: { readonly nextCursor?: string | null };
};

type LiveSavedScan = {
  readonly id: string;
  readonly name: string;
  readonly currentRevision: number;
  readonly status: string;
  readonly updatedAt: string;
};

type LiveWatchlist = {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly updatedAt: string;
  readonly items: readonly unknown[];
};

type LiveAlert = {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly currentRevision: number;
};

type LiveNotification = {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly readAt: string | null;
  readonly occurredAt: string;
};

function safeApiMessage(error: unknown): string {
  return error instanceof AtlasApiError
    ? `${error.safeMessage}${error.requestId ? ` · ${error.requestId}` : ''}`
    : 'İstek tamamlanamadı. Lütfen yeniden deneyin.';
}

function LiveScannerScreen() {
  const { client, state } = useAuth();
  const owner = 'session' in state ? state.session.userId : 'anonymous';
  const scans = useQuery({
    queryKey: ['private', owner, 'saved-scans'],
    queryFn: () =>
      client.request<ApiEnvelope<readonly LiveSavedScan[]>>({
        path: '/saved-scans',
      }),
  });
  return (
    <Screen testID="scanner-production">
      <AppHeader
        title="Scanner"
        subtitle="Kısıtlı taramalar özel ve revision tabanlıdır"
      />
      <Button
        label="Radar'a dön"
        onPress={() => router.replace('/(tabs)/radar')}
      />
      {scans.isPending ? <Text>Kayıtlı taramalar yükleniyor…</Text> : null}
      {scans.isError ? (
        <Card>
          <Text style={styles.validationTitle}>
            {safeApiMessage(scans.error)}
          </Text>
          <Button label="Yeniden dene" onPress={() => void scans.refetch()} />
        </Card>
      ) : null}
      {scans.data?.data.length === 0 ? (
        <Card>
          <Text style={styles.cardTitle}>Henüz kayıtlı tarama yok</Text>
          <Text style={styles.muted}>
            Kural oluşturucu backend'in paylaşılan AST sözleşmesini kullanır.
          </Text>
        </Card>
      ) : null}
      {scans.data?.data.map((scan) => (
        <Card key={scan.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{scan.name}</Text>
            <Badge label={scan.status.toUpperCase()} />
          </View>
          <Text>Revision {scan.currentRevision}</Text>
          <Text style={styles.muted}>Güncellendi: {scan.updatedAt}</Text>
        </Card>
      ))}
      <ProviderRequiredState />
      <Text style={styles.muted}>
        Canlı tarama yalnız veri sağlayıcısı kullanılabilir olduğunda backend
        worker tarafından çalıştırılır; istemci sahte sonuç üretmez.
      </Text>
    </Screen>
  );
}

function LiveOperationsScreen({
  initialSection,
}: {
  initialSection: 'lists' | 'alerts' | 'activity';
}) {
  const { client, state } = useAuth();
  const queryClient = useQueryClient();
  const owner = 'session' in state ? state.session.userId : 'anonymous';
  const [section, setSection] = useState<'lists' | 'alerts' | 'activity'>(
    initialSection,
  );
  const [name, setName] = useState('');
  const lists = useQuery({
    queryKey: ['private', owner, 'watchlists'],
    queryFn: () =>
      client.request<ApiEnvelope<{ readonly items: readonly LiveWatchlist[] }>>(
        {
          path: '/watchlists?limit=50',
        },
      ),
  });
  const alerts = useQuery({
    queryKey: ['private', owner, 'alerts'],
    queryFn: () =>
      client.request<ApiEnvelope<readonly LiveAlert[]>>({
        path: '/alerts?limit=50',
      }),
  });
  const notifications = useQuery({
    queryKey: ['private', owner, 'notifications'],
    queryFn: () =>
      client.request<ApiEnvelope<readonly LiveNotification[]>>({
        path: '/notifications?limit=50',
      }),
  });
  const createList = useMutation({
    mutationFn: () =>
      client.request<ApiEnvelope<LiveWatchlist>>({
        method: 'POST',
        path: '/watchlists',
        body: { name: name.trim() },
      }),
    onSuccess: () => {
      setName('');
      void queryClient.invalidateQueries({
        queryKey: ['private', owner, 'watchlists'],
      });
    },
  });
  const busy = lists.isPending || alerts.isPending || notifications.isPending;
  const error = lists.error ?? alerts.error ?? notifications.error;
  return (
    <Screen testID="watchlists-production">
      <AppHeader
        title="İzleme listeleri ve alarmlar"
        subtitle="Owner-scoped kaynaklar · piyasa değerleri capability-gated"
      />
      <Button
        label="Radar'a dön"
        onPress={() => router.replace('/(tabs)/radar')}
      />
      <TabStrip
        active={section}
        items={['lists', 'alerts', 'activity']}
        onSelect={(value) =>
          setSection(value as 'lists' | 'alerts' | 'activity')
        }
      />
      {busy ? <Text>Kayıtlar yükleniyor…</Text> : null}
      {error ? (
        <Card>
          <Text style={styles.validationTitle}>{safeApiMessage(error)}</Text>
        </Card>
      ) : null}
      {section === 'lists' ? (
        <>
          <TextInput
            accessibilityLabel="Yeni izleme listesi adı"
            maxLength={160}
            onChangeText={setName}
            placeholder="Yeni liste adı"
            style={styles.input}
            value={name}
          />
          <Button
            disabled={name.trim().length === 0 || createList.isPending}
            label={createList.isPending ? 'Oluşturuluyor…' : 'Liste oluştur'}
            onPress={() => createList.mutate()}
          />
          {createList.isError ? (
            <Text style={styles.validationTitle}>
              {safeApiMessage(createList.error)}
            </Text>
          ) : null}
          {lists.data?.data.items.map((list) => (
            <Card key={list.id}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{list.name}</Text>
                <Badge label={`${list.items.length} SYMBOL`} />
              </View>
              <Text style={styles.muted}>
                {list.status} · {list.updatedAt}
              </Text>
            </Card>
          ))}
          <ProviderRequiredState />
        </>
      ) : null}
      {section === 'alerts'
        ? alerts.data?.data.map((alert) => (
            <Card key={alert.id}>
              <Text style={styles.cardTitle}>{alert.name}</Text>
              <Text>
                {alert.status} · Revision {alert.currentRevision}
              </Text>
            </Card>
          ))
        : null}
      {section === 'activity'
        ? notifications.data?.data.map((notification) => (
            <Card key={notification.id}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{notification.title}</Text>
                <Badge label={notification.readAt ? 'READ' : 'UNREAD'} />
              </View>
              <Text>{notification.body}</Text>
              <Text style={styles.muted}>{notification.occurredAt}</Text>
            </Card>
          ))
        : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    borderColor: '#C9D4E5',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: touchTargets.minimum,
    paddingHorizontal: spacing[12],
  },
  actionText: { color: lightTheme.primary, fontWeight: '700' },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
    marginTop: spacing[8],
  },
  cardTitle: { color: lightTheme.textPrimary, fontSize: 17, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] },
  condition: {
    alignItems: 'center',
    backgroundColor: '#F4F7FB',
    borderRadius: radius.medium,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
    marginVertical: spacing[8],
    minHeight: 56,
    padding: spacing[12],
  },
  disabled: { opacity: 0.46 },
  eyebrow: {
    color: '#60708A',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginTop: spacing[12],
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9D4E5',
    borderRadius: radius.medium,
    borderWidth: 1,
    color: lightTheme.textPrimary,
    fontSize: 17,
    minHeight: 52,
    paddingHorizontal: spacing[12],
  },
  ledgerRow: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#DCE4EF',
    borderBottomWidth: 1,
    gap: spacing[8],
    minHeight: 84,
    paddingVertical: spacing[12],
  },
  metric: {
    color: lightTheme.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    marginTop: spacing[12],
  },
  muted: { color: '#63718A', lineHeight: 21 },
  preference: {
    alignItems: 'center',
    borderBottomColor: '#DCE4EF',
    borderBottomWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    minHeight: 62,
  },
  progressFill: {
    backgroundColor: lightTheme.primary,
    borderRadius: 5,
    height: 10,
  },
  progressTrack: {
    backgroundColor: '#DCE7F7',
    borderRadius: 5,
    height: 10,
    marginTop: spacing[20],
    overflow: 'hidden',
  },
  reason: { color: '#183A67', fontWeight: '600' },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
    justifyContent: 'space-between',
  },
  screen: {
    backgroundColor: '#F3F6FA',
    flexGrow: 1,
    gap: spacing[12],
    padding: spacing[16],
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: lightTheme.textPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
  symbol: {
    color: lightTheme.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  tab: {
    alignItems: 'center',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: touchTargets.minimum,
    paddingHorizontal: spacing[12],
  },
  tabActive: { backgroundColor: lightTheme.primary },
  tabText: { color: '#53627A', fontWeight: '700' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '800' },
  tabs: {
    backgroundColor: '#E9EEF6',
    borderRadius: 999,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
    padding: spacing[4],
  },
  timelineDot: {
    backgroundColor: lightTheme.primary,
    borderRadius: 7,
    height: 14,
    marginTop: 5,
    width: 14,
  },
  timelineRead: { backgroundColor: '#A8B4C6' },
  timelineRow: {
    borderLeftColor: '#BCD0EF',
    borderLeftWidth: 2,
    flexDirection: 'row',
    gap: spacing[12],
    marginLeft: 7,
    minHeight: 76,
    paddingBottom: spacing[16],
    paddingLeft: spacing[12],
  },
  validation: {
    backgroundColor: '#FFF2F2',
    borderColor: '#E7A5A5',
    borderRadius: radius.medium,
    borderWidth: 1,
    padding: spacing[12],
  },
  validationTitle: { color: '#A32626', fontWeight: '800' },
});
