# Short-Selling Data Model

Restriction and activity have separate semantics:

- `SHORT_SELL_RESTRICTION` is a `MarketMeasure` effective period.
- `ShortSellingActivity` is a revisioned observation keyed by provider/source activity ID/revision, with instrument, `tradeDate`, optional session, quantity, value, share of turnover, cutoff, `availableAt`, provenance, quality, and license.

Quantity, value, and turnover share are optional because providers differ, but at least one must exist. Numeric values cannot be negative and turnover share must be within 0–1. No activity row is synthesized when the provider is unavailable or data is missing. API delivery is capability and license gated.
