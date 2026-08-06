# Mobile Scanner Feature Matrix

| Capability          | Backend       | Provider            | Mobile      | Validation                  | Tests             | Status |
| ------------------- | ------------- | ------------------- | ----------- | --------------------------- | ----------------- | ------ |
| Saved scans         | BACKEND_READY | none                | implemented | owner/version               | unit + E2E        | PASS   |
| Immutable revisions | BACKEND_READY | none                | implemented | historical pin              | API + E2E         | PASS   |
| Preset catalog      | BACKEND_READY | capability-aware    | implemented | immutable ID/version        | unit + E2E        | PASS   |
| AST builder         | BACKEND_READY | capability-aware    | implemented | allowlists, depth 4, max 25 | unit + E2E        | PASS   |
| Run lifecycle       | BACKEND_READY | CREDENTIAL_REQUIRED | implemented | idempotency/cancel          | integration + E2E | PASS   |
| Results             | BACKEND_READY | CREDENTIAL_REQUIRED | implemented | server cursor               | perf + E2E        | PASS   |
| History             | BACKEND_READY | none                | implemented | owner cursor                | integration + E2E | PASS   |

Production without provider credentials returns `PROVIDER_REQUIRED`; fixture execution is test-only
and never establishes live scanner availability.
