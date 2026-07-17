# Portfolio and Risk Performance Baseline

- **Status:** PASS
- **Generated:** 2026-07-16T17:08:31.733Z
- **Environment:** {"hostname":"192.168.1.7","platform":"darwin","release":"25.5.0","cpu":"Apple M1","memoryBytes":8589934592,"node":"v22.14.0","pnpm":"9.15.4","redis":"7.4.9","databaseUrl":"test PostgreSQL (credential redacted)","externalProvider":false}
- **Fixture:** {"ledgerTransactions":10000,"ledgerInstruments":100,"positions":1000,"seriesDays":1826,"csvRows":10000}

| ID            | Scenario                                                | Fixture                  | Warm/cold                                          | Repetitions | p50 ms | p95 ms | Max ms | Errors | Threshold                  | Result |
| ------------- | ------------------------------------------------------- | ------------------------ | -------------------------------------------------- | ----------: | -----: | -----: | -----: | -----: | -------------------------- | ------ |
| PERF-PORT-006 | Owned 50-row position page through the real API process | 1000 positions / page 50 | 1 cold warm-up excluded; measured repetitions warm |         100 |   6.01 |  10.38 |  18.32 |      0 | p95 <= 500 ms; errors <= 0 | PASS   |
