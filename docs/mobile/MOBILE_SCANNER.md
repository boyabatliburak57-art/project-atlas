# Mobile Scanner

The iOS scanner uses the backend-owned, versioned scanner AST. Mobile exposes only catalog fields
and operators, caps nesting at four levels and conditions at 25, validates numeric bounds, and never
accepts SQL or executable expressions. Editing creates a new immutable revision; historical runs
retain their original revision.

Saved scans, presets, builder, progress, cancellation, cursor-paginated results and history are
separate states. Run submission is idempotent, polling is bounded and stops at terminal state, and
background polling is suspended. Results explain matched condition, observed value, threshold,
evaluation time, cutoff and methodology without investment advice.

Provider capability is server-authoritative. Without credentials production permits scan metadata
management but fails execution closed with `PROVIDER_REQUIRED`; it never manufactures results.
Deterministic UI evidence is compiled into development/test only and is marked
`DEMO_UI_FIXTURE · NOT_LIVE_MARKET_DATA · TEST_ONLY`.

Ownership is rechecked for saved scans, revisions, runs and results. Offline mutations are blocked,
telemetry excludes names and AST payloads, and list/history/result pagination remains server cursor
based.
