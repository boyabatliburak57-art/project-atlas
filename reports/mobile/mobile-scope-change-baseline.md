# TASK-100A — Mobile Scope Change Baseline

**Baseline date:** 2026-07-28  
**Evidence boundary:** Repository inspection; no mobile implementation or external staging evidence

```text
Product Strategy: MOBILE_FIRST
Primary Customer Surface: MOBILE_APPLICATION
Desktop Surface: ADVANCED_ANALYTICS_AND_ADMIN
Backend Platform: SHARED_API_AND_WORKERS
Production Readiness: NO-GO
Staging Gate: DEFERRED_EXTERNAL_GATE
Production Launch: BLOCKED
```

Project Atlas is a modern, professional BIST-focused mobile financial application for market
analysis, scanner, alerts, portfolio/risk management, financial-data analysis and strategy
backtesting. Mobile is the primary customer surface. Web remains the advanced desktop analytics,
large table/chart, advanced strategy editing, operations and administration surface. API and
workers are shared by all clients.

## Status vocabulary

- `BACKEND_READY`: reusable backend/domain/worker capability exists.
- `WEB_READY`: working web surface or established web workflow exists.
- `MOBILE_ADAPTATION_REQUIRED`: existing contract/workflow needs native presentation or adaptation.
- `MOBILE_NATIVE_REQUIRED`: native-only capability must be implemented.
- `EXTERNAL_PROVIDER_REQUIRED`: real external capability/credential evidence remains required.
- `DEFERRED`: explicitly outside the current implementation step or gated to a later task.
- `NOT_APPLICABLE`: the status does not apply to that surface.

No row implies that a mobile feature is implemented. `apps/mobile` does not exist at this baseline.

## Feature scope matrix

