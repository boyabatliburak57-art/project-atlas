# Mobile Performance Final Result

Candidate: `fac5bfe45c2f+WORKTREE`  
Profile: `iPhone 17 · iOS 26.5 · local production-like/native and deterministic backend fixtures`  
Result: `PASS`

Existing source-of-truth thresholds were retained. Market, scanner, alerts/watchlists and portfolio benchmark suites passed with zero errors. The backtest suite was rerun uncontended after native regression completed; PERF-BT-001 through PERF-BT-006 all passed without changing a threshold.

| Area                  | Fixture / runs                               | Evidence                                          | Result |
| --------------------- | -------------------------------------------- | ------------------------------------------------- | ------ |
| Market intelligence   | PERF-MKT-001..006                            | all scenarios within accepted thresholds          | PASS   |
| Scanner               | PERF-SCN-001..006                            | pagination duplicate/missing 0; heap growth 0 MiB | PASS   |
| Alerts/watchlists     | PERF-AWN-001..005                            | errors 0                                          | PASS   |
| Portfolio             | PERF-PORT-001..006                           | errors 0                                          | PASS   |
| Backtest              | PERF-BT-001..006                             | persistence p95 4,129.92 ms; threshold 8,000 ms   | PASS   |
| Native lifecycle core | 20 background/foreground + 20 network cycles | listener counts returned to 0                     | PASS   |

These local measurements are not staging evidence.
