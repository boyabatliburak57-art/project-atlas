# TASK-083 — Onboarding and Preferences

Status: PASS

Production Readiness: NO-GO  
Staging Gate: DEFERRED_EXTERNAL_GATE  
Product Development: CONTINUE

## Delivered scope

- Added a server-owned, per-user preferences aggregate and an eight-step
  onboarding state machine.
- Added locale, timezone, date/number/currency, default market and benchmark,
  chart, notification, quiet-hours, accessibility and display preferences.
- Added authenticated current-user endpoints for preferences and onboarding,
  with strict request validation and mandatory optimistic concurrency.
- Added the responsive onboarding web flow with disclosure, skip, resume,
  reset and completion behavior.
- Added migration, rollback, domain, API, database-integration and browser E2E
  coverage.

## Database and migration

- Forward migration: `packages/database/drizzle/0014_user_preferences.sql`
- Destructive development rollback:
  `packages/database/drizzle/rollback/0014_user_preferences.down.sql`
- New `user_preferences` table has a one-to-one cascading foreign key to
  `security_users`, JSON size checks, currency/version checks and timestamps.
- Clean migration inventory is 77 tables. Reapply and rollback integration
  paths include migration 0014.

## API

| Method | Path                             | Behavior                                             |
| ------ | -------------------------------- | ---------------------------------------------------- |
| GET    | `/api/v1/me/preferences`         | Returns authenticated user's server-side preferences |
| PATCH  | `/api/v1/me/preferences`         | Applies validated patch with `expectedVersion`       |
| GET    | `/api/v1/me/onboarding`          | Returns authenticated user's onboarding state        |
| POST   | `/api/v1/me/onboarding/complete` | Completes/skips a step with version check            |
| POST   | `/api/v1/me/onboarding/reset`    | Resets onboarding with version check                 |

The authenticated session is the only user identity source. Client-supplied
`userId` is rejected. Stale versions return a conflict and the atomic update
does not overwrite newer state.

## Verification

| Gate                                 |                  Result |
| ------------------------------------ | ----------------------: |
| Format                               |                    PASS |
| ADR validation                       |              25/25 PASS |
| Lint, cache-free                     |       8/8 packages PASS |
| Typecheck, cache-free                |       8/8 packages PASS |
| Unit tests                           |            615/615 PASS |
| Database integration                 |              63/63 PASS |
| Worker integration                   |              68/68 PASS |
| Preferences API database integration |                4/4 PASS |
| OpenAPI generation                   |                1/1 PASS |
| Production build                     |       8/8 packages PASS |
| Playwright full suite                |              19/19 PASS |
| TASK-083 onboarding E2E              |                1/1 PASS |
| Secret scan                          |              0 findings |
| Production dependency audit          | 0 known vulnerabilities |
| Skip/fixme/only scan                 |              0 findings |
| `git diff --check`                   |                    PASS |

The four-worker Playwright diagnostic run experienced local resource
contention and timed out; no assertions, fixtures or product thresholds were
changed. The unchanged complete suite then passed 19/19 with one deterministic
worker. This is local regression evidence, not staging evidence.

## Security and accessibility

- Authentication is required on every endpoint.
- Cross-user database integration proves that user B cannot read or mutate
  user A's preferences.
- Request-body identity injection is rejected, stale writes return conflict,
  and mutation is atomic.
- IDOR failures: 0. Secret findings: 0. Production dependency findings: 0.
- The onboarding E2E verifies keyboard progression and visible focus. The UI
  uses labelled controls, fieldsets/legends, status/live regions, semantic
  headings and reduced-motion-aware styling.
- Accessibility E2E: 1/1 PASS; full browser regression: 19/19 PASS.

## External gates

No staging deployment, staging synthetic, load, chaos, rollback or current-RC
DAST was executed by TASK-083. Those controls remain
`DEFERRED_EXTERNAL_GATE`. No local result in this report is staging evidence,
and the TASK-080 decision remains NO-GO.

## Acceptance

All TASK-083 repository acceptance criteria passed without skipped tests,
reduced assertions or relaxed performance thresholds. TASK-084 may proceed as
product development work; this does not authorize a production release.
