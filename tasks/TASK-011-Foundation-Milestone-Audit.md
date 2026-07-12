# TASK-011 — Foundation Milestone Audit

**Bağımlılık:** TASK-001–TASK-010

## Amaç

İlk on görevin kabul kriterlerini repository üzerinde doğrulamak ve Indicator/Scanner geliştirmesine geçiş raporu üretmek.

## Kontroller

- monorepo komutları
- web build
- API health ve OpenAPI
- worker Redis bağlantısı
- Docker health
- migration temiz kurulum
- fake provider contract tests
- instrument import idempotency
- OHLCV ingestion idempotency
- quality issue üretimi
- lint, typecheck, test, build
- secret scan
- doküman uyumu.

## Çıktı

`reports/foundation-milestone-audit.md`

## Kabul kriterleri

- Her önceki görev passed, failed veya not verifiable olarak işaretlenir.
- Komut çıktıları özetlenir.
- Kritik failure varsa TASK-012'ye geçiş önerilmez.
- Testler yalnızca yeşil görünmesi için skip edilmez.

## T3 Code prompt

```text
TASK-011 görevini uygula. TASK-001–TASK-010 kabul kriterlerini mevcut repository üzerinde doğrula. reports/foundation-milestone-audit.md oluştur. Büyük refactor yapma; önce sapmaları raporla.
```
