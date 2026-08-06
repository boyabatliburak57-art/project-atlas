# TASK-100D Maestro iOS Result

Date: 2026-08-03

The repository contains exactly sixteen TASK-100D auth/onboarding flows. Maestro 2.7.0 discovered
and executed all sixteen on iPhone 17/iOS 26.5. The first clean run produced seven passes and nine
failures. Route URL encoding, logout navigation cleanup, cold deep-link back-state and legal badge
selectors were corrected while retaining the behavioral assertions.

During the required clean rerun, the Maestro XCTest driver teardown crashed SpringBoard. The iPhone
17 profile remained on the Apple boot screen after erase, CoreSimulator restart, recreation and a
two-minute boot wait. An iPhone 17 Pro booted on the same runtime, confirming a device-profile
environment failure. The partial run is not promoted to PASS.

```text
Flows required: 16
Flows discovered for TASK-100D: 16
Flows executed in first clean run: 16
Flows passed in first clean run: 7
Flows failed in first clean run: 9
Required clean rerun: BLOCKED_BY_CORESIMULATOR
Result: FAIL
```

## Final clean rerun — 2026-08-03

After the approved host restart, the required iPhone 17/iOS 26.5 simulator completed a clean run:

```text
Flows discovered: 16
Flows executed: 16
Flows passed: 16
Flows failed: 0
Flows skipped: 0
Retry-only: 0
Runtime: 9m 4s
Result: PASS
Artifact: /tmp/task100d-suite-final2.xml
```

The historical failed and blocked runs above are retained and are not counted as final evidence.
