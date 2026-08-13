# Atlas Information Architecture V2

**Status:** `IMPLEMENTED_TASK_110B`
**Detailed design owner:** TASK-110B

## Navigation contract

| Placement     | Contract                    | Purpose                                                              |
| ------------- | --------------------------- | -------------------------------------------------------------------- |
| Primary tab 1 | Home                        | Personalized market brief, Pulse, watchlist and portfolio context    |
| Primary tab 2 | Markets                     | Market, symbol, chart, depth, VIOP and fund discovery                |
| Primary tab 3 | Radar                       | Unified scanners, anomalies, institutional and event discovery       |
| Primary tab 4 | Portfolio                   | Holdings, performance, risk and portfolio-linked research            |
| Primary tab 5 | Research                    | Company, KAP, events, calendars, compare and saved workspaces        |
| Global action | Search                      | Symbols, companies, institutions, funds, events and research objects |
| Global action | Notifications / Smart Inbox | Alerts, disclosures, events and saved-research updates               |
| Profile level | Settings / Account          | Account, security, preferences, provider disclosures and support     |

The primary-tab maximum is five. A generic "More" destination, duplicated feature launchers and an
icon-wall navigation model are prohibited.

## Organization principles

1. Domain hubs organize related capabilities; a feature is not promoted to a primary tab merely
   because it exists.
2. Progressive disclosure shows a concise default and reveals institutional, methodology and raw
   data detail in context.
3. Contextual actions preserve `symbol`, `company`, `institution`, `fund`, `event`, `contract`,
   `interval` and `asOf` when moving between hubs.
4. Search and Smart Inbox are cross-cutting actions, not duplicate screens inside every hub.
5. Provider availability, delay, license and freshness appear at the point of use.
6. Shared empty, loading, stale, delayed, unavailable and restricted states are used across hubs.
7. Research outputs never imitate chat, recommendations, orders or broker workflows.

## Domain-to-hub placement

| Domain family                     | Default hub        | Contextual entries                        |
| --------------------------------- | ------------------ | ----------------------------------------- |
| Market data and market structure  | Markets            | Home, Radar, Symbol Detail                |
| KAP and corporate events          | Research           | Home, Smart Inbox, Company Timeline       |
| Institutional flow and settlement | Markets / Research | Radar, Symbol Detail, Company Timeline    |
| Calendars                         | Research           | Home, Smart Inbox, symbol/company context |
| Company and fundamentals          | Research           | Search, Radar, Symbol Detail              |
| Scanners and anomalies            | Radar              | Home, Company, Events, Backtests          |
| Funds and ownership               | Markets / Research | Company, Compare, Search                  |
| VIOP                              | Markets            | Radar, Calendar, Chart Workspace          |
| Portfolio and risk                | Portfolio          | Home, Company, Smart Inbox                |
| Strategies and backtests          | Research           | Radar, Event Impact Lab, Reports          |

## Implemented route-object contract

The shared feature registry assigns a single canonical owner route to each current and future
capability. Customer hubs filter that registry to implemented, available entries; the development
catalog retains gated future inventory without customer exposure. Typed intents validate payloads
and declare auth, ownership, capability and fallback requirements. Legacy aliases preserve bounded
query parameters and resolve into the canonical tree without changing resource authorization.

The five nested tab stacks preserve safe per-tab state. Global Search, Smart Inbox and Profile use
root-level routes shared by all hubs. See `ATLAS_ROUTE_OWNERSHIP.md`,
`ATLAS_PROGRESSIVE_DISCLOSURE_RULES.md`, `ATLAS_CROSS_MODULE_NAVIGATION.md` and
`../mobile/MOBILE_NAVIGATION_V2.md` for the normative implementation contract.
