# TASK-050B — Watchlist Market Summary Performance Remediation

**Bağımlılık:** TASK-050A

## Amaç

Watchlist market summary performansını, TASK-040 GO baseline davranışını azaltmadan p95 ≤ 750 ms seviyesine geri getirmek.

## T3 Code prompt

```text
tasks/TASK-050B-Watchlist-Market-Summary-Performance-Remediation.md görevini uygula.

Önce oku:
- Alerts/Watchlists GO baseline performans raporu
- reports/portfolio-risk-milestone-audit.md
- docs/DOC-024-Pagination-and-Regression-Performance-Gates.md
- guides/WATCHLIST_MARKET_SUMMARY_PERFORMANCE_GUIDE.md

Aynı fixture ve gerçek API yoluyla 975,93 ms ve 1.193,12 ms regresyonunu yeniden üret.

Profil çıkar:
- query count
- DB time
- application time
- watchlist item query
- instrument/market data lookup
- active alert count
- mapping/serialization
- cache hit/miss

N+1, per-item lookup, DB dışı pagination, eksik index, gereksiz select ve duplicate request-scope lookup sorunlarını incele.

Ürün contract'ını değiştirmeden optimize et.
Active alert count, stale ve data-cutoff alanlarını kaldırma.
Ownership kontrolünü bypass etme.
Fixture'ı küçültme ve threshold'u yükseltme.

Aynı baseline senaryosunu en az iki bağımsız koşumla çalıştır.
Her iki koşumda da p95 ≤ 750 ms olmalı.

Cache kullanırsan item, market bar, alert state ve watchlist değişiklikleri için invalidation testleri ekle.

Mevcut watchlist unit/integration/API/E2E, IDOR, format, lint, typecheck ve build kapılarını çalıştır.
Önce/sonra p50/p95/max/query count tablosu oluştur.
```
