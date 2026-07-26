# Market Intelligence Performance Baseline

Status: **PASS**

| Scenario     | Fixture                                                     | p50 (ms) | p95 (ms) | max (ms) | Errors | Threshold                                                                        | Result |
| ------------ | ----------------------------------------------------------- | -------: | -------: | -------: | -----: | -------------------------------------------------------------------------------- | ------ |
| PERF-MKT-001 | 650 active BIST instruments                                 |     1.52 |     2.71 |     4.19 |      0 | warm p95 <= 500 ms; cold p95 <= 1200 ms                                          | PASS   |
| PERF-MKT-002 | 650 ranking rows; page size 50                              |     2.97 |     4.56 |    23.33 |      0 | p95 <= 400 ms; duplicate = 0; missing = 0                                        | PASS   |
| PERF-MKT-003 | 1 symbol / latest quote / latest pattern signal             |     3.88 |    20.37 |    20.37 |      0 | p95 <= 700 ms                                                                    | PASS   |
| PERF-MKT-004 | 730 daily bars / volume + 6 indicators / 1 corporate action |    37.37 |    61.62 |    61.62 |      0 | cold p95 <= 900 ms; alignment failure = 0                                        | PASS   |
| PERF-MKT-005 | 20 periods / 14 derived ratios                              |     4.29 |     5.44 |     7.01 |      0 | p95 <= 500 ms                                                                    | PASS   |
| PERF-MKT-006 | 650 symbols × 201 daily closed bars × 16 definitions        |  2308.29 |  2400.06 |  2400.06 |      0 | queue-to-terminal p95 <= 12000 ms; duplicate pattern = 0; look-ahead failure = 0 | PASS   |

PERF-MKT-006 uses the real BullMQ worker and PostgreSQL persistence path. Duplicate pattern rows: 0; look-ahead failures: 0.
