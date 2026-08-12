# Mobile Component Inventory

Mobile v1 is iOS-only and phone-only. BottomNavigation on iPhone 17 is the v1 production navigation candidate.
NavigationRail: Implemented Yes; Unit tested Yes; Native phone applicable No; Tablet native
validation Deferred v1.1; V1 release blocker No.

Android component validation: `DEFERRED_V1_1_NOT_RELEASE_GATED`.

| Component                    | Implemented | Tested  | Accessibility  | Visual Baseline |
| ---------------------------- | ----------- | ------- | -------------- | --------------- |
| BottomNavigation             | YES         | UNIT    | CONTRACT_PASS  | NATIVE_PENDING  |
| NavigationRail               | YES         | UNIT    | CONTRACT_PASS  | NATIVE_PENDING  |
| AdaptiveNavigationShell      | YES         | UNIT    | CONTRACT_PASS  | NATIVE_PENDING  |
| BottomSheet                  | YES         | UNIT    | NATIVE_PENDING | NATIVE_PENDING  |
| ConfirmationDialog           | YES         | UNIT    | NATIVE_PENDING | NATIVE_PENDING  |
| Modal                        | YES         | UNIT    | NATIVE_PENDING | NATIVE_PENDING  |
| Financial/display primitives | YES         | UNIT    | CONTRACT_PASS  | NATIVE_PENDING  |
| State/row/layout primitives  | YES         | PARTIAL | MATRIX_PARTIAL | NATIVE_PENDING  |

The export surface increased only for the six remediation components and their typed navigation/
focus contracts. No feature API or redundant display alias was added. Native evidence remains the
blocking status, so none of the affected rows is marked `VISUAL_BASELINE_PASS`.

## TASK-100E additions — 2026-08-05

| Component                   | Implemented | Tested            | Accessibility                | Native visual |
| --------------------------- | ----------- | ----------------- | ---------------------------- | ------------- |
| MarketOverview/Markets tabs | YES         | UNIT/API/MAESTRO  | CONTRACT_PASS_WITH_WAIVER    | PASS          |
| GlobalSymbolSearch          | YES         | UNIT/API/MAESTRO  | CONTRACT_PASS_WITH_WAIVER    | PASS          |
| SymbolDetail tabs           | YES         | UNIT/API/MAESTRO  | CONTRACT_PASS_WITH_WAIVER    | PASS          |
| NativeFinancialChart        | YES         | UNIT/MAESTRO/PERF | SUMMARY_AND_POINT_NAVIGATION | PASS          |
| IndicatorSelector           | YES         | UNIT/API/MAESTRO  | CONTRACT_PASS_WITH_WAIVER    | PASS          |

Historical TASK-100E note: scanner, watchlist and alert flows were completed by TASK-100F. VoiceOver
manual validation remains `NOT_EXECUTED` under `USER_ACCEPTED_DOCUMENTED_EXCEPTION`.

## TASK-100F additions — 2026-08-06

| Component                               | Implemented | Tested                | Accessibility             | Native visual |
| --------------------------------------- | ----------- | --------------------- | ------------------------- | ------------- |
| Scanner tabs/builder/progress/results   | YES         | UNIT/API/MAESTRO/PERF | CONTRACT_PASS_WITH_WAIVER | PASS          |
| Watchlist list/detail/summary           | YES         | UNIT/API/MAESTRO/PERF | CONTRACT_PASS_WITH_WAIVER | PASS          |
| Alert builder/list/history              | YES         | UNIT/API/MAESTRO/PERF | CONTRACT_PASS_WITH_WAIVER | PASS          |
| Push permission/preferences/quiet hours | YES         | UNIT/API/MAESTRO      | CONTRACT_PASS_WITH_WAIVER | PASS          |
| Notification center/activity            | YES         | UNIT/API/MAESTRO      | CONTRACT_PASS_WITH_WAIVER | PASS          |

Historical TASK-100F note: portfolio/risk components were completed by TASK-100G. VoiceOver manual
validation remains `NOT_EXECUTED` under the documented user exception.

## TASK-100G additions

Portfolio selector, privacy band, portfolio metric, position row, transaction record form/row, performance summary, allocation ranked list, risk metric and data-quality issue are implemented for iOS phone. Financial engines remain backend-authoritative.

# TASK-100H component addendum

- Strategy Lab shell and strategy/revision cards
- Shared scanner-AST rule editor
- Backtest configuration and progress surfaces
- Equity and drawdown native chart surfaces
- Metric and NOT_EVALUABLE cards
- Cursor-paginated trade history/detail
- Data-quality, experiment comparison, and re-run surfaces

# TASK-100I component addendum

| Component                             | Implemented | Tested                  | Accessibility             | Native visual |
| ------------------------------------- | ----------- | ----------------------- | ------------------------- | ------------- |
| Reports landing/type/detail/lifecycle | YES         | UNIT/API/WORKER/MAESTRO | CONTRACT_PASS_WITH_WAIVER | PASS          |
| Metadata spine/export/share warning   | YES         | UNIT/API/MAESTRO        | CONTRACT_PASS_WITH_WAIVER | PASS          |
| Help search/article/methodology/legal | YES         | UNIT/API/MAESTRO        | CONTRACT_PASS_WITH_WAIVER | PASS          |
| Support form/history                  | YES         | UNIT/API/MAESTRO        | CONTRACT_PASS_WITH_WAIVER | PASS          |
| Settings/appearance/privacy/about     | YES         | UNIT/API/MAESTRO        | CONTRACT_PASS_WITH_WAIVER | PASS          |

Historical TASK-100I note: advanced native hardening was completed by TASK-100J. VoiceOver manual
validation remains `NOT_EXECUTED` under the documented user exception.
