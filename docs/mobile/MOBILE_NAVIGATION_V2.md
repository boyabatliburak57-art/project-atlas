# Atlas Mobile Navigation V2

## Market Structure extension (TASK-110F2)

`Markets → Piyasa Yapısı` is the single canonical owner for market measures and short-selling research. It preserves five primary tabs, does not add a VBTS root, and uses at most three local tabs: Özet, Tedbirler, Açığa Satış. Symbol, watchlist, and portfolio contexts link back to this owner through compact contextual navigation.

**Status:** `IMPLEMENTED_TASK_110B`  
**Objective:** `MORE_CAPABILITY_LESS_PERCEIVED_COMPLEXITY`

## Primary shell

| Order | Tab       | Question                                  | Customer-visible destinations                                      |
| ----- | --------- | ----------------------------------------- | ------------------------------------------------------------------ |
| 1     | Home      | What needs my attention?                  | Market snapshot, watchlist/portfolio context, active real alerts   |
| 2     | Markets   | What is happening in the market?          | Overview, indices, sectors, symbol detail                          |
| 3     | Radar     | What should I investigate?                | Scanner, saved scans, watchlists, alerts, activity                 |
| 4     | Portfolio | What do I own and how is it behaving?     | Overview, positions, transactions, performance, risk, data quality |
| 5     | Research  | Why did it happen and how has it behaved? | Strategy Lab, backtests/experiments, reports, methodology          |

The first viewport presents no more than seven meaningful information/action groups. Hubs use a
primary focus, recent or personalized context, grouped categories and explicit “see all” links.
They never render an icon wall or a catalog of unavailable tools.

## Global chrome

Primary hub headers use one `AppHeader` contract: context title, Search, Inbox and profile avatar.
Search opens `/search`; Inbox opens `/inbox`; the avatar opens `/profile`. Detail screens use the
native stack back action, entity/title, bounded contextual actions and overflow only where needed.
Market status appears only in market-relevant content, not every header.

## Stack and state behavior

Each tab is a nested Expo Router stack. Switching tabs retains that stack in memory while the
authenticated user remains unchanged. Normal depth is tab → hub/category → feature/detail.
Builder and detail workflows may add a level. Logout and identity change discard protected state;
stale state never replaces a fresh authorization or ownership decision.

## Availability and accessibility

The centralized registry distinguishes `AVAILABLE`, `PROVIDER_REQUIRED`, `LICENSE_REQUIRED`,
`EXTERNAL_CONFIGURATION_REQUIRED`, `COMING_IN_CURRENT_EXPANSION`, `DEFERRED_V1_1` and
`NOT_AVAILABLE`. Only `CUSTOMER` entries with usable current implementations are shown by default.
Tabs, selected state, global actions, headings, feature entries, unavailable state, back and
contextual actions have native accessibility labels/roles.

VoiceOver native manual validation remains `NOT_EXECUTED`; the documented, user-accepted release
gate exception remains in force. Android and tablet remain `DEFERRED_TO_V1_1`.

## Performance and analytics

Hub roots do not preload future modules or fetch hidden-domain data. Route modules stay lazy and
tab switching does not introduce queries or listeners. Allowed events are
`primary_tab_opened`, `hub_section_opened`, `global_search_opened`, `smart_inbox_opened`,
`profile_menu_opened` and `contextual_navigation_used`. Event properties must not include search
queries, private IDs, resource contents, portfolio values or strategy ASTs.
