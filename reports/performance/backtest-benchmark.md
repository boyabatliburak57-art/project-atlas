# Backtest Performance Benchmark

- **Status:** PASS
- **Generated:** 2026-07-25T22:07:45.244Z
- **Commit:** `1525f1b2d3a2ca9b7a9e9b3de7fc5c5846b45cc5`
- **Selected scenario:** all
- **Environment:** {"hostname":"192.168.1.6","os":"darwin 25.5.0","cpu":"Apple M1","cpuCount":8,"memoryBytes":8589934592,"memoryPeakMeasurement":"process.resourceUsage.maxRSS","node":"v22.14.0","pnpm":"9.15.4","postgres":"17.10","redis":"7.4.9","database":"isolated test PostgreSQL (credentials redacted)","internetProvider":false}
- **Fixture contract:** `performance/fixtures/backtest-v1.json`
- **Threshold contract:** `performance/thresholds/backtest.json`

| ID                  | Fixture                                                              | Worker |   Batch | Repetitions | Warm/cold                                                     |   p50 ms |   p95 ms |   Max ms | Engine ms |   DB ms | Persistence ms | API ms | Peak memory | Errors | Threshold                                     | Result |
| ------------------- | -------------------------------------------------------------------- | -----: | ------: | ----------: | ------------------------------------------------------------- | -------: | -------: | -------: | --------: | ------: | -------------: | -----: | ----------: | -----: | --------------------------------------------- | ------ |
| PERF-BT-001         | 650 symbols × 1304 daily bars × 4 indicators                         |      2 |    2000 |           3 | cold PostgreSQL snapshot; precomputed causal indicator series | 23407.85 | 27101.13 | 27101.13 |  22602.17 |  805.68 |         116.07 |      0 |   821510144 |      0 | p95 <= 30000 ms; repetitions >= 3; errors = 0 | PASS   |
| PERF-BT-002         | 5000000 ordered events; linear cost every 100                        |      1 | 5000000 |           5 | warm deterministic core; no cache                             |  5292.35 |  5447.29 |  5447.29 |   5292.35 |       0 |              0 |      0 |   167428096 |      0 | p95 <= 12000 ms; repetitions >= 5; errors = 0 | PASS   |
| PERF-BT-003         | 100000 combined orders/fills/trades/series points                    |      1 |   20000 |           5 | cold writes; idempotent replay warm conflict path             |  4608.95 |   7027.2 |   7027.2 |         0 | 4608.95 |        4608.95 |      0 |   202014720 |      0 | p95 <= 8000 ms; repetitions >= 5; errors = 0  | PASS   |
| PERF-BT-004-series  | 2000-point equity series                                             |      1 |     100 |          10 | one cold request followed by warm measured requests           |    21.42 |    53.86 |    53.86 |         0 |       0 |              0 |  21.42 |   188809216 |      0 | p95 <= 700 ms; repetitions >= 10; errors = 0  | PASS   |
| PERF-BT-004-summary | summary through auth/controller/application/repository/serialization |      1 |     100 |          10 | one cold request followed by warm measured requests           |     5.16 |     8.66 |     8.66 |         0 |       0 |              0 |   5.16 |   188809216 |      0 | p95 <= 500 ms; repetitions >= 10; errors = 0  | PASS   |
| PERF-BT-004-trades  | 10000 trades; page 100                                               |      1 |     100 |         100 | one cold request followed by warm measured requests           |     6.55 |    15.04 |    23.48 |         0 |       0 |              0 |   6.55 |   188809216 |      0 | p95 <= 500 ms; repetitions >= 10; errors = 0  | PASS   |
| PERF-BT-005         | 100 parameter combinations                                           |      2 |     100 |           5 | warm compatible completed-run reuse                           |    75.73 |     89.5 |     89.5 |         0 |       0 |              0 |      0 |   165085184 |      0 | p95 <= 3000 ms; repetitions >= 5; errors = 0  | PASS   |
| PERF-BT-006         | 2 independent runs on atlas-backtest-benchmark-snapshot-v1           |      2 |    2000 |           2 | warm persisted result read                                    |     4.24 |     6.93 |     6.93 |         0 |    4.24 |              0 |      0 |   838369280 |      0 | p95 <= 30000 ms; repetitions >= 2; errors = 0 | PASS   |

## Invariants and errors

- **PERF-BT-001:** invariants={"fixtureSymbols":650,"fixtureBars":847600,"indicatorCount":4,"pointInTimeSnapshot":true,"terminalRuns":3}; errors=[]
- **PERF-BT-002:** invariants={"resultHashCount":1,"invalidOrder":0}; errors=[]
- **PERF-BT-003:** invariants={"combinedEvents":100000,"idempotentReplay":true}; errors=[]
- **PERF-BT-004-series:** invariants={"requestedPoints":2000}; errors=[]
- **PERF-BT-004-summary:** invariants={"realHttp":true}; errors=[]
- **PERF-BT-004-trades:** invariants={"duplicateTrade":0,"missingTrade":0}; errors=[]
- **PERF-BT-005:** invariants={"productionJobRegistered":true,"duplicateChildRun":0,"parameterCombinations":100}; errors=[]
- **PERF-BT-006:** invariants={"summaryHashEqual":true,"fillSequenceHashEqual":true,"equitySeriesHashEqual":true}; errors=[]
