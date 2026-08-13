# ADR-029 — Intelligence Temporal availableAt Semantics

Status: Accepted

## Decision

`availableAt` is the authoritative point-in-time visibility boundary. Publication, occurrence, effectiveness, observation, trade, settlement, source, ingestion, cutoff and as-of times are distinct fields where applicable. Research and backtests may read only records whose `availableAt <= dataCutoff`.

Corrections append immutable revisions and reference the superseded revision. They never overwrite historical evidence.

## Consequences

Event Impact and backtests cannot see future corrections or announcements. Trade-date and T+ settlement-date are never interchangeable.
