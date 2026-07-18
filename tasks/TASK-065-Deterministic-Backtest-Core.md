# TASK-065 — Deterministic Backtest Core

**Bağımlılık:** TASK-064

Infrastructure bağımsız olarak oluştur:

- planner contracts
- ordered event timeline
- simulation state
- scanner evaluator integration
- order intents
- equal/fixed sizing
- cash validation
- next-open execution
- position lifecycle
- forced exit/end liquidation
- equity/cash/exposure series
- metrics
- deterministic hashes
- checkpoint contract

Kabul:

- same input same result
- no-look-ahead
- stable symbol/event order
- duplicate fill yok
- cash/quantity invariant
- no short/leverage
- zero-trade result
- NaN/Infinity yok
- checkpoint resume same result
