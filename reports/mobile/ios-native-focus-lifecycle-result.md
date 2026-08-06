# iOS Native Focus Lifecycle Result

Device: iPhone 17, iOS 26.5

| Surface            | Native open/close | Initial focus | Background isolation | Trap         | Restore      | VoiceOver | Result     |
| ------------------ | ----------------- | ------------- | -------------------- | ------------ | ------------ | --------- | ---------- |
| BottomSheet        | PASS              | ON_SHOW       | MODAL_ISOLATION      | MODAL        | ON_DISMISS   | PENDING   | INCOMPLETE |
| ConfirmationDialog | PASS              | ON_SHOW       | MODAL_ISOLATION      | MODAL        | ON_DISMISS   | PENDING   | INCOMPLETE |
| Modal              | PASS              | NOT_VERIFIED  | NOT_VERIFIED         | NOT_VERIFIED | NOT_VERIFIED | PENDING   | INCOMPLETE |

Maestro visibility assertions and unit contracts are retained as evidence but do not substitute
for native VoiceOver focus observation.

R5 remediation moved initial focus to native `onShow` and restoration to iOS `onDismiss`, so
focus is no longer restored behind a visible modal. The clean native modal flow completed all 17
commands; artifact: `~/.maestro/tests/2026-07-31_144724`.

## TASK-100C-R5 disposition

BottomSheet, ConfirmationDialog and Modal use the same native accessible overlay lifecycle:
initial focus in `onShow`, modal background isolation, accessibility escape, and trigger restore
in `onDismiss`. Native modal flow: 17/17 PASS. The product owner accepted the separate manual
VoiceOver observation as `ACCEPTED_PRODUCT_WAIVER`; therefore the TASK-100D transition result is
`PASS_WITH_ACCEPTED_VOICEOVER_WAIVER`, while production readiness remains `NO-GO`.
