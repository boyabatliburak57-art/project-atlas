# Market Intelligence Performance Baseline

Status: **PASS**

| Scenario     | Fixture                                                     | p50 (ms) | p95 (ms) | max (ms) | Errors | Threshold                                                                        | Result |
| ------------ | ----------------------------------------------------------- | -------: | -------: | -------: | -----: | -------------------------------------------------------------------------------- | ------ |
| PERF-MKT-001 | 650 active BIST instruments                                 |     3.89 |      6.5 |     8.25 |      0 | warm p95 <= 500 ms; cold p95 <= 1200 ms                                          | PASS   |
| PERF-MKT-002 | 650 ranking rows; page size 50                              |     8.85 |    19.93 |    36.98 |      0 | p95 <= 400 ms; duplicate = 0; missing = 0                                        | PASS   |
| PERF-MKT-003 | 1 symbol / latest quote / latest pattern signal             |    13.27 |    65.91 |    65.91 |      0 | p95 <= 700 ms                                                                    | PASS   |
| PERF-MKT-004 | 730 daily bars / volume + 6 indicators / 1 corporate action |     83.7 |    137.2 |    137.2 |      0 | cold p95 <= 900 ms; alignment failure = 0                                        | PASS   |
| PERF-MKT-005 | 20 periods / 14 derived ratios                              |    10.82 |    16.37 |     18.1 |      0 | p95 <= 500 ms                                                                    | PASS   |
| PERF-MKT-006 | 650 symbols × 201 daily closed bars × 16 definitions        |  4364.05 |  6960.81 |  6960.81 |      0 | queue-to-terminal p95 <= 12000 ms; duplicate pattern = 0; look-ahead failure = 0 | PASS   |

PERF-MKT-006 uses the real BullMQ worker and PostgreSQL persistence path. Duplicate pattern rows: 0; look-ahead failures: 0.
