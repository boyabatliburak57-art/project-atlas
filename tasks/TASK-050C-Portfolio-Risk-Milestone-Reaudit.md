# TASK-050C — Portfolio and Risk Milestone Re-Audit

**Bağımlılık:** TASK-050A, TASK-050B

## Amaç

İki engelleyici bulgu kapatıldıktan sonra Portfolio/Risk milestone'unu tam kapılarla yeniden doğrulamak.

## T3 Code prompt

```text
tasks/TASK-050C-Portfolio-Risk-Milestone-Reaudit.md görevini uygula.

İlk TASK-050 NO-GO raporunu ve TASK-050A/TASK-050B değişikliklerini incele.

reports/portfolio-risk-milestone-reaudit.md oluştur.

Ayrı kanıt bölümleri oluştur:
1. PERF-PORT-006 gerçek HTTP/application/API cursor pagination yolu
2. Cursor duplicate/missing/context/version/ledger invariant sonuçları
3. Watchlist market summary önceki ve remediation sonrası ölçümleri
4. Aynı fixture ve threshold'un korunduğu
5. Portfolio financial/risk/CSV/API/E2E regresyonları
6. Scanner ve Alerts/Watchlists baseline regresyonları

Zorunlu kapılar:
- format, ADR, lint, typecheck, build
- secret scan, dependency audit, skip/only
- OpenAPI ve migrations
- financial/risk fixtures
- CSV security/atomicity
- IDOR ve E2E
- tüm mandatory performance scenarios

PERF-PORT-006:
- gerçek API yolu
- 1.000 position
- p95 ≤ 500 ms
- duplicate=0, missing=0, invariant failure=0

Watchlist market summary:
- TASK-040 ile aynı fixture
- en az iki koşum
- her koşumda p95 ≤ 750 ms

Yalnız adapter süresini kabul etme.
Threshold veya fixture kapsamını değiştirme.

Raporun başında GO veya NO-GO yaz.
GO değilse sonraki pakete geçilmesini önerme.
```
