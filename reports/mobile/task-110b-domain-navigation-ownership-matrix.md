# TASK-110B Domain Navigation Ownership Matrix

| Capability                          | Domain Owner            | Primary Hub   | Contextual Entry                  | Canonical Route                               | Duplicate Implementations |
| ----------------------------------- | ----------------------- | ------------- | --------------------------------- | --------------------------------------------- | ------------------------- |
| Market overview / index / sector    | MarketDataDomain        | Markets       | Home, Search, Symbol              | `/markets/*`                                  | 0                         |
| AKD analytics and scanner           | InstitutionalFlowDomain | Markets       | Radar, Symbol, Research           | `/markets/institutional`                      | 0                         |
| Takas analytics and scanner         | SettlementDomain        | Markets       | Radar, Symbol, Research           | `/markets/institutional`                      | 0                         |
| Money/foreign/institution flow      | InstitutionalFlowDomain | Markets       | Radar, Symbol                     | `/markets/institutional`                      | 0                         |
| VBTS / short selling                | MarketMeasuresDomain    | Markets       | Radar, Symbol                     | `/markets/institutional`                      | 0                         |
| KAP and corporate events            | EventsDomain            | Research      | Home, Inbox, Symbol               | `/research/events`                            | 0                         |
| Calendars                           | EventsDomain            | Research      | Home, Inbox                       | `/research/events`                            | 0                         |
| Scanner / Radar 2.0                 | ScannerDomain           | Radar         | Home, Research                    | `/radar/scanner`                              | 0                         |
| Watchlists                          | WatchlistDomain         | Radar         | Home, Search, Symbol              | `/radar/watchlists`                           | 0                         |
| Alerts / Smart Inbox destination    | AlertsDomain            | Radar         | Home, Inbox, resources            | `/radar/alerts`                               | 0                         |
| Portfolio / Risk                    | PortfolioDomain         | Portfolio     | Home, Symbol, Inbox               | `/portfolio/*`                                | 0                         |
| Company intelligence                | CompanyDomain           | Research      | Search, Symbol, Event             | `/research/company`                           | 0                         |
| Comparison                          | ComparisonDomain        | Research      | Symbol, Company, Funds            | `/research/compare`                           | 0                         |
| Funds / fund compare                | FundDomain              | Markets       | Research Compare, Search          | `/markets/funds`                              | 0                         |
| VIOP analytics / institutional flow | ViopDomain              | Markets       | Radar, Calendar, Chart            | `/markets/derivatives`                        | 0                         |
| Strategy / backtest / experiments   | StrategyDomain          | Research      | Radar, Event, Reports             | `/research/strategies`, `/research/backtests` | 0                         |
| Reports / methodology               | ReportsDomain           | Research      | Strategy, Portfolio, Profile help | `/research/reports`, `/research/methodology`  | 0                         |
| Global Search                       | SearchDomain            | Global action | All hubs                          | `/search`                                     | 0                         |
| Notifications / Smart Inbox         | AlertsDomain            | Global action | All hubs                          | `/inbox`                                      | 0                         |
| Settings / Help / Support           | AccountDomain           | Profile       | Global header                     | `/settings`, `/help`, `/support`              | 0                         |

`atlasFeatureRegistry` is the single navigation catalog. Analytics and scanner views reuse their
domain owner; they do not establish a second domain. Duplicate navigation domain owners: `0`.
