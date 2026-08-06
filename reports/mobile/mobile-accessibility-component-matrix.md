# Mobile Accessibility Component Matrix

Mobile v1 accessibility requires iOS and Android phone evidence. All phone-native columns remain
`MANUAL_NATIVE_VERIFICATION_REQUIRED`. Later sequential runs installed and launched both apps and
passed smoke navigation, but the full Maestro suites failed and VoiceOver/TalkBack/keyboard
checklists were not completed. Tablet Status for every applicable row is
`DEFERRED_V1_1`; tablet absence is not a v1 failure.

Legend: `UNIT` means deterministic contract coverage; `NATIVE_PENDING` requires VoiceOver,
TalkBack or keyboard evidence on the native runner.

VoiceOver remains `ACCEPTED_PRODUCT_WAIVER` with follow-up `OPEN_TASK_100K`. TASK-100D-R adds an
accessible verification title, masked-address description, alert semantics, disabled/loading state
and minimum-target buttons; native VoiceOver is not reported PASS.

| Component/Flow                                         | Role                | Label            | State                     | Touch Target | Dynamic Type | VoiceOver | TalkBack | Keyboard | Test Status |
| ------------------------------------------------------ | ------------------- | ---------------- | ------------------------- | ------------ | ------------ | --------- | -------- | -------- | ----------- |
| BottomNavigation                                       | tablist/tab         | yes              | selected/disabled         | 48           | yes          | pending   | pending  | pending  | UNIT        |
| NavigationRail                                         | tablist/tab         | yes              | selected/disabled         | 48           | yes          | pending   | pending  | pending  | UNIT        |
| AppHeader/SectionHeader                                | header              | yes              | n/a                       | n/a          | yes          | pending   | pending  | n/a      | UNIT        |
| Button/IconButton/BackButton/TextButton                | button              | yes              | disabled                  | 48           | yes          | pending   | pending  | pending  | PARTIAL     |
| E-mail verification status/resend/confirm              | header/button/alert | yes              | loading/error/cooldown    | 48           | yes          | waiver    | deferred | pending  | UNIT        |
| SearchInput/TextField/SecureTextField/NumberField      | input               | yes              | error                     | 48           | yes          | pending   | pending  | pending  | PARTIAL     |
| Switch/Checkbox/Radio                                  | control             | yes              | checked/disabled          | 48           | yes          | pending   | pending  | pending  | PARTIAL     |
| SegmentedControl/Tabs                                  | tab                 | yes              | selected                  | 48           | yes          | pending   | pending  | pending  | PARTIAL     |
| BottomSheet                                            | alert/modal         | yes              | expanded/loading          | 48           | yes          | pending   | pending  | pending  | UNIT        |
| ConfirmationDialog/Modal                               | alert/modal         | yes              | loading/error             | 48           | yes          | pending   | pending  | pending  | UNIT        |
| Toast/Tooltip/info sheet                               | alert/text          | yes              | live                      | 48           | yes          | pending   | pending  | pending  | PARTIAL     |
| FinancialValue/PriceDisplay/CurrencyDisplay            | text                | yes              | unavailable               | n/a          | yes          | pending   | pending  | n/a      | UNIT        |
| FinancialChange/ChangeBadge/PercentageDisplay          | text                | spoken direction | positive/negative/neutral | n/a          | yes          | pending   | pending  | n/a      | UNIT        |
| MetricCard/IndexCard/BacktestMetricCard/RiskMetricCard | text                | yes              | n/a                       | n/a          | yes          | pending   | pending  | n/a      | PARTIAL     |
| MarketStatusBadge/DataFreshnessBadge                   | text                | yes              | status                    | n/a          | yes          | pending   | pending  | n/a      | PARTIAL     |
| SymbolRow/PositionRow/AlertRow/ScanResultRow           | text                | yes              | n/a                       | 48           | yes          | pending   | pending  | pending  | PARTIAL     |
| ReportRow/StrategyCard/MoreMenuSection                 | text                | yes              | n/a                       | 48           | yes          | pending   | pending  | pending  | PARTIAL     |
| Empty/Error/Offline/ProviderRequired                   | alert               | yes              | status                    | n/a          | yes          | pending   | pending  | n/a      | PARTIAL     |
| Stale/Partial/NotEvaluable/PermissionRequired/Demo     | alert/text          | yes              | status                    | n/a          | yes          | pending   | pending  | n/a      | PARTIAL     |
| Screen                                                 | summary             | yes              | offline/loading           | n/a          | yes          | pending   | pending  | pending  | PARTIAL     |

