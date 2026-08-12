# TASK-100H Local Performance Result

The bounded native screens use performant list contracts, shared native chart
primitives, and terminal polling cleanup. The backend benchmark exercises real
BullMQ and PostgreSQL paths with a 650-symbol, 1,304-session deterministic
fixture and validates terminal persistence. The engine caches immutable rule
operands and maintains the equity peak incrementally, avoiding per-event map
allocation and quadratic curve rescans without changing checkpoint results.

The authoritative timing and machine metadata are recorded in
`reports/performance/backtest-benchmark.md`. These measurements are local
development evidence, not staging or production load evidence.

```text
PERF-BT-001 Full BIST: PASS
Fixture: 650 symbols × 1,304 sessions × 4 indicators
Repetitions: 3
p50: 24,922.38 ms
p95: 28,768.97 ms
Threshold: p95 <= 30,000 ms
Errors: 0
```
