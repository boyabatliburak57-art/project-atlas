# Mobile Backtests

Backtest configuration submits a versioned strategy revision, bounded dates, capital, sizing, benchmark, commission, slippage, adjustment mode and methodology options to the backend. The backend and BullMQ worker remain authoritative.

Lifecycle states are queued, validating, running, completed, failed, cancelled, providerRequired and notEvaluable. Polling is bounded and stops at terminal state; cancellation and dispatch are idempotent. Result screens show cutoff, dataset/benchmark/engine/methodology revisions and the historical-performance disclosure. Mobile does not calculate official returns, costs, signals, or trade fills.
