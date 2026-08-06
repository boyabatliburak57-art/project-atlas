# TASK-100E Market, Search and Symbol Gap Analysis

Date: 2026-08-04

| Capability                      | Backend         | Web           | Mobile                     | Provider Dependency          | Missing Work                                  | Target    |
| ------------------------------- | --------------- | ------------- | -------------------------- | ---------------------------- | --------------------------------------------- | --------- |
| Market overview                 | BACKEND_READY   | BACKEND_READY | MOBILE_ADAPTATION_REQUIRED | PROVIDER_REQUIRED            | Native sections and fail-closed states        | TASK-100E |
| Market breadth/rankings/sectors | BACKEND_READY   | BACKEND_READY | MOBILE_ADAPTATION_REQUIRED | PROVIDER_REQUIRED            | Native cards, pagination and partial state    | TASK-100E |
| Global instrument search        | BACKEND_READY   | BACKEND_READY | MOBILE_ADAPTATION_REQUIRED | Instrument metadata required | Debounce/cancel/recent UI                     | TASK-100E |
| Symbol profile/quote            | BACKEND_READY   | BACKEND_READY | MOBILE_ADAPTATION_REQUIRED | PROVIDER_REQUIRED            | Native header and capability states           | TASK-100E |
| OHLCV chart                     | BACKEND_READY   | BACKEND_READY | MOBILE_ADAPTATION_REQUIRED | PROVIDER_REQUIRED            | Native renderer and gesture/a11y layer        | TASK-100E |
| Indicator overlays              | BACKEND_READY   | BACKEND_READY | MOBILE_ADAPTATION_REQUIRED | PROVIDER_REQUIRED            | Typed selector; backend remains authoritative | TASK-100E |
| Fundamentals                    | BACKEND_READY   | BACKEND_READY | MOBILE_ADAPTATION_REQUIRED | PROVIDER_REQUIRED            | Revision-aware native surface                 | TASK-100E |
| Patterns                        | BACKEND_READY   | BACKEND_READY | MOBILE_ADAPTATION_REQUIRED | PROVIDER_REQUIRED            | State/disclosure native surface               | TASK-100E |
| Insights                        | FEATURE_FLAGGED | BACKEND_READY | FEATURE_FLAGGED            | PROVIDER_REQUIRED            | No fabricated content; safe empty state       | TASK-100E |
| Watchlist/alerts                | BACKEND_READY   | BACKEND_READY | DEFERRED                   | NOT_APPLICABLE               | Placeholder only                              | TASK-100F |
| Portfolio                       | BACKEND_READY   | BACKEND_READY | DEFERRED                   | NOT_APPLICABLE               | Placeholder only                              | TASK-100G |

Backend contracts are reused. Provider absence is never converted to zero, stale-as-fresh or live
fixture data. Native evidence fixtures are development-only and visibly marked
`DEMO_UI_FIXTURE · NOT_LIVE_MARKET_DATA`.
