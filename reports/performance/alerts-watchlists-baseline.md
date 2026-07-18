# PASS — Alerts and Watchlists Performance Baseline

Generated: 2026-07-18T03:14:52.535Z

| ID           | Scenario                              | Fixture                      |  p50 ms |  p95 ms |  Max ms | Errors | Threshold                                    | Result |
| ------------ | ------------------------------------- | ---------------------------- | ------: | ------: | ------: | -----: | -------------------------------------------- | ------ |
| PERF-AWN-001 | 1000 active alert candidate filtering | 1 event × 1000 active alerts |    9.02 |   12.94 |   13.62 |      0 | p95 ≤ 250 ms; errors = 0; invariant = true   | PASS   |
| PERF-AWN-002 | 500 alert evaluation batch            | 500 candidates × 3 batches   | 1892.19 | 2057.08 | 2057.08 |      0 | p95 ≤ 10000 ms; errors = 0; invariant = true | PASS   |
| PERF-AWN-003 | Notification unread count             | 10000 notifications          |    1.22 |    2.01 |    2.74 |      0 | p95 ≤ 100 ms; errors = 0; invariant = true   | PASS   |
| PERF-AWN-004 | Notification cursor pagination        | 10000 rows / page 100        |    2.31 |    5.49 |    6.63 |      0 | p95 ≤ 150 ms; errors = 0; invariant = true   | PASS   |
| PERF-AWN-005 | Watchlist market summary              | 500 instruments / 2 bars     |   39.69 |   45.15 |   45.15 |      0 | p95 ≤ 750 ms; errors = 0; invariant = true   | PASS   |

## Environment

```json
{
  "hostname": "192.168.1.3",
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
