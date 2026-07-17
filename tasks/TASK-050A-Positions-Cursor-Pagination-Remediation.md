# TASK-050A — Positions Cursor Pagination Remediation

**Bağımlılık:** TASK-050 NO-GO

## Amaç

Positions endpoint'inde gerçek HTTP/application/API cursor pagination yolunu tamamlamak ve PERF-PORT-006 kapısını gerçek kullanıcı yolu üzerinde geçirmek.

## T3 Code prompt

```text
tasks/TASK-050A-Positions-Cursor-Pagination-Remediation.md görevini uygula.

Önce oku:
- reports/portfolio-risk-milestone-audit.md
- docs/DOC-024-Pagination-and-Regression-Performance-Gates.md
- guides/POSITIONS_CURSOR_PAGINATION_CONTRACT.md
- api/API-006-Portfolios-Transactions-Risk.md

PERF-PORT-006'nın yalnız adapter sorgusunu ölçmesi nedeniyle NO-GO verdiğini doğrula.

GET /api/v1/portfolios/{id}/positions için şu gerçek yolu oluştur veya tamamla:

HTTP → auth/ownership → validation → application service → versioned opaque cursor
→ repository keyset query → DTO/meta mapping → response.

Kurallar:
- Offset pagination kullanma.
- Stable unique tie-breaker kullan.
- Cursor user, portfolio, sort, filter ve projectionLedgerVersion bağlamına bağlı olsun.
- Başka context'te cursor kullanımını reddet.
- Projection version değişirse sessiz karışım yapma.
- DB seviyesinde limit+1 veya eşdeğer keyset pagination uygula.
- Tüm dataset'i memory'ye yükleyip sonra sayfalama yapma.
- Decimal string ve dataCutoff meta sözleşmesini koru.
- OpenAPI'yi güncelle.

Testler:
- ilk/orta/son sayfa
- empty/exact boundary
- aynı sort value
- ASC/DESC
- duplicate=0
- missing=0
- invalid/version/context/filter/sort cursor
- ledger version değişimi
- limit upper bound
- deleted portfolio
- IDOR
- decimal serialization
- gerçek HTTP round-trip

PERF-PORT-006:
- 1.000 position
- gerçek PostgreSQL ve API process
- auth/ownership/application/mapping dahil
- p95 ≤ 500 ms
- error=0, duplicate=0, missing=0, invariant failure=0

Adapter süresini ayrıca raporla; milestone sonucunu gerçek API yoluna göre ver.
Threshold'u değiştirme ve fixture'ı küçültme.

Format, ADR validation, lint, typecheck, unit, integration, API contract, OpenAPI, IDOR, build ve performance testlerini çalıştır.
```
