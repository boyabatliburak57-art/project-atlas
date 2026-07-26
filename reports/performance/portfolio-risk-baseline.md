# Portfolio and Risk Performance Baseline

- **Status:** PASS
- **Generated:** 2026-07-26T15:00:57.782Z
- **Environment:** {"hostname":"192.168.1.2","platform":"darwin","release":"25.5.0","cpu":"Apple M1","memoryBytes":8589934592,"node":"v22.14.0","pnpm":"9.15.4","redis":"7.4.9","databaseUrl":"test PostgreSQL (credential redacted)","externalProvider":false}
- **Fixture:** {"ledgerTransactions":10000,"ledgerInstruments":100,"positions":1000,"seriesDays":1826,"csvRows":10000}

| ID            | Scenario                                                | Fixture                                                 | Warm/cold                                          | Repetitions | p50 ms | p95 ms | Max ms | Errors | Threshold                   | Result |
| ------------- | ------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------- | ----------: | -----: | -----: | -----: | -----: | --------------------------- | ------ |
| PERF-PORT-001 | Ledger replay and projection rebuild                    | 10000 posted transactions / 100 instruments             | 1 cold warm-up excluded; measured repetitions warm |           5 |    125 | 130.95 | 130.95 |      0 | p95 <= 5000 ms; errors <= 0 | PASS   |
| PERF-PORT-002 | Position valuation, price load and snapshot write       | 1000 positions / 1000 closed daily prices               | 1 cold warm-up excluded; measured repetitions warm |           5 | 109.87 | 116.67 | 116.67 |      0 | p95 <= 3000 ms; errors <= 0 | PASS   |
| PERF-PORT-003 | Five-year TWR and XIRR performance series               | 1826 daily valuations / 3 irregular cash flows          | 1 cold warm-up excluded; measured repetitions warm |          20 |  36.59 |   42.5 | 101.08 |      0 | p95 <= 1500 ms; errors <= 0 | PASS   |
| PERF-PORT-004 | Five-year portfolio risk analytics                      | 1826 portfolio + benchmark days / 1000 exposures        | 1 cold warm-up excluded; measured repetitions warm |          20 |   5.05 |   5.87 |   6.19 |      0 | p95 <= 3000 ms; errors <= 0 | PASS   |
| PERF-PORT-005 | CSV preview validation and duplicate summary            | 10000 mixed valid/invalid/duplicate rows / 669203 bytes | 1 cold warm-up excluded; measured repetitions warm |           5 | 150.14 | 190.72 | 190.72 |      0 | p95 <= 8000 ms; errors <= 0 | PASS   |
| PERF-PORT-006 | Owned 50-row position page through the real API process | 1000 positions / page 50                                | 1 cold warm-up excluded; measured repetitions warm |         100 |   5.67 |   12.3 |  18.13 |      0 | p95 <= 500 ms; errors <= 0  | PASS   |
