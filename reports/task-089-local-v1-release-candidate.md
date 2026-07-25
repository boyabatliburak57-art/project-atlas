# TASK-089 — Local v1 Release Candidate

Status: **PASS — local pre-staging scope only**

Release classification:

```text
PRE_STAGING_ONLY
NOT_APPROVED_FOR_PRODUCTION
```

Production Readiness: **NO-GO**  
Staging Gate: **DEFERRED_EXTERNAL_GATE**

## Candidate

- Version: `1.0.0-rc.prestaging.1`
- Source commit: `e2d6a7f346feb6d7b8f78c48593d049d9d8ec91d`
- Base image: `node:22.14.0-alpine3.21@sha256:9bef0ef1e268f60627da9ba7d7605e8831d5b56ad07487d24d1aa386336d1944`
- Local API image ID: `sha256:d955cb2f3a3bbb4c01e7db0773eda6c8d8d01724a615e6b4ad82725edac406de`
- Local worker image ID: `sha256:b2dfbab5a0a49bc725352ce0ebe6cf04b43bc2ad04ddd623ccf1ef5978571ba3`
- Local web image ID: `sha256:a5783cfdd9ce52258264c1a917cad81c62ee274c2f8fdc64ae8387e0a1bc13ab`
- Local migration image ID: `sha256:07b859d6aad97fefadf79ec3b28821f52820d015438b0305001e97087af2a83c`
- Registry digest: unavailable; these IDs are local image IDs and are not
  staging evidence.

## Artifacts

The release directory contains the release record, four SPDX SBOMs, four
Trivy SARIF reports, production dependency audit, OpenAPI document, migration
manifest, feature flag snapshot, and release notes.

Production dependency audit found 0 Critical and 0 High advisories. Trivy
scans found 0 Critical and 0 High findings. Secret scan found 0 leaks. License
policy passed for 173 production packages. All images run as non-root `node`.

## Validation

- Cache-free local unit suites: 635/635 PASS.
- PostgreSQL database integration: 65/65 PASS. An initial resource-contention
  timeout was reproduced; the isolated full rerun passed without changing a
  timeout or assertion.
- API database/security integration: 22/22 PASS with `ATLAS_ENV=test`.
- Playwright run 1: 28/28 PASS.
- Playwright run 2: 28/28 PASS.
- OpenAPI generation and validation: PASS.
- Axe WCAG A/AA, keyboard focus, tablet/mobile overflow: PASS.
- IDOR/admin denial/security scenarios: PASS; authorization failures 0.
- Skip/fixme/only additions: 0.

The experiment production-dispatch integration composition root was corrected
to provide the same real PostgreSQL pool used by the runtime feature-flag
store. No product assertion or threshold was reduced.

## Deferred external gates

Registry publication, immutable registry digest, staging deployment,
synthetic journeys, staging load/chaos, current staging DAST, rollback
rehearsal, and incident game-day were not run and remain
`DEFERRED_EXTERNAL_GATE`. No local result in this record is staging evidence.

## Transition

TASK-089 local acceptance criteria pass. TASK-090 may proceed as a local
product-completion audit, but it must preserve Production Readiness `NO-GO` and
must not convert deferred staging gates into local PASS evidence.
