export type NavigationDomain =
  | 'home'
  | 'market-data'
  | 'institutional-flow'
  | 'settlement'
  | 'market-measures'
  | 'derivatives'
  | 'funds'
  | 'scanner'
  | 'watchlists'
  | 'alerts'
  | 'portfolio'
  | 'company'
  | 'events'
  | 'comparison'
  | 'strategy'
  | 'reports'
  | 'methodology'
  | 'account';

export type NavigationAvailability =
  | 'AVAILABLE'
  | 'PROVIDER_REQUIRED'
  | 'LICENSE_REQUIRED'
  | 'EXTERNAL_CONFIGURATION_REQUIRED'
  | 'COMING_IN_CURRENT_EXPANSION'
  | 'DEFERRED_V1_1'
  | 'NOT_AVAILABLE';

export type NavigationVisibility =
  | 'CUSTOMER'
  | 'CAPABILITY_GATED'
  | 'DEVELOPMENT_ONLY';

export type PrimaryHub =
  | 'home'
  | 'markets'
  | 'radar'
  | 'portfolio'
  | 'research'
  | 'profile'
  | 'global';

export const primaryNavigation = [
  { routeName: 'home', label: 'Home' },
  { routeName: 'markets', label: 'Markets' },
  { routeName: 'radar', label: 'Radar' },
  { routeName: 'portfolio', label: 'Portfolio' },
  { routeName: 'research', label: 'Research' },
] as const;

export interface FeatureRegistryItem {
  readonly id: string;
  readonly domain: NavigationDomain;
  readonly primaryHub: PrimaryHub;
  readonly canonicalRoute: string;
  readonly title: string;
  readonly shortDescription: string;
  readonly icon: string;
  readonly availability: NavigationAvailability;
  readonly capability?: string;
  readonly featureFlag?: string;
  readonly externalDependency?: string;
  readonly visibility: NavigationVisibility;
  readonly minimumRole?: 'admin';
  readonly searchable: boolean;
  readonly inboxDestinationSupport: boolean;
  readonly analyticsCategory: string;
}

const available = (
  item: Omit<
    FeatureRegistryItem,
    'availability' | 'visibility' | 'searchable' | 'inboxDestinationSupport'
  > &
    Partial<
      Pick<
        FeatureRegistryItem,
        'visibility' | 'searchable' | 'inboxDestinationSupport'
      >
    >,
): FeatureRegistryItem => ({
  availability: 'AVAILABLE',
  visibility: 'CUSTOMER',
  searchable: false,
  inboxDestinationSupport: false,
  ...item,
});

const future = (
  item: Omit<
    FeatureRegistryItem,
    'availability' | 'visibility' | 'searchable' | 'inboxDestinationSupport'
  > &
    Pick<FeatureRegistryItem, 'availability'>,
): FeatureRegistryItem => ({
  visibility: 'CAPABILITY_GATED',
  searchable: false,
  inboxDestinationSupport: false,
  ...item,
});

