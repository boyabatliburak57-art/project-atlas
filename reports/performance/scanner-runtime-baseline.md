# PASS — Scanner Runtime Performance Baseline

Generated: 2026-07-18T18:53:46.809Z

## Environment

```json
{
  "commitSha": "b1bffa00b76f1b0cb628ecb1af28e98b3721ea89",
  "nodeVersion": "v22.14.0",
  "pnpmVersion": "9.15.4",
  "operatingSystem": "darwin 25.5.0",
  "hostname": "Burak-MacBook-Air.local",
  "cpu": "Apple M1",
  "cpuCount": 8,
  "totalMemoryBytes": 8589934592,
  "freeMemoryBytes": 184172544,
  "postgresql": "PostgreSQL 17.10 on aarch64-unknown-linux-musl, compiled by gcc (Alpine 15.2.0) 15.2.0, 64-bit",
  "redis": "7.4.9",
  "workerConcurrency": 2,
  "batchSize": 100
}
```

## Scenarios

### PERF-SCN-001 — PASS

- Scenario: Small synchronous scan
- Fixture size: 25 instruments · 60 daily bars
- Worker concurrency: 2
- Batch size: 100
- Cache: 1 cold + 5 warm runs
- Repetitions: 6
- p50: 121.46 ms
- p95: 178.72 ms
- Maximum: 178.72 ms
- Errors: 0
- Processed instruments: 25
- Matched instruments: 25
- Threshold: cold p95 ≤ 2000 ms; warm p95 ≤ 750 ms; errors = 0
- cold p95: 137.03 ms
- execution mode: sync

### PERF-SCN-002 — PASS

- Scenario: Full BIST fixture scan
- Fixture size: 600 instruments · 70,900 persisted bars
- Worker concurrency: 2
- Batch size: 100
- Cache: warm after 1 warm-up run
- Repetitions: 5
- p50: 2080.08 ms
- p95: 2380.36 ms
- Maximum: 2380.36 ms
- Errors: 0
- Processed instruments: 600
- Matched instruments: 600
- Threshold: queue-to-terminal p95 ≤ 8000 ms; errors/duplicates = 0; progress monotonic = 100%
- duplicate results: 0
- progress monotonicity: 100%
- 3 unique indicators · 7 AST nodes

### PERF-SCN-003 — PASS

- Scenario: Medium complexity scan
- Fixture size: 600 instruments · 2 timeframes · 10 short-history instruments
- Worker concurrency: 2
- Batch size: 100
- Cache: warm after 1 warm-up run
- Repetitions: 5
- p50: 3542.06 ms
- p95: 3651.95 ms
- Maximum: 3651.95 ms
- Errors: 0
- Processed instruments: 600
- Matched instruments: 0
- Threshold: queue-to-terminal p95 ≤ 15000 ms; errors/crashes = 0; deterministic matches; heap growth ≤ 128 MiB
- heap growth: 11.4 MiB
- notEvaluable: 10
- 6 unique indicators · 10 AST nodes · nested groups · cross operator

### PERF-SCN-004 — PASS

- Scenario: Result pagination
- Fixture size: 600 results · 50 rows/page
- Worker concurrency: 2
- Batch size: 100
- Cache: warm database
- Repetitions: 13
- p50: 0.56 ms
- p95: 2.48 ms
- Maximum: 2.48 ms
- Errors: 0
- Processed instruments: 600
- Matched instruments: 600
- Threshold: p95 ≤ 300 ms; duplicate/missing rows = 0
- duplicate/missing rows: 0

### PERF-SCN-005 — PASS

- Scenario: Progress polling
- Fixture size: completed 600-instrument run · PostgreSQL + Redis
- Worker concurrency: 2
- Batch size: 100
- Cache: warm terminal polling
- Repetitions: 10
- p50: 0.52 ms
- p95: 1.26 ms
- Maximum: 1.26 ms
- Errors: 0
- Processed instruments: 600
- Matched instruments: 600
- Threshold: p95 ≤ 250 ms; unauthorized access/terminal changes = 0
- unauthorized accesses: 0
- terminal changes: 0

### PERF-SCN-006 — PASS

- Scenario: Idempotent replay
- Fixture size: 25-instrument normalized request
- Worker concurrency: 2
- Batch size: 100
- Cache: warm PostgreSQL idempotency lookup
- Repetitions: 10
- p50: 1.01 ms
- p95: 1.77 ms
- Maximum: 1.77 ms
- Errors: 0
- Processed instruments: 0
- Matched instruments: 0
- Threshold: response p95 ≤ 300 ms; new runs = 0; request hash stable
- new runs: 0
- request hash variants: 1
