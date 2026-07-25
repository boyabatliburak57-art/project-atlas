# TASK-084 — Global Navigation, Search and Activity

Status: PASS

Production Readiness: NO-GO  
Staging Gate: DEFERRED_EXTERNAL_GATE  
Product Development: CONTINUE

## Delivered scope

- Added persistent global navigation for market, scanner, watchlists, alerts,
  portfolios, strategies, backtests, experiments, reports, activity and
  settings.
- Added an accessible command palette with keyboard opening, arrow navigation,
  quick-create commands, safe search result rendering and no dangerous admin
  commands.
- Added an ownership-safe search aggregator for instruments, watchlists, saved
  scans, portfolios, strategies, backtests and experiments.
- Added signed cursors bound to user, query and type context.
- Added the activity read model, API and responsive activity center UI.
- Added activity deduplication, expiry indexes, retention deletion support and
  metadata redaction.

## Database and migration

- Forward migration: `packages/database/drizzle/0015_user_activity.sql`
- Development rollback:
  `packages/database/drizzle/rollback/0015_user_activity.down.sql`
- New table: `user_activity_events`
- Clean migration inventory: 78 tables
- Per-user deduplication key, user/cursor index, expiry index, metadata size
  constraint and cascade ownership foreign key are enforced.
- PostgreSQL integration proves ownership filtering, expiry exclusion and
  duplicate rejection.

## API

| Method | Path                                      | Behavior                                                      |
| ------ | ----------------------------------------- | ------------------------------------------------------------- |
| GET    | `/api/v1/search?q=&types=&cursor=&limit=` | Parameterized, allowlisted and ownership-scoped global search |
| GET    | `/api/v1/activity?cursor=&limit=`         | Current-user, non-expired activity page                       |

Both endpoints require the authenticated session identity. Search uses one
static parameterized query; it cannot execute arbitrary SQL or provider
queries. Query length, type allowlist, page size and cursor size are bounded.
Existing per-IP and per-user `normal_read` rate limiting applies.

## Security

- Private resources are filtered by the authenticated user inside every search
  branch.
- Search cursors are HMAC signed and bound to user/query/type context. A cursor
  issued to user A is rejected for user B.
- Activity cursors are user-bound. Expired rows are excluded.
- Highlighting is returned as text segments rather than HTML.
- Secret-shaped activity metadata keys are removed from responses.
- Command palette cannot invoke dangerous admin operations.
- IDOR failures: 0.
- Secret findings: 0.
- Production dependency Critical/High findings: 0.

During verification, the package-manager audit detected
`GHSA-r28c-9q8g-f849` through the existing `postcss@8.5.16` override. The
override was upgraded to `postcss@8.5.23`, the lockfile was regenerated, a
clean frozen install completed and the production audit returned zero known
vulnerabilities.

## Accessibility

- Skip link and semantic main landmark
- Labelled primary navigation with `aria-current`
- Command palette dialog, combobox/listbox roles and live result count
- Ctrl/Cmd+K, Escape, ArrowUp, ArrowDown and Enter keyboard support
- Visible focus indicators and responsive navigation/activity layouts
- XSS payload is rendered as inert text in E2E
- TASK-084 accessibility/browser E2E: 1/1 PASS

## Verification

| Gate                           |                  Result |
| ------------------------------ | ----------------------: |
| Format                         |                    PASS |
| ADR validation                 |              25/25 PASS |
| Lint, cache-free               |       8/8 packages PASS |
| Typecheck, cache-free          |       8/8 packages PASS |
| Unit tests                     |            620/620 PASS |
| Database integration           |              64/64 PASS |
| Worker integration baseline    |              68/68 PASS |
| Navigation/security unit tests |                4/4 PASS |
| OpenAPI generation             |                1/1 PASS |
| Production build               |       8/8 packages PASS |
| Playwright full suite          |              20/20 PASS |
| TASK-084 E2E                   |                1/1 PASS |
| Secret scan                    |              0 findings |
| Production dependency audit    | 0 known vulnerabilities |
| Skip/fixme/only scan           |              0 findings |
| `git diff --check`             |                    PASS |

## External gates

No staging deployment, staging synthetic, load, chaos, rollback or current-RC
DAST was executed. Those controls remain `DEFERRED_EXTERNAL_GATE`. Local
PostgreSQL, browser and build results are repository regression evidence only,
not staging evidence. TASK-080 remains NO-GO.

## Acceptance

All TASK-084 repository acceptance criteria passed without skipped tests,
reduced assertions, relaxed thresholds or architecture changes. TASK-085 may
proceed as product development work; this does not authorize production
release.
