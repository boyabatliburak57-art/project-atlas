# ADR-031 — High-Volume Order Book Storage Strategy

Status: Accepted

## Decision

TASK-110C defines the `OrderBookProvider` stream envelope and canonical level semantics but does not persist live depth. Redis may hold bounded ephemeral snapshots; PostgreSQL stores configuration and low-volume evidence only. Historical high-volume retention requires measured throughput, licensing approval and a separate ADR before adding stream/time-series technology.

## Consequences

Atlas avoids an unbounded relational depth table and avoids premature infrastructure. Redistribution policy travels with every depth envelope.
