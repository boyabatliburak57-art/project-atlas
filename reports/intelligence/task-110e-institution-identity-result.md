# TASK-110E Institution Identity Result

- Canonical model: reused `intelligence_institutions` and external identity mappings.
- Provider institution IDs exposed as canonical IDs: 0.
- Resolution key: provider + external ID + validity time + approved mapping state.
- Alias/rename/inactive validity: supported by canonical validity and external-reference history.
- Fuzzy auto-creation: prohibited.
- Unresolved behavior: `UNRESOLVED_IDENTITY`, record rejected from canonical persistence.
- Incorrect mappings observed in deterministic tests: 0.

Result: **PASS**.
