# TASK-110A Existing vs New Capability Matrix

`Existing` means an existing Atlas capability or reusable baseline, not that the newly listed
capability is implemented. All new provider data remains fail-closed until registry evidence exists.

| Domain             | Existing | New Capability                          | Backend Reuse                     | New Data Required              | Provider/License       | Target Task |
| ------------------ | -------- | --------------------------------------- | --------------------------------- | ------------------------------ | ---------------------- | ----------- |
| KAP                | Partial  | 1. KAP Intelligence                     | search, symbol IDs, reports       | disclosures, source revisions  | provider/source terms  | TASK-110D   |
| Events             | Partial  | 2. Corporate Events                     | corporate actions, alerts         | normalized event feed          | provider/source terms  | TASK-110D   |
| Events             | Partial  | 3. Financial Result Events              | fundamentals periods              | result event timestamps        | provider required      | TASK-110D   |
| Events             | No       | 4. New Business Relationships           | symbol/company IDs                | classified KAP relationships   | provider/source terms  | TASK-110D   |
| Corporate actions  | Partial  | 5. Buybacks                             | action/portfolio model            | buyback notices and executions | provider required      | TASK-110D   |
| Corporate actions  | Yes      | 6. Dividends                            | corporate actions                 | richer event lifecycle         | provider required      | TASK-110D   |
| Corporate actions  | Yes      | 7. Capital Actions                      | corporate actions                 | expanded action types          | provider required      | TASK-110D   |
| IPO                | No       | 8. IPO Center                           | search, reports                   | IPO lifecycle and documents    | provider/source terms  | TASK-110D   |
| Institutional flow | No       | 9. AKD / Brokerage Distribution         | symbol/time-series primitives     | broker distribution            | license required       | TASK-110E   |
| Institutional flow | No       | 10. Institutional Buyers                | shared flow domain                | buyer aggregates               | license required       | TASK-110E   |
| Institutional flow | No       | 11. Institutional Sellers               | shared flow domain                | seller aggregates              | license required       | TASK-110E   |
| Institutional flow | No       | 12. Institution-specific Flow           | shared flow domain                | institution observations       | license required       | TASK-110E   |
| Institutional flow | No       | 13. Money Inflow / Outflow              | analytics primitives              | licensed flow inputs           | license required       | TASK-110E   |
| Settlement         | No       | 14. Settlement / Takas Analysis         | symbol/time-series primitives     | settlement snapshots           | license required       | TASK-110E   |
| Settlement         | No       | 15. Foreign Settlement                  | shared settlement domain          | foreign settlement fields      | license required       | TASK-110E   |
| Settlement         | No       | 16. Institutional Settlement            | shared settlement domain          | institution settlement fields  | license required       | TASK-110E   |
| Settlement         | No       | 17. Settlement Trend                    | indicator/baseline math           | historical settlement series   | license required       | TASK-110E   |
| Settlement         | No       | 18. Settlement Anomaly                  | anomaly methodology               | versioned settlement history   | license required       | TASK-110E   |
| Market measures    | No       | 19. VBTS / Market Measures              | symbol IDs, alerts                | effective measure notices      | provider/source terms  | TASK-110F   |
| Market measures    | No       | 20. Gross Settlement                    | shared measure domain             | effective intervals            | provider/source terms  | TASK-110F   |
| Market measures    | No       | 21. Single Price                        | shared measure domain             | effective intervals            | provider/source terms  | TASK-110F   |
| Market measures    | No       | 22. Order Package Measures              | shared measure domain             | restriction details            | provider/source terms  | TASK-110F   |
| Short selling      | No       | 23. Short-Selling Restrictions          | shared measure domain             | restriction rules/intervals    | provider/source terms  | TASK-110F   |
| Short selling      | No       | 24. Short-Selling Analytics             | market analytics                  | short-sale observations        | license required       | TASK-110F   |
| Calendar           | No       | 25. Economic Calendar                   | notifications, reports            | macro events/actuals           | provider required      | TASK-110G   |
| Calendar           | Partial  | 26. Earnings Calendar                   | fundamentals periods              | scheduled/result dates         | provider required      | TASK-110G   |
| Calendar           | Partial  | 27. Dividend Calendar                   | corporate actions                 | ex/pay/record schedule         | provider required      | TASK-110G   |
| Calendar           | Partial  | 28. Corporate Event Calendar            | events, alerts                    | normalized event schedule      | provider required      | TASK-110G   |
| Calendar           | No       | 29. IPO Calendar                        | IPO domain                        | offer/listing schedule         | provider/source terms  | TASK-110G   |
| Calendar           | No       | 30. VIOP Expiry Calendar                | time/date primitives              | contract expiries              | provider required      | TASK-110G   |
| Company            | No       | 31. Company Timeline                    | symbol detail, reports            | cross-domain event projection  | inherited capabilities | TASK-110H   |
| Company            | Partial  | 32. Peer Analysis                       | fundamentals, experiments         | peer taxonomy/cohorts          | provider required      | TASK-110H   |
| Comparison         | Partial  | 33. Company Comparison                  | experiment comparison             | aligned company metrics        | inherited capabilities | TASK-110H   |
| Analyst data       | No       | 34. Analyst Expectations                | comparison primitives             | estimates and revisions        | license required       | TASK-110H   |
| Ownership          | No       | 35. Fund Positions                      | portfolio-like holdings model     | fund holdings                  | license required       | TASK-110J   |
| Ownership          | No       | 36. Institutional Ownership             | company IDs, time series          | ownership observations         | license required       | TASK-110J   |
| Scanner            | Yes      | 37. Fundamental Scanner 2.0             | scanner AST/runtime, fundamentals | expanded metrics/cohorts       | inherited capabilities | TASK-110I   |
| Scanner            | No       | 38. Institutional Scanner               | scanner runtime, flow domain      | institutional flow data        | license required       | TASK-110I   |
| Scanner            | No       | 39. Settlement Scanner                  | scanner runtime, settlement       | settlement data                | license required       | TASK-110I   |
| Scanner            | No       | 40. Event Scanner                       | scanner runtime, event domain     | normalized event data          | provider required      | TASK-110I   |
| Scanner            | No       | 41. Anomaly Scanner                     | scanner runtime, methodology      | domain baselines               | inherited capabilities | TASK-110I   |
| Funds              | No       | 42. Fund Analytics                      | portfolio/performance/risk math   | NAV, holdings, classifications | provider/license       | TASK-110J   |
| Comparison         | Partial  | 43. Fund Comparison                     | comparison definitions            | aligned fund metrics           | provider/license       | TASK-110J   |
| VIOP               | No       | 44. VIOP Analytics                      | market/chart primitives           | contract master and series     | license required       | TASK-110K   |
| VIOP               | No       | 45. Futures Basis                       | analytics primitives              | spot/futures aligned series    | license required       | TASK-110K   |
| VIOP               | No       | 46. Open Interest                       | chart/time-series primitives      | OI observations                | license required       | TASK-110K   |
| VIOP               | No       | 47. Volume                              | OHLCV patterns                    | derivative volume              | license required       | TASK-110K   |
| VIOP               | No       | 48. Rollover                            | analytics/methodology             | contract-chain series          | license required       | TASK-110K   |
| VIOP               | No       | 49. Institutional VIOP Flow             | institutional flow patterns       | participant flow               | license required       | TASK-110K   |
| Order book         | No       | 50. Market Depth / Order Book Analytics | market cache/chart primitives     | depth snapshots                | license required       | TASK-110L   |
| Charts             | Partial  | 51. Advanced Chart Drawings             | existing chart architecture       | drawing/workspace state        | market data inherited  | TASK-110L   |
| Comparison         | Partial  | 52. Multi-Symbol Comparison             | experiment/chart comparison       | aligned multi-symbol series    | market data inherited  | TASK-110L   |
| Charts             | Partial  | 53. Chart Workspaces                    | reports/preferences               | versioned workspace state      | market data inherited  | TASK-110L   |

