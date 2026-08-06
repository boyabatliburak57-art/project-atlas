# ADR-026 — Mobile Expo Architecture and Shared Client

**Durum:** Accepted  
**Tarih:** 2026-07-28

## Bağlam

Atlas'ın ana müşteri yüzeyi native mobile uygulamaya dönüşmüştür. Mevcut Next.js web uygulaması
masaüstü analiz ve admin için korunurken, NestJS API ve worker sistemleri bütün istemcilerin ortak
platformudur. Repository pnpm/Turborepo, strict TypeScript, React, Zod, TanStack Query, OpenAPI ve
server-authoritative domain kuralları kullanır.

Mobile temelinin platform API'lerini güvenli adapter sınırlarında tutması, server domain
semantiğini kopyalamaması, auth session sırlarını cihazın güvenli storage'ında saklaması ve native
dependency sürümlerini Expo SDK uyumluluk matrisiyle yönetmesi gerekir.

## Karar

Mobile uygulama `apps/mobile` altında Expo SDK 57, React Native 0.86 ve Expo Router ile managed/CNG
yaklaşımında kurulur. SDK 57 repository'nin Node 22.14.0 sürümüyle uyumludur ve zorunlu React Native
New Architecture üzerinde çalışır.

Expo/React Native seçilmiştir çünkü iOS/Android için ortak TypeScript uygulama katmanı, Expo Modules
ile kontrollü native kabiliyetler, config plugin modeli, development build ve EAS build doğrulaması
sağlar. Expo Router file-based route grupları, typed route/deep-link temeli ve auth/onboarding/tab
shell'ini açık dosya sınırlarıyla ifade eder.

`packages/api-client` platformdan bağımsız typed transport sınırıdır. OpenAPI endpoint kataloğu ve
response envelope tipleri merkezi tutulur; generated snapshot/drift kontrolü sonraki contract
genişletmelerinde authoritative olur. Mobile ve web aynı client'ı kullanabilir, fakat bu görev web
istemcilerini taşımayı zorunlu kılmaz.

Mobile:

- `packages/database`, worker kodu veya server-only domain internals import etmez;
- domain kararlarını, finans hesaplarını veya scanner/backtest evaluator'larını kopyalamaz;
- server state için TanStack Query, form doğrulama için React Hook Form ve Zod kullanır;
- session secret'ını yalnız Expo SecureStore adapter'ında saklar ve daha zayıf storage'a düşmez;
- non-sensitive preference/cache storage'ını auth storage'dan ayrı tutar;
- notification, local authentication, linking, network ve app-state API'lerini adapter/provider
  arkasında kullanır;
- offline veriyi ileride yalnız timestamped/read-only olarak ele alır; mutation queue varsayılan
  değildir.

Push notification delivery provider-neutral port arkasındadır. Bu görev yalnız permission/link
foundation kurar; device-token backend binding ve production delivery TASK-100F/J kapsamındadır.

Native dependency eklemek için Expo SDK compatibility, New Architecture, license, maintenance,
platform support ve bundle etkisi belgelenir. `expo install --check`, typecheck, tests ve doctor
geçmeden dependency kabul edilmez. `--force` ve legacy peer bypass yasaktır.

EAS profilleri development/preview/production yapılarını tanımlar, fakat production signing
credential repository'ye konmaz. Bundle/package identifier olarak `com.atlasfinance.mobile`
teknik placeholder'ı kullanılır; product/legal ownership onayı olmadan store-ready sayılmaz.

## Web ve mobile ayrımı

Web DOM/CSS componentleri React Native'e taşınmaz. Platform-independent token, formatting,
telemetry ve API transport package'leri paylaşılır. Native component library TASK-100C'de
`packages/mobile-ui` altında kurulabilir.

## Güvenlik ve veri politikası

Public Expo environment yalnız public runtime configuration taşır; provider/database/registry
credential içermez. Telemetry auth token, cookie, password, portfolio value, transaction detail,
personal identifier, raw payload ve provider credential alanlarını redact/drop eder.

Deep link allowlist ile parse edilir, auth/onboarding gate'ten geçer ve hedef resource serverdan
yeniden yetkilendirilir. Navigation state session token taşımaz.

## Değerlendirilen alternatifler

- WebView wrapper native UX, güvenlik ve platform servis hedeflerini karşılamadığı için reddedildi.
- Ayrı native Swift/Kotlin uygulamaları iki istemci davranışının ve contract adapterlarının
  ayrışma riskini büyüttüğü için reddedildi.
- React Navigation'ın manual route setup'ı çalışabilir, ancak Expo Router'ın typed file routes ve
  universal-link modeli seçilen Expo platformuna daha doğrudan uyduğu için tercih edilmedi.
- Tokenı AsyncStorage veya plain file içinde tutmak güvenli değildir ve reddedildi.
- Domain package'lerini doğrudan mobile bundle'a almak Node-only transitives ve domain duplication
  riski nedeniyle reddedildi.
- Tam offline-first mutation queue finansal mutasyon güvenliği ve conflict semantiği çözülmeden
  reddedildi.

## Sonuçlar

Mobile shell ve shared transport sınırı erken doğrulanır; gerçek feature UI sonraki görevlere
kalır. Expo SDK yükseltmeleri kontrollü uyumluluk işi gerektirir. Native build ve store signing
external ortam/credential kapısı olarak kalır. Bu karar production veya staging GO vermez.