export const atlasFeatureRegistry = [
  available({
    id: 'home',
    domain: 'home',
    primaryHub: 'home',
    canonicalRoute: '/(tabs)/home',
    title: 'Home',
    shortDescription: 'Dikkat gerektirenleri tek bakışta gör',
    icon: 'H',
    analyticsCategory: 'home',
  }),
  available({
    id: 'market-overview',
    domain: 'market-data',
    primaryHub: 'markets',
    canonicalRoute: '/markets/overview',
    title: 'Piyasa görünümü',
    shortDescription: 'BIST özeti, genişlik ve hareket edenler',
    icon: 'M',
    capability: 'mobileMarkets',
    searchable: true,
    analyticsCategory: 'markets',
  }),
  available({
    id: 'indices',
    domain: 'market-data',
    primaryHub: 'markets',
    canonicalRoute: '/markets/indices',
    title: 'Endeksler',
    shortDescription: 'BIST endekslerini incele',
    icon: 'I',
    capability: 'mobileMarkets',
    searchable: true,
    analyticsCategory: 'markets',
  }),
  available({
    id: 'sectors',
    domain: 'market-data',
    primaryHub: 'markets',
    canonicalRoute: '/markets/sectors',
    title: 'Sektörler',
    shortDescription: 'Sektör performansını karşılaştır',
    icon: 'S',
    capability: 'mobileMarkets',
    searchable: true,
    analyticsCategory: 'markets',
  }),
  available({
    id: 'scanner',
    domain: 'scanner',
    primaryHub: 'radar',
    canonicalRoute: '/radar/scanner',
    title: 'Scanner',
    shortDescription: 'Teknik ve özel kurallarla araştır',
    icon: 'R',
    capability: 'mobileScanner',
    searchable: true,
    inboxDestinationSupport: true,
    analyticsCategory: 'radar',
  }),
  available({
    id: 'saved-scans',
    domain: 'scanner',
    primaryHub: 'radar',
    canonicalRoute: '/radar/saved',
    title: 'Kayıtlı taramalar',
    shortDescription: 'Sürümlü tarama tanımlarına dön',
    icon: 'S',
    capability: 'mobileScanner',
    analyticsCategory: 'radar',
  }),
  available({
    id: 'watchlists',
    domain: 'watchlists',
    primaryHub: 'radar',
    canonicalRoute: '/radar/watchlists',
    title: 'İzleme listeleri',
    shortDescription: 'Takip ettiğin sembolleri yönet',
    icon: 'W',
    capability: 'mobileAlerts',
    searchable: true,
    inboxDestinationSupport: true,
    analyticsCategory: 'radar',
  }),
  available({
    id: 'alerts',
    domain: 'alerts',
    primaryHub: 'radar',
    canonicalRoute: '/radar/alerts',
    title: 'Alarmlar',
    shortDescription: 'Aktif ve tetiklenen kuralları incele',
    icon: 'A',
    capability: 'mobileAlerts',
    inboxDestinationSupport: true,
    analyticsCategory: 'radar',
  }),
  available({
    id: 'radar-activity',
    domain: 'alerts',
    primaryHub: 'radar',
    canonicalRoute: '/radar/activity',
    title: 'Aktivite',
    shortDescription: 'Tarama ve alarm hareketlerini gör',
    icon: 'A',
    capability: 'mobileAlerts',
    analyticsCategory: 'radar',
  }),
  available({
    id: 'portfolio-overview',
    domain: 'portfolio',
    primaryHub: 'portfolio',
    canonicalRoute: '/portfolio/overview',
    title: 'Genel görünüm',
    shortDescription: 'Portföy kayıtlarının özetini gör',
    icon: 'P',
    capability: 'mobilePortfolio',
    inboxDestinationSupport: true,
    analyticsCategory: 'portfolio',
  }),
  available({
    id: 'portfolio-positions',
    domain: 'portfolio',
    primaryHub: 'portfolio',
    canonicalRoute: '/portfolio/positions',
    title: 'Pozisyonlar',
    shortDescription: 'Sahip olunan pozisyonları incele',
    icon: 'P',
    capability: 'mobilePortfolio',
    analyticsCategory: 'portfolio',
  }),
  available({
    id: 'portfolio-transactions',
    domain: 'portfolio',
    primaryHub: 'portfolio',
    canonicalRoute: '/portfolio/transactions',
    title: 'İşlemler',
    shortDescription: 'Kayıtlı işlem geçmişini yönet',
    icon: 'T',
    capability: 'mobilePortfolio',
    analyticsCategory: 'portfolio',
  }),
  available({
    id: 'portfolio-performance',
    domain: 'portfolio',
    primaryHub: 'portfolio',
    canonicalRoute: '/portfolio/performance',
    title: 'Performans',
    shortDescription: 'Getiri ve benchmark bağlamını incele',
    icon: 'P',
    capability: 'mobilePortfolio',
    analyticsCategory: 'portfolio',
  }),
  available({
    id: 'portfolio-risk',
    domain: 'portfolio',
    primaryHub: 'portfolio',
    canonicalRoute: '/portfolio/risk',
    title: 'Risk',
    shortDescription: 'Risk metrikleri ve değerlendirilebilirliği gör',
    icon: 'R',
    capability: 'mobilePortfolio',
    analyticsCategory: 'portfolio',
  }),
  available({
    id: 'portfolio-quality',
    domain: 'portfolio',
    primaryHub: 'portfolio',
    canonicalRoute: '/portfolio/quality',
    title: 'Veri kalitesi',
    shortDescription: 'Eksik ve tutarsız kayıtları incele',
    icon: 'Q',
    capability: 'mobilePortfolio',
    analyticsCategory: 'portfolio',
  }),
  available({
    id: 'strategy-lab',
    domain: 'strategy',
    primaryHub: 'research',
    canonicalRoute: '/research/strategies',
    title: 'Strategy Lab',
    shortDescription: 'Araştırma tanımları ve sürümler',
    icon: 'S',
    capability: 'mobileStrategyLab',
    searchable: true,
    inboxDestinationSupport: true,
    analyticsCategory: 'research',
  }),
  available({
    id: 'backtests',
    domain: 'strategy',
    primaryHub: 'research',
    canonicalRoute: '/research/backtests',
    title: 'Backtests & Experiments',
    shortDescription: 'Geçmiş davranışı tekrarlanabilir şekilde incele',
    icon: 'B',
    capability: 'mobileStrategyLab',
    searchable: true,
    inboxDestinationSupport: true,
    analyticsCategory: 'research',
  }),
  available({
    id: 'reports',
    domain: 'reports',
    primaryHub: 'research',
    canonicalRoute: '/research/reports',
    title: 'Raporlar',
    shortDescription: 'Kaynak ve metodoloji bağlı çıktılar',
    icon: 'R',
    capability: 'mobileReports',
    searchable: true,
    inboxDestinationSupport: true,
    analyticsCategory: 'research',
  }),
  available({
    id: 'methodology',
    domain: 'methodology',
    primaryHub: 'research',
    canonicalRoute: '/research/methodology',
    title: 'Metodoloji',
    shortDescription: 'Hesaplama ve veri sınırlamalarını oku',
    icon: 'M',
    capability: 'mobileReports',
    searchable: true,
    analyticsCategory: 'research',
  }),
  available({
    id: 'events-calendar',
    domain: 'events',
    primaryHub: 'research',
    canonicalRoute: '/research/events',
    title: 'Olaylar',
    shortDescription: 'KAP bildirimlerini ve şirket olaylarını incele',
    icon: 'E',
    capability: 'disclosure.kap',
    searchable: true,
    inboxDestinationSupport: true,
    analyticsCategory: 'research-events',
  }),
  available({
    id: 'global-search',
    domain: 'market-data',
    primaryHub: 'global',
    canonicalRoute: '/search',
    title: 'Global Search',
    shortDescription: 'Mevcut sembol ve şirket aramasını aç',
    icon: 'S',
    capability: 'mobileSearch',
    searchable: false,
    analyticsCategory: 'global_action',
  }),
  available({
    id: 'smart-inbox',
    domain: 'alerts',
    primaryHub: 'global',
    canonicalRoute: '/inbox',
    title: 'Smart Inbox',
    shortDescription: 'Mevcut bildirim merkezini aç',
    icon: 'I',
    capability: 'mobileAlerts',
    searchable: false,
    analyticsCategory: 'global_action',
  }),
  available({
    id: 'profile',
    domain: 'account',
    primaryHub: 'profile',
    canonicalRoute: '/profile',
    title: 'Profil ve hesap',
    shortDescription: 'Ayarlar, güvenlik ve destek',
    icon: 'P',
    analyticsCategory: 'profile',
  }),
  available({
    id: 'account',
    domain: 'account',
    primaryHub: 'profile',
    canonicalRoute: '/preferences',
    title: 'Hesap',
    shortDescription: 'Profil ve temel tercihlerini yönet',
    icon: 'A',
    capability: 'mobileHome',
    analyticsCategory: 'profile',
  }),
  available({
    id: 'settings',
    domain: 'account',
    primaryHub: 'profile',
    canonicalRoute: '/settings',
    title: 'Ayarlar',
    shortDescription: 'Görünüm ve veri tercihleri',
    icon: 'S',
    capability: 'mobileReports',
    analyticsCategory: 'profile',
  }),
  available({
    id: 'privacy-security',
    domain: 'account',
    primaryHub: 'profile',
    canonicalRoute: '/security',
    title: 'Gizlilik ve güvenlik',
    shortDescription: 'Native güvenlik kontrolleri',
    icon: 'P',
    analyticsCategory: 'profile',
  }),
  available({
    id: 'help',
    domain: 'account',
    primaryHub: 'profile',
    canonicalRoute: '/help',
    title: 'Yardım Merkezi',
    shortDescription: 'Ürün ve metodoloji yardımı',
    icon: 'H',
    capability: 'mobileReports',
    analyticsCategory: 'profile',
  }),
  available({
    id: 'support',
    domain: 'account',
    primaryHub: 'profile',
    canonicalRoute: '/support',
    title: 'Destek',
    shortDescription: 'Destek talebi oluştur ve izle',
    icon: 'S',
    capability: 'mobileReports',
    analyticsCategory: 'profile',
  }),
  available({
    id: 'legal',
    domain: 'account',
    primaryHub: 'profile',
    canonicalRoute: '/legal',
    title: 'Yasal',
    shortDescription: 'Yayın ve onay durumu görünen belgeler',
    icon: 'L',
    analyticsCategory: 'profile',
  }),
  available({
    id: 'institutional',
    domain: 'institutional-flow',
    primaryHub: 'markets',
    canonicalRoute: '/markets/institutional',
    title: 'Kurumsal',
    shortDescription: 'AKD, para akışı ve takas araştırması',
    icon: 'I',
    capability: 'institutional.akd',
    searchable: true,
    analyticsCategory: 'markets',
  }),
  future({
    id: 'derivatives',
    domain: 'derivatives',
    primaryHub: 'markets',
    canonicalRoute: '/markets/derivatives',
    title: 'VİOP',
    shortDescription: 'Vadeli sözleşme araştırması',
    icon: 'V',
    availability: 'LICENSE_REQUIRED',
    capability: 'viop',
    externalDependency: 'TASK-110K',
    analyticsCategory: 'markets',
  }),
  future({
    id: 'funds',
    domain: 'funds',
    primaryHub: 'markets',
    canonicalRoute: '/markets/funds',
    title: 'Fonlar',
    shortDescription: 'Fon analitiği ve karşılaştırma',
    icon: 'F',
    availability: 'PROVIDER_REQUIRED',
    capability: 'funds',
    externalDependency: 'TASK-110J',
    analyticsCategory: 'markets',
  }),
  future({
    id: 'company-research',
    domain: 'company',
    primaryHub: 'research',
    canonicalRoute: '/research/company',
    title: 'Şirket araştırması',
    shortDescription: 'Timeline, KAP, temel ve kurumsal bağlam',
    icon: 'C',
    availability: 'COMING_IN_CURRENT_EXPANSION',
    capability: 'company-intelligence',
    externalDependency: 'TASK-110H',
    analyticsCategory: 'research',
  }),
  future({
    id: 'compare',
    domain: 'comparison',
    primaryHub: 'research',
    canonicalRoute: '/research/compare',
    title: 'Karşılaştır',
    shortDescription: 'Şirket ve fon araştırmasını hizala',
    icon: 'C',
    availability: 'COMING_IN_CURRENT_EXPANSION',
    capability: 'comparison',
    externalDependency: 'TASK-110H/TASK-110J',
    analyticsCategory: 'research',
  }),
] as const satisfies readonly FeatureRegistryItem[];

export function featureById(id: string): FeatureRegistryItem | undefined {
  return atlasFeatureRegistry.find((item) => item.id === id);
}

export function customerFeaturesForHub(hub: PrimaryHub): FeatureRegistryItem[] {
  return atlasFeatureRegistry.filter(
    (item) => item.primaryHub === hub && item.visibility === 'CUSTOMER',
  );
}

export function developmentFeatureCatalog(): readonly FeatureRegistryItem[] {
  return atlasFeatureRegistry;
}

export function duplicateCanonicalOwners(): string[] {
  const owners = new Map<string, string>();
  const duplicates: string[] = [];
  for (const item of atlasFeatureRegistry) {
    const prior = owners.get(item.canonicalRoute);
    if (prior) duplicates.push(`${prior}:${item.id}:${item.canonicalRoute}`);
    else owners.set(item.canonicalRoute, item.id);
  }
  return duplicates;
}
