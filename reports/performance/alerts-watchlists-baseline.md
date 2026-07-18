# PASS — Alerts and Watchlists Performance Baseline

Generated: 2026-07-18T18:54:26.357Z

| ID           | Scenario                              | Fixture                      |  p50 ms | p95 ms | Max ms | Errors | Threshold                                    | Result |
| ------------ | ------------------------------------- | ---------------------------- | ------: | -----: | -----: | -----: | -------------------------------------------- | ------ |
| PERF-AWN-001 | 1000 active alert candidate filtering | 1 event × 1000 active alerts |    8.48 |  17.01 |  17.45 |      0 | p95 ≤ 250 ms; errors = 0; invariant = true   | PASS   |
| PERF-AWN-002 | 500 alert evaluation batch            | 500 candidates × 3 batches   | 1389.53 | 1736.7 | 1736.7 |      0 | p95 ≤ 10000 ms; errors = 0; invariant = true | PASS   |
| PERF-AWN-003 | Notification unread count             | 10000 notifications          |    0.89 |   1.24 |   2.01 |      0 | p95 ≤ 100 ms; errors = 0; invariant = true   | PASS   |
| PERF-AWN-004 | Notification cursor pagination        | 10000 rows / page 100        |    1.65 |   2.81 |   3.37 |      0 | p95 ≤ 150 ms; errors = 0; invariant = true   | PASS   |
| PERF-AWN-005 | Watchlist market summary              | 500 instruments / 2 bars     |   43.94 |     77 |     77 |      0 | p95 ≤ 750 ms; errors = 0; invariant = true   | PASS   |

## Environment

```json
{
  "hostname": "Burak-MacBook-Air.local",
  "platform": "darwin",
  "release": "25.5.0",
  "node": "v22.14.0"
}
```

## Fixture

```json
{
  "activeAlerts": 1000,
  "evaluationBatchSize": 500,
  "notifications": 10000,
  "watchlistInstruments": 500,
  "externalProvider": false
}
```
