# Mobile Watchlist Feature Matrix

| Capability                | Backend       | Mobile      | Concurrency/ownership   | Provider state             | Tests      | Status |
| ------------------------- | ------------- | ----------- | ----------------------- | -------------------------- | ---------- | ------ |
| List/create/rename/delete | BACKEND_READY | implemented | owner + expectedVersion | metadata available         | API/E2E    | PASS   |
| Add/remove symbols        | BACKEND_READY | implemented | owner + duplicate guard | metadata available         | API/E2E    | PASS   |
| Detail                    | BACKEND_READY | implemented | owner scoped            | prices `PROVIDER_REQUIRED` | E2E/visual | PASS   |
| Market summary            | BACKEND_READY | implemented | backend computed        | partial/provider-aware     | perf/E2E   | PASS   |

No portfolio or risk surface is claimed; those remain TASK-100G.
