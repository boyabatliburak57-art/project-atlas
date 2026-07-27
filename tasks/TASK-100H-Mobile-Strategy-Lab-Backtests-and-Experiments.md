# TASK-100H — Mobile Strategy Lab, Backtests and Experiments

**Durum:** BLOCKED_BY_TASK-100G  
**Bağımlılıklar:** TASK-100C, TASK-100E, TASK-100G

## Amaç

Versioned strateji, deterministic backtest ve bounded experiment iş akışlarını mobile taşımak.

## Mevcut durum

Strategy domain/API, backtest engine/worker, experiment grid/progress/results ve web Strategy Lab
vardır. Native editor/result visualization yoktur.

## Kapsam

Strategy name/version/universe/timeframe/entry/exit/cost/capital/benchmark/date; full-screen/bottom
sheet condition editor; result metrics; equity/drawdown/heatmap/benchmark/trade markers;
Overview/Trades/Analysis/Settings; experiment grid/combinations/status/comparison and metric sort.

## Kapsam dışı

Live trading, auto-optimization advice, unbounded grids, look-ahead data, mobile engine duplication.

## Bağımlılıklar

Strategy/backtest/experiment APIs/workers, chart system, capability/data-integrity metadata.

## Mimari gereksinimler

Versioned condition AST round-trips unchanged. Execution occurs in shared worker. Results include
strategy/data/cost/methodology versions and cutoff. Progress resumes after app lifecycle changes.

## API gereksinimleri

Owner-scoped strategy/run/experiment resources; idempotent dispatch; cursor trades; bounded grid
validation; signed/expiring exports where applicable.

## UI/UX gereksinimleri

Metrics list includes return/CAGR/Sharpe/Sortino/Calmar/drawdown/expectancy/turnover/trades/
benchmark/excess. “Best” always means selected-metric sort, not recommendation. Warnings and
partial/stale states visible.

## Güvenlik gereksinimleri

Strategy/run/experiment/export IDOR, parameter exhaustion, replay, unsafe formulas, secret/raw data
leak and deep-link authorization tests.

## Accessibility gereksinimleri

Condition groups semantically announced, non-drag alternatives, chart/table summaries, heatmap
labels, progress announcements and reduced motion.

## Unit testleri

AST round-trip, parameter grid bounds, metric formatting/sort semantics, chart transforms and
progress state.

## Integration testleri

Strategy version/create/edit, backtest dispatch/progress/result/trades, experiment compare and
owner isolation.

## Mobile E2E testleri

Create strategy, edit conditions, run/resume backtest, inspect tabs/charts/trades, experiment grid/
progress/metric sort.

## Visual regression testleri

Editor, result tabs, charts/heatmap and experiment states light/dark/device matrix.

## Kabul kriterleri

AST/version drift 0; deterministic fixture mismatch 0; IDOR 0; unbounded combination accepted 0;
recommendation-like “Best” usage 0; previous backtest benchmark regression 0.

## Yasak yöntemler

Engine/domain copy in mobile; client-computed official metrics; unbounded optimization; AI advice;
future-data leakage; hidden cost policy.

## Çıktı raporu

`reports/mobile/task-100h-strategy-backtests.md`, deterministic parity, security and screenshot
coverage.

## Ayrıntılı T3 Code uygulama prompt'u

```text
TASK-100H'yi uygula. Existing versioned strategy AST, deterministic engine, worker and experiment
contracts remain authoritative. Mobile strategy editor, backtest result tabs/charts/trades and
bounded experiment grid/progress/comparison oluştur. Mobile'da engine veya official metrics
hesaplama. Version/data/cost/cutoff ve warnings görünür olsun. “Best” yalnız seçili metriğe göre
sıralama olarak açıklansın. AST roundtrip, deterministic fixtures, IDOR/resource exhaustion,
integration/E2E/visual/a11y ve prior benchmark regressions çalıştır.
```
