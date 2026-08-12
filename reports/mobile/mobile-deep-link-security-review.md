# Mobile Deep-Link Security Review

Custom scheme routes are allowlisted and schema-validated for symbol, scanner, watchlist, alert, portfolio, strategy, backtest, report and support. UUID/symbol bounds, total URL length, no query/fragment/credentials and no extra segments are enforced. Authentication, onboarding and backend owner checks remain mandatory; IDs/push payloads are not authorization.

Reset/verification tokens use a separate bounded consumption function and are never returned as ordinary destinations, persisted, logged or telemetered. Invalid/expired/used resources fall back safely and pending navigation is cleared.

| Surface                          | Status                          |
| -------------------------------- | ------------------------------- |
| Custom scheme                    | PASS_WITH_BACKEND_AUTHORITY     |
| Route/schema/parameter allowlist | PASS                            |
| Auth/onboarding guards           | PASS                            |
| Ownership revalidation           | PASS                            |
| Token hygiene                    | PASS                            |
| Arbitrary API host via link      | 0                               |
| Universal Links                  | EXTERNAL_CONFIGURATION_REQUIRED |
| Production Associated Domains    | EXTERNAL_CONFIGURATION_REQUIRED |
