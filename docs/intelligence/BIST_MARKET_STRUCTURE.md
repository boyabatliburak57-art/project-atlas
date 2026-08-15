# BIST Market Structure

Atlas models exchange measures under the existing `MarketMeasureDomain`. There is no `VBTSDomain`, restricted-symbol table, or second event system. The same canonical revision feeds instrument summaries, market-wide queries, future Radar conditions, Company Timeline projections, and Calendar integration.

## Boundaries

- A market measure is a policy/effective-period record.
- Short-selling activity is an observed market statistic and is never stored in a restriction row.
- Provider names map into the canonical registry; unknown names become `OTHER_EXCHANGE_MEASURE` while source taxonomy remains an attribute.
- Missing observations remain absent. Atlas never turns them into zero.
- Production requires a configured and licensed provider. Test fixtures are not registered in the production composition root.

TASK-110F1 adds backend/data/API foundation only. Customer mobile screens remain TASK-110F2 scope.