Because native screen-reader and keyboard evidence is pending, this matrix is not an
`ACCESSIBILITY_PASS`.

TASK-100C-R2 added no native evidence because preflight failed. iOS native, Android native,
VoiceOver, TalkBack and keyboard results remain `BLOCKED_BY_ENVIRONMENT` or
`MANUAL_NATIVE_VERIFICATION_REQUIRED`.

TASK-100C-R4 adds Standard iPhone navigation and modal visibility evidence, but native focus,
VoiceOver, TalkBack, small/large profiles and Android full-suite evidence remain incomplete.
Matrix result remains `INCOMPLETE`; tablet remains `DEFERRED_V1_1`.

## TASK-100C-R5 iOS-only status

| Component group                              | Unit/component | iOS native      | VoiceOver | Dynamic Type  | Touch target | Focus lifecycle | Result     | Android       | Tablet        |
| -------------------------------------------- | -------------- | --------------- | --------- | ------------- | ------------ | --------------- | ---------- | ------------- | ------------- |
| BottomNavigation/AppHeader/actions           | PASS           | PARTIAL         | PENDING   | CONTRACT_PASS | PASS         | N/A             | INCOMPLETE | DEFERRED_V1_1 | DEFERRED_V1_1 |
| Inputs/SegmentedControl                      | PASS           | PARTIAL         | PENDING   | CONTRACT_PASS | PASS         | PARTIAL         | INCOMPLETE | DEFERRED_V1_1 | DEFERRED_V1_1 |
| BottomSheet/Dialog/Modal                     | PASS           | OPEN_CLOSE_PASS | PENDING   | CONTRACT_PASS | PASS         | INCOMPLETE      | INCOMPLETE | DEFERRED_V1_1 | DEFERRED_V1_1 |
| Financial values/freshness                   | PASS           | PARTIAL         | PENDING   | CONTRACT_PASS | N/A          | N/A             | INCOMPLETE | DEFERRED_V1_1 | DEFERRED_V1_1 |
| Rows and empty/error/offline/provider states | PASS           | PARTIAL         | PENDING   | CONTRACT_PASS | PASS         | N/A             | INCOMPLETE | DEFERRED_V1_1 | DEFERRED_V1_1 |

No row with missing VoiceOver or native focus evidence is marked PASS.

## TASK-100C-R5 transition disposition — 2026-07-31

| Component group                              | Unit | iOS native | VoiceOver disposition   | Dynamic Type | Touch target | Focus | Result | Android       | Tablet        |
| -------------------------------------------- | ---- | ---------- | ----------------------- | ------------ | ------------ | ----- | ------ | ------------- | ------------- |
| BottomNavigation/AppHeader/actions           | PASS | PASS       | ACCEPTED_PRODUCT_WAIVER | PASS         | PASS         | N/A   | PASS   | DEFERRED_V1_1 | DEFERRED_V1_1 |
| Inputs/SegmentedControl                      | PASS | PASS       | ACCEPTED_PRODUCT_WAIVER | PASS         | PASS         | PASS  | PASS   | DEFERRED_V1_1 | DEFERRED_V1_1 |
| BottomSheet/Dialog/Modal                     | PASS | PASS       | ACCEPTED_PRODUCT_WAIVER | PASS         | PASS         | PASS  | PASS   | DEFERRED_V1_1 | DEFERRED_V1_1 |
| Financial values/freshness                   | PASS | PASS       | ACCEPTED_PRODUCT_WAIVER | PASS         | N/A          | N/A   | PASS   | DEFERRED_V1_1 | DEFERRED_V1_1 |
| Rows and empty/error/offline/provider states | PASS | PASS       | ACCEPTED_PRODUCT_WAIVER | PASS         | PASS         | N/A   | PASS   | DEFERRED_V1_1 | DEFERRED_V1_1 |

Transition result: `PASS_WITH_ACCEPTED_VOICEOVER_WAIVER`. This is not a claim that the manual
VoiceOver checklist was executed.

TASK-100D-R verification UI hierarchy, labels, Dynamic Type and safe error-state component tests
passed. VoiceOver remains `ACCEPTED_PRODUCT_WAIVER` with follow-up `OPEN_TASK_100K`; it is not
reported as manual VoiceOver PASS. Android and tablet remain `DEFERRED_V1_1`.

## TASK-100E automated iOS evidence — 2026-08-05

