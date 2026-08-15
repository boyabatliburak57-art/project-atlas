# Institution Identity

Provider institution identifiers are external references, never Atlas IDs. Resolution is provider + external ID + validity time → canonical institution UUID. The canonical registry supports brokerage, custodian, fund manager, fund, foreign custodian, and other types plus validity windows, aliases, renames, mergers, and inactive state.

Only approved resolved mappings enter observations. Fuzzy names do not create entities. Missing, ambiguous, or unapproved mappings fail with `UNRESOLVED_IDENTITY` and remain available for controlled review without polluting the canonical registry.
