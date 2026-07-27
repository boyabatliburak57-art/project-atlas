# TASK-100L — Mobile Feature Parity Audit

**Durum:** BLOCKED_BY_TASK-100K  
**Bağımlılıklar:** TASK-100K

## Amaç

Mobile kapsamın eksiksizliğini ve eski platform regresyonlarını bağımsız gate olarak denetlemek.

## Mevcut durum

Audit contract `reports/mobile/mobile-feature-parity-audit.md` içinde `NOT_RUN` ve
`NO_GO_FOR_TASK_100_REAUDIT` durumundadır.

## Kapsam

Welcome/onboarding, market, symbol/chart, scanner, watchlists, alerts/push, portfolio/risk,
Strategy Lab, reports/help/settings/navigation/offline/native security/a11y/devices/visual/API
parity/IDOR/secrets ve web/API/worker regressions.

## Kapsam dışı

Feature düzeltmesi yapmak, external provider/staging evidence üretmek, TASK-100R'yi aynı adımda
çalıştırmak.

## Bağımlılıklar

TASK-100K PASS kanıtı, clean auditable source state and complete coverage ledger.

## Mimari gereksinimler

Audit implementationdan bağımsız kanıt okur; requirement-to-test-to-screenshot traceability
kurar. Eksik kanıt FAIL'dir.

## API gereksinimleri

OpenAPI drift 0; required mobile endpoints owner/RBAC/cursor/idempotency/capability sözleşmelerini
karşılar.

## UI/UX gereksinimleri

Required route/state/theme/device screenshots 100%; AI-chat motif 0; unavailable/provider copy
truthful.

## Güvenlik gereksinimleri

Mobile IDOR 0, secret leakage 0, device token ownership PASS, deep links reauthorized, admin bypass
0, offline mutation violation 0.

## Accessibility gereksinimleri

Critical findings 0 and required screen-reader/device evidence complete.

## Unit testleri

Full mobile unit suite, failed/skipped/only/retry inventory.

## Integration testleri

Full mobile/API integration suite and contract drift.

## Mobile E2E testleri

Full mandatory journey matrix PASS with no skipped or retry-only test.

## Visual regression testleri

Screenshot feature coverage 100%, unreviewed diff 0.

## Kabul kriterleri

Failed 0; critical deviations 0; screenshot 100%; fake provider production claim 0; mobile IDOR 0;
secret leakage 0; a11y critical 0; mobile E2E PASS; web/API/worker regression 0. Yalnız hepsi
sağlanırsa `GO_FOR_TASK_100_REAUDIT`.

## Yasak yöntemler

Missing evidence'i N/A ile gizlemek; audit sırasında fix; skip/rebaseline; local/provider fixture
ile production iddiası; koşullu GO.

## Çıktı raporu

Güncellenmiş `reports/mobile/mobile-feature-parity-audit.md` ve karar.

## Ayrıntılı T3 Code uygulama prompt'u

```text
TASK-100L auditini yalnız TASK-100K tamamlandıysa çalıştır. Kod düzeltme; yalnız immutable source
state ve kanıtları denetle. Required feature/device/state/test/security/a11y screenshot traceability
oluştur. Full mobile unit/integration/E2E/visual, IDOR/leakage ve prior web/API/worker gates'i
doğrula. Failed, critical deviations, screenshot coverage, fake provider claims, IDOR, secrets,
a11y critical ve regressions sayaçlarını açık yaz. Tüm GO koşulları aynı anda sağlanmıyorsa
NO_GO_FOR_TASK_100_REAUDIT ver. GO olsa bile production veya staging PASS verme.
```
