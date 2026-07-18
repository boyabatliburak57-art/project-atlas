# TASK-070C — Backtest Performance Benchmark Runner

**Bağımlılık:** TASK-070B

PERF-BT-001–006 için gerçek runner, deterministic fixture, threshold evaluator, rapor ve CI komutları oluştur.

## T3 Code prompt

```text
TASK-070C görevini uygula.

BACKTEST_BENCHMARK_RUNNER_SPEC ve mevcut BACKTEST_PERFORMANCE_BASELINE belgelerini oku.

Tek root entrypoint oluştur:
pnpm perf:backtest

PERF-BT-001–006 senaryolarını gerçek yol gereksinimleriyle uygula:
- 001 queue/worker/engine/persistence
- 002 pure engine
- 003 real PostgreSQL
- 004 real HTTP API
- 005 production experiment worker
- 006 two independent runs on same snapshot

Deterministic fixture generator, scenario registry, environment collector, repetitions, p50/p95/max, memory/phase timing ve threshold evaluator ekle.

Threshold, missing scenario veya fixture mismatch non-zero exit üretmeli.

reports/performance/backtest-baseline.json ve .md oluştur.
Threshold veya fixture kapsamını değiştirme.
Runner testlerini, tüm scenario'ları, format/lint/typecheck/build ve CI workflow validation'ı çalıştır.
```
