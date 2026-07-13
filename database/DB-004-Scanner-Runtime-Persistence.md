# DB-004 — Scanner Runtime Persistence

**Sürüm:** 1.0  
**Durum:** Uygulamaya hazır

## 1. Scan run

`scan_runs.status`: queued, running, completed, failed, cancel_requested, cancelled, expired.

Ek alanlar:

- idempotency_key_hash
- request_hash
- progress_total
- progress_processed
- not_evaluable_count
- warning_count
- cancel_requested_at
- cancelled_at
- timeout_at
- expires_at
- retention_policy

Unique: `requested_by + idempotency_key_hash`.

## 2. Scan run batches

`scan_run_batches`:

- id
- scan_run_id
- batch_index
- status
- instrument_ids veya snapshot segment reference
- attempt
- timestamps
- error_code
- processed/matched/not_evaluable counts

Unique: `scan_run_id + batch_index`.

## 3. Results

`scan_results` ek alanları:

- data_cutoff_at
- matched_at
- source_batch_index
- result_version

Unique: `scan_run_id + instrument_id`.

## 4. Saved scan tags

`saved_scan_tags(saved_scan_id, tag)` unique olmalıdır.

## 5. Optimistic locking

Transaction içinde expected current revision kontrol edilir, yeni revision insert edilir ve parent current revision güncellenir. Eski expected revision conflict üretir.

## 6. Preset publication

Draft/review/published/archive metadata, published_by ve published_at tutulur. Aynı preset için tek aktif published revision yaklaşımı uygulanır.

## 7. Retention

Terminal run expiry index'i ve cleanup job için `expires_at` partial index tasarlanır. Redis progress kalıcı kayıt değildir.
