# TASK-064 — Strategy Domain and Backtest-Safe Validation

**Bağımlılık:** TASK-063

Oluştur:

- strategy CRUD/revision/clone
- optimistic concurrency
- parameter definitions/bindings
- entry/exit/filter AST
- sizing
- risk controls
- execution/cost references
- required data/warm-up
- complexity/workload
- point-in-time validation

Kabul:

- future reference rejected
- unsupported operand rejected
- multi-timeframe closed-bar alignment
- deterministic binding hash
- revision conflict
- clone ownership
- no eval/free code
- AST round-trip
- path-based validation errors
