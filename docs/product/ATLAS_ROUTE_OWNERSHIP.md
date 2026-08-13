# Atlas Route Ownership

Every capability has one canonical owner. Other hubs may link to it contextually but may not create
a second navigation tree or data domain.

| Capability                                    | Owner                   | Canonical route                                             |
| --------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| Market overview / indices / sectors           | Markets                 | `/markets/overview`, `/markets/indices`, `/markets/sectors` |
| AKD, Takas, money/foreign flow, short selling | Markets / Institutional | `/markets/institutional` (capability-gated foundation)      |
| VIOP                                          | Markets / Derivatives   | `/markets/derivatives` (capability-gated foundation)        |
| Funds                                         | Markets / Funds         | `/markets/funds` (capability-gated foundation)              |
| Scanner / saved scans                         | Radar                   | `/radar/scanner`, `/radar/saved`                            |
| Watchlists / alerts / activity                | Radar                   | `/radar/watchlists`, `/radar/alerts`, `/radar/activity`     |
| Portfolio and risk                            | Portfolio               | `/portfolio/*`                                              |
| KAP and corporate events                      | Research / Events       | `/research/events` (capability-gated foundation)            |
| Company intelligence                          | Research / Company      | `/research/company` (capability-gated foundation)           |
| Company/fund compare                          | Research / Compare      | `/research/compare` (capability-gated foundation)           |
| Strategy Lab / backtests / experiments        | Research                | `/research/strategies`, `/research/backtests`               |
| Reports / methodology                         | Research                | `/research/reports`, `/research/methodology`                |
| Search / Smart Inbox                          | Global                  | `/search`, `/inbox`                                         |
| Account / Settings / Help / Support           | Profile                 | `/profile`, `/settings`, `/help`, `/support`                |

Legacy aliases resolve to these routes. Resource links still pass schema validation and auth,
onboarding, ownership and capability gates before navigation. Token links retain their dedicated
single-consumption handling and never pass through generic aliases.
