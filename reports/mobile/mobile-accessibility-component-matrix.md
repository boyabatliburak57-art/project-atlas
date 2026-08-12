# Mobile Accessibility Component Matrix — TASK-100K release gate

Profile: `iPhone 17 · iOS 26.5 · phone portrait-first`

Candidate date: `2026-08-10`
Overall result: `INCOMPLETE`

Automated component and native hierarchy checks do not replace a human-operated VoiceOver session. The current host has the required simulator but no attached physical iPhone; therefore every mandatory VoiceOver cell remains `INCOMPLETE` and no row is promoted to final PASS. Android and tablet are `DEFERRED_TO_V1_1` and are not release gates.

| Product area / component | Component/unit test | Native iOS | VoiceOver  | Dynamic Type | Reduced Motion | Touch target | Focus order   | Modal focus lifecycle | Non-color semantics | Privacy semantics | Result     |
| ------------------------ | ------------------- | ---------- | ---------- | ------------ | -------------- | ------------ | ------------- | --------------------- | ------------------- | ----------------- | ---------- |
| Authentication           | PASS                | PASS       | INCOMPLETE | PASS         | PASS           | PASS         | CONTRACT_PASS | N/A                   | PASS                | PASS              | INCOMPLETE |
| Onboarding               | PASS                | PASS       | INCOMPLETE | PASS         | PASS           | PASS         | CONTRACT_PASS | N/A                   | PASS                | PASS              | INCOMPLETE |
| BottomNavigation         | PASS                | PASS       | INCOMPLETE | PASS         | PASS           | PASS         | CONTRACT_PASS | N/A                   | PASS                | N/A               | INCOMPLETE |
| Market Overview          | PASS                | PASS       | INCOMPLETE | PASS         | PASS           | PASS         | CONTRACT_PASS | N/A                   | PASS                | PASS              | INCOMPLETE |
| Markets                  | PASS                | PASS       | INCOMPLETE | PASS         | PASS           | PASS         | CONTRACT_PASS | N/A                   | PASS                | PASS              | INCOMPLETE |
| Search                   | PASS                | PASS       | INCOMPLETE | PASS         | PASS           | PASS         | CONTRACT_PASS | N/A                   | PASS                | PASS              | INCOMPLETE |
| Symbol Detail            | PASS                | PASS       | INCOMPLETE | PASS         | PASS           | PASS         | CONTRACT_PASS | N/A                   | PASS                | PASS              | INCOMPLETE |
| Financial charts         | PASS                | PASS       | INCOMPLETE | PASS         | PASS           | PASS         | CONTRACT_PASS | N/A                   | PASS                | PASS              | INCOMPLETE |
| Scanner                  | PASS                | PASS       | INCOMPLETE | PASS         | PASS           | PASS         | CONTRACT_PASS | N/A                   | PASS                | PASS              | INCOMPLETE |
| Scan builder/results     | PASS                | PASS       | INCOMPLETE | PASS         | PASS           | PASS         | CONTRACT_PASS | PASS                  | PASS                | PASS              | INCOMPLETE |
| Watchlists               | PASS                | PASS       | INCOMPLETE | PASS         | PASS           | PASS         | CONTRACT_PASS | PASS                  | PASS                | PASS              | INCOMPLETE |
| Alerts                   | PASS                | PASS       | INCOMPLETE | PASS         | PASS           | PASS         | CONTRACT_PASS | PASS                  | PASS                | PASS              | INCOMPLETE |
| Notification Center      | PASS                | PASS       | INCOMPLETE | PASS         | PASS           | PASS         | CONTRACT_PASS | N/A                   | PASS                | PASS              | INCOMPLETE |
| Portfolio                | PASS                | PASS       | INCOMPLETE | PASS         | PASS           | PASS         | CONTRACT_PASS | PASS                  | PASS                | PASS              | INCOMPLETE |
| Positions/transactions   | PASS                | PASS       | INCOMPLETE | PASS         | PASS           | PASS         | CONTRACT_PASS | PASS                  | PASS                | PASS              | INCOMPLETE |
| Portfolio performance    | PASS                | PASS       | INCOMPLETE | PASS         | PASS           | PASS         | CONTRACT_PASS | N/A                   | PASS                | PASS              | INCOMPLETE |
| Portfolio risk           | PASS                | PASS       | INCOMPLETE | PASS         | PASS           | PASS         | CONTRACT_PASS | N/A                   | PASS                | PASS              | INCOMPLETE |
| Strategy Lab             | PASS                | PASS       | INCOMPLETE | PASS         | PASS           | PASS         | CONTRACT_PASS | PASS                  | PASS                | PASS              | INCOMPLETE |
| Backtests                | PASS                | PASS       | INCOMPLETE | PASS         | PASS           | PASS         | CONTRACT_PASS | N/A                   | PASS                | PASS              | INCOMPLETE |
| Experiments              | PASS                | PASS       | INCOMPLETE | PASS         | PASS           | PASS         | CONTRACT_PASS | PASS                  | PASS                | PASS              | INCOMPLETE |
| Reports                  | PASS                | PASS       | INCOMPLETE | PASS         | PASS           | PASS         | CONTRACT_PASS | PASS                  | PASS                | PASS              | INCOMPLETE |
| Help                     | PASS                | PASS       | INCOMPLETE | PASS         | PASS           | PASS         | CONTRACT_PASS | N/A                   | PASS                | PASS              | INCOMPLETE |
| Support                  | PASS                | PASS       | INCOMPLETE | PASS         | PASS           | PASS         | CONTRACT_PASS | PASS                  | PASS                | PASS              | INCOMPLETE |
| Settings                 | PASS                | PASS       | INCOMPLETE | PASS         | PASS           | PASS         | CONTRACT_PASS | PASS                  | PASS                | PASS              | INCOMPLETE |
| Offline states           | PASS                | PASS       | INCOMPLETE | PASS         | PASS           | PASS         | CONTRACT_PASS | N/A                   | PASS                | PASS              | INCOMPLETE |
| App lock                 | PASS                | PASS       | INCOMPLETE | PASS         | PASS           | PASS         | CONTRACT_PASS | PASS                  | PASS                | PASS              | INCOMPLETE |
| Privacy cover            | PASS                | PASS       | INCOMPLETE | PASS         | PASS           | N/A          | CONTRACT_PASS | N/A                   | PASS                | PASS              | INCOMPLETE |
| Error dialogs            | PASS                | PASS       | INCOMPLETE | PASS         | PASS           | PASS         | CONTRACT_PASS | PASS                  | PASS                | PASS              | INCOMPLETE |
| BottomSheet              | PASS                | PASS       | INCOMPLETE | PASS         | PASS           | PASS         | CONTRACT_PASS | CONTRACT_PASS         | PASS                | PASS              | INCOMPLETE |
| ConfirmationDialog       | PASS                | PASS       | INCOMPLETE | PASS         | PASS           | PASS         | CONTRACT_PASS | CONTRACT_PASS         | PASS                | PASS              | INCOMPLETE |

## Release decision

- Mandatory rows present: `30/30`
- Automated critical label/state/privacy failures: `0`
- Native manual VoiceOver observations: `0 completed`
- Privacy VoiceOver leakage: `NOT_MANUALLY_VERIFIED`
- Critical modal VoiceOver focus failures: `NOT_MANUALLY_VERIFIED`
- VoiceOver waiver: `USER_ACCEPTED_EXCEPTION_FOR_TASK_100L_TRANSITION`
- Matrix gate: `PASS_WITH_DOCUMENTED_EXCEPTION`

The user authorized TASK-100L transition with the unexecuted manual rows recorded as an explicit exception. The rows remain `INCOMPLETE` and are not represented as verified VoiceOver PASS evidence.
