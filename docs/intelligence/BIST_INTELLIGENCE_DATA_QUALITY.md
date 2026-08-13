# BIST Intelligence Data Quality

Canonical states are `COMPLETE`, `PARTIAL`, `STALE`, `DELAYED`, `UNRESOLVED_IDENTITY`, `CORRECTED`, `CONFLICTING_SOURCE`, `NOT_EVALUABLE`, and `PROVIDER_UNAVAILABLE`. Missing data is null/absent, never numeric zero.

Reconciliation compares provider-normalized canonical observations and emits an explicit conflict finding. It does not silently choose a provider. Quality and coverage travel with response metadata. Revision history retains corrections and restatements.
