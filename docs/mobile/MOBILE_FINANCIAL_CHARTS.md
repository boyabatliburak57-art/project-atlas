# Mobile Financial Charts

The chart is a React Native view renderer with no WebView or DOM dependency. It renders candlestick,
line-summary and volume information from ordered OHLCV bars. The pure validation layer rejects
duplicate/out-of-order timestamps and invalid OHLC bounds; missing sessions are not interpolated.

Pan/crosshair uses one bounded selected-index update and memoized summary/transform data. Textual
previous/next controls provide gesture alternatives. The accessibility summary includes range,
first/last/high/low/change, point count and freshness. Indicator selection is capped at six and only
builds typed server overlay requests; indicator domain calculations remain backend-authoritative.
Raw is the safe default. Adjusted modes remain disabled until corporate-action capability exists.
