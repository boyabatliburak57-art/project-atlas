# DB-003 — Indicator and Scanner Schema

**Sürüm:** 1.0  
**Durum:** Taslak

## indicator_definitions

- id uuid
- code varchar
- version integer
- name varchar
- category varchar
- parameter_schema jsonb
- output_schema jsonb
- status varchar
- created_at timestamptz

Unique: `code + version`

Hesaplama kodu veritabanında tutulmaz.

## scan_categories

- id uuid
- code varchar unique
- name varchar
- description text
- parent_id uuid nullable
- sort_order integer
- active boolean

## saved_scans

- id uuid
- owner_user_id uuid
- name varchar
- description text nullable
- visibility varchar
- status varchar
- current_revision integer
- created_at timestamptz
- updated_at timestamptz
- deleted_at timestamptz nullable

## saved_scan_revisions

- id uuid
- saved_scan_id uuid
- revision integer
- rule_version integer
- rule_ast jsonb
- complexity_score numeric nullable
- created_by uuid
- created_at timestamptz

Unique: `saved_scan_id + revision`

## preset_scans ve revisions

Preset scan da revision'lı saklanır. Published revision geçmiş run'larla ilişkilendirilebilir.

## scan_runs

- id uuid
- source_type varchar
- source_id uuid nullable
- source_revision integer nullable
- requested_by uuid
- status varchar
- execution_mode varchar
- plan_version integer
- rule_version integer
- normalized_rule_ast jsonb
- universe_snapshot jsonb
- complexity_score numeric
- data_cutoff_at timestamptz
- queued_at timestamptz
- started_at timestamptz nullable
- completed_at timestamptz nullable
- expires_at timestamptz nullable
- matched_count integer
- processed_count integer
- error_code varchar nullable
- error_details jsonb nullable

## scan_results

- id bigint
- scan_run_id uuid
- instrument_id uuid
- rank integer nullable
- status varchar
- computed_values jsonb
- explanation jsonb
- warnings jsonb
- created_at timestamptz

Unique: `scan_run_id + instrument_id`

## scan_run_events

State transition audit için kullanılır.

## İndeksler

- saved_scans(owner_user_id, status, updated_at desc)
- scan_runs(requested_by, queued_at desc)
- scan_runs(status, queued_at)
- scan_results(scan_run_id, rank)
- scan_results(instrument_id, created_at desc)

## Retention

Saved/preset revision kalıcıdır. Scan run ve result saklama süresi ürün planına göre belirlenebilir. Progress kalıcı sonuç değildir.