## Atlas-native capability allocation

| Domain        | Existing | New Capability                   | Backend Reuse                        | New Data Required             | Provider/License       | Target Task    |
| ------------- | -------- | -------------------------------- | ------------------------------------ | ----------------------------- | ---------------------- | -------------- |
| Intelligence  | No       | Atlas Pulse                      | notifications, watchlists, portfolio | ranked cross-domain facts     | inherited, fail-closed | TASK-110M      |
| Company       | No       | Company Timeline                 | disclosure/event/company domains     | composed projection only      | inherited, fail-closed | TASK-110H/110M |
| Research      | Partial  | Event Impact Lab                 | backtests, experiments               | event-aligned cohorts         | inherited, fail-closed | TASK-110M      |
| Intelligence  | No       | Atlas Anomaly Engine             | indicators, scanners                 | versioned baselines           | inherited, fail-closed | TASK-110M      |
| Intelligence  | No       | Atlas Market Regime              | market analytics                     | regime inputs/history         | inherited, fail-closed | TASK-110M      |
| Notifications | Yes      | Smart Inbox                      | alerts, notification center          | cross-domain inbox projection | inherited, fail-closed | TASK-110N      |
| Research link | Partial  | Scanner → Backtest               | scanner AST, backtests               | translation/version metadata  | inherited              | TASK-110O      |
| Research link | No       | Event → Historical Analysis      | events, backtests                    | cohort definition             | inherited              | TASK-110O      |
| Comparison    | Partial  | Advanced Company Compare         | experiments, fundamentals            | alignment/methodology         | inherited, fail-closed | TASK-110H/110O |
| Navigation    | Partial  | Cross-Module Research Navigation | deep links, search                   | context-envelope metadata     | inherited              | TASK-110O      |

## Matrix conclusion

All 53 approved domain capabilities and all 10 Atlas-native capabilities have an owner. Data reuse
is through canonical domains; a scanner or view does not create a second source of truth. Provider
and license labels are planning defaults, not claims of live availability.
