# Mobile Navigation Map

```text
BottomNavigation: V1_PRODUCTION_NAVIGATION
NavigationRail: EXPERIMENTAL
Supported Platform: IOS_ONLY
Required Profile: IPHONE_17_IOS_26_5
Android Status: DEFERRED_V1_1
Tablet Status: DEFERRED_V1_1
Tablet Release Gate: false
```

| Route                 | Phone Source     | Tablet Source        | Auth            | Onboarding         | Role           | Flag                       | Deep link                 | A11y label          | E2E               | Visual  | Status/Target           |
| --------------------- | ---------------- | -------------------- | --------------- | ------------------ | -------------- | -------------------------- | ------------------------- | ------------------- | ----------------- | ------- | ----------------------- |
| welcome/onboarding    | launch           | deferred v1.1        | global guard    | server checkpoint  | none           | mobileHome                 | atlas://onboarding        | Onboarding          | native/API        | PASS    | IMPLEMENTED/PASS        |
| verify-email          | auth guard       | deferred v1.1        | pending session | after verification | none           | auth                       | atlas://auth/verify-email | E-posta doğrulaması | TASK-100D pending | pending | IMPLEMENTED/TASK-100D-R |
| home                  | BottomNavigation | NavigationRail       | global guard    | global guard       | none           | mobileHome                 | atlas://home              | Home                | native/API        | PASS    | IMPLEMENTED/PASS        |
| markets/symbol        | BottomNavigation | NavigationRail/split | global guard    | global guard       | none           | mobileMarkets              | atlas://symbol/:id        | Markets             | native/API        | PASS    | IMPLEMENTED_AS_GATED    |
| search/scanner        | BottomNavigation | NavigationRail       | global guard    | global guard       | owner          | mobileSearch/mobileScanner | atlas://scanner           | Search/Scanner      | native/API        | PASS    | IMPLEMENTED_AS_GATED    |
| watchlists/alerts     | Markets/More     | rail secondary       | global guard    | global guard       | owner          | mobileAlerts               | atlas://watchlists        | Watchlists          | native/API        | PASS    | IMPLEMENTED/PASS        |
| portfolio/risk        | BottomNavigation | NavigationRail/split | global guard    | global guard       | owner          | mobilePortfolio            | atlas://portfolio/:id     | Portfolio           | native/API        | PASS    | IMPLEMENTED_AS_GATED    |
| strategies/backtests  | More             | rail secondary       | global guard    | global guard       | owner          | mobileStrategyLab          | atlas://strategies        | Strategies          | native/API        | PASS    | IMPLEMENTED_AS_GATED    |
| reports/help/settings | More             | rail utility         | global guard    | global guard       | owner/content  | mobileReports              | atlas://reports/:id       | Reports             | native/API        | PASS    | IMPLEMENTED_AS_GATED    |
| admin                 | internal         | role rail            | yes             | yes                | admin + server | capability                 | none                      | Administration      | guards            | pending | DEFERRED                |

Route state contains identifiers only; credentials and user payloads are prohibited. Android and
tablet entries describe preserved experimental architecture, not mobile v1 support.

TASK-100L remediation (2026-08-11): production API composition, global auth/onboarding routing, cold/warm deep links and ownership revalidation are connected. Supplemental native production flows verify major-domain reachability, logout and foreign-resource denial. Details are in `mobile-v1-navigation-parity-result.md`.

TASK-100D-R final evidence (2026-08-03): verification status/resend/confirm, verification-first
guard priority, cold/warm verification links and onboarding continuation passed API/mobile tests and
the clean 16/16 iOS Maestro suite. `verify-email` status: `IMPLEMENTED/PASS`.

TASK-100E final evidence (2026-08-05): Home/Markets, symbol search and symbol detail are implemented
for the iOS v1 profile and passed the clean 20/20 Maestro suite. Its former TASK-100F deferral was
subsequently completed; Android and tablet remain `DEFERRED_V1_1`.

TASK-100F final evidence (2026-08-06): Scanner, saved scans, watchlists, alerts and notification center
are implemented for the iOS v1 profile and passed the clean 24/24 Maestro suite. Push client/device
contracts pass; live APNs delivery remains externally unvalidated. Portfolio/risk remains TASK-100G.

## TASK-100G portfolio routes

`/(tabs)/portfolio` and `/portfolio-risk` now render the owner-scoped Portfolio and Risk experience. Position, transaction, performance, allocation, risk, data-quality and privacy states are implemented. Strategy Lab and Reports remain TASK-100H/TASK-100I.

# TASK-100H navigation addendum

- `/strategies`: Strategy Lab with authenticated, verification, and onboarding guards.
- Strategy, experiment, backtest run, and result intents require typed allowlisted routes and server-side ownership validation.
- Provider-unavailable runs fail closed; offline mutations are not queued.
- TASK-100I Reports, Help, Support, and full Settings destinations remain deferred.

# TASK-100I navigation addendum

- `/reports` exposes Reports, Help, Methodology, Support and Settings destinations from More.
- Report and support resource intents require authentication plus backend ownership; identifiers never authorize access.
- Legal documents expose review metadata only. Report/support mutations fail closed offline.
- TASK-100J native persistence, file/share and expanded deep-link hardening remain open.
