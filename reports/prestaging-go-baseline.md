# TASK-091 — Pre-Staging Baseline and Gap Verification

Audit date: 2026-07-26  
Repository HEAD: `085f80b`  
Scope: repository evidence only; no external credential or staging claim

```text
Production Readiness: NO-GO
Staging Gate: DEFERRED_EXTERNAL_GATE
Product Development: CONTINUE
```

## 1. Decision

The current repository has production-shaped internal ingestion, persistence, queue, retry, and
read-model foundations, but it does **not** contain a real external market-data, fundamentals,
corporate-actions, benchmark, or transactional e-mail integration.

The production worker composition root explicitly registers fake market/fundamentals adapters and
an unconfigured e-mail adapter. Legal consent, help center, support intake, data-issue reporting,
and support-admin queue capabilities are absent. Test fixtures, static disclosure copy, domain
calculations, and database columns are not classified as production integrations.

All requested capabilities have a determinate classification. No capability below is promoted
from fake, fixture, sandbox, or interface-only evidence to `REAL_INTEGRATION`.

## 2. Classification rules

- `REAL_INTEGRATION`: production composition uses a concrete implementation with its required
  persistence/queue/API path. For external providers this additionally requires a real HTTP
  adapter, credential boundary, environment/deployment registration, and contract evidence.
- `SANDBOX_INTEGRATION`: concrete external provider adapter wired only to an explicitly identified
  sandbox environment.
- `FAKE_ADAPTER`: executable fake registered in a composition root or used by tests.
- `FIXTURE_ONLY`: evidence exists only as test/demo fixtures, static values, or calculations over
  caller-supplied data.
- `INTERFACE_ONLY`: contracts and/or orchestration exist, but the production implementation is
  absent or deliberately unconfigured.
- `MISSING`: no capability-specific contract and executable product path exists.
- `NOT_APPLICABLE`: the capability is explicitly outside product scope. No audited capability
  qualified for this status.

Production composition-root evidence takes precedence over test injection points.

## 3. Capability baseline

