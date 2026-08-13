# Atlas Cross-Module Navigation Contract

Feature code requests typed intents instead of sharing arbitrary raw route strings. TASK-110B
defines `OpenSymbol`, `OpenScanner`, `OpenWatchlist`, `OpenAlert`, `OpenPortfolio`, `OpenStrategy`,
`OpenBacktest` and `OpenReport`, plus capability-gated future intents for Institution, Event, Fund,
VIOP Contract and Compare.

Each resolved intent contains a schema-validated payload, authentication requirement, ownership
requirement where applicable, capability requirement and safe fallback. The intended cross-module
edges are:

- Symbol → Institutional, Events or Compare
- Scanner result or portfolio position → Symbol
- Scanner → Backtest
- Event → Company or Historical Analysis
- Alert or Inbox item → its authorized resource

TASK-110B supplies only the route and type foundation. TASK-110O owns business orchestration and
TASK-110N owns multi-source Smart Inbox aggregation. Until then, no synthetic event, institution,
fund or VIOP resource is generated. Analytics record only the intent category and source/target hub;
resource contents, private identifiers, search text, portfolio data and strategy AST are forbidden.
