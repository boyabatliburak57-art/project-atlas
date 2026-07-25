# Project Atlas Roadmap

## v1.0 — Product completion and pre-staging validation

Status: `scope:frozen`

Sequence:

1. TASK-081 — staging gate deferral record
2. TASK-082 — scope freeze and backlog triage
3. TASK-083 — onboarding and preferences
4. TASK-084 — global navigation, search and activity
5. TASK-085 — unified report center
6. TASK-086 — accessibility, localization and responsive polish
7. TASK-087 — trust, methodology and disclosure surfaces
8. TASK-088 — local performance and resilience polish
9. TASK-089 — local pre-staging release candidate
10. TASK-090 — pre-staging product completion audit

TASK-090 can produce readiness for staging validation, not production approval.

## External production-readiness gate

```text
Production Readiness: NO-GO
Staging Gate: DEFERRED_EXTERNAL_GATE
Production Launch: BLOCKED
```

TASK-080S/TASK-080P must be reopened only when real staging access and authorization exist. Local tests,
containers, load or historical DAST artifacts are not staging evidence.

## v1.1+

The following remain outside v1.0:

- broker connections and live trading/order routing
- native mobile application
- social/community and public strategy marketplace
- AI investment recommendations
- tick-level/HFT simulation and unbounded optimization
- enterprise billing

Moving any item into v1.0 requires the change-control process in `reports/v1-scope-freeze.md`.
