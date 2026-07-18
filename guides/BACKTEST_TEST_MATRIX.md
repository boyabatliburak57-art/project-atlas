# Backtest Test Matrix

## Strategy

- revision/clone/conflict
- AST round-trip
- parameter binding
- future reference rejection
- multi-timeframe alignment
- IDOR

## Engine

- buy/sell
- multiple symbols
- equal weight
- cash/max positions
- deterministic ordering
- next-open
- stop/take-profit/trailing
- liquidation
- checkpoint/cancel

## Costs

- commission/minimum
- slippage
- fees/tax
- insufficient cash
- participation
- missing volume

## Data integrity

- look-ahead
- survivorship
- listing/delisting
- index membership
- fundamental publication/restatement
- corporate action double count
- missing/corrected bar

## Metrics

- equity/return/drawdown
- volatility
- Sharpe/Sortino/Calmar
- win rate/profit factor
- turnover/exposure
- benchmark
- zero trade
- NaN/Infinity

## Runtime/API

- idempotency
- transitions
- retry/cancel/progress
- result IDOR
- cursor pagination
- series chunks
- export security
- OpenAPI

## Experiments

- grid count
- duplicate binding
- run reuse
- max combinations
- partial failure
- holdout
- export

## E2E

- create/validate strategy
- run/progress/results
- cancel
- experiment
- clone
- IDOR
