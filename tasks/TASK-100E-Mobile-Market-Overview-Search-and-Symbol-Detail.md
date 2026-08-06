# TASK-100E — Mobile Market Overview, Search and Symbol Detail

**Durum:** COMPLETED_GO_FOR_TASK_100F
**Bağımlılıklar:** TASK-100C, TASK-100D

## Amaç

Atlas'ın BIST odaklı Home/Markets, global arama ve ileri symbol/chart deneyimini mobile taşımak.

## Mevcut durum

Market overview, symbol quote/chart/fundamentals/patterns ve search API/read model'leri ile web
yüzeyleri vardır. Native chart/gesture ve mobile screens yoktur; news/futures/FX provider bağımlıdır.

## Kapsam

BIST 100/30/Banka/Sınai, mini chart, breadth, movers, volume, sectors, status/freshness, research,
watchlist/alert/portfolio summaries, pull refresh; search by symbol/company/index/sector with
recent/favorites; symbol header/actions/tags/freshness; candle/line/volume, zoom/pan/crosshair/
tooltip, timeframe/raw-adjusted/MA/EMA/Bollinger/RSI/MACD; Overview/Financials/Patterns/
News-Insights/Company.

## Kapsam dışı

Brokerage execution, fabricated news/quotes, provider credential onboarding, investment advice.

## Bağımlılıklar

Market/symbol/navigation APIs, chart contract, TASK-100J capabilities and TASK-100K performance
baselines.

## Mimari gereksinimler

Query keys include symbol/timeframe/adjustment/indicator/cutoff. Chart transformation is pure and
versioned. Large series is bounded/downsampled without changing financial semantics. Research has
source, date, method and stale status.

## API gereksinimleri

Cursor search, summaries, favorites/recent ownership, timeframe/adjustment metadata and capability
reason codes must be typed. Missing contracts are added server-side with OpenAPI/IDOR tests, never
mocked as production.

## UI/UX gereksinimleri

High-density readable hierarchy, skeleton/error/empty/offline/stale/unavailable states. Change uses
sign, icon/text and color. Provider-required tabs explain reason and link to help.

## Güvenlik gereksinimleri

Search/history/favorites and user markers owner-scoped; share excludes tokens/internal IDs; raw
provider payload/errors absent; deep-linked symbols revalidated.

## Accessibility gereksinimleri

Chart text summary/table alternative, gesture alternatives, announced price direction/freshness,
dynamic type and minimum targets.

## Unit testleri

Chart transforms, timeframe/adjustment, financial formatting, search debounce/cancel, capability
gates, freshness and safe research metadata.

## Integration testleri

Overview/search/detail/fundamentals/patterns/actions; watchlist/alert actions; offline cache and
provider unavailable contracts.

## Mobile E2E testleri

Market overview refresh, search/detail, chart interactions/timeframes/indicators, watchlist/alert/
share, provider-unavailable and stale/offline flows.

## Visual regression testleri

Home, Markets, Search and symbol tabs/states light/dark across phone/tablet; chart references.

## Kabul kriterleri

Required fields/screens complete; fake provider content 0; chart correctness fixtures pass;
search/user-marker IDOR 0; chart a11y summary coverage 100%; performance within versioned local
device thresholds.

## Yasak yöntemler

Fake news/data/freshness; AI chat; price extrapolation; client-only capability enable; chart bitmap
without accessible data; color-only change.

## Çıktı raporu

`reports/mobile/task-100e-market-search-symbol.md`, provider matrix, chart fixture and screenshot
coverage.

## Ayrıntılı T3 Code uygulama prompt'u

```text
TASK-100E'yi uygula. Mevcut market overview, navigation search ve symbol/chart OpenAPI
sözleşmelerini kullan; eksikleri owning API katmanında typed/owner-scoped biçimde tamamla. Home,
Markets, global Search ve symbol detail tabs/chart gestures/indicators oluştur. Tüm data
freshness/source/cutoff ve provider-unavailable durumlarını açık göster; news/futures/FX için fake
veri üretme. Chart transform fixture, IDOR, integration, mobile E2E, visual, accessibility ve
physical-device local performance testlerini çalıştır. Local sonucu staging kanıtı sayma.
```
