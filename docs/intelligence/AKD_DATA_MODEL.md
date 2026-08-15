# AKD Data Model

`institutional_flow_observations` stores immutable provider revisions keyed by provider, instrument, institution, trade date, session, and provider revision. Provider identifiers are resolved through canonical external mappings before persistence.

Supported source fields are buy/sell/net quantity and value, average prices, total volume, market share, rank, currency, timestamps, coverage, and provenance. Missing source values remain missing. A net metric may be derived with exact decimal arithmetic only when both sides exist, and is marked `DERIVED_METRIC`; a supplied net remains `SOURCE_METRIC`. A mismatch is a source-conflict finding rather than a silent replacement.

1D, 5D, and 20D select the latest actual observed trading sessions. They never multiply a daily value or interpolate a missing session. Custom ranges are bounded to one year.