| Capability              | Backend Status             | Web Status     | Required Mobile Status     | Target Task         | Evidence                                                                                                                    |
| ----------------------- | -------------------------- | -------------- | -------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Authentication          | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100D           | `apps/api/src/security/auth.controller.ts`; `apps/web/e2e/onboarding.spec.ts`                                               |
| Session management      | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100D/TASK-100J | `apps/api/src/security/auth-session.service.ts`; `apps/api/src/security/authentication.middleware.ts`                       |
| Onboarding              | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100D           | `apps/api/src/preferences`; `apps/web/src/features/preferences/onboarding-workspace.tsx`                                    |
| User preferences        | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100D/TASK-100I | `apps/api/src/preferences`; `apps/web/src/features/portfolio/preferences-workspace.tsx`                                     |
| Market overview         | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100E           | `apps/api/src/market`; `apps/web/src/features/market/market-workspace.tsx`                                                  |
| Indices                 | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100E           | `apps/api/src/market/market-overview.service.ts`; `apps/web/src/app/market/page.tsx`                                        |
| Sector performance      | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100E           | `apps/api/src/market`; `apps/web/src/features/market/sectors-workspace.tsx`                                                 |
| Market breadth          | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100E           | `apps/api/src/market/market-overview.dto.ts`; `apps/web/src/features/market/market-workspace.tsx`                           |
| Top gainers/losers      | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100E           | `apps/api/src/market/market-overview.service.ts`; `apps/web/src/features/market/market-workspace.tsx`                       |
| Symbol search           | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100E           | `apps/api/src/navigation`; `apps/web/src/features/navigation/global-shell.tsx`                                              |
| Symbol detail           | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100E           | `apps/api/src/symbols`; `apps/web/src/features/market/symbol-workspace.tsx`                                                 |
| Candlestick chart       | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100E           | `architecture/ARCH-011-Chart-Data-and-Overlay-Runtime.md`; `guides/CHART_DATA_CONTRACT.md`                                  |
| Indicator overlays      | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100E           | `apps/api/src/indicators`; `apps/api/src/symbols/symbol-detail.service.ts`                                                  |
| Fundamentals            | EXTERNAL_PROVIDER_REQUIRED | WEB_READY      | EXTERNAL_PROVIDER_REQUIRED | TASK-100E/TASK-100J | `apps/api/src/fundamentals`; `reports/non-staging-launch-completeness-audit.md`                                             |
| Patterns                | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100E           | `apps/api/src/patterns`; `apps/worker/src/market-data/patterns`                                                             |
| Scanner                 | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100F           | `apps/api/src/scanner`; `apps/worker/src/scanner`; `apps/web/src/features/scanner`                                          |
| Saved scans             | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100F           | `apps/api/src/saved-scans`; `apps/web/src/features/scanner/scanner-workspace.tsx`                                           |
| Scan history            | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100F           | `apps/api/src/scanner/scanner-runtime.controller.ts`; `database/DB-004-Scanner-Runtime-Persistence.md`                      |
| Watchlists              | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100F           | `apps/api/src/watchlists`; `apps/web/src/features/portfolio/watchlists-workspace.tsx`                                       |
| Alerts                  | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100F           | `apps/api/src/alerts`; `apps/worker/src/alerts`; `apps/web/src/features/portfolio/alerts-workspace.tsx`                     |
| In-app notifications    | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100F           | `apps/api/src/notifications`; `apps/web/src/features/portfolio/notifications-workspace.tsx`                                 |
| Push notifications      | DEFERRED                   | NOT_APPLICABLE | MOBILE_NATIVE_REQUIRED     | TASK-100F/TASK-100J | `reports/mobile/mobile-transformation-gap-analysis.md`; no device-token/push adapter found                                  |
| E-mail notifications    | EXTERNAL_PROVIDER_REQUIRED | WEB_READY      | EXTERNAL_PROVIDER_REQUIRED | TASK-100F/TASK-100J | `apps/worker/src/notifications`; `reports/communications/notification-delivery-readiness.md`                                |
| Portfolio               | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100G           | `apps/api/src/portfolios`; `apps/web/src/features/portfolio/portfolio-overview-workspace.tsx`                               |
| Transactions            | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100G           | `packages/domain/src/portfolio`; `apps/web/src/features/portfolio/portfolio-transactions-workspace.tsx`                     |
| P&L                     | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100G           | `architecture/ARCH-008-Portfolio-Ledger-and-Valuation.md`; `apps/api/src/portfolios`                                        |
| Benchmark comparison    | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100G           | `api/API-006-Portfolios-Transactions-Risk.md`; `apps/web/src/features/portfolio/portfolio-performance-workspace.tsx`        |
| Risk metrics            | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100G           | `architecture/ARCH-009-Portfolio-Risk-Analytics-Runtime.md`; `apps/web/src/features/portfolio/portfolio-risk-workspace.tsx` |
| Strategy definitions    | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100H           | `packages/domain/src/strategies`; `apps/web/src/features/strategy-lab`                                                      |
| Backtests               | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100H           | `apps/api/src/backtests`; `apps/worker/src/backtesting`; `apps/web/src/app/backtests`                                       |
| Experiments             | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100H           | `apps/worker/src/backtesting/experiment-processor.ts`; `apps/web/src/app/experiments`                                       |
| Reports                 | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100I           | `apps/api/src/reports`; `apps/web/src/features/reports/report-center.tsx`                                                   |
| Activity center         | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100I           | `apps/api/src/navigation`; `apps/web/src/features/navigation/activity-center.tsx`                                           |
| Help center             | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100I           | `apps/web/src/features/help`; `reports/product-education/help-and-demo-readiness.md`                                        |
| Demo data               | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100D/TASK-100I | `apps/api/src/demo`; `apps/web/src/features/help/demo-panel.tsx`                                                            |
| Support                 | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100I           | `apps/api/src/support`; `apps/web/src/features/support`                                                                     |
| User settings           | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100I           | `apps/api/src/preferences`; `apps/web/src/app/notification-preferences/page.tsx`                                            |
| Legal documents         | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100D/TASK-100I | `apps/api/src/legal`; `apps/web/src/features/legal`; legal review remains external                                          |
| Account export          | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100I           | `apps/api/src/reports`; `api/API-011-Data-Operations-Consent-and-Support.md`                                                |
| Account deletion        | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100I           | `apps/api/src/security/account-deletion.controller.ts`; `apps/web/e2e/support-lifecycle.spec.ts`                            |
| Feature flags           | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100J           | `apps/api/src/operations/feature-flag-runtime.service.ts`; `apps/worker/src/operations/worker-feature-flags.ts`             |
| Admin access            | BACKEND_READY              | WEB_READY      | MOBILE_ADAPTATION_REQUIRED | TASK-100I/TASK-100J | `apps/api/src/operations`; `apps/web/src/app/admin`; `apps/web/e2e/admin-operations.spec.ts`                                |
| Offline/read-only cache | DEFERRED                   | NOT_APPLICABLE | MOBILE_NATIVE_REQUIRED     | TASK-100J           | `reports/mobile/mobile-transformation-gap-analysis.md`; no native cache implementation found                                |
| Secure token storage    | BACKEND_READY              | NOT_APPLICABLE | MOBILE_NATIVE_REQUIRED     | TASK-100D/TASK-100J | Server session: `apps/api/src/security/auth-session.service.ts`; no SecureStore implementation found                        |
| Biometrics              | NOT_APPLICABLE             | NOT_APPLICABLE | MOBILE_NATIVE_REQUIRED     | TASK-100D/TASK-100J | No native local-authentication implementation found                                                                         |
| Deep links              | BACKEND_READY              | WEB_READY      | MOBILE_NATIVE_REQUIRED     | TASK-100C/TASK-100J | Resource authorization APIs exist; no app-link/deep-link mobile implementation found                                        |
| Native sharing          | NOT_APPLICABLE             | NOT_APPLICABLE | MOBILE_NATIVE_REQUIRED     | TASK-100I/TASK-100J | No native share adapter found                                                                                               |
| Background refresh      | BACKEND_READY              | NOT_APPLICABLE | MOBILE_NATIVE_REQUIRED     | TASK-100J           | Shared APIs/workers exist; no mobile background task implementation found                                                   |
| Mobile telemetry        | BACKEND_READY              | WEB_READY      | MOBILE_NATIVE_REQUIRED     | TASK-100J           | `apps/api/src/observability`; `apps/worker/src/observability`; no mobile adapter found                                      |
| Mobile accessibility    | NOT_APPLICABLE             | WEB_READY      | MOBILE_NATIVE_REQUIRED     | TASK-100C/TASK-100K | `apps/web/e2e/accessibility.spec.ts`; no mobile accessibility evidence found                                                |
| Tablet support          | NOT_APPLICABLE             | WEB_READY      | MOBILE_NATIVE_REQUIRED     | TASK-100C/TASK-100K | Responsive web exists; no tablet device/screenshot matrix found                                                             |

