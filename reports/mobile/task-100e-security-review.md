# TASK-100E Security Review

Search is bounded, Unicode-normalized, wildcard-escaped, rate-limited and cursor-signed. Private
entities remain owner-scoped. Symbol routes accept only allowlisted symbols. Share contains no token,
user or portfolio data. Company links require HTTPS. Provider payloads and credentials never enter
mobile UI or bundle. Feature visibility is not authorization. Fixtures are development-only,
non-live-labelled and production fail-closed. VoiceOver remains `ACCEPTED_PRODUCT_WAIVER`.
