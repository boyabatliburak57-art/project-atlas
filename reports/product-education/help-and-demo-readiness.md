# TASK-098 Help and Demo Readiness

**Decision: PASS — local product completion evidence**

**Production Readiness: NO-GO**  
**Staging Gate: DEFERRED_EXTERNAL_GATE**  
**Product Development: CONTINUE**

This report covers repository and local integration evidence for TASK-098. It
does not treat local execution, fixtures, deterministic demo content, or local
containers as staging evidence.

## Delivered surfaces

- `/help` provides Turkish search, category navigation, article summaries,
  version/locale, last-updated metadata, no-result recovery, and demo controls.
- `/help/[slug]` provides article detail, breadcrumbs, related articles,
  version/locale, and last-updated metadata.
- The catalog includes Getting started, Market and symbols, Scanner,
  Watchlists and alerts, Portfolio and risk, Fundamentals and patterns,
  Strategy Lab and backtesting, Reports and exports, Data freshness and
  methodology, Account and security, Troubleshooting, and FAQ.
- The glossary defines OHLCV, adjusted/raw price, data cutoff, stale/partial,
  TWR, XIRR, volatility, beta, VaR, Sharpe/Sortino/Calmar, drawdown, turnover,
  slippage, survivorship bias, look-ahead bias, and pattern candidate.
- Global search/command palette returns help articles. Portfolio, watchlist,
  scanner, Strategy Lab, and report surfaces expose contextual help or
  educational empty-state actions.

## Demo model and isolation

Migration `0020_organic_jazinda.sql` adds `user_demo_resources`. Every row has
an authenticated owner, constrained resource type, stable key, explicit
`is_demo=true`, `DEMO` label, safe disclaimer, and isolated JSON payload.
The deterministic bundle contains a watchlist, saved scan, portfolio, alert,
strategy, and backtest result.

`GET`, `POST`, and `DELETE /api/v1/me/demo` are authenticated owner-scoped
operations. Creation is idempotent by `(owner_user_id, stable_key)`. Reset
deletes only the caller's rows with `is_demo=true`; it cannot delete real
watchlist/portfolio resources or another user's demo resources. Creation and
reset generate operational audit events. Demo financial output is explicitly
described as educational, deterministic, non-live, and not investment advice.

## Required acceptance evidence

| Requirement               | Evidence                                                 | Result |
| ------------------------- | -------------------------------------------------------- | ------ |
| Help search               | Catalog unit tests and Playwright query/no-result flows  | PASS   |
| Category/article          | Required category set, article route and metadata E2E    | PASS   |
| Contextual link           | Product empty states and report header links             | PASS   |
| Localization              | Every article carries `tr-TR`; localized search test     | PASS   |
| Keyboard/accessibility    | Keyboard navigation plus axe WCAG A/AA E2E               | PASS   |
| Demo creation             | Database-backed six-resource bundle test                 | PASS   |
| Demo ownership            | Authenticated owner filtering and unauthenticated denial | PASS   |
| Demo reset                | Owner/demo-only delete with audit                        | PASS   |
| Real resource isolation   | Real watchlist/portfolio and other owner preserved       | PASS   |
| Demo disclaimer           | API and UI assertions for DEMO/non-advice disclosure     | PASS   |
| Empty-state actions       | Start, demo, and contextual help actions                 | PASS   |
| Global search integration | Command palette help-result E2E                          | PASS   |
| Playwright E2E            | `help-demo.spec.ts`: 4/4                                 | PASS   |

## Verification summary

- Database unit: 31/31 passed.
- Database migration/integration: 65/65 passed.
- API database integration: 41/41 passed, including 4/4 demo isolation tests.
- TASK-098 selected Playwright: 4/4 passed, including automated accessibility.
- Repository unit suite: 729/729 passed (domain 416, database 31, web 23,
  worker 113, API 146).
- Full Playwright suite: 36/36 passed with 4 normal workers, no retry.
- Format, ADR validation, lint, typecheck, production build, secret scan,
  TASK-098 skip/fixme/only scan, and `git diff --check`: passed.

## Security and accessibility

- IDOR/ownership failures: 0.
- Unauthenticated demo API access is denied.
- Demo reset real-resource deletion: 0.
- Cross-user demo disclosure: 0.
- New secret or provider credential handling: none.
- Automated axe findings in the TASK-098 help flow: 0.
- Help search and navigation are keyboard-operable with visible semantic
  controls and descriptive labels.

## Deferred external gates

No TASK-098 acceptance criterion requires staging execution. No local evidence
in this report changes TASK-080, proves an immutable staging release candidate,
or closes the staging gate.
