# Project Atlas v0.8.1 — Strategy Lab Milestone Remediation Plan

**Durum:** Zorunlu  
**Kaynak:** TASK-070 Strategy Lab Milestone Audit  
**Karar:** NO-GO

## Engelleyici bulgular

1. PERF-BT-001–006 için gerçek benchmark runner/komutu yok.
2. Annualized return, volatility, Sharpe, Sortino, Calmar, expectancy ve benchmark metrikleri eksik; turnover sabit `0`.
3. Experiment orchestration production BullMQ worker composition root'una bağlı değil.
4. Tam Playwright suite 12 PASS, 1 FAIL, 2 not-run; tek-worker 4/4 sonucu tam-suite kararlılık kanıtı değildir.

## Uygulama sırası

1. TASK-070A — Backtest Metrics Remediation
2. TASK-070B — Experiment Production Worker Wiring
3. TASK-070C — Backtest Performance Benchmark Runner
4. TASK-070D — Strategy Lab E2E Stability
5. TASK-070E — Strategy Lab Milestone Re-Audit

## GO kapısı

```text
Decision: GO
Failed: 0
Critical deviations: 0
Mandatory backtest metrics: PASS
Turnover calculation: PASS
Experiment production worker wiring: PASS
PERF-BT-001–006: PASS
Full Playwright stability: PASS
```

## Yasaklar

- Placeholder/sabit metric değerleri
- Turnover'ı `0` bırakmak
- Production composition root'u testte bypass etmek
- Mock/no-op benchmark yolu
- Threshold yükseltmek veya fixture küçültmek
- Playwright skip/fixme/only
- Kök nedeni çözmeden retry artırmak
