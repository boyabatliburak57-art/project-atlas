# TASK-100K — Mobile Accessibility, Performance and QA

**Durum:** BLOCKED_BY_TASK-100J  
**Bağımlılıklar:** TASK-100J

## Amaç

Mobile ürün için kapsamlı test, cihaz, accessibility, visual ve local performance kanıtı üretmek.

## Mevcut durum

Web Playwright/axe ve API/worker integration/performance baselines vardır. Mobile E2E, screenshot
ledger, physical-device baselines ve screen-reader audit yoktur.

## Kapsam

Unit/integration/E2E suites; first launch through account deletion entry; light/dark visual
regression; VoiceOver/TalkBack/dynamic type/keyboard/focus/touch/contrast/chart summaries; small/
standard/large phone and tablet portrait/landscape; cold/warm/FMS/overview/symbol/scanner/portfolio/
backtest/memory/scroll metrics with versioned device baselines.

## Kapsam dışı

Local benchmarkı staging load kanıtı saymak; skipped/flaky testi PASS saymak; feature eksiklerini
screenshot ile kapatmak.

## Bağımlılıklar

All implemented mobile features, stable fixture environment and named physical/simulator device
profiles.

## Mimari gereksinimler

Test layers deterministic and isolated; E2E uses API contracts/fixtures clearly labeled non-live.
Screenshot manifest maps every required feature/state/theme/device. Baselines include app/build,
OS, hardware and dataset revision.

## API gereksinimleri

Mobile integration fixtures exercise real HTTP/controller/application boundaries and owner
isolation. External-provider cases remain unavailable simulations, not live evidence.

## UI/UX gereksinimleri

All screens have loading/error/empty/offline/stale states where relevant. Tablet layouts and
keyboard navigation cannot be stretched phone-only views.

## Güvenlik gereksinimleri

Dedicated mobile IDOR, secret/bundle/cache/log/crash scan, link/push/device ownership and previous
web/API/worker regression suites are mandatory.

## Accessibility gereksinimleri

Critical finding 0; screen-reader manual scripts plus automation; WCAG AA contrast; dynamic type
without loss; 44x44 targets; logical focus; non-color metrics; chart summaries; reduced motion.

## Unit testleri

Formatting, guards, offline, provider gates, notification links, secure storage, chart transforms
and feature-specific suites.

## Integration testleri

Auth, preferences, search, scanner, watchlist, alerts, portfolio, backtest, reports and support.

## Mobile E2E testleri

First launch, login, onboarding, overview, symbol, scanner, watchlist, alert, simulated push,
portfolio, strategy/backtest, report share, help/support, settings, logout and deletion entry.

## Visual regression testleri

100% required screen/state mapping in light/dark; approved baselines for five device classes; no
unreviewed diff.

## Kabul kriterleri

Failed/skipped/retry-only 0; critical a11y 0; screenshot feature coverage 100%; thresholds pass or
explicit NO-GO; mobile IDOR/secret leakage 0; web/API/worker regression 0.

## Yasak yöntemler

Threshold sonrası baseline oynatma; simulator result as universal device proof; hidden retry;
disabled assertion; local load as staging evidence; inaccessible chart-only data.

## Çıktı raporu

`reports/mobile/task-100k-accessibility-performance-qa.md`, versioned baselines and coverage ledger.

## Ayrıntılı T3 Code uygulama prompt'u

```text
TASK-100K'yi uygula. Zorunlu unit/integration/mobile E2E/visual/a11y/security suites'i ve beş cihaz
sınıfını kapsayan manifest oluştur. VoiceOver/TalkBack manual scripts, automation, dynamic type,
keyboard/focus, contrast, touch targets, non-color metrics ve chart summaries doğrula. Named
device/OS/build/dataset ile cold/warm/FMS ve ekran/chart/list/memory/frame ölçümlerini versioned
baseline'a kaydet. Full prior web/API/worker gates'i çalıştır. Skip/retry-only/baseline weakening
kabul etme; local performance'ı staging evidence olarak sunma.
```
