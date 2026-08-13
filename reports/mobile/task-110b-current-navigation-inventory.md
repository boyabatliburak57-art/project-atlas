# TASK-110B Current Navigation Inventory

Inventory was taken before migration from the Home/Markets/Search/Portfolio/More shell. “Alias”
means the former entry remains accepted and resolves to the V2 canonical owner.

| Feature               | Current Entry        | Current Route                   | Current Tab    | Deep Link                | Usage                         | V2 Destination            | Migration                                 |
| --------------------- | -------------------- | ------------------------------- | -------------- | ------------------------ | ----------------------------- | ------------------------- | ----------------------------------------- |
| Home                  | Bottom tab           | `/(tabs)/home`                  | Home           | `atlas://home`           | Attention overview            | Home                      | Retained; hub redesigned                  |
| Market Overview       | Markets tab          | `/(tabs)/markets`               | Markets        | `atlas://markets`        | Market status/breadth/movers  | `/markets/overview`       | Nested stack + alias                      |
| Indices               | Markets section      | Markets view                    | Markets        | Markets link             | Index research                | `/markets/indices`        | Canonical child route                     |
| Sectors               | Markets section      | Markets view                    | Markets        | Markets link             | Sector research               | `/markets/sectors`        | Canonical child route                     |
| Global Search         | Search tab           | `/(tabs)/search`                | Search         | `atlas://search`         | Symbol/company lookup         | `/search` global action   | Root route + old alias                    |
| Symbol Detail         | Market/search result | `/symbol/[symbol]`              | Contextual     | `atlas://symbol/:id`     | Symbol research               | `/symbol/[symbol]`        | Retained and contextual                   |
| Scanner               | Search/More          | `/scanner`                      | Search/More    | `atlas://scanner`        | Scan/builder/results          | `/radar/scanner`          | Alias preserves safe view/fixture         |
| Saved Scans           | Scanner section      | `/scanner?view=saved`           | Search/More    | Scanner link             | Saved scan definitions        | `/radar/saved`            | Canonical Radar child                     |
| Watchlists            | Markets/More         | `/watchlists`                   | Markets/More   | `atlas://watchlists`     | Lists and symbol tracking     | `/radar/watchlists`       | Alias to Radar                            |
| Alerts                | Watchlists/More      | `/watchlists?view=alerts`       | Markets/More   | `atlas://alerts`         | Active/triggered alerts       | `/radar/alerts`           | Alias to Radar                            |
| Notifications / Push  | More                 | `/notifications`                | More           | `atlas://notifications`  | Notification center           | `/inbox`                  | Smart Inbox foundation; behavior retained |
| Portfolio Overview    | Bottom tab           | `/(tabs)/portfolio`             | Portfolio      | `atlas://portfolio`      | Portfolio records             | `/portfolio/overview`     | Nested stack + alias                      |
| Positions             | Portfolio view       | Portfolio view                  | Portfolio      | Portfolio resource       | Position list/detail          | `/portfolio/positions`    | Canonical child route                     |
| Transactions          | Portfolio view       | Portfolio view                  | Portfolio      | Portfolio resource       | Transaction history           | `/portfolio/transactions` | Canonical child route                     |
| Performance           | Portfolio view       | Portfolio view                  | Portfolio      | Portfolio resource       | Performance/benchmark         | `/portfolio/performance`  | Canonical child route                     |
| Portfolio Risk        | Portfolio/More       | `/portfolio-risk`               | Portfolio/More | Portfolio link           | Risk/quality/privacy          | `/portfolio/risk`         | Alias; owner unchanged                    |
| Strategy Lab          | More                 | `/strategies`                   | More           | `atlas://strategies`     | Strategy definitions/builders | `/research/strategies`    | Alias to Research                         |
| Backtests             | Strategy Lab         | `/strategies?view=backtest`     | More           | `atlas://backtests`      | Backtest/experiment results   | `/research/backtests`     | Alias to Research                         |
| Experiments           | Strategy Lab         | `/strategies?view=experiments`  | More           | Strategy link            | Experiment comparison         | `/research/backtests`     | Same Research owner                       |
| Reports               | More                 | `/reports`                      | More           | `atlas://reports`        | Reports/create/share          | `/research/reports`       | Alias to Research                         |
| Methodology           | Reports              | `/reports?view=methodology`     | More           | Report link              | Method disclosure             | `/research/methodology`   | Canonical Research child                  |
| Account / Preferences | More                 | `/preferences`                  | More           | Internal                 | User preferences              | Profile → `/preferences`  | Existing screen retained                  |
| Settings              | More                 | `/reports?view=settings`        | More           | `atlas://settings`       | Appearance/data settings      | Profile → `/settings`     | Alias; no duplicate screen                |
| Privacy & Security    | More                 | `/security`                     | More           | Internal                 | App lock/privacy controls     | Profile → `/security`     | Existing screen retained                  |
| Help Center           | More                 | `/reports?view=help`            | More           | `atlas://help`           | Help/search/articles          | Profile → `/help`         | Alias; existing implementation            |
| Support               | More                 | `/reports?view=support`         | More           | `atlas://support`        | Support request/history       | Profile → `/support`      | Alias; existing implementation            |
| Legal                 | More                 | `/legal`                        | More           | Internal                 | Legal documents               | Profile → `/legal`        | Existing screen retained                  |
| About                 | More                 | Reports/settings view           | More           | Internal                 | Product information           | Profile → `/about`        | Existing implementation reused            |
| Offline states        | Contextual           | Domain routes                   | All            | Existing resource links  | Cached/fail-closed states     | Canonical owner route     | Behavior and guards retained              |
| Native Security       | App/profile          | `/security` and native overlays | Profile        | Existing protected links | Lock/privacy/capture defense  | Profile → `/security`     | Retained; logout cleanup                  |

Result: existing customer features lost `0`; every former public entry has a V2 canonical owner or
safe compatibility alias.
