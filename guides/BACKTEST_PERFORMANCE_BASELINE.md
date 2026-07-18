# Backtest Performance Baseline

## PERF-BT-001

650 symbols, 5 years daily bars, 4 indicators, real worker/engine/persistence.

Target: queue-to-terminal p95 ≤ 30 seconds.

## PERF-BT-002

5 million ordered events, deterministic simulation, cost model.

Target: p95 ≤ 12 seconds.

## PERF-BT-003

100.000 orders/fills/trades/events and series chunks.

Target: p95 ≤ 8 seconds.

## PERF-BT-004

- summary p95 ≤ 500 ms
- 2.000-point series p95 ≤ 700 ms
- 10.000 trades cursor page p95 ≤ 500 ms

## PERF-BT-005

100 parameter combinations.

- orchestration overhead p95 ≤ 3 seconds
- duplicate run = 0

## PERF-BT-006

Two independent runs on same snapshot:

- summary hash equal
- fill sequence equal
- equity hash equal

## Rapor

Environment, fixture, concurrency, p50/p95/max, engine/DB/persistence time, memory, errors and threshold result.

Threshold'lar yalnız testi geçirmek için yükseltilemez.
