# TASK-100B — Mobile Architecture and Monorepo Setup

**Durum:** COMPLETED
**Bağımlılıklar:** TASK-100A

## Amaç

Expo/React Native mobil uygulama temelini ve OpenAPI tabanlı ortak istemci sınırını kurmak.

## Mevcut durum

pnpm/Turbo, TS, React, Zod ve TanStack Query standartları vardır; Expo uygulaması ve typed API
client yoktur. OpenAPI endpoint/testi vardır, web istemcileri feature-local `fetch` kullanır.

## Kapsam

`apps/mobile`; Expo Router; environment/build profiles; TanStack Query, RHF, Zod; önerilen
`api-client`, `design-tokens`, `mobile-ui`, `financial-formatting`, `telemetry` paketlerinin gerekli
minimum scaffold'u; OpenAPI üretim/drift kontrolü; native test ve visual-catalog iskeleti.

## Kapsam dışı

Ürün ekranlarının tamamlanması, domain kuralı kopyalama, push/provider seçimi, production store
release.

## Bağımlılıklar

TASK-100A; repository-pinned Node/pnpm; Expo/React/React Native compatibility spike; OpenAPI
documenti.

## Mimari gereksinimler

Expo managed workflow ve Expo Router kullan. Mobile, database/worker/server-only domain import
etmez. Server state TanStack Query'de, form state RHF+Zod'da tutulur. Generated client elle
değiştirilmez. Package export'ları platform-safe olmalıdır.

## API gereksinimleri

OpenAPI snapshot üretimi deterministik olmalı; bearer session, correlation ID, timeout,
cancellation, sanitized error, opaque cursor ve 401 rotation politikası typed wrapper ile
sağlanmalı. Eksik endpointler bu görevde uydurulmaz.

## UI/UX gereksinimleri

Root loading/error/offline/unavailable yüzeyleri hazırlanır; görsel ürün kapsamı TASK-100C
sonrasıdır. Sistem fontu ve light/dark theme plumbing desteklenir.

## Güvenlik gereksinimleri

Secret build-time env'e gömülmez. Token saklama arabirimi SecureStore hedeflidir; AsyncStorage token
için yasaktır. Development logs auth header/body yazmaz.

## Accessibility gereksinimleri

Root navigation semantic labels, reduced-motion hook, font-scale safe layout ve minimum target
yardımcıları scaffold'a dahil edilir.

## Unit testleri

Client error mapping, auth rotation concurrency, cursor pass-through, query keys, env parsing,
platform-safe exports.

## Integration testleri

Generated client ↔ OpenAPI drift; auth/login/refresh/logout contract smoke; workspace build,
lint/typecheck.

## Mobile E2E testleri

Boot, safe configuration failure, unauthenticated route ve test fixture login smoke.

## Visual regression testleri

Root loading/error/offline shell light/dark baseline.

## Kabul kriterleri

- Expo app workspace komutları pinned toolchain ile çalışır.
- Generated API client CI'da drift yakalar.
- Mobile hiçbir server-only paketi import etmez.
- Secret/token güvenlik kontrolleri geçer.
- Web/API/worker mevcut test/build sayıları gerilemez.

## Yasak yöntemler

Domain kopyalama; hand-written duplicate DTO; generated file edit; hard-coded credential/base URL;
AsyncStorage token; fake production provider.

## Çıktı raporu

`reports/mobile/task-100b-mobile-architecture-setup.md`, dependency/compatibility kararları ve
OpenAPI parity sonucu.

## Ayrıntılı T3 Code uygulama prompt'u

```text
TASK-100B'yi yalnız TASK-100A tamamlandıysa uygula. Repository standartlarını ve Expo compatibility
matrix'ini doğrula. apps/mobile Expo Router TypeScript uygulamasını ve yalnız gerekli shared
packages'i kur. OpenAPI'den deterministik typed client üret; auth rotation, cancellation, cursor,
sanitized errors ve drift CI ekle. Domain/database/worker kodunu mobile'a taşıma. SecureStore
arabirimi dışında token persistence kurma. Boot/auth smoke, unit, build, lint/typecheck ve önceki
web/API/worker regressions çalıştır. Sonuçları local kanıt olarak raporla; staging iddiası üretme.
```
