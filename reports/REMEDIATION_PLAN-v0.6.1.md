# Project Atlas v0.6.1 — Portfolio/Risk Remediation Plan

**Durum:** Zorunlu  
**Kaynak:** TASK-050 milestone audit  
**Karar:** NO-GO

## Engelleyici bulgular

### PERF-PORT-006

Positions performans ölçümü yalnız repository adapter sorgusunu kapsıyor. Gerçek zorunlu yol doğrulanmamış durumda:

```text
HTTP → auth/ownership → validation → application service → cursor codec
→ repository keyset query → DTO mapping → response serialization
```

Adapter p95 değeri 33,27 ms olsa da bu sonuç gerçek API pagination invariant'ını karşılamaz.

### Alerts/Watchlists regresyonu

Watchlist market summary için önceki GO baseline eşiği:

```text
p95 ≤ 750 ms
```

TASK-050 ölçümleri:

- 975,93 ms
- 1.193,12 ms

Threshold değiştirilemez ve fixture küçültülemez.

## Görev sırası

1. `TASK-050A-Positions-Cursor-Pagination-Remediation.md`
2. `TASK-050B-Watchlist-Market-Summary-Performance-Remediation.md`
3. `TASK-050C-Portfolio-Risk-Milestone-Reaudit.md`

## GO koşulu

```text
Decision: GO
Failed: 0
Critical deviations: 0
PERF-PORT-006 real API path: PASS
Positions cursor invariants: PASS
Watchlist market summary p95: PASS
Alerts/Watchlists regression: 0
```

## Yasaklar

- Yalnız adapter benchmark'ı ile geçiş vermek
- Offset pagination'ı cursor olarak adlandırmak
- Threshold yükseltmek
- Fixture küçültmek
- Ownership, stale/data-cutoff veya active alert count davranışını kaldırmak
- CI performans kapısını continue-on-error yapmak