## Design direction

```text
Design Direction:
Professional Financial Application

Visual Character:
Premium Fintech
Trustworthy
Data-Focused
Minimal
Institutional
Modern
```

Chatbot home screens, prompt boxes, assistant avatars, robot icons, AI sparkles, conversation
bubbles, magical-gradient overload and ambiguous AI-generated recommendation language are
prohibited.

Every financial surface must show clear price and percentage movement, non-color-only direction,
data freshness, source/methodology, partial/stale/notEvaluable states, risk/non-advice disclosure,
professional charts/tables and consistent financial formatting.

TASK-100L must audit all eight screen groups: Welcome/Onboarding; Market Overview; Symbol Detail;
Scanner; Watchlists/Alerts; Portfolio/Risk; Strategy Lab/Backtest; Reports/Help/Settings.

## Mobile v1.0 exclusions

- Live broker connection
- Real order execution
- Automatic trading
- Public strategy marketplace
- Social/community feed
- AI investment recommendations
- Tick-level HFT simulation
- Unbounded optimization
- Enterprise billing
- Native desktop application

## Preserved external blockers

- Real market-data provider credentials
- Provider licensing and redistribution approval
- Production e-mail provider
- Legal review
- Final staging execution

None is resolved by mobile implementation or by this documentation baseline.
