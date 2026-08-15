import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { spacing } from '@atlas/design-tokens';
import {
  AppHeader,
  Badge,
  FeatureEntryRow,
  GlobalActionButton,
  HubSection,
  ProfileMenu,
  useAtlasTheme,
} from '@atlas/mobile-ui';
import {
  customerFeaturesForHub,
  featureById,
  type PrimaryHub,
} from './feature-registry';
import { useAuth } from '../providers/auth-provider';
import { SafeAreaScrollScreen } from '../components/safe-area-scroll-screen';
import { isRuntimeLocalMobileE2EHarness } from '../config/local-e2e-harness';

function GlobalActions() {
  const parameters = useLocalSearchParams<{ fixture?: string }>();
  const fixture =
    (__DEV__ || isRuntimeLocalMobileE2EHarness()) && parameters.fixture === '1';
  const href = (pathname: string) =>
    fixture
      ? ({ pathname, params: { fixture: '1' } } as never)
      : (pathname as never);
  return (
    <>
      <GlobalActionButton
        glyph="⌕"
        label="Global Search"
        onPress={() => router.push(href('/search'))}
        testID="global-search"
      />
      <GlobalActionButton
        glyph="▣"
        label="Smart Inbox"
        onPress={() => router.push(href('/inbox'))}
        testID="global-inbox"
      />
      <GlobalActionButton
        glyph="A"
        label="Profil ve hesap"
        onPress={() => router.push(href('/profile'))}
        testID="global-profile"
      />
    </>
  );
}

function HubShell({
  title,
  question,
  children,
  testID,
}: {
  title: string;
  question: string;
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
      <AppHeader actions={<GlobalActions />} title={title} />
      <Text
        accessibilityRole="header"
        style={[styles.question, { color: theme.textPrimary }]}
      >
        {question}
      </Text>
      {children}
    </SafeAreaScrollScreen>
  );
}

function MutedNote({ children }: { children: React.ReactNode }) {
  const theme = useAtlasTheme();
  return (
    <Text style={[styles.note, { color: theme.textSecondary }]}>
      {children}
    </Text>
  );
}

function Entry({ id }: { id: string }) {
  const parameters = useLocalSearchParams<{ fixture?: string }>();
  const item = featureById(id);
  if (!item || item.visibility !== 'CUSTOMER') return null;
  const fixture =
    (__DEV__ || isRuntimeLocalMobileE2EHarness()) && parameters.fixture === '1';
  const internalRoute =
    item.id === 'events-calendar'
      ? '/(tabs)/research/events'
      : item.id === 'institutional'
        ? '/(tabs)/markets/institutional'
        : item.id === 'market-structure'
          ? '/(tabs)/markets/market-structure'
          : item.canonicalRoute;
  const destination = fixture
    ? ({ pathname: internalRoute, params: { fixture: '1' } } as never)
    : (internalRoute as never);
  const open = () => {
    if (
      item.id === 'events-calendar' ||
      item.id === 'institutional' ||
      item.id === 'market-structure'
    ) {
      router.navigate(destination);
      return;
    }
    router.push(destination);
  };
  return (
    <FeatureEntryRow
      description={item.shortDescription}
      onPress={open}
      testID={`feature-${item.id}`}
      title={item.title}
    />
  );
}

export function HomeHubScreen() {
  return (
    <HubShell
      question="Bugün ne dikkat gerektiriyor?"
      testID="hub-home"
      title="Home"
    >
      <HubSection
        description="Gerçek kaynaklara bağlanan mevcut özetler"
        title="Şimdi"
      >
        <Entry id="market-overview" />
        <Entry id="portfolio-overview" />
        <Entry id="alerts" />
      </HubSection>
      <HubSection
        description="Kaldığın araştırmaya canonical rotasından devam et"
        title="Devam et"
      >
        <Entry id="watchlists" />
        <Entry id="scanner" />
        <Entry id="strategy-lab" />
      </HubSection>
      <MutedNote>
        Atlas Pulse, kurumsal özetler ve takvim kartları capability aktif olana
        kadar müşteri navigasyonunda gösterilmez.
      </MutedNote>
    </HubShell>
  );
}

