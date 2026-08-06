# Mobile Alert Feature Matrix

| Capability           | Backend            | Mobile          | Evaluation                      | Tests           | Status   |
| -------------------- | ------------------ | --------------- | ------------------------------- | --------------- | -------- |
| Price alert          | BACKEND_READY      | implemented     | server-authoritative crossing   | API/E2E         | PASS     |
| Indicator alert      | BACKEND_READY      | implemented     | server, missing = NOT_EVALUABLE | API/E2E         | PASS     |
| Saved-scan alert     | BACKEND_READY      | implemented     | revision pinned/follow policy   | API/E2E         | PASS     |
| Lifecycle/history    | BACKEND_READY      | implemented     | version/idempotency/dedup       | integration/E2E | PASS     |
| Portfolio/risk alert | DEFERRED_TASK_100G | not implemented | not applicable                  | none            | DEFERRED |
