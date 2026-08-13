# TASK-110C Storage and Query Review

Result: **PASS**.

TASK-110C adds 12 stable PostgreSQL tables (95 → 107): four canonical/master-policy areas and immutable disclosure/event/flow/settlement/measure/holding foundations. No destructive migration or new technology was introduced.

| Expected query              | Index                                            | Cardinality/write cost |
| --------------------------- | ------------------------------------------------ | ---------------------- |
| company disclosure timeline | company + publishedAt                            | medium / low           |
| disclosure type feed        | type + publishedAt                               | medium / low           |
| flow by symbol/date         | instrument + tradeDate                           | high / medium          |
| flow by institution/date    | institution + tradeDate                          | high / medium          |
| settlement by symbol/date   | instrument + settlementDate                      | high / medium          |
| event projection            | entity + publishedAt; type + availableAt         | high / medium          |
| restriction validity        | instrument + effective period                    | medium / low           |
| fund holdings               | fund + reportingDate; instrument + reportingDate | high / low             |
| derivative chain            | underlying + expiry                              | medium / low           |

Queries enforce cursor/page/range/filter bounds. Order book remains a streaming contract with bounded ephemeral cache; historical storage needs measured evidence and a later ADR.
