# Mobile Accessibility Final Gate

Mobile v1 is an iOS-only, phone portrait-first release contract for iPhone 17 on iOS 26.5. Android and tablet validation are deferred to v1.1.

## Required evidence

The release gate requires both automated semantics tests and a human-operated VoiceOver session on the native iPhone 17 / iOS 26.5 app. Xcode 26.5 does not provide iOS VoiceOver in Simulator, so the manual session requires a physical iPhone. Hierarchy dumps, screenshots, Accessibility Inspector output and Maestro cannot substitute for that interaction. The TASK-100K candidate has automated label, state, privacy, minimum-target, Dynamic Type and Reduced Motion coverage, but no physical device is attached. The waiver therefore remains open and the accessibility gate is incomplete.

Dynamic Type is exercised at system default, Large and Accessibility Extra Large. Content must reflow or remain vertically scrollable; controls cannot be hidden behind fixed containers. Reduced Motion disables overlay animation through the shared focus-lifecycle primitive. Financial direction, unavailable/provider/stale/partial states and risk severity use words/signs in addition to color. Charts expose textual summaries rather than requiring gesture interpretation.

BottomSheet and ConfirmationDialog share one modal primitive with heading focus, modal isolation, accessibility escape, safe actions and trigger-focus restoration contracts. Manual VoiceOver focus containment and restoration remain mandatory before the waiver can close.

Privacy cover and masked portfolio states must remove the underlying financial tree, not merely cover pixels. A screen reader must never receive the real value while masking is active.

Current disposition: `VoiceOver Native Manual Validation: NOT_EXECUTED`; `VoiceOver Waiver: USER_ACCEPTED_EXCEPTION_FOR_TASK_100L_TRANSITION`. The exception authorizes the next audit task but is not a verified VoiceOver PASS.
