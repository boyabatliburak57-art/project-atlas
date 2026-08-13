# BIST Intelligence Temporal Model

`availableAt` is authoritative for point-in-time visibility. A query/backtest cutoff may include only `availableAt <= dataCutoff`.

| Field           | Meaning                                              |
| --------------- | ---------------------------------------------------- |
| observedAt/asOf | observation state time                               |
| tradeDate       | exchange trading date/session                        |
| settlementDate  | custody settlement date; never inferred as tradeDate |
| occurredAt      | event occurrence, if known                           |
| publishedAt     | source publication time                              |
| effectiveAt     | legal/economic effective time                        |
| sourceTimestamp | provider clock                                       |
| ingestedAt      | Atlas receipt/persistence time                       |
| availableAt     | earliest Atlas point-in-time eligibility             |
| dataCutoff      | complete input boundary used by a result             |

The existing exchange calendar/session adapter owns BIST session calculation. Corrections append a new immutable revision with `supersedesRevisionId`; prior records remain queryable. A future Event Impact projection uses publication/availability and T+1/T+5/T+20 exchange sessions without look-ahead.
