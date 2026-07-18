# TASK-063 — Strategies, Backtests and Experiments Database Migrations

**Bağımlılık:** TASK-062

DB-008'e göre migration oluştur:

- strategies
- strategy_revisions
- backtest_runs
- backtest_data_snapshots
- backtest_summaries
- backtest_orders
- backtest_fills
- backtest_trades
- backtest_series_chunks
- research_experiments
- research_experiment_runs

Kabul:

- clean migration
- immutable revision unique
- idempotency unique
- snapshot hash unique
- fill dedup unique
- series chunk unique
- experiment binding unique
- numeric finansal alanlar
- ownership FK/index
- integration tests
- rollback/forward strategy

Henüz engine/API/worker ekleme.
