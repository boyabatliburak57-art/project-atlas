# Backtest Performance Benchmark

- **Status:** PASS
- **Generated:** 2026-08-09T23:30:04.587Z
- **Commit:** `fac5bfe45c2fafad159bb223a01e870bbd26bf07`
- **Selected scenario:** all
- **Environment:** {"hostname":"192.168.1.2","os":"darwin 25.5.0","cpu":"Apple M1","cpuCount":8,"memoryBytes":8589934592,"memoryPeakMeasurement":"process.resourceUsage.maxRSS","node":"v22.14.0","pnpm":"9.15.4","postgres":"17.10","redis":"7.4.9","database":"isolated test PostgreSQL (credentials redacted)","internetProvider":false}
- **Fixture contract:** `performance/fixtures/backtest-v1.json`
- **Threshold contract:** `performance/thresholds/backtest.json`

| ID                  | Fixture                                                              | Worker |   Batch | Repetitions | Warm/cold                                                     |   p50 ms |   p95 ms |   Max ms | Engine ms |   DB ms | Persistence ms | API ms | Peak memory | Errors | Threshold                                     | Result |
| ------------------- | -------------------------------------------------------------------- | -----: | ------: | ----------: | ------------------------------------------------------------- | -------: | -------: | -------: | --------: | ------: | -------------: | -----: | ----------: | -----: | --------------------------------------------- | ------ |
| PERF-BT-001         | 650 symbols × 1304 daily bars × 4 indicators                         |      2 |    2000 |           3 | cold PostgreSQL snapshot; precomputed causal indicator series | 20603.23 | 25575.18 | 25575.18 |  19881.17 |  722.06 |          93.85 |      0 |   893485056 |      0 | p95 <= 30000 ms; repetitions >= 3; errors = 0 | PASS   |
| PERF-BT-002         | 5000000 ordered events; linear cost every 100                        |      1 | 5000000 |           5 | warm deterministic core; no cache                             |  5313.02 |  5420.55 |  5420.55 |   5313.02 |       0 |              0 |      0 |   170672128 |      0 | p95 <= 12000 ms; repetitions >= 5; errors = 0 | PASS   |
| PERF-BT-003         | 100000 combined orders/fills/trades/series points                    |      1 |   20000 |           5 | cold writes; idempotent replay warm conflict path             |  3560.35 |  4129.92 |  4129.92 |         0 | 3560.35 |        3560.35 |      0 |   243630080 |      0 | p95 <= 8000 ms; repetitions >= 5; errors = 0  | PASS   |
| PERF-BT-004-series  | 2000-point equity series                                             |      1 |     100 |          10 | one cold request followed by warm measured requests           |    12.69 |    74.12 |    74.12 |         0 |       0 |              0 |  12.69 |   234881024 |      0 | p95 <= 700 ms; repetitions >= 10; errors = 0  | PASS   |
| PERF-BT-004-summary | summary through auth/controller/application/repository/serialization |      1 |     100 |          10 | one cold request followed by warm measured requests           |     4.03 |     9.06 |     9.06 |         0 |       0 |              0 |   4.03 |   234881024 |      0 | p95 <= 500 ms; repetitions >= 10; errors = 0  | PASS   |
| PERF-BT-004-trades  | 10000 trades; page 100                                               |      1 |     100 |         100 | one cold request followed by warm measured requests           |     6.51 |     9.29 |    17.48 |         0 |       0 |              0 |   6.51 |   234881024 |      0 | p95 <= 500 ms; repetitions >= 10; errors = 0  | PASS   |
| PERF-BT-005         | 100 parameter combinations                                           |      2 |     100 |           5 | warm compatible completed-run reuse                           |       75 |    87.83 |    87.83 |         0 |       0 |              0 |      0 |   175161344 |      0 | p95 <= 3000 ms; repetitions >= 5; errors = 0  | PASS   |
| PERF-BT-006         | 2 independent runs on atlas-backtest-benchmark-snapshot-v1           |      2 |    2000 |           2 | warm persisted result read                                    |      4.6 |     6.64 |     6.64 |         0 |     4.6 |              0 |      0 |   922681344 |      0 | p95 <= 30000 ms; repetitions >= 2; errors = 0 | PASS   |

## Invariants and errors

- **PERF-BT-001:** invariants={"fixtureSymbols":650,"fixtureBars":847600,"indicatorCount":4,"pointInTimeSnapshot":true,"terminalRuns":3}; errors=[]
- **PERF-BT-002:** invariants={"resultHashCount":1,"invalidOrder":0}; errors=[]
- **PERF-BT-003:** invariants={"combinedEvents":100000,"idempotentReplay":true}; errors=[]
- **PERF-BT-004-series:** invariants={"requestedPoints":2000}; errors=[]
- **PERF-BT-004-summary:** invariants={"realHttp":true}; errors=[]
- **PERF-BT-004-trades:** invariants={"duplicateTrade":0,"missingTrade":0}; errors=[]
- **PERF-BT-005:** invariants={"productionJobRegistered":true,"duplicateChildRun":0,"parameterCombinations":100}; errors=[]
- **PERF-BT-006:** invariants={"summaryHashEqual":true,"fillSequenceHashEqual":true,"equitySeriesHashEqual":true}; errors=[]
