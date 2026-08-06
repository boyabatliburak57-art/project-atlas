# Atlas Mobile Component Catalog

`@atlas/mobile-ui` provides typography, actions, cards, inputs, financial values, rows, states,
responsive layout and chart accessibility contracts. `/component-catalog` is development-only.

Catalog fixtures must display `DEMO_UI_FIXTURE · NOT_LIVE_MARKET_DATA`; they are never provider or
feature evidence. Add behavior and accessibility assertions for every variant. Do not use
snapshots as the sole test, direct hex values in feature code, feature-specific sheets, manual
financial `toFixed`, or ScrollView for large financial lists.
