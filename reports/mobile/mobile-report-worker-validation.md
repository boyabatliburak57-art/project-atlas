# Mobile Report Worker Validation

| Gate                         | Evidence                                                                                          | Result |
| ---------------------------- | ------------------------------------------------------------------------------------------------- | ------ |
| Report Job Enqueue           | API dispatcher writes `reports.generate.v1` to `atlas.reports.v1` with stable per-report identity | PASS   |
| Report Worker Attached       | `WorkerRuntime` owns the report queue/worker and `report` role                                    | PASS   |
| Queue → Worker → Persistence | real Redis/BullMQ + PostgreSQL integration generates artifact, SHA-256 and `ready` state          | PASS   |
| Retry Policy                 | five bounded exponential attempts; failed jobs retained                                           | PASS   |
| Cancellation/Expiry          | non-generatable terminal states fail closed; download rechecks ready and expiry                   | PASS   |
| Foreign owner                | worker query binds both report ID and owner ID                                                    | PASS   |

The integration does not use an in-process completion shortcut. The API creates `queued`; only the production worker composition creates and persists the artifact.
