# DOC-034 — Strategy Lab and Backtest UX

**Sürüm:** 1.0  
**Durum:** Uygulamaya hazır

## Ekranlar

- `/strategies`
- `/strategies/new`
- `/strategies/{id}`
- `/backtests`
- `/backtests/{id}`
- `/experiments`
- `/experiments/{id}`

## Strategy builder

- universe
- entry
- exit
- sizing
- risk controls
- execution
- costs
- benchmark
- parameters
- validation summary

## Run form

- revision
- range
- capital
- timeframe
- adjustment
- execution
- cost model
- benchmark
- parameter overrides

Run öncesi validation, workload, bias warnings ve data availability gösterilir.

## Progress

- validating
- resolving universe
- loading point-in-time data
- warming indicators
- simulating
- metrics
- persistence
- finalizing

Sahte progress yoktur.

## Results

- return/benchmark
- drawdown
- Sharpe/Sortino/Calmar
- trade count
- win rate
- profit factor
- exposure/turnover
- fees/slippage
- methodology/data snapshot

## Charts

- equity
- benchmark
- drawdown
- exposure
- cash
- trade markers
- accessible text summary

## Experiment UI

- parameter matrix
- combination count
- progress
- comparison
- in/out-of-sample
- export

## Uyarılar

- past performance
- survivorship coverage
- partial data
- same-bar research mode
- low trade count
- high turnover
- overfitting
- missing point-in-time fundamentals

## Kabul kriterleri

- Strategy AST round-trip
- Run request round-trip
- Progress terminal stop
- Trade pagination
- Methodology görünür
- Cancellation
- Experiment comparison
- IDOR ve accessibility
