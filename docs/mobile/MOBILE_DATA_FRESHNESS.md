# Mobile Data Freshness

Atlas distinguishes available, delayed, stale, partial, provider-required, capability-unavailable,
market-closed, not-evaluable and demo states. Server timestamps, exchange timezone, data cutoff,
source timestamp and revision metadata are authoritative. Device time is presentation context only.

Production without credentials fails closed and contains no claim of live or real-time data. A
section may preserve safe cached content while another fails; stale and partial warnings remain
visible. Fixture data is never presented without the demo/non-live label.