| Component group                     | iOS native | VoiceOver               | Dynamic Type | Touch target | Automated hierarchy | Result           | Android       | Tablet        |
| ----------------------------------- | ---------- | ----------------------- | ------------ | ------------ | ------------------- | ---------------- | ------------- | ------------- |
| Markets tabs/search/results         | PASS       | ACCEPTED_PRODUCT_WAIVER | PASS         | PASS         | PASS                | PASS_WITH_WAIVER | DEFERRED_V1_1 | DEFERRED_V1_1 |
| Market status/freshness/movers      | PASS       | ACCEPTED_PRODUCT_WAIVER | PASS         | PASS         | PASS                | PASS_WITH_WAIVER | DEFERRED_V1_1 | DEFERRED_V1_1 |
| Chart summary/data-point navigation | PASS       | ACCEPTED_PRODUCT_WAIVER | PASS         | PASS         | PASS                | PASS_WITH_WAIVER | DEFERRED_V1_1 | DEFERRED_V1_1 |
| Symbol tabs/provider/error states   | PASS       | ACCEPTED_PRODUCT_WAIVER | PASS         | PASS         | PASS                | PASS_WITH_WAIVER | DEFERRED_V1_1 | DEFERRED_V1_1 |

VoiceOver remains an accepted product waiver and is not reported as PASS. Follow-up remains
`OPEN_TASK_100K`.

## TASK-100F automated iOS evidence — 2026-08-06

| Component group                         | iOS native | VoiceOver               | Dynamic Type | Touch target | Automated hierarchy | Result           | Android       | Tablet        |
| --------------------------------------- | ---------- | ----------------------- | ------------ | ------------ | ------------------- | ---------------- | ------------- | ------------- |
| Scanner tabs/chips/condition groups     | PASS       | ACCEPTED_PRODUCT_WAIVER | PASS         | PASS         | PASS                | PASS_WITH_WAIVER | DEFERRED_V1_1 | DEFERRED_V1_1 |
| Progress/results/matched explanation    | PASS       | ACCEPTED_PRODUCT_WAIVER | PASS         | PASS         | PASS                | PASS_WITH_WAIVER | DEFERRED_V1_1 | DEFERRED_V1_1 |
| Watchlist and alert rows/states         | PASS       | ACCEPTED_PRODUCT_WAIVER | PASS         | PASS         | PASS                | PASS_WITH_WAIVER | DEFERRED_V1_1 | DEFERRED_V1_1 |
| Push permission/preferences/quiet hours | PASS       | ACCEPTED_PRODUCT_WAIVER | PASS         | PASS         | PASS                | PASS_WITH_WAIVER | DEFERRED_V1_1 | DEFERRED_V1_1 |
| Notification center/unread state        | PASS       | ACCEPTED_PRODUCT_WAIVER | PASS         | PASS         | PASS                | PASS_WITH_WAIVER | DEFERRED_V1_1 | DEFERRED_V1_1 |

The waiver is unchanged and remains `OPEN_TASK_100K`; no manual VoiceOver PASS is claimed.

## TASK-100G portfolio/risk additions

| Component                             | iOS native | VoiceOver               | Dynamic Type | Touch target | Focus lifecycle | Result           | Android       | Tablet        |
| ------------------------------------- | ---------- | ----------------------- | ------------ | ------------ | --------------- | ---------------- | ------------- | ------------- |
| Portfolio selector and metrics        | PASS       | ACCEPTED_PRODUCT_WAIVER | PASS         | PASS         | PASS            | PASS_WITH_WAIVER | DEFERRED_V1_1 | DEFERRED_V1_1 |
| Position/transaction rows and forms   | PASS       | ACCEPTED_PRODUCT_WAIVER | PASS         | PASS         | PASS            | PASS_WITH_WAIVER | DEFERRED_V1_1 | DEFERRED_V1_1 |
| Performance/allocation/risk summaries | PASS       | ACCEPTED_PRODUCT_WAIVER | PASS         | PASS         | PASS            | PASS_WITH_WAIVER | DEFERRED_V1_1 | DEFERRED_V1_1 |
| Privacy hidden state                  | PASS       | ACCEPTED_PRODUCT_WAIVER | PASS         | PASS         | N/A             | PASS_WITH_WAIVER | DEFERRED_V1_1 | DEFERRED_V1_1 |

Manual VoiceOver follow-up remains `OPEN_TASK_100K`; it is not reported PASS.
