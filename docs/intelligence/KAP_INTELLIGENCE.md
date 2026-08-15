# KAP Intelligence

KAP is implemented as a source `CorporateDisclosure` plus a normalized `MarketEvent`; it is not a news domain. The shared event projection powers the global feed, company history, relevance, timeline, inbox references, alerts, and future point-in-time research. Production remains fail-closed until a licensed provider is configured.

The API exposes bounded cursor feeds, detail, immutable revision history, company history, and symbol history. Raw provider payloads and internal provider identifiers are never returned. Watchlist and portfolio relevance is computed for the authenticated user at query time.
