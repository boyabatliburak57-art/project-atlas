# TASK-100F Performance Result

Date: 2026-08-06

Local Apple M1 / Node 22.14.0 evidence:

| Scenario                   |        p95 | Errors | Result |
| -------------------------- | ---------: | -----: | ------ |
| Scanner small run          |  107.34 ms |      0 | PASS   |
| Scanner 600-instrument run | 1938.01 ms |      0 | PASS   |
| Scanner complex run        | 3572.73 ms |      0 | PASS   |
| Result cursor page         |    2.72 ms |      0 | PASS   |
| Progress polling           |    1.40 ms |      0 | PASS   |
| Idempotent replay          |    1.11 ms |      0 | PASS   |
| Alert/watchlist scenario 1 |   11.87 ms |      0 | PASS   |
| Alert/watchlist scenario 2 | 1370.36 ms |      0 | PASS   |
| Alert/watchlist scenario 3 |    1.22 ms |      0 | PASS   |
| Alert/watchlist scenario 4 |    2.65 ms |      0 | PASS   |
| Alert/watchlist scenario 5 |   56.14 ms |      0 | PASS   |

These are deterministic local benchmark results, not staging or production load evidence.
