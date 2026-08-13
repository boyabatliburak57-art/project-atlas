# ADR-030 — Provider Identity Resolution

Status: Accepted

## Decision

Provider external IDs map through validity-bounded references to canonical instrument, company, institution, fund or derivative-contract IDs. A mapping records status, confidence, source and review state. Only `RESOLVED` mappings with a canonical ID may proceed.

Unknown mappings return `UNRESOLVED_IDENTITY`; ingestion must not manufacture a canonical entity.

## Consequences

Aliases, mergers and identifier changes retain history. Vendor identifiers do not leak into public resource identity.
