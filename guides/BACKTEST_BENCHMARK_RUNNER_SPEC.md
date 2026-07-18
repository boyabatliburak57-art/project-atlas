# Backtest Benchmark Runner Specification

## Root komutu

```bash
pnpm perf:backtest
pnpm perf:backtest --scenario <scenario>
```

Eksik scenario, threshold failure, fixture mismatch veya yetersiz tekrar non-zero exit üretmelidir.

## Gerçek yol

- PERF-BT-001: API/run create → DB → queue → worker → snapshot → engine → persistence → terminal
- PERF-BT-002: saf deterministic event engine
- PERF-BT-003: gerçek PostgreSQL persistence
- PERF-BT-004: gerçek HTTP/application/repository
- PERF-BT-005: production experiment worker ve child-run orchestration
- PERF-BT-006: aynı immutable snapshot üzerinde iki bağımsız run

## Senaryolar ve eşikler

- PERF-BT-001: 650 sembol, 5 yıl, 4 indikatör, p95 ≤ 30 sn
- PERF-BT-002: 5 milyon event, p95 ≤ 12 sn
- PERF-BT-003: 100.000 persisted event/result, p95 ≤ 8 sn
- PERF-BT-004: summary ≤ 500 ms; 2.000-point series ≤ 700 ms; trade page ≤ 500 ms
- PERF-BT-005: 100 kombinasyon orchestration overhead ≤ 3 sn; duplicate child run = 0
- PERF-BT-006: summary/fill/equity hash eşit

## Fixture

Deterministik seed, internet/provider yok, versioned generator, aynı symbol/bar/event sayısı.

## Rapor

```text
reports/performance/backtest-baseline.json
reports/performance/backtest-baseline.md
```

Commit SHA, environment, fixture, concurrency, repetitions, p50/p95/max, memory, engine/DB/persistence time, errors ve PASS/FAIL içermelidir.

Threshold'lar remediation sırasında yükseltilemez.
