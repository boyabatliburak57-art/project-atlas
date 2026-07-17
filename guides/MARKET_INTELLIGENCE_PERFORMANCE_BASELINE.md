# Market Intelligence Performance Baseline

## PERF-MKT-001 — Market overview

- full BIST fixture
- index, breadth, sectors, top lists
- real HTTP/application/read-model path

Threshold:

- warm p95 ≤ 500 ms
- cold p95 ≤ 1.200 ms

## PERF-MKT-002 — Rankings

- 650 instruments
- cursor pagination

Threshold:

- p95 ≤ 400 ms
- duplicate/missing = 0

## PERF-MKT-003 — Symbol aggregate

- quote, profile, latest signals and quality meta

Threshold:

- p95 ≤ 700 ms

## PERF-MKT-004 — Chart

- 2 years daily bars
- volume + 6 overlays + corporate action markers

Threshold:

- p95 ≤ 900 ms
- timestamp alignment failure = 0

## PERF-MKT-005 — Fundamentals

- 20 periods + derived ratios

Threshold:

- p95 ≤ 500 ms

## PERF-MKT-006 — Pattern batch

- 650 symbols
- daily timeframe
- initial mandatory pattern set
- real worker/persistence path

Threshold:

- queue-to-terminal p95 ≤ 12 seconds
- duplicate pattern = 0
- look-ahead failure = 0

## Rapor

Her senaryo:

- environment
- fixture
- repeats
- warm/cold
- p50/p95/max
- error count
- query count
- cache hit/miss
- threshold result

taşır.
