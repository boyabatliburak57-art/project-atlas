# TASK-110E Settlement Ingestion Result

`SETTLEMENT_SYNC` is attached as a separate capability-specific worker. Natural identity uses provider + instrument + institution/custodian + settlement date + provider revision. Trade date remains optional and separate. Corrections create immutable revisions and latest views exclude superseded rows.

Real queue → worker → PostgreSQL persistence: PASS. Checkpoint, duplicate delivery, malformed payload rejection, provider-required failure, and source residency cases are covered. Duplicate snapshots: 0.

Result: **ATTACHED / PASS**.
