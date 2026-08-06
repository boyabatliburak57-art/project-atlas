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

VoiceOver remains `ACCEPTED_PRODUCT_WAIVER`; scanner, watchlist and alert feature flows remain
`NOT_IMPLEMENTED/TASK-100F`.

## TASK-100F additions — 2026-08-06

| Component                               | Implemented | Tested                | Accessibility             | Native visual |
| --------------------------------------- | ----------- | --------------------- | ------------------------- | ------------- |
| Scanner tabs/builder/progress/results   | YES         | UNIT/API/MAESTRO/PERF | CONTRACT_PASS_WITH_WAIVER | PASS          |
| Watchlist list/detail/summary           | YES         | UNIT/API/MAESTRO/PERF | CONTRACT_PASS_WITH_WAIVER | PASS          |
| Alert builder/list/history              | YES         | UNIT/API/MAESTRO/PERF | CONTRACT_PASS_WITH_WAIVER | PASS          |
| Push permission/preferences/quiet hours | YES         | UNIT/API/MAESTRO      | CONTRACT_PASS_WITH_WAIVER | PASS          |
| Notification center/activity            | YES         | UNIT/API/MAESTRO      | CONTRACT_PASS_WITH_WAIVER | PASS          |

VoiceOver remains `ACCEPTED_PRODUCT_WAIVER`. Portfolio/risk components remain TASK-100G.

## TASK-100G additions

Portfolio selector, privacy band, portfolio metric, position row, transaction record form/row, performance summary, allocation ranked list, risk metric and data-quality issue are implemented for iOS phone. Financial engines remain backend-authoritative.
