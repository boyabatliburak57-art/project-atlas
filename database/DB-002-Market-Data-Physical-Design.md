# DB-002 — Market Data Physical Design

**Sürüm:** 1.0  
**Durum:** Taslak

## 1. Amaç

BIST sembol ana verisi ve OHLCV barları için ilk fiziksel PostgreSQL tasarımını tanımlar.

## 2. Tablolar

### `instruments`

Temel kolonlar:

- `id uuid primary key`
- `symbol varchar`
- `normalized_symbol varchar`
- `name varchar`
- `isin varchar nullable`
- `market_code varchar`
- `currency_code char(3)`
- `status varchar`
- `sector_id uuid nullable`
- `listed_at date nullable`
- `delisted_at date nullable`
- `created_at timestamptz`
- `updated_at timestamptz`

Constraint:

- aktif sembol için normalize edilmiş sembol benzersizliği,
- durum izin listesi.

### `instrument_symbol_history`

- `id uuid`
- `instrument_id uuid`
- `symbol varchar`
- `valid_from date`
- `valid_to date nullable`
- `reason varchar nullable`

### `data_providers`

- `id uuid`
- `code varchar unique`
- `name varchar`
- `status varchar`
- `created_at timestamptz`
- `updated_at timestamptz`

Secret configuration bu tabloda düz metin tutulmaz.

### `provider_instrument_mappings`

- `provider_id uuid`
- `instrument_id uuid`
- `provider_symbol varchar`
- `provider_market varchar nullable`
- `active boolean`
- `metadata jsonb`
- `updated_at timestamptz`

Unique:

- provider + provider_symbol
- provider + instrument, aktif mapping için.

### `price_bars`

- `id bigint generated`
- `instrument_id uuid`
- `provider_id uuid`
- `timeframe varchar`
- `open_time timestamptz`
- `close_time timestamptz`
- `open numeric`
- `high numeric`
- `low numeric`
- `close numeric`
- `volume numeric`
- `is_closed boolean`
- `source_timestamp timestamptz nullable`
- `ingested_at timestamptz`
- `revision integer`
- `quality_status varchar`

Unique önerisi:

```text
instrument_id + provider_id + timeframe + open_time + revision
```

Okuma için aktif revision görünümü veya ayrı `is_current` yaklaşımı fiziksel migration sırasında seçilecektir.

### `data_quality_issues`

- `id uuid`
- `provider_id uuid nullable`
- `instrument_id uuid nullable`
- `timeframe varchar nullable`
- `open_time timestamptz nullable`
- `issue_type varchar`
- `severity varchar`
- `details jsonb`
- `detected_at timestamptz`
- `resolved_at timestamptz nullable`
- `resolution_note text nullable`

### `ingestion_runs`

- `id uuid`
- `provider_id uuid`
- `job_type varchar`
- `status varchar`
- `requested_from timestamptz nullable`
- `requested_to timestamptz nullable`
- `started_at timestamptz`
- `completed_at timestamptz nullable`
- `fetched_count integer`
- `accepted_count integer`
- `rejected_count integer`
- `error_code varchar nullable`
- `metadata jsonb`

## 3. İndeksler

`price_bars`:

- `(instrument_id, timeframe, open_time desc)`
- `(timeframe, open_time desc)`
- `(provider_id, ingested_at desc)`
- quality issue sorguları için uygun kısmi indeks.

`provider_instrument_mappings`:

- `(provider_id, provider_symbol)`
- `(instrument_id, active)`

## 4. Partition

İlk migration'da zorunlu değildir.

Aşağıdakiler ölçüldüğünde range partition değerlendirilebilir:

- tablo büyüklüğü,
- write throughput,
- retention,
- index büyümesi,
- vacuum maliyeti.

Erken partition operasyonel karmaşıklık yaratabilir.

## 5. Numeric hassasiyet

Kesin precision/scale provider örnekleri incelendikten sonra belirlenir.

Temel kural:

- veritabanında float kullanılmaz,
- uygulama boundary'sinde decimal string veya decimal kütüphanesi kullanılır.

## 6. Migration kabul kriterleri

- Foreign key'ler tanımlı.
- Unique constraint'ler duplicate barı engelliyor.
- Zaman kolonları `timestamptz`.
- Decimal alanlar `numeric`.
- Secret saklayan kolon yok.
- Seed işlemi idempotent.
- Migration temiz veritabanında ve mevcut şema üzerinde test ediliyor.
