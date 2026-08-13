# Atlas Mobile Navigation

Mobile v1 uses the Navigation V2 contract defined in
[`MOBILE_NAVIGATION_V2.md`](./MOBILE_NAVIGATION_V2.md). Its five primary iPhone tabs are, in fixed
order: **Home, Markets, Radar, Portfolio, Research**. Search and Smart Inbox are global actions;
account and settings are profile-level navigation. There is no `More` or tool-catalog tab.

Each primary tab owns a nested stack so its last safe location is retained while switching tabs.
Logout and user changes clear protected state. Android and tablet remain deferred to v1.1 and are
not production-supported by this contract.

Auth, onboarding, ownership and capability guards run before destination resolution. Deep links
carry only bounded identifiers, never resource content. Legacy Search, Scanner, Watchlist, Alert,
Portfolio, Strategy, Backtest, Report and Settings entries resolve to their V2 canonical owner
without bypassing those guards.

The customer shell exposes only implemented features. Provider-, license- and expansion-gated
destinations remain absent from customer hubs until their capability is genuinely available. The
development registry may inventory them without presenting fake data or active customer cards.