| Capability                           | Status           | Evidence                                                                                                                                                                                                     | Missing Pieces                                                                                                                                                                            | Target Task         |
| ------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Provider architecture                | INTERFACE_ONLY   | `providers/contracts.ts`, `provider-registry.ts`, `validated-provider.ts`, schemas and registry tests provide normalization, capability metadata and error mapping                                           | Credential/secret reference boundary, provider health contract, licensing metadata, source/available-at/revision contract, provider-wide retry policy and production adapter registration | TASK-092            |
| Market data provider                 | FAKE_ADAPTER     | `createDefaultMarketDataComposition()` registers `FakeMarketDataProviderAdapter`; `WorkerRuntime` uses this default for the production market-data role                                                      | Real HTTP adapter, credential schema/reference, provider contract/replay tests, health, licensing, deployment configuration                                                               | TASK-092 → TASK-093 |
| Instrument provider                  | FAKE_ADAPTER     | Instrument import service and PostgreSQL store are real, but production registry resolves `listInstruments()` from `FakeMarketDataProviderAdapter` with an empty instrument array                            | Real instrument endpoint/mapping, pagination, status/delisting behavior, credential and contract evidence                                                                                 | TASK-093            |
| OHLCV provider                       | FAKE_ADAPTER     | Bar ingestion service/store and validation tests exist; production adapter returns configured fake `barBatch: { bars: [] }`                                                                                  | Real OHLCV HTTP transport, backfill/incremental cursor, retry/rate-limit enforcement, revision/correction and replay tests                                                                | TASK-093            |
| Trading calendar provider            | MISSING          | No calendar/session provider contract, adapter, environment key, deployment registration, worker job, API, or UI path was found                                                                              | Calendar/session contract, real adapter, timezone/holiday/session mapping, health and contract tests                                                                                      | TASK-093            |
| Index and sector membership provider | MISSING          | Market read models expose sectors/index summaries, but the provider contract only supplies instruments and bars; no membership-fetch operation or production registration exists                             | Index/sector membership contract, effective dates/revisions, real adapter and reconciliation                                                                                              | TASK-093            |
| Benchmark provider                   | FIXTURE_ONLY     | Portfolio/backtest schemas and domain tests accept benchmark codes/series such as `XU100`; no benchmark provider contract or composition registration exists                                                 | Real benchmark/index adapter, calendar alignment, revisions, credentials, health and contract tests                                                                                       | TASK-093            |
| Fundamentals provider                | FAKE_ADAPTER     | Fundamentals contract, normalization, immutable revision persistence and integration tests exist; production composition registers `FakeFundamentalsProvider('fake-provider', ...)`                          | Real HTTP adapter, credentials, publication/restatement replay, rate-limit behavior, licensing and health                                                                                 | TASK-092 → TASK-094 |
| Corporate actions provider           | FIXTURE_ONLY     | Portfolio domain/database support split, dividend, rights issue and deduplication fixtures; market provider exposes only a `supportsCorporateActions` boolean and no fetch operation                         | Provider contract/adapter for split/dividend/rights/delisting, effective/revision timestamps and raw/adjusted consistency                                                                 | TASK-094            |
| Internal snapshot reconciliation     | REAL_INTEGRATION | Market-data worker registers `SnapshotReconciliationService` with PostgreSQL store, Redis cache backend, queue job and integration tests                                                                     | This proves only current internal snapshot reconciliation; add provider/cross-source comparison, operational visibility and correction workflow                                           | TASK-095            |
| Data correction operations           | MISSING          | No correction-request aggregate, immutable correction revision workflow, controlled replay API, admin UI, audit path or deployment configuration exists                                                      | Finding lifecycle, correction approvals, revision-preserving replay, read-model rebuild, metrics/alerts and admin authorization                                                           | TASK-095            |
| Transactional e-mail provider        | INTERFACE_ONLY   | `EmailAdapter`, durable PostgreSQL outbox, retry/idempotency processor and notification worker exist; default production composition resolves to `UnconfiguredEmailAdapter`; tests inject `FakeEmailAdapter` | Real or explicit sandbox adapter, recipient resolver, credential boundary, templates/localization, provider health and deployment config                                                  | TASK-096            |
| Bounce and complaint handling        | MISSING          | `EMAIL_PERMANENT_BOUNCE` is only an internal error code; no signed webhook controller, complaint model, suppression state, provider event persistence or tests exist                                         | Authenticated webhook, event deduplication, bounce/complaint suppression, audit, metrics and security tests                                                                               | TASK-096            |
| Legal document versioning            | MISSING          | `/trust` and disclosure E2E provide static product copy only; no legal document schema, version/locale repository, publishing workflow or API exists                                                         | Versioned documents, approval state, locale, effective dates, admin publish audit and legal-review boundary                                                                               | TASK-097            |
| User consent records                 | MISSING          | No consent schema, repository, API route, UI, ownership test or re-consent composition exists                                                                                                                | Immutable acceptance records, document/version binding, re-consent policy, export/delete handling, IDOR and E2E                                                                           | TASK-097            |
| Help center                          | MISSING          | No help route/page, article schema, search API, contextual-help registry or help-center E2E exists                                                                                                           | Searchable localized articles, module guides, glossary, contextual links, accessibility and ownership-safe analytics                                                                      | TASK-098            |
| Demo data                            | FIXTURE_ONLY     | `demoMode` exists as an onboarding preference and tests contain product fixtures; no isolated demo tenant/dataset, safe reset or ownership boundary is wired                                                 | Explicit demo dataset, isolation, reset lifecycle, no-mixing invariant, education flows and E2E                                                                                           | TASK-098            |
| Feedback and bug reporting           | MISSING          | No feedback/bug aggregate, API, UI, attachment policy, rate limit category, audit or admin ownership path exists                                                                                             | User intake, safe attachments, correlation ID, status/history, retention, IDOR and support queue                                                                                          | TASK-099            |
| Data issue reporting                 | MISSING          | Internal reconciliation findings do not expose a user data-issue request API/UI; no ownership/status/history workflow exists                                                                                 | User-facing data issue intake, symbol/provider context, correction linkage, audit, rate limiting and IDOR                                                                                 | TASK-095 → TASK-099 |
| Account deletion and data export UX  | MISSING          | Authenticated account-deletion API and scheduled recovery processing are real; portfolio/report exports exist, but there is no account lifecycle page or full account-data export API/UX                     | Re-authenticated deletion/export UX, status/grace-period visibility, full account export, retry/failure guidance and E2E                                                                  | TASK-099            |
| Support admin queue                  | MISSING          | Admin operations covers flags/queues/incidents/recovery, not support requests; no support schema, controller, RBAC service, UI or worker registration exists                                                 | Support queue, ownership/status/history, dangerous actions, attachment review, audit, rate limits and admin IDOR tests                                                                    | TASK-099            |

