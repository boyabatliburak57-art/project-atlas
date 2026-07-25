# v1.0 Scope Freeze and Backlog Triage

Date: 2026-07-24  
Task: TASK-082  
Policy: DOC-043

## Decision

```text
Scope Freeze: ACTIVE
Production Readiness: NO-GO
Staging Gate: DEFERRED_EXTERNAL_GATE
Product Development: CONTINUE
```

v1.0 feature scope is frozen. Freeze acceptance authorizes only the included scope and the explicitly
allowed completion/fix classes below. It does not approve staging or production.

## Included v1.0 scope

| Scope                                | Release expectation                                                               |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| Market data and instruments          | Existing ingestion, freshness and instrument contracts retained                   |
| Indicators and Scanner               | Versioned indicators, saved/preset scans and scanner runtime retained             |
| Watchlists, Alerts and Notifications | Ownership-safe lifecycle, evaluation and delivery retained                        |
| Portfolio and Risk                   | Ledger, valuation, performance, risk and import/export retained                   |
| Market Intelligence                  | Overview, symbol/chart, fundamentals and patterns retained                        |
| Strategy Lab                         | Strategies, deterministic backtests and research experiments retained             |
| Admin operations                     | RBAC-protected flags, queues, incidents, recovery and release visibility retained |
| Security and audit                   | Authentication, IDOR controls, rate limits, audit and redaction retained          |
| Product completion                   | TASK-083–TASK-087 onboarding, navigation, reports, accessibility and disclosures  |
| Pre-staging quality                  | TASK-088–TASK-090 local regression, local RC and product-completion audit         |

The scope includes integration and polish needed to make these existing capabilities coherent. It does not
authorize a new product domain.

## Allowed after freeze

- blocker, security and correctness fixes
- accessibility and localization work
- performance regression fixes without threshold relaxation
- API contract corrections that preserve compatibility or follow approved migration/versioning policy
- UX consistency and empty/loading/error states
- onboarding and user preferences defined by DOC-044
- documentation, disclosures and methodology visibility
- tests that strengthen existing acceptance criteria

## Deferred to v1.1 or later

| Capability                    | Label         | Reason                                       |
| ----------------------------- | ------------- | -------------------------------------------- |
| Broker connection             | `scope:v1.1+` | New regulated/external integration domain    |
| Live trading/order routing    | `scope:v1.1+` | Execution and financial-risk domain          |
| Native mobile application     | `scope:v1.1+` | New client/platform scope                    |
| Social/community              | `scope:v1.1+` | New moderation and privacy domain            |
| Public strategy marketplace   | `scope:v1.1+` | New publishing, review and commercial domain |
| AI investment recommendations | `scope:v1.1+` | New model, suitability and legal-risk domain |
| Tick-level/HFT simulation     | `scope:v1.1+` | New data/capacity and execution model        |
| Unbounded optimizer           | `scope:v1.1+` | Violates bounded workload policy             |
| Enterprise billing            | `scope:v1.1+` | New identity, entitlement and payment domain |

Deferred features must not be partially introduced behind an undocumented flag in v1.0.

## Severity and priority classes

| Class            | Definition                                                                                                  | Release handling                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `class:blocker`  | Prevents required build/test/security/data-integrity gate, or makes core flow unusable                      | Must close before the affected next gate                                 |
| `class:critical` | Exploitable security/IDOR issue, durable data loss/corruption, financial invariant failure, secret exposure | Immediate triage; v1 acceptance prohibited until closed                  |
| `class:major`    | Included-scope acceptance failure with material user impact and no safe complete experience                 | Must close or be explicitly removed from v1 scope through change control |
| `class:minor`    | Limited polish defect with safe workaround and no security/correctness/accessibility blocker                | May defer with owner, rationale and target milestone                     |

Severity cannot be reduced to pass a release gate. Accessibility failures that block a critical journey are
at least `class:major`; security, IDOR, secret, durable-data and financial correctness failures cannot be
classified as minor.

## Feature request change control

Every request after freeze must include:

1. problem statement and affected users
2. proposed scope and explicit non-goals
3. requested `scope:v1.0` or `scope:v1.1+` label
4. severity class when it fixes an existing acceptance failure
5. architecture, DB, API, security, privacy, accessibility and operational impact
6. migration/backward-compatibility plan when applicable
7. test and acceptance evidence
8. owner and target milestone

Requests remain `change:proposed` until reviewed. A v1.0 addition requires product-scope approval and
engineering approval; security/privacy, persistence, public API or operational changes additionally require
the relevant specialist review. Approved work receives `change:approved`; rejected or deferred work receives
`change:deferred`. An emergency `class:critical` fix may be expedited but still requires a recorded review
and retrospective.

No request may:

- weaken tests, thresholds, IDOR, accessibility or security acceptance
- treat local evidence as staging evidence
- change TASK-080 to GO
- introduce arbitrary SQL, file paths, provider payloads or unbounded workloads
- silently expand data collection, retention or public API surface

## Backlog triage result

The authoritative labels and current sequence are recorded in `BACKLOG.md`. TASK-083–TASK-090 are
`scope:v1.0`; all DOC-043 future capabilities are `scope:v1.1+`. No unclassified feature request is accepted
into v1.0.

## Release acceptance

`guides/V1_RELEASE_ACCEPTANCE_CHECKLIST.md` is the v1 acceptance checklist. Local product-completion
acceptance and the external staging/production gate are separate:

- TASK-090 may decide only readiness to enter staging validation.
- Real staging evidence remains `DEFERRED_EXTERNAL_GATE`.
- Production remains blocked until TASK-080S/TASK-080P and the final Production Readiness re-audit pass.

## Acceptance result

| Criterion                                       | Result |
| ----------------------------------------------- | ------ |
| v1.0 included scope documented                  | PASS   |
| v1.1+ deferred scope documented                 | PASS   |
| blocker/critical/major/minor classes documented | PASS   |
| feature request change control documented       | PASS   |
| roadmap and backlog labels recorded             | PASS   |
| release acceptance checklist created            | PASS   |
| TASK-080 remains NO-GO                          | PASS   |
| Local evidence substitution prohibited          | PASS   |

TASK-082 acceptance is complete. This is not staging or production approval.
