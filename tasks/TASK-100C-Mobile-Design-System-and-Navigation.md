# TASK-100C — Mobile Design System and Navigation

## TASK-100C-R5 iOS-only v1 scope supersession

Mobile v1 validates only iPhone 17 on iOS 26.5. Small/large iPhone, Android and tablet
implementation, native validation, accessibility, visual regression and E2E are deferred to
mobile v1.1. Deferred results must not be reported as PASS or production-supported. This section
supersedes conflicting multi-phone, Android and tablet v1 criteria below without deleting their
historical task context.

**Durum:** READY_FOR_IMPLEMENTATION
**Bağımlılıklar:** TASK-100B

## Amaç

Premium fintech mobil design systemini, visual catalog'u ve güvenli tab/stack navigasyonu kurmak.

## Mevcut durum

Web component/CSS örnekleri vardır; ortak native token veya component paketi ve mobile router yoktur.

## Kapsam

Belirlenen renk/spacing/radius sistemi; sistem fontu; AppHeader, BottomNavigation, FinancialValue,
ChangeBadge, DataFreshnessBadge, MetricCard, IndexCard, SymbolRow, PositionRow, AlertRow,
ScanResultRow, FilterChip, SegmentedControl, TimeframeSelector, states/banners, MethodologySheet,
chart wrappers, BottomSheet, dialog, skeleton, toast ve SecureTextField; Storybook RN veya eşdeğer
catalog; Home/Markets/Search/Portfolio/More rotaları ve tüm detay route sözleşmeleri.

## Kapsam dışı

Feature veri entegrasyonu, chart engine seçiminin nihai uygulanması, admin işlevlerinin kendisi.

## Bağımlılıklar

TASK-100B packages, Expo Router ve erişilebilir native primitive'ler.

## Mimari gereksinimler

Tokenlar platformdan bağımsız; mobile-ui native; feature componentleri route katmanında kalır.
Watchlists/alerts Markets ve More'dan, Scanner Search'ten erişilir. Admin route role + server guard
gerektirir.

## API gereksinimleri

Navigation parametreleri typed ve minimaldir; resource payload taşınmaz, ID ile serverdan yeniden
okunur. Capability reason/help modeli ortak clienttan gelir.

## UI/UX gereksinimleri

Deep navy `#0B1F3A`, blue `#1565FF`, positive `#0F9D72`, negative `#D64550`, warning `#D99A21`,
background/card/border/text renkleri yönergedeki gibidir. Hafif shadow, 12/16 card radius, 10/12
button radius. Renk tek sinyal değildir. AI-chat estetiği yoktur.

## Güvenlik gereksinimleri

Deep link allowlist, auth-before-resolution, admin visibility guard, sensitive param redaction,
route analytics sanitization.

## Accessibility gereksinimleri

44x44 minimum targets, semantic roles/labels, logical focus, dynamic type, reduced motion,
VoiceOver/TalkBack ve tablet keyboard navigation catalog'da kanıtlanır.

## Unit testleri

Token invariants, financial value signs/labels, route guards, deep-link parser, focus order ve
reduced motion.

## Integration testleri

Tab/stack transitions, dual watchlist/alert entry, admin guard, auth redirect/return route.

## Mobile E2E testleri

Beş tab, detail back behavior, app link allow/deny, unauthorized admin ve tablet navigation.

## Visual regression testleri

Tüm catalog state'leri ve navigation shell small/standard/tablet light/dark.

## Kabul kriterleri

Component listesi catalog'da belgeli; route manifesti eksiksiz; accessibility critical finding 0;
yasak AI motifleri 0; token sapması 0; web regression 0.

## Yasak yöntemler

Feature başına rastgele renk/spacing; emoji finans sinyali; color-only P&L; prompt/chat UI; client
role ile tek başına admin yetkilendirme; payloadlı deep link.

## Çıktı raporu

`reports/mobile/task-100c-design-system-navigation.md` ve screenshot/component coverage manifesti.

## Ayrıntılı T3 Code uygulama prompt'u

```text
TASK-100C'yi uygula. Belirlenen Atlas tokenlarını ortak package'ta, accessible native componentleri
mobile-ui'da kur. Zorunlu componentlerin her state'ini visual catalog'da belgeleyip light/dark,
dynamic type ve tablet varyantlarını ekle. Expo Router ile beş tab ve tüm typed detail routes'u
oluştur; watchlists/alerts dual access, Scanner/Search ve admin server-backed guard kurallarını
test et. Deep link payloadına güvenme. AI sohbet motifi kullanma. Unit/integration/E2E/visual/a11y
kanıtlarını raporla.
```
