# PASS — Alerts and Watchlists Performance Baseline

Generated: 2026-08-06T11:24:14.382Z

| ID           | Scenario                              | Fixture                      |  p50 ms |  p95 ms |  Max ms | Errors | Threshold                                    | Result |
| ------------ | ------------------------------------- | ---------------------------- | ------: | ------: | ------: | -----: | -------------------------------------------- | ------ |
| PERF-AWN-001 | 1000 active alert candidate filtering | 1 event × 1000 active alerts |    7.68 |   11.87 |   13.89 |      0 | p95 ≤ 250 ms; errors = 0; invariant = true   | PASS   |
| PERF-AWN-002 | 500 alert evaluation batch            | 500 candidates × 3 batches   | 1226.61 | 1370.36 | 1370.36 |      0 | p95 ≤ 10000 ms; errors = 0; invariant = true | PASS   |
| PERF-AWN-003 | Notification unread count             | 10000 notifications          |    0.88 |    1.22 |    1.61 |      0 | p95 ≤ 100 ms; errors = 0; invariant = true   | PASS   |
| PERF-AWN-004 | Notification cursor pagination        | 10000 rows / page 100        |    2.13 |    2.65 |    3.12 |      0 | p95 ≤ 150 ms; errors = 0; invariant = true   | PASS   |
| PERF-AWN-005 | Watchlist market summary              | 500 instruments / 2 bars     |   40.64 |   56.14 |   56.14 |      0 | p95 ≤ 750 ms; errors = 0; invariant = true   | PASS   |

## Environment

```json
{
  "hostname": "192.168.1.2",
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
