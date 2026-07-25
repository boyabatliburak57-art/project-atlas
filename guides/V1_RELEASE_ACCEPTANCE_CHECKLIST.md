# v1.0 Release Acceptance Checklist

This checklist separates local product-completion acceptance from external staging and production evidence.

## Scope and governance

- [ ] v1.0 work is present in `BACKLOG.md` with `scope:v1.0`
- [ ] no `scope:v1.1+` feature was introduced
- [ ] post-freeze changes have `change:approved` evidence
- [ ] blocker/critical/major/minor classification is recorded
- [ ] no acceptance, assertion, fixture or performance threshold was weakened

## Product completion

- [ ] onboarding and backend-owned preferences pass
- [ ] global navigation, ownership-safe search and activity pass
- [ ] unified reports, ownership, expiry and formula-injection controls pass
- [ ] accessibility, localization and responsive acceptance pass
- [ ] methodology, freshness, warning and legal-review disclosures are visible

## Repository quality and security

- [ ] format and ADR validation pass
- [ ] cache-free lint, typecheck, unit/integration and production build pass
- [ ] OpenAPI and migrations pass
- [ ] full Playwright passes twice with normal workers
- [ ] skipped, fixme, only, not-run and retry-only tests equal zero
- [ ] IDOR/admin authorization failures equal zero
- [ ] Critical/High dependency and container findings equal zero
- [ ] secret leakage equals zero
- [ ] previous milestone regressions equal zero

## Pre-staging artifact

- [ ] clean commit is used
- [ ] local RC is labeled `PRE_STAGING_ONLY`
- [ ] local RC is labeled `NOT_APPROVED_FOR_PRODUCTION`
- [ ] local SBOM, scans, migration manifest, OpenAPI, notes and flag snapshot are current
- [ ] local performance/resilience evidence is labeled `NOT_STAGING_EVIDENCE`

## External staging gate

- [ ] gate status remains `DEFERRED_EXTERNAL_GATE` until real access exists
- [ ] registry-backed immutable digest is deployed
- [ ] staging PostgreSQL, Redis, object storage and all worker roles are verified
- [ ] staging synthetic journeys pass
- [ ] LOAD-OPS-001–003 pass on staging
- [ ] CHAOS-OPS-001–006 pass on staging
- [ ] rollback rehearsal passes on staging
- [ ] current RC DAST passes on staging
- [ ] incident game-day passes on staging
- [ ] digest-bound SBOM, scan and provenance pass

Unchecked external staging items may be deferred for TASK-090's pre-staging decision, but they prohibit
production GO and production launch.

## Decision boundaries

- TASK-090: `GO_FOR_STAGING_VALIDATION` or `NO-GO_FOR_STAGING_VALIDATION`
- TASK-080S/TASK-080P: real staging evidence completion
- Production Readiness: remains `NO-GO` until final real-staging re-audit satisfies every production gate

Local results, local containers/load and historical DAST must not be checked as external staging evidence.
