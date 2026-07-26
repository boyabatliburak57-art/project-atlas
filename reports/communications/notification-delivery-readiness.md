# Notification Delivery Readiness

Status: SANDBOX_INTEGRATION

Assessment date: 2026-07-26  
Task: TASK-096  
Production provider claim: No

## Decision

The notification delivery boundary is provider-ready and its sandbox contract,
worker lifecycle, persistence, security controls, and user preference behavior
pass locally. No transactional e-mail credential is available in the current
environment, so this report does not classify the adapter as a real integration
and does not provide staging or production delivery evidence.

Production Readiness remains `NO-GO`. The staging gate remains
`DEFERRED_EXTERNAL_GATE`.

## Provider and credential status

| Control                              | Result                                                                            |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| Transactional provider credential    | unavailable                                                                       |
| Default non-production mode          | `sandbox`                                                                         |
| Deployed environment production mode | fail-fast unless base URL, secret-store reference, and injected token are present |
| Credential persistence               | reference only; no credential column                                              |
| Real provider HTTP boundary          | implemented, not activated or claimed                                             |
| Current integration classification   | `SANDBOX_INTEGRATION`                                                             |

The real adapter accepts only `secret://`, `vault://`, `aws-sm://`,
`gcp-sm://`, or `azure-kv://` references. Provider credentials are resolved at
the infrastructure boundary and are neither stored in delivery records nor
included in errors.

## Implemented scope

- Immutable, content-hashed `tr-TR` template registry:
  verification, password reset, security alert, alert trigger, report/export
  ready, import failure, account deletion, backtest completion, and experiment
  completion.
- Active-content rejection, HTML escaping, subject header-injection rejection,
  and sensitive subject guard.
- Persistent delivery attempts with retry outcome and hashed provider message
  identifier.
- Outbox idempotency, bounded retry/backoff, permanent failure handling, and
  per-minute provider rate limiting.
- HMAC-SHA256 signed bounce/complaint webhook with a five-minute replay window,
  event deduplication, bounded request rate, and hashed provider identifiers.
- User-owned notification reads, channel preferences, quiet hours, authenticated
  unsubscribe, and a security-message unsubscribe exception.
- Alert-delivery metrics and an on-call alert with runbook and recovery
  notification metadata.

Raw provider message IDs are not returned by the public API. Passwords,
verification/reset tokens, arbitrary provider response bodies, and credentials
are not logged or persisted by the delivery implementation.

## Database and migration

Migration `0018_violet_justice.sql` adds:

- `communication_templates`
- `communication_delivery_attempts`
- `communication_provider_events`

The migration has a matching rollback file and schema snapshot. Template
identity is immutable by `(code, version, locale)`. Delivery attempts are unique
by `(delivery_id, attempt)`, while provider events are idempotent by provider and
hashed event identity. No raw provider credential or raw provider event/message
identifier column exists.

## API and worker contracts

- `POST /api/v1/webhooks/email`: signed bounce/complaint ingestion; returns an
  acknowledgement without provider identifiers.
- `POST /api/v1/notification-preferences/unsubscribe`: affects only the
  authenticated user and disables alert e-mail without disabling security
  messages.
- Worker provider modes: `disabled`, `sandbox`, `production`.
- Production mode uses the existing worker/outbox composition root and fails
  configuration validation when provider metadata is absent.

## Required test matrix

| Requirement                                     | Evidence                                           | Result |
| ----------------------------------------------- | -------------------------------------------------- | ------ |
| Template rendering and active-content isolation | `communication-templates.test.ts`                  | PASS   |
| Locale and immutable template version           | `communication-templates.test.ts`                  | PASS   |
| Verification and password reset                 | `communication-templates.test.ts`                  | PASS   |
| Alert e-mail                                    | template and worker integration tests              | PASS   |
| Quiet hours                                     | `notification-delivery.integration.test.ts`        | PASS   |
| User preference and unsubscribe                 | API and worker integration tests                   | PASS   |
| Idempotent delivery                             | sandbox contract and PostgreSQL worker integration | PASS   |
| Retryable failure                               | worker integration; two attempts, one send         | PASS   |
| Permanent failure                               | worker integration; one attempt                    | PASS   |
| Bounce and complaint                            | PostgreSQL webhook test                            | PASS   |
| Webhook signature and replay protection         | PostgreSQL webhook test                            | PASS   |
| Security message exception                      | template policy test                               | PASS   |
| Secret redaction and provider-ID isolation      | adapter, webhook, and persistence tests            | PASS   |
| Delivery ownership / IDOR                       | API notification integration tests                 | PASS   |
| Rate limit                                      | sandbox adapter and webhook service tests          | PASS   |
| Worker integration                              | PostgreSQL + Redis suite                           | PASS   |
| Provider sandbox contract                       | sandbox adapter contract tests                     | PASS   |

No test was skipped, marked fixme/only, or weakened for this task.

## Validation summary

| Gate                                         |       Result |
| -------------------------------------------- | -----------: |
| Notification-focused unit/API contract tests |   23/23 PASS |
| Worker PostgreSQL/Redis integration suite    |   68/68 PASS |
| API PostgreSQL integration suite             |   29/29 PASS |
| Repository unit suites                       | 722/722 PASS |
| Database schema/migration tests              |   27/27 PASS |
| Format                                       |         PASS |
| ADR validation                               |         PASS |
| Lint                                         |         PASS |
| Typecheck                                    |         PASS |
| Production build                             |         PASS |

The database and API integration suite totals include broader regression
coverage; their notification-specific assertions passed within those runs.

## Security and ownership

- Duplicate deliveries observed: 0
- Webhook signature/replay failures: 0
- Delivery ownership/IDOR failures: 0
- Preference or quiet-hours failures: 0
- Secret/token leakage findings: 0
- Raw provider-message-ID public exposure: 0
- Provider webhook accepts arbitrary HTML/JS: no

## Remaining external gate

A real provider must be selected and its base URL, secret-store reference,
credential injection, verified sending identity, and provider-specific webhook
contract must be configured. Contract tests must then run against the authorized
provider sandbox or staging account. Until that evidence exists, this capability
must remain `SANDBOX_INTEGRATION`; local sandbox delivery is not staging or
production evidence.

## Transition

TASK-096 acceptance criteria are satisfied for the credential-absent path.
TASK-097 may proceed. This transition does not change TASK-080, production
readiness, or the deferred external staging gate.
