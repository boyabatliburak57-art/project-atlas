# TASK-110B-R2 Consolidated Suite Inventory

The suite is reconstructed from 36 distinct active TASK-100D–TASK-100K release flows. Each wrapper executes the referenced authoritative flow; no placeholder or empty flow is counted.

Run command:

```sh
MAESTRO_DRIVER_STARTUP_TIMEOUT=300000 maestro test apps/mobile/.maestro/consolidated-critical
```

|   # | Source active flow               | Domain         | Critical user journey     | Current path               | Canonical navigation    | Release gated |
| --: | -------------------------------- | -------------- | ------------------------- | -------------------------- | ----------------------- | ------------- |
|  01 | task-100d/02-login-success       | Authentication | Sign in                   | /login → /home             | Home                    | YES           |
|  02 | task-100d/06-onboarding-full     | Onboarding     | Complete onboarding       | /onboarding → /home        | Home                    | YES           |
|  03 | task-100e/01-home-available      | Home           | Market-attention overview | /home                      | Home                    | YES           |
|  04 | task-100e/03-market-status       | Markets        | Market status             | /markets/overview          | Markets                 | YES           |
|  05 | task-100e/09-search-exact        | Search         | Exact symbol search       | /search → /symbol          | Global Search           | YES           |
|  06 | task-100e/13-symbol-overview     | Symbol         | Symbol overview           | /symbol/:symbol            | Markets contextual      | YES           |
|  07 | task-100e/14-chart-timeframe     | Chart          | Change chart timeframe    | /symbol/:symbol            | Symbol detail           | YES           |
|  08 | task-100f/01-scanner-saved       | Radar          | Saved investigations      | /radar/scanner             | Radar                   | YES           |
|  09 | task-100f/04-builder-basic       | Scanner        | Build scan                | /radar/scanner             | Radar                   | YES           |
|  10 | task-100f/10-results-pagination  | Scanner        | Paginate results          | /radar/scanner             | Radar                   | YES           |
|  11 | task-100f/13-watchlist-create    | Watchlists     | Create watchlist          | /radar/watchlists          | Radar                   | YES           |
|  12 | task-100f/17-price-alert         | Alerts         | Create price alert        | /radar/alerts              | Radar                   | YES           |
|  13 | task-100f/22-push-deep-links     | Push           | Open owned destination    | push → canonical resource  | Smart Inbox / owner     | YES           |
|  14 | task-100g/01-empty               | Portfolio      | Empty portfolio           | /portfolio/overview        | Portfolio               | YES           |
|  15 | task-100g/13-position            | Portfolio      | Position detail           | /portfolio/positions       | Portfolio               | YES           |
|  16 | task-100g/12-history             | Portfolio      | Transaction history       | /portfolio/transactions    | Portfolio               | YES           |
|  17 | task-100g/15-performance         | Portfolio      | Performance timeframe     | /portfolio/performance     | Portfolio               | YES           |
|  18 | task-100g/20-risk                | Portfolio      | Risk overview             | /portfolio/risk            | Portfolio               | YES           |
|  19 | task-100h/02-list                | Research       | Strategy list             | /research/strategies       | Research                | YES           |
|  20 | task-100h/04-rules               | Research       | Strategy builder          | /research/strategies       | Research                | YES           |
|  21 | task-100h/07-config              | Research       | Configure backtest        | /research/backtests        | Research                | YES           |
|  22 | task-100h/12-result              | Research       | Backtest result           | /research/backtests        | Research                | YES           |
|  23 | task-100h/21-experiment          | Research       | Create experiment         | /research/backtests        | Research                | YES           |
|  24 | task-100i/01-reports             | Reports        | Reports landing           | /research/reports          | Research                | YES           |
|  25 | task-100i/11-help                | Help           | Help center               | /help                      | Profile                 | YES           |
|  26 | task-100i/16-support-create      | Support        | Create request            | /support                   | Profile                 | YES           |
|  27 | task-100i/19-settings            | Settings       | Settings landing          | /settings                  | Profile                 | YES           |
|  28 | task-100j/01-offline-market      | Offline        | Cached market policy      | /markets/overview          | Markets                 | YES           |
|  29 | task-100j/12-biometric-lock      | Security       | App lock                  | /security                  | Profile                 | YES           |
|  30 | task-100j/22-privacy-background  | Privacy        | Background privacy        | lifecycle                  | Profile                 | YES           |
|  31 | task-100d/14-protected-deep-link | Deep links     | Protected continuation    | deep link → owned resource | Canonical owner         | YES           |
|  32 | task-100d/13-logout-cleanup      | Authentication | Logout cleanup            | /profile → /welcome        | Profile                 | YES           |
|  33 | task-100j/09-user-switch         | Security       | User switch isolation     | session switch             | Profile                 | YES           |
|  34 | task-100f/24-notification-center | Smart Inbox    | Read/unread cleanup       | /inbox                     | Global action           | YES           |
|  35 | task-100j/23-security-settings   | Profile        | Security settings         | /profile → /security       | Profile                 | YES           |
|  36 | task-100f/11-result-symbol       | Cross-domain   | Scanner result to symbol  | /radar/scanner → /symbol   | Radar → Markets context | YES           |