## 4. Cross-cutting evidence

### Production composition roots

- `WorkerRuntime.start()` selects `createDefaultMarketDataComposition()` for the `market-data`
  worker and `createDefaultNotificationComposition()` for notification delivery.
- The default market-data composition registers only `FakeMarketDataProviderAdapter` and
  `FakeFundamentalsProvider`.
- The default notification composition does not inject an `EmailAdapter`; the factory therefore
  selects `UnconfiguredEmailAdapter`.
- Scanner, alert, backtest, experiment, recovery, PostgreSQL/Redis, queue, and worker-role roots are
  real internal infrastructure. They do not turn an upstream fake/unconfigured provider into a
  real external integration.

### Environment and credential boundary

- Worker/API environment schemas cover database, Redis, object storage, telemetry, release and
  operational settings.
- `.env.example` plus local/test/staging/production examples contain no market provider,
  fundamentals provider, corporate-action provider, benchmark provider, transactional e-mail,
  webhook-signing, legal publishing, or support attachment credential/reference keys.
- Kubernetes/workflow/config searches found no registration or secret-store reference for those
  integrations.
- No secret values were printed or copied into this report.

### Tests and product wiring

- Provider registry, validation, ingestion, notification outbox, retry and idempotency tests prove
  internal contracts using fake inputs.
- API/UI market, fundamentals, notification-center, reports, trust and account-deletion surfaces
  prove existing product behavior, not external-provider authenticity.
- Static trust disclosures are not versioned legal documents.
- Portfolio/backtest benchmark and corporate-action fixtures are not benchmark/corporate-action
  provider adapters.
- `demoMode` preference and E2E fixtures are not an isolated demo-data integration.

## 5. Gap routing

| Workstream                     | Confirmed baseline gap                                                                          | Required next task |
| ------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------ |
| Provider architecture          | No credential, licensing, health, revision/available-at or production adapter boundary          | TASK-092           |
| Market data                    | Fake instruments/OHLCV; calendar, membership and benchmark providers absent                     | TASK-093           |
| Fundamentals/corporate actions | Fake fundamentals and fixture-only corporate actions                                            | TASK-094           |
| Data reconciliation            | Internal snapshot reconciliation exists; correction operations and cross-source workflow absent | TASK-095           |
| Notification delivery          | Durable orchestration exists; real/sandbox e-mail and webhook lifecycle absent                  | TASK-096           |
| Legal/consent                  | Static disclosures only; versioning, approval and consent records absent                        | TASK-097           |
| Help/demo                      | Help center absent; demo is preference/test-fixture only                                        | TASK-098           |
| Support/account lifecycle      | Deletion backend partial; support, feedback, data-issue intake and account export UX absent     | TASK-099           |

## 6. Transition

The classifications are unambiguous at repository level. TASK-092 may proceed to complete the
provider-neutral architecture and contracts before any real provider adapter work.

This transition does not assert that provider credentials are available, does not classify a fake
or sandbox adapter as production-ready, does not supply staging evidence, and does not change
TASK-080:

```text
Production Readiness: NO-GO
Staging Gate: DEFERRED_EXTERNAL_GATE
Product Development: CONTINUE
```
