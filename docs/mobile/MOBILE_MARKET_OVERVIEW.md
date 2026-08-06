# Mobile Market Overview

The iOS Home and Markets surfaces consume the existing versioned market snapshot, breadth, sector
and server-ranked cursor endpoints. Every section has independent loading, partial, stale,
unavailable and retry semantics. Calendar/session status is server-authoritative; device time is
never used to infer whether BIST is open. Provider absence renders `ProviderRequiredState`, never a
zero or fixture quote. Watchlists/alerts and portfolio cards remain TASK-100F/TASK-100G placeholders.

Query identity includes market, timeframe, locale, timezone and capability revision. Foreground and
pull refresh cancel superseded requests. Data cutoff, universe, evaluated/excluded counts and
methodology remain visible. Deterministic evidence data is development-only and visibly marked
`DEMO_UI_FIXTURE · NOT_LIVE_MARKET_DATA`.
