# Market Intelligence Performance Baseline

Status: **PASS**

| Scenario     | Fixture                                                     | Cache / repetitions                                                        | p50 (ms) | p95 (ms) | max (ms) | Errors | Threshold                                 | Result |
| ------------ | ----------------------------------------------------------- | -------------------------------------------------------------------------- | -------: | -------: | -------: | -----: | ----------------------------------------- | ------ |
| PERF-MKT-001 | 650 active BIST instruments                                 | 7 response-cache cold repetitions; 25 response-cache warm repetitions      |     1.28 |     2.03 |     3.61 |      0 | warm p95 <= 500 ms; cold p95 <= 1200 ms   | PASS   |
| PERF-MKT-002 | 650 ranking rows; page size 50                              | cold cache per traversal; each opaque cursor page is a distinct cache miss |     2.62 |     3.65 |        7 |      0 | p95 <= 400 ms; duplicate = 0; missing = 0 | PASS   |
| PERF-MKT-003 | 1 symbol / latest quote / latest pattern signal             | database read path; 12 repetitions                                         |      3.4 |    31.14 |    31.14 |      0 | p95 <= 700 ms                             | PASS   |
| PERF-MKT-004 | 730 daily bars / volume + 6 indicators / 1 corporate action | 7 cold and 20 warm response-cache repetitions                              |     36.1 |     52.1 |     52.1 |      0 | cold p95 <= 900 ms; alignment failure = 0 | PASS   |
| PERF-MKT-005 | 20 periods / 14 derived ratios                              | database read and ratio calculation path; 20 repetitions                   |     4.16 |      5.2 |     6.69 |      0 | p95 <= 500 ms                             | PASS   |

PERF-MKT-001 cold response-cache: p50 2.22 ms, p95 18.68 ms, max 18.68 ms.

PERF-MKT-002 cursor invariants: duplicate 0, missing 0.

PERF-MKT-003 queries: 7 logical read-model queries per aggregate repetition; cache hits 0, misses 0.

PERF-MKT-004 queries: 3 logical read-model queries per HTTP request; cache hits 20, misses 1; alignment failures 0.

PERF-MKT-005 queries: 4 logical PostgreSQL queries per HTTP request; cache hits 0, misses 0.

The benchmark uses the real Nest HTTP controller, application service, PostgreSQL read model, cursor codec, DTO mapping, serialization, and a deterministic local fixture. No external provider is called.
