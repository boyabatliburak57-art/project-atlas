# Mobile Reports

## Scope and structure

The iOS Reports center exposes recent reports, a versioned type registry, generation status, report detail, methodology, disclosures, expiry and explicit export/share actions. Supported source families are portfolio, scanner, backtest and experiment. Market and symbol reports remain capability-gated.

The UI uses a metadata spine for source revision, data cutoff, methodology version, generated time and expiry. Missing or not-evaluable values are never rendered as zero. Portfolio privacy mode is preserved in preview and share confirmation.

## API and lifecycle

`POST /api/v1/reports` validates owner, source, type, date bounds and format, then creates an idempotent `queued` record. `reports.generate.v1` is consumed from `atlas.reports.v1` by the production worker composition root. The worker claims `queued/running`, produces the bounded artifact, computes SHA-256, persists an opaque storage key and transitions to `ready`. Retries are bounded and terminal polling stops.

List/detail/cancel/delete and short-lived authenticated download contracts are owner-scoped. PDF and CSV are user formats. PDF carries human-readable metadata and disclosures; CSV uses canonical cells with spreadsheet injection protection. JSON is an internal contract, not a normal mobile option.

## Data and disclosures

Portfolio reports separate recorded values from provider-dependent valuation. Scanner reports expose readable conditions, never raw AST. Backtest and experiment reports preserve revision, dataset, engine, point-in-time policy, costs, NOT_EVALUABLE reasons and neutral comparison language. Reports are historical analysis, not investment advice.

## Offline, accessibility and tests

Cached metadata may be read-only offline; generation, mutation and download-link creation are blocked rather than queued. Status, expiry and metric labels have text semantics and minimum touch targets. VoiceOver remains under `OPEN_TASK_100K`. Unit, API, PostgreSQL/BullMQ, IDOR, Maestro and native visual evidence cover the flow.
