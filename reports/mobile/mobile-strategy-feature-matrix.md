# Mobile Strategy Feature Matrix

| Capability                | Backend | Mobile | Validation            | Tests        | Status |
| ------------------------- | ------- | ------ | --------------------- | ------------ | ------ |
| List/create               | PASS    | PASS   | bounded/owner-scoped  | unit/API/E2E | PASS   |
| Shared rule AST           | PASS    | PASS   | allowlist/depth/count | unit/domain  | PASS   |
| Immutable revisions       | PASS    | PASS   | history retained      | API/E2E      | PASS   |
| Provider gating           | PASS    | PASS   | fail-closed           | bundle/E2E   | PASS   |
| Advice/execution boundary | N/A     | PASS   | prohibited language   | scan/review  | PASS   |
