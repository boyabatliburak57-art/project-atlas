# Mobile Performance Budgets

Performance is release-gated on iPhone 17 / iOS 26.5 using production-like builds and deterministic, non-user fixtures. Existing accepted feature thresholds remain authoritative; TASK-100K does not raise budgets to make a regression pass.

Every benchmark records build mode, candidate revision, fixture volume, cold/warm state, run count, p50/p95 where meaningful, peak or delta memory and result. Covered paths include launch/session bootstrap, Home, search, symbol/chart, scanner/results, watchlist/alerts, portfolio positions and transactions, portfolio charts, backtest metrics/trades, reports and settings.

Cursor lists are validated for stable order, zero duplicates, zero omissions and no cursor loop. Chart audits cover bounded series, interaction state, listener cleanup and retained arrays. Lifecycle resource checks repeat background/foreground, route, offline/online, app-lock and file/share cycles. A local benchmark is regression evidence only; it is not staging or production capacity evidence.
