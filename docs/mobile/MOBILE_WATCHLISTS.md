# Mobile Watchlists

Watchlists support owner-scoped list/create/rename/delete, symbol add/remove and version-aware
conflict handling. The iOS surface keeps metadata useful when market data is unavailable: symbol and
company remain visible while price fields explicitly show `PROVIDER_REQUIRED`.

The backend summary is authoritative for advancing, declining, unchanged, not-evaluated, cutoff and
partial coverage. Mobile does not download all constituents to recompute a summary. Duplicate symbols
and duplicate submissions are rejected; updates carry `expectedVersion`, and conflicts never silently
overwrite another revision.

Cached lists are read-only offline. Logout and account switch clear owner-scoped cache. Deep links and
push destinations contain opaque IDs only and must pass session, ownership and feature checks before
data is fetched.
