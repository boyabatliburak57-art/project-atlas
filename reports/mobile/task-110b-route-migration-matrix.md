# TASK-110B Route Migration Matrix

| Legacy entry                              | Canonical V2 destination | Compatibility                                         | Guard behavior                                   |
| ----------------------------------------- | ------------------------ | ----------------------------------------------------- | ------------------------------------------------ |
| `/(tabs)/search`, `atlas://search`        | `/search`                | Root alias                                            | Auth/onboarding unchanged                        |
| `/scanner`, `atlas://scanner`             | `/radar/scanner`         | Safe alias; bounded `view`, `fixture`, `offline` only | Resource and capability checks unchanged         |
| `/watchlists`, `atlas://watchlists`       | `/radar/watchlists`      | Safe alias                                            | Ownership rechecked for resource links           |
| `atlas://alerts`                          | `/radar/alerts`          | Static alias                                          | Auth/onboarding unchanged                        |
| `/notifications`, `atlas://notifications` | `/inbox`                 | Safe alias                                            | Existing notification behavior retained          |
| `/(tabs)/portfolio`, `atlas://portfolio`  | `/portfolio/overview`    | Nested-stack alias                                    | Portfolio ownership remains server-authoritative |
| `/portfolio-risk`                         | `/portfolio/risk`        | Safe alias; bounded view                              | Auth and ownership unchanged                     |
| `/strategies`, `atlas://strategies`       | `/research/strategies`   | Safe alias                                            | Strategy ownership rechecked                     |
| `atlas://backtests`                       | `/research/backtests`    | Static alias                                          | Backtest ownership rechecked                     |
| `/reports`, `atlas://reports`             | `/research/reports`      | Safe alias; bounded view/resource IDs                 | Report ownership rechecked                       |
| `atlas://settings`                        | `/settings`              | Static alias                                          | Protected profile route                          |
| `atlas://help`                            | `/help`                  | Static alias                                          | Existing Help implementation                     |
| `atlas://support`                         | `/support`               | Static alias                                          | Existing Support implementation                  |
| `/more`                                   | `/profile`               | Legacy escape hatch only                              | No More tab or icon wall                         |

Verification and reset token links keep their dedicated bounded schemas and single-consumption
path. Symbol, scanner, watchlist, alert, portfolio, strategy, backtest and report resource links use
the existing route guard: authenticate → onboarding → fetch/verify ownership → canonical navigate.
Aliases cannot carry resource contents, credentials, fragments or arbitrary query parameters.

Redirect loops: `0`. Authorization bypasses: `0`. Token-bearing route changes: `0`. Broken existing
deep links after automated and native validation: recorded in the TASK-110B result report.
