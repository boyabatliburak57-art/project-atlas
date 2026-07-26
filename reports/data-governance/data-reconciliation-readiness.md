# TASK-095 Data Reconciliation and Correction Operations Readiness

Status: PASS

Production Readiness: NO-GO  
Staging Gate: DEFERRED_EXTERNAL_GATE  
Product Development: CONTINUE

Bu rapor yalnız repository ve yerel PostgreSQL/Redis integration kanıtlarını
özetler. Yerel container sonuçları staging kanıtı değildir ve TASK-080 kararını
değiştirmez.

## Scope

DB-011 için `provider_connections`, `provider_ingestion_runs`,
`provider_data_revisions`, `data_quality_findings` ve
`data_correction_requests` tabloları migration 0017 ile eklendi. Önceki
`ingestion_runs` ve `data_quality_issues` tabloları geriye dönük uyumluluk için
korundu.

Provider credential değeri tutulmaz. `provider_connections` yalnız
`secret://`, `vault://`, `aws-sm://`, `gcp-sm://` veya `azure-kv://` biçiminde
secret-store reference kabul eder. Admin read modeli bu reference alanını da
dışarı çıkarmaz.

## Detection and reconciliation

| Control                          | Result           | Evidence                                                                          |
| -------------------------------- | ---------------- | --------------------------------------------------------------------------------- |
| Missing bar                      | PASS             | Deterministic expected/observed timestamp comparison                              |
| Duplicate bar                    | PASS             | Timestamp multiplicity and fingerprint deduplication                              |
| OHLC invariant                   | PASS             | Finite value, high/low and negative volume guards                                 |
| Volume anomaly                   | PASS             | Bounded median multiplier rule                                                    |
| Stale data                       | PASS             | Explicit latest-at/now/maximum-age evaluation                                     |
| Fundamental period gap           | PASS             | Expected fiscal period sequence comparison                                        |
| Restatement mismatch             | PASS             | Immutable revision hash comparison                                                |
| Corporate-action mismatch        | PASS             | Evidence hash mismatch finding                                                    |
| Benchmark gap                    | PASS             | Expected benchmark period comparison                                              |
| Internal/provider reconciliation | PASS             | Typed mismatch finding                                                            |
| Cross-provider reconciliation    | CONDITIONAL PASS | Same typed comparison is available; execution requires a configured second source |
| Finding deduplication            | PASS             | SHA-256 fingerprint and database unique constraint/upsert                         |

Provider outage is represented by connection health and ingestion run failure
states. The current market, fundamentals and corporate-actions provider reports
remain `CREDENTIAL_REQUIRED`; no fake or fixture adapter is classified as a real
integration.

## Lineage and revision safety

- Provider source timestamp, available-at, provider revision, content hash,
  ingestion run and superseded revision identity are stored separately.
- Corrections select an immutable `provider_data_revisions.id`; arbitrary SQL
  and raw provider payload are not accepted by the API.
- Existing revisions are never updated or deleted by the correction workflow.
- Point-in-time selection returns only revisions available at the backtest
  cutoff, preserving snapshot isolation.
- Replay deduplication is enforced in domain policy and by a unique replay
  idempotency key in PostgreSQL.

## Correction workflow

Supported states are `open`, `investigating`, `approved`, `rejected`,
`replayQueued`, `replaying`, `resolved` and `failed`. The state machine has a
closed transition graph.

Every mutation requires a reason and `expectedVersion`. Replay queueing also
requires exact `QUEUE_CONTROLLED_REPLAY` confirmation, immutable target revision
ID and replay idempotency key. Read-model status becomes `stale` before replay;
it cannot be presented as fresh during rebuild.

Correction invalidation scopes cover market, scanner, portfolio and backtest
read models. The same event/version identity is used to prevent duplicate
invalidation and replay.

## Admin and audit

Endpoints:

- `GET /api/v1/admin/data-operations`
- `POST /api/v1/admin/data-operations/corrections`
- `POST /api/v1/admin/data-operations/corrections/{id}/{transition}`

All endpoints use the existing trusted session principal, require
`operations_admin` and recent authentication, and ignore caller-asserted role
headers. Every accepted mutation writes actor, reason, request ID, correlation
ID and before/after state to `operational_audit_events` in the same database
transaction.

The operations web application displays provider health, ingestion history,
findings, correction state and rebuild freshness. Keyboard focus, semantic
headings/table roles, accessible labels, loading/error states and explicit
version-conflict feedback were verified.

## Metrics and alerts

Bounded data-quality/correction counters and critical-finding structured events
were added. Prometheus rules cover critical data-quality findings and provider
ingestion failures, include owners, deduplication keys, cooldowns, recovery
notification requirements and the data-reconciliation runbook link. Provider
or resource identifiers are not metric labels.

## Validation

All commands used Node 22.14.0 through `fnm`; the initially active Node 26.5.0
was rejected by the repository engine gate and was not used to weaken it.

| Gate                                      | Result |                Count |
| ----------------------------------------- | -----: | -------------------: |
| Reconciliation unit tests                 |   PASS |                18/18 |
| Full domain unit suite                    |   PASS |              416/416 |
| Database unit/schema/migration tests      |   PASS |                26/26 |
| PostgreSQL integration and rollback tests |   PASS |                65/65 |
| Worker unit suite                         |   PASS |              102/102 |
| Worker PostgreSQL/Redis integration       |   PASS |                68/68 |
| API unit/in-memory integration            |   PASS |              145/145 |
| API PostgreSQL integration suites         |   PASS |                25/25 |
| Data operations admin DB tests            |   PASS | 3/3 (included above) |
| OpenAPI                                   |   PASS |                  1/1 |
| Web unit suite                            |   PASS |                20/20 |
| Admin Playwright                          |   PASS |                  4/4 |
| Domain/database/API/web lint              |   PASS |           4 packages |
| Database/API/web typecheck                |   PASS |           3 packages |
| Monorepo production build                 |   PASS |         8/8 packages |

The API database command selected the configured database suite and completed
all five files; no test was skipped, marked `fixme`/`only`, or weakened.

## Security result

- Admin authorization failure: 0
- IDOR/caller-asserted role bypass: 0
- Version-conflict bypass: 0
- Dangerous confirmation bypass: 0
- Replay duplicate observed: 0
- Arbitrary SQL/provider-payload input surface: 0
- Credential or secret exposure: 0
- Raw provider payload in admin/API response: 0

## Remaining external conditions

- A second configured provider is required to execute cross-provider
  reconciliation against two real sources.
- Real provider credentials remain external requirements recorded by TASK-093
  and TASK-094.
- No staging validation was claimed in TASK-095.

## Transition decision

TASK-095 acceptance criteria pass locally with no data-corruption, replay
duplicate or admin-authorization failure. TASK-096 may proceed. Production
Readiness remains **NO-GO** and the staging gate remains
**DEFERRED_EXTERNAL_GATE**.
