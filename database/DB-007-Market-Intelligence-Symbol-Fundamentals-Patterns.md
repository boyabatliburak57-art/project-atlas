# DB-007 — Market Intelligence, Fundamentals and Pattern Persistence

**Sürüm:** 1.0  
**Durum:** Uygulamaya hazır

## Market read models

### `market_overview_snapshots`

- market_code
- timeframe
- generation_id
- policy_version
- data_cutoff_at
- status
- payload jsonb
- excluded_count
- created_at

### `sector_market_snapshots`

- generation_id
- sector_id
- data_cutoff_at
- policy_version
- payload jsonb

### `market_rank_snapshots`

- generation_id
- ranking_type
- instrument_id
- rank
- sort_value numeric
- payload jsonb

## Fundamentals

### `fundamental_statement_snapshots`

- id uuid
- instrument_id
- provider_id
- statement_type
- fiscal_year
- fiscal_period
- period_start/end
- currency_code
- unit_scale
- provider_revision
- published_at
- source_timestamp
- normalized_payload jsonb
- quality_status
- ingested_at

Unique:

```text
instrument + provider + statement_type
+ fiscal_year + fiscal_period + provider_revision
```

### `fundamental_metric_snapshots`

- statement_snapshot_id
- metric_code
- value numeric nullable
- status
- metadata jsonb

### `fundamental_ratio_snapshots`

- instrument_id
- ratio_code
- formula_version
- fiscal_period_reference
- market_data_cutoff_at nullable
- value numeric nullable
- status
- reason_code nullable
- inputs jsonb
- created_at

## Patterns

### `pattern_definitions`

- code
- version
- category
- parameter_schema jsonb
- status

### `pattern_instances`

- id uuid
- instrument_id
- timeframe
- adjustment_mode
- pattern_code
- pattern_version
- state
- direction
- start_time
- end_time
- detected_at
- confirmed_at nullable
- invalidated_at nullable
- data_cutoff_at
- confidence numeric nullable
- evidence jsonb
- deduplication_key
- warnings jsonb
- created_at
- updated_at

Unique:

```text
deduplication_key
```

## Indexler

- market snapshot cutoff/generation
- ranking type + generation + rank
- fundamental instrument + fiscal period
- ratio instrument + ratio + period
- pattern instrument + timeframe + detected_at desc
- pattern code/state/detected_at
