# PASS — TASK-050B Watchlist Market Summary Performance Remediation

## Scope and baseline evidence

The TASK-040 GO baseline recorded PERF-AWN-005 with the 500-instrument / two-bar fixture at p50 399.13 ms, p95 636.27 ms and max 636.27 ms. The TASK-050 audit reproduced the regression twice at p95 975.93 ms and 1,193.12 ms with the unchanged p95 ≤ 750 ms threshold.

Repository inspection also found that the old benchmark measured one database adapter query directly. It did not exercise the required HTTP, authentication, ownership, validation, application, DTO mapping and serialization path. TASK-050B corrects the gate so PERF-AWN-005 now traverses the real `GET /api/v1/watchlists/{id}/market-summary` endpoint and fails non-zero when the unchanged threshold or response invariants fail.

## Remediation

- Replaced application-memory pagination of the full watchlist aggregate with PostgreSQL keyset pagination over the existing `watchlist_items_watchlist_sort_idx` index (`watchlist_id`, `sort_order`, `id`).
- Ownership and deleted-state checks remain before market-data enrichment. An unauthorized request cannot invoke enrichment.
- The page query selects only owner/status plus item id, instrument id and sort order. Notes and tags are not loaded.
- Replaced the per-instrument correlated active-alert count with one page-bounded grouped CTE. Instrument alerts and watchlist alerts retain distinct-alert semantics.
- Instrument metadata, canonical closed daily bars, stale/data-cutoff inputs and active alert count remain in the response contract.
- No cache was introduced, so no artificial pre-warm or invalidation dependency exists.

## Query and phase profile

The profile covers one complete 500-row traversal using five 100-row pages.

| Phase                             |                                   Before |                            After | Finding                                                                                                    |
| --------------------------------- | ---------------------------------------: | -------------------------------: | ---------------------------------------------------------------------------------------------------------- |
| Ownership + watchlist item access |                               15 queries |                        5 queries | Before: watchlist, all items and all tags on every page. After: one ownership-aware keyset query per page. |
| Instrument lookup                 |         Included in 5 enrichment queries | Included in 5 enrichment queries | Bounded page lookup; no item-level query.                                                                  |
| Market-data lookup                |         Included in 5 enrichment queries | Included in 5 enrichment queries | Canonical bar lookup is page-batched and cutoff-aware.                                                     |
| Active alert count                |  500 correlated executions per traversal |      5 grouped page calculations | No item-level alert query remains.                                                                         |
| Total SQL statements              |                                       20 |                               10 | Five item/ownership queries plus five enrichment queries.                                                  |
| Application pagination            | Full 500-item sort/filter/slice per page |                  Database keyset | Memory pagination removed.                                                                                 |
| DTO mapping and serialization     |                        Per returned page |                Per returned page | Response fields and pagination metadata unchanged.                                                         |
| Cache                             |               Disabled; hits 0, misses 0 |       Disabled; hits 0, misses 0 | Three startup/warm-up traversals are excluded; ten traversals are measured.                                |

The optimized enrichment query performs instrument lookup, market-bar aggregation and active-alert aggregation in one bounded SQL plan. Consequently their database duration is observed as one enrichment phase rather than three network round trips. End-to-end application duration is the HTTP benchmark duration and includes all ten SQL statements, application mapping and JSON serialization.

No missing index was found for the remediated access patterns: `watchlist_items_watchlist_sort_idx`, `price_bars_instrument_timeframe_open_time_idx`, `alerts_owner_status_updated_idx`, `alert_revisions_instrument_timeframe_idx` and `alert_revisions_watchlist_idx` cover the relevant predicates. No migration was added.

## Before and after

| Measurement                 | Path                          |       p50 ms |   p95 ms |       Max ms | Query count | Result |
| --------------------------- | ----------------------------- | -----------: | -------: | -----------: | ----------: | ------ |
| TASK-040 GO                 | Historical adapter baseline   |       399.13 |   636.27 |       636.27 |           1 | PASS   |
| TASK-050 run 1              | Historical adapter regression | Not retained |   975.93 | Not retained |           1 | FAIL   |
| TASK-050 run 2              | Historical adapter regression | Not retained | 1,193.12 | Not retained |           1 | FAIL   |
| TASK-050B independent run 1 | Real API, 500 rows            |        49.62 |   127.02 |       127.02 |          10 | PASS   |
| TASK-050B independent run 2 | Real API, 500 rows            |        41.28 |    87.52 |        87.52 |          10 | PASS   |

Both independent TASK-050B runs used clean PostgreSQL and Redis volumes, the same 500 instruments, two closed bars per instrument, 1,000 active alerts, endpoint, ownership enforcement, enrichment fields, stale/data-cutoff policy, three excluded warm-up traversals and ten measured traversals. Each returned 500 unique rows, zero duplicate rows and zero errors.

Threshold: **p95 ≤ 750 ms**. Both runs: **PASS**.

## Verification

- `pnpm perf:alerts` — PASS, independent run 1; PERF-AWN-005 p95 127.02 ms.
- `pnpm perf:alerts` — PASS, independent run 2; PERF-AWN-005 p95 87.52 ms.
- Watchlist API integration including ownership/IDOR and market-summary contract — PASS, 5/5.
- Watchlist/alerts/notifications Playwright flow — PASS, 2/2.
- API and worker lint — PASS.
- API and worker typecheck — PASS.
- API and worker production build — PASS.
- Repository format check — PASS.

The canonical machine-readable and Markdown performance reports contain the second independent run at `reports/performance/alerts-watchlists-baseline.json` and `reports/performance/alerts-watchlists-baseline.md`.
