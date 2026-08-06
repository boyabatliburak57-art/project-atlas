# Mobile Portfolio Feature Matrix

| Capability                        | Backend | Provider            | Mobile | Data Quality         | Tests                | Status |
| --------------------------------- | ------- | ------------------- | ------ | -------------------- | -------------------- | ------ |
| List/select/create/update/archive | PASS    | N/A                 | PASS   | AVAILABLE            | Unit/API/Maestro     | PASS   |
| Positions                         | PASS    | Market values gated | PASS   | PARTIAL supported    | Pagination invariant | PASS   |
| Position detail                   | PASS    | Market values gated | PASS   | Freshness/status     | Unit/Maestro         | PASS   |
| Home/symbol integration           | PASS    | Capability-aware    | PASS   | No cross-owner cache | Integration          | PASS   |
| Demo portfolio                    | PASS    | NOT_LIVE            | PASS   | Owner-scoped         | Isolation scan       | PASS   |
| Broker execution                  | N/A     | N/A                 | ABSENT | N/A                  | Semantic scan        | PASS   |