export function MarketsHubScreen() {
  return (
    <HubShell
      question="Piyasada ne oluyor?"
      testID="hub-markets"
      title="Markets"
    >
      <HubSection title="Piyasa görünümü">
        <Entry id="market-overview" />
        <Entry id="indices" />
        <Entry id="sectors" />
      </HubSection>
      <HubSection
        description="AKD işlem akışı ile Takas saklama dağılımını ayırır"
        title="Genişleyen araştırma alanları"
      >
        <Entry id="institutional" />
        <Entry id="market-structure" />
        <MutedNote>
          VİOP ve fonlar ilgili capability uygulanana kadar customer
          navigation'da gizli kalır.
        </MutedNote>
      </HubSection>
    </HubShell>
  );
}

export function RadarHubScreen() {
  return (
    <HubShell question="Neyi araştırmalıyım?" testID="hub-radar" title="Radar">
      <HubSection title="Keşfet">
        <Entry id="scanner" />
      </HubSection>
      <HubSection title="Araştırmalarım">
        <Entry id="saved-scans" />
        <Entry id="watchlists" />
        <Entry id="alerts" />
        <Entry id="radar-activity" />
      </HubSection>
    </HubShell>
  );
}

export function PortfolioHubScreen() {
  return (
    <HubShell
      question="Portföyüm nasıl konumlanıyor?"
      testID="hub-portfolio"
      title="Portfolio"
    >
      <HubSection title="Portföy">
        {customerFeaturesForHub('portfolio').map((item) => (
          <Entry id={item.id} key={item.id} />
        ))}
      </HubSection>
      <MutedNote>
        Portfolio kayıt ve analiz alanıdır; broker bağlantısı veya emir yürütme
        içermez.
      </MutedNote>
    </HubShell>
  );
}

export function ResearchHubScreen() {
  return (
    <HubShell
      question="Neden oldu, geçmişte nasıl davrandı?"
      testID="hub-research"
      title="Research"
    >
      <HubSection
        title="Şirket olayları"
        description="KAP kaynağı, düzeltmeler ve kişisel ilgi bağlamı"
      >
        <Entry id="events-calendar" />
      </HubSection>
      <HubSection title="Araştırma araçları">
        <Entry id="strategy-lab" />
        <Entry id="backtests" />
        <Entry id="reports" />
        <Entry id="methodology" />
      </HubSection>
      <MutedNote>
        Tam takvim merkezi ve şirket karşılaştırma araçları ilgili
        capability'ler uygulanana kadar customer navigation'da gizlidir.
      </MutedNote>
    </HubShell>
  );
}

export function ProfileMenuScreen() {
  const auth = useAuth();
  const theme = useAtlasTheme();
  const parameters = useLocalSearchParams<{ fixture?: string }>();
  const fixture =
    (__DEV__ || isRuntimeLocalMobileE2EHarness()) && parameters.fixture === '1';
  return (
    <SafeAreaScrollScreen
      contentContainerStyle={[
        styles.screen,
        { backgroundColor: theme.background },
      ]}
      testID="profile-menu"
    >
      <AppHeader title="Profil" subtitle="Hesap ve uygulama tercihleri" />
      <ProfileMenu>
        <Entry id="account" />
        <Entry id="settings" />
        <Entry id="privacy-security" />
        <Entry id="help" />
        <Entry id="support" />
        <Entry id="legal" />
        <FeatureEntryRow
          description="Uygulama sürümü ve ürün sınırları"
          onPress={() =>
            router.push(
              fixture
                ? ({ pathname: '/about', params: { fixture: '1' } } as never)
                : '/about',
            )
          }
          testID="feature-about"
          title="Hakkında"
        />
        <FeatureEntryRow
          description="Özel cihaz ve navigation state temizlenir"
          onPress={() =>
            void auth.logout().finally(() => router.replace('/welcome'))
          }
          testID="profile-logout"
          title="Çıkış yap"
        />
      </ProfileMenu>
      <Badge label="VoiceOver manual validation · NOT_EXECUTED" />
    </SafeAreaScrollScreen>
  );
}

export function assertCustomerHubLimit(hub: PrimaryHub): boolean {
  return customerFeaturesForHub(hub).length <= 7;
}

const styles = StyleSheet.create({
  note: { fontSize: 13, lineHeight: 19 },
  question: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  screen: {
    flexGrow: 1,
    gap: spacing[20],
    padding: spacing[16],
  },
});
