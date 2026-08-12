# Mobile v1 API and Worker Parity Result

Audit date: `2026-08-11`  
Result: `PASS`

| Domain                          | Backend/API                                                             | Mobile production composition                                  | Async runtime                          | Status        |
| ------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------- | ------------- |
| Auth/session                    | OpenAPI + auth controllers                                              | Anonymous login/reset policy; SecureStore session              | N/A                                    | PASS          |
| Preferences/onboarding          | `/me/preferences`, `/me/onboarding/*`                                   | `MobilePreferencesApi` + query/mutation/expectedVersion        | N/A                                    | PASS          |
| Market/search/symbol            | Typed overview/search/symbol/chart/fundamental/pattern APIs             | `MobileMarketApi` + TanStack Query                             | Provider capability                    | PASS_AS_GATED |
| Scanner/saved scans             | Saved-scan and scanner-run contracts                                    | Owned saved scans + revision/run state surfaces                | Scanner worker attached                | PASS_AS_GATED |
| Watchlists/alerts/notifications | CRUD, history and cursor contracts                                      | Owned list/alert/notification queries and mutations            | Alert/notification workers attached    | PASS_AS_GATED |
| Portfolio/transactions/risk     | Portfolio, positions, ledger, valuation, performance and risk contracts | Owner-keyed queries, true cursors, decimal/idempotent mutation | Portfolio jobs attached where required | PASS_AS_GATED |
| Strategy/backtests/experiments  | Strategy revision, run, result, series, trade and experiment contracts  | Owner-keyed production queries and cursor lists                | Backtest + experiment workers attached | PASS_AS_GATED |
| Reports/support/settings        | Report/support/preferences/data-operation contracts                     | `ReportsSettingsApi` + production queries/mutations            | Report worker attached                 | PASS_AS_GATED |
| Deep links                      | Private-resource GET contracts                                          | Central cold/warm consumer revalidates ownership               | N/A                                    | PASS          |

OpenAPI production endpoint gaps: `0`  
Typed-client contract mismatches: `0`  
Deprecated mobile dependencies: `0`  
Required worker attachment failures: `0`

Worker validation:

- Scanner queue → worker → persisted result: `PASS`
- Alert evaluation and notification lifecycle: `PASS`
- Backtest worker: `PASS`
- Experiment worker: `PASS`
- Report enqueue → worker → persistence: `PASS`
- Fake client completion timers: `0`

Unavailable live providers remain `CREDENTIAL_REQUIRED`; the production client displays provider-required states and never substitutes fixture output.
