# TASK-085 — Unified Report Center

Status: PASS

Production Readiness: NO-GO  
Staging Gate: DEFERRED_EXTERNAL_GATE  
Product Development: CONTINUE

## Delivered scope

- Added report orchestration for portfolio, scanner, alert history, backtest,
  experiment matrix, account/security and authorized admin operational reports.
- Added list, detail, create, cancel, short-lived download and delete APIs.
- Added CSV and JSON adapters with methodology, cutoff, generated time, source
  revision, warning, partial/stale and not-evaluable transparency fields.
- Added the responsive Report Center UI with report generation, lifecycle,
  methodology disclosure, download and dangerous delete confirmation.
- Added expiry cleanup, idempotent request deduplication and activity audit
  events.

## Database and migration

- Forward migration: `packages/database/drizzle/0016_generated_reports.sql`
- Development rollback:
  `packages/database/drizzle/rollback/0016_generated_reports.down.sql`
- New table: `generated_reports`
- Clean migration inventory: 79 tables
- Owner/request deduplication, owner/status/cursor index, expiry index, lifecycle
  constraints, JSON limits and ready-artifact consistency are enforced.
- Artifact bytes are bounded to 1 MiB and internal storage identifiers are never
  returned by the public service.

## API

| Method | Path                            | Behavior                                 |
| ------ | ------------------------------- | ---------------------------------------- |
| GET    | `/api/v1/reports`               | Ownership-scoped cursor page             |
| POST   | `/api/v1/reports`               | Allowlisted report orchestration         |
| GET    | `/api/v1/reports/{id}`          | Ownership-scoped report status/detail    |
| DELETE | `/api/v1/reports/{id}`          | Artifact-clearing soft delete with audit |
| POST   | `/api/v1/reports/{id}/cancel`   | Queued/running cancellation              |
| GET    | `/api/v1/reports/{id}/download` | 60-second user/report-bound link         |

No endpoint accepts a path, storage key, content type or arbitrary artifact
payload. Strict input validation rejects extra internal fields.

## Security

- Source ownership is checked before report creation.
- All report reads and mutations include owner identity in the database query.
- Cross-user source and report access returns the same safe not-found response.
- Admin operational reports require `operations_admin`.
- Download tokens are HMAC signed, expire after 60 seconds and are bound to both
  user and report.
- Formula-leading CSV cells (`=`, `+`, `-`, `@`) are prefixed safely and all
  values are quoted.
- Internal storage key and artifact bytes are removed from public responses.
- Existing `import_export` and normal request rate/size protections apply.
- Generate, download, cancel and delete actions create deduplicated activity
  audit records.
- IDOR failures: 0.
- Secret leakage: 0.
- Production dependency Critical/High findings: 0.

## Accessibility

- Semantic heading, fieldset/legend, labels, ordered report list and details
  disclosure
- Keyboard-operable generate, download, cancel and delete actions
- Live lifecycle announcements
- Visible focus indicators
- Responsive single-column behavior
- Explicit destructive delete confirmation
- TASK-085 accessibility/browser E2E: 1/1 PASS

## Verification

| Gate                                 |                  Result |
| ------------------------------------ | ----------------------: |
| Format                               |                    PASS |
| ADR validation                       |              25/25 PASS |
| Lint, cache-free                     |       8/8 packages PASS |
| Typecheck, cache-free                |       8/8 packages PASS |
| Unit tests                           |            625/625 PASS |
| Database integration                 |              65/65 PASS |
| Worker integration retained baseline |              68/68 PASS |
| Report security/service tests        |                4/4 PASS |
| OpenAPI generation                   |                1/1 PASS |
| Production build                     |       8/8 packages PASS |
| Playwright full suite                |              21/21 PASS |
| TASK-085 E2E                         |                1/1 PASS |
| Secret scan                          |              0 findings |
| Production dependency audit          | 0 known vulnerabilities |
| Skip/fixme/only scan                 |              0 findings |
| `git diff --check`                   |                    PASS |

## External gates

No staging deployment, staging object-storage validation, staging synthetic,
load, chaos, rollback or current-RC DAST was executed. These remain
`DEFERRED_EXTERNAL_GATE`. Local database, browser and build results are
repository regression evidence only and are not staging evidence. TASK-080
remains NO-GO.

## Acceptance

All TASK-085 repository acceptance criteria passed without skipped tests,
reduced assertions, relaxed thresholds or architecture changes. TASK-086 may
proceed as product development work; this does not authorize production
release.
