# Mobile v1 Visual Coverage Matrix

Audit date: `2026-08-11`

| Screen group              | Native baselines | Covered states                            | Data provenance                | Status |
| ------------------------- | ---------------: | ----------------------------------------- | ------------------------------ | ------ |
| Welcome/onboarding        |          Present | default, validation, large type           | deterministic non-user fixture | PASS   |
| Market/search/symbol      |          Present | provider, partial, chart, indicators      | `DEMO_UI_FIXTURE`              | PASS   |
| Scanner/watchlists/alerts |          Present | builder, progress, results, alerts        | `DEMO_UI_FIXTURE`              | PASS   |
| Portfolio/risk            |          Present | forms, performance, risk, privacy         | `DEMO_UI_FIXTURE`              | PASS   |
| Strategy/backtests        |          Present | builder, curves, metrics, trades          | `DEMO_UI_FIXTURE`              | PASS   |
| Reports/help/settings     |          Present | lifecycle, help, support, settings        | `DEMO_UI_FIXTURE`              | PASS   |
| Offline/native security   |          Present | lock, cover, cache, file/deep-link errors | deterministic non-user fixture | PASS   |
| Accessibility QA          |               12 | Dynamic Type, privacy, Reduced Motion     | deterministic non-user fixture | PASS   |

Native baselines: `156`  
Missing: `0`  
Unexpected: `0`  
Differences: `0`  
Metadata errors: `0`  
Normal-run baseline mutation: `0`

Fixtures prove rendering states, not provider availability. Production composition is independently covered by TASK-100L native flows.
