# TASK-069 — Strategy Lab and Backtest Web Experience

**Bağımlılık:** TASK-068

Oluştur:

- `/strategies`
- strategy builder
- validation/workload/bias warnings
- `/backtests`
- run form/progress
- summary
- equity/benchmark/drawdown/exposure charts
- trades/detail
- methodology/warnings
- cancellation
- `/experiments`
- parameter grid
- comparison matrix
- export
- accessibility
- Playwright

E2E:

- create/validate strategy
- AST request round-trip
- backtest request round-trip
- progress/completion
- summary/chart/trades
- cancel
- experiment
- clone
- IDOR
- no-look-ahead warning visible
