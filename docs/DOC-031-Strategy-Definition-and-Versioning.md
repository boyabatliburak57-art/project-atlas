# DOC-031 — Strategy Definition and Versioning

**Sürüm:** 1.0  
**Durum:** Uygulamaya hazır

## Strategy resource

- owner
- name
- description
- private visibility
- status
- current revision
- tags
- timestamps

## Immutable revision

Kural veya execution parametresi değiştiğinde yeni revision oluşur.

Revision:

- schema version
- entry/exit/filter AST
- parameters
- sizing
- risk controls
- execution policy
- cost model
- benchmark policy

taşır.

## Durumlar

- draft
- validated
- archived
- deleted

Yalnız validated revision backtest edilir.

## Backtest-safe AST

Yasak:

- future bar reference
- publication date öncesi fundamental kullanım
- free expression
- SQL/eval
- tamamlanmamış üst timeframe barı

## Parameters

Named parameter type, range, default ve deterministic binding hash taşır.

## Position sizing

- equalWeight
- fixedCash
- fixedPercent
- volatilityTarget
- riskPerTrade

## Risk controls

- stopLossPercent
- takeProfitPercent
- trailingStopPercent
- maxHoldingBars
- maxPositionWeight
- maxConcurrentPositions

## Validation çıktısı

- errors/warnings
- required data
- warm-up
- complexity
- workload estimate
- execution compatibility

## Concurrency

Update `expectedRevision` kullanır. Eski revision:

```text
STRATEGY_REVISION_CONFLICT
```

üretir.

## Kabul kriterleri

- Revision immutable.
- AST round-trip çalışır.
- Future reference reddedilir.
- Multi-timeframe closed-bar hizalaması testlidir.
- Parameter binding deterministiktir.
- Clone ownership ve conflict testlidir.
