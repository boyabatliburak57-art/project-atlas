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

| Route                 | Phone Source     | Tablet Source        | Auth            | Onboarding         | Role           | Flag                       | Deep link                 | A11y label          | E2E               | Visual  | Status/Target             |
| --------------------- | ---------------- | -------------------- | --------------- | ------------------ | -------------- | -------------------------- | ------------------------- | ------------------- | ----------------- | ------- | ------------------------- |
| welcome/onboarding    | launch           | deferred v1.1        | yes             | yes                | none           | mobileHome                 | atlas://onboarding        | Onboarding          | TASK-100D pending | pending | IMPLEMENTED/TASK-100D     |
| verify-email          | auth guard       | deferred v1.1        | pending session | after verification | none           | auth                       | atlas://auth/verify-email | E-posta doğrulaması | TASK-100D pending | pending | IMPLEMENTED/TASK-100D-R   |
| home                  | BottomNavigation | NavigationRail       | yes             | yes                | none           | mobileHome                 | atlas://home              | Home                | 20/20 suite       | PASS    | IMPLEMENTED/TASK-100E     |
| markets/symbol        | BottomNavigation | NavigationRail/split | yes             | yes                | none           | mobileMarkets              | atlas://symbol/:id        | Markets             | 20/20 suite       | PASS    | IMPLEMENTED/TASK-100E     |
| search/scanner        | BottomNavigation | NavigationRail       | yes             | yes                | owner          | mobileSearch/mobileScanner | atlas://scanner           | Search/Scanner      | 24/24 suite       | PASS    | IMPLEMENTED/TASK-100F     |
| watchlists/alerts     | Markets/More     | rail secondary       | yes             | yes                | owner          | mobileAlerts               | atlas://watchlists        | Watchlists          | 24/24 suite       | PASS    | IMPLEMENTED/TASK-100F     |
| portfolio/risk        | BottomNavigation | NavigationRail/split | yes             | yes                | owner          | mobilePortfolio            | atlas://portfolio/:id     | Portfolio           | phone/tablet      | pending | NOT_IMPLEMENTED/TASK-100G |
| strategies/backtests  | More             | rail secondary       | yes             | yes                | owner          | mobileStrategyLab          | atlas://strategies        | Strategies          | more              | pending | NOT_IMPLEMENTED/TASK-100H |
| reports/help/settings | More             | rail utility         | yes             | yes                | none           | mobileReports              | atlas://reports/:id       | Reports             | more/deep-links   | pending | NOT_IMPLEMENTED/TASK-100I |
| admin                 | internal         | role rail            | yes             | yes                | admin + server | capability                 | none                      | Administration      | guards            | pending | DEFERRED                  |

Route state contains identifiers only; credentials and user payloads are prohibited. Android and
tablet entries describe preserved experimental architecture, not mobile v1 support.

TASK-100D-R final evidence (2026-08-03): verification status/resend/confirm, verification-first
guard priority, cold/warm verification links and onboarding continuation passed API/mobile tests and
the clean 16/16 iOS Maestro suite. `verify-email` status: `IMPLEMENTED/PASS`.

TASK-100E final evidence (2026-08-05): Home/Markets, symbol search and symbol detail are implemented
for the iOS v1 profile and passed the clean 20/20 Maestro suite. Scanner, watchlists and alerts remain
`NOT_IMPLEMENTED/TASK-100F`; Android and tablet remain `DEFERRED_V1_1`.

TASK-100F final evidence (2026-08-06): Scanner, saved scans, watchlists, alerts and notification center
are implemented for the iOS v1 profile and passed the clean 24/24 Maestro suite. Push client/device
contracts pass; live APNs delivery remains externally unvalidated. Portfolio/risk remains TASK-100G.

## TASK-100G portfolio routes

`/(tabs)/portfolio` and `/portfolio-risk` now render the owner-scoped Portfolio and Risk experience. Position, transaction, performance, allocation, risk, data-quality and privacy states are implemented. Strategy Lab and Reports remain TASK-100H/TASK-100I.
