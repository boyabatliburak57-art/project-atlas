# Atlas Mobile Navigation

BottomNavigation is the mobile v1 production navigation for the supported iPhone 17 profile. Android BottomNavigation validation and NavigationRail
is an experimental mobile v1.1 candidate, is not v1 release-gated, and does not establish tablet
production support.

Phone: Home, Markets, Search, Portfolio, More bottom tabs. Android and tablet widths are v1.1 deferred; tablet widths at 768px use an experimental rail;
1024px supports sidebar/split layouts. Width, not device model, selects layout.

Auth, onboarding, role and backend capability guards precede destination resolution. Deep links
carry only validated IDs and never resource payloads. Watchlists/alerts have Markets and More
entries; Scanner is a Search entry. Admin is hidden and rejected without server-authoritative role.

Feature shell routes cover welcome, market overview, symbol, scanner, watchlists/alerts,
portfolio/risk, strategy/backtest and reports/help/settings. They are explicitly NOT_IMPLEMENTED.
