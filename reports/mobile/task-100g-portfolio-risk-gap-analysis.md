# TASK-100G Portfolio and Risk Gap Analysis

Date: 2026-08-06

| Capability                      | Backend        | Web            | Mobile          | Provider Dependency             | Data Quality                 | Missing Work    | Action                |
| ------------------------------- | -------------- | -------------- | --------------- | ------------------------------- | ---------------------------- | --------------- | --------------------- |
| Portfolio CRUD/archive          | BACKEND_READY  | PASS           | IMPLEMENTED     | NOT_APPLICABLE                  | AVAILABLE                    | Native evidence | Validate              |
| Positions/keyset pagination     | BACKEND_READY  | PASS           | IMPLEMENTED     | Market values PROVIDER_REQUIRED | PARTIAL                      | Native evidence | Validate invariant    |
| Ledger/buy/sell/cash/dividend   | BACKEND_READY  | PASS           | IMPLEMENTED     | NOT_APPLICABLE                  | AVAILABLE                    | Native evidence | Validate              |
| Cost basis/realized P/L         | BACKEND_READY  | PASS           | IMPLEMENTED     | NOT_APPLICABLE                  | MISSING_COST_BASIS supported | None            | Reuse backend         |
| Valuation/unrealized P/L        | BACKEND_READY  | PASS           | IMPLEMENTED     | PROVIDER_REQUIRED               | PARTIAL                      | Credential      | Gate fail-closed      |
| Performance/cash-flow treatment | BACKEND_READY  | PASS           | IMPLEMENTED     | Valuation provider              | PARTIAL                      | Credential      | Gate fail-closed      |
| Benchmark                       | BACKEND_READY  | PASS           | IMPLEMENTED     | PROVIDER_REQUIRED               | BENCHMARK_UNAVAILABLE        | Credential      | Gate fail-closed      |
| Allocation/contribution         | BACKEND_READY  | PASS           | IMPLEMENTED     | Market/sector provider          | PARTIAL                      | Credential      | Cost-based label only |
| Risk/concentration/drawdown     | BACKEND_READY  | PASS           | IMPLEMENTED     | Valuation/benchmark             | NOT_EVALUABLE supported      | Native evidence | Validate              |
| Corporate actions               | BACKEND_READY  | PASS           | IMPLEMENTED     | CREDENTIAL_REQUIRED             | PENDING supported            | Credential      | No client adjustment  |
| Privacy mode                    | BACKEND_READY  | N/A            | IMPLEMENTED     | NOT_APPLICABLE                  | AVAILABLE                    | Native evidence | Validate redaction    |
| Broker/trade execution          | NOT_APPLICABLE | NOT_APPLICABLE | NOT_IMPLEMENTED | NOT_APPLICABLE                  | NOT_APPLICABLE               | None            | Prohibited            |

Backend domain services remain authoritative for decimal arithmetic, cost basis, performance, risk and corporate actions. Mobile performs validation/serialization and presentation only.
