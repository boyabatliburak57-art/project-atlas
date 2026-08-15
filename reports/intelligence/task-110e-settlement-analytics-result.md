# TASK-110E Settlement Analytics Result

Bounded APIs cover instrument snapshot, snapshot history, canonical institution holdings, largest increases/decreases, and source-classified foreign settlement. Existing instrument/date and institution/date indexes serve the expected query patterns. Current and change values are distinct; missing fields remain null.

Foreign residency is accepted only as `FOREIGN`, `DOMESTIC`, or `UNKNOWN`; provider names/types are never used to infer it. The foreign endpoint uses the independent `settlement.foreign` capability and stays provider-gated without verified coverage.

Result: **PASS / FOREIGN_PROVIDER_GATED**.
