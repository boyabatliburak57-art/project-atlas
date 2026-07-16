# DOC-023 — Portfolio Performance Quality Gates

**Sürüm:** 1.0  
**Durum:** Uygulamaya hazır

## 1. Amaç

Portfolio, valuation, performance, risk ve CSV işlemlerinin kontrollü fixture ortamında ölçülebilir kabul eşiklerine sahip olmasını sağlar.

Bu eşikler production kapasite garantisi değildir; milestone regresyon kapısıdır.

## 2. Ölçüm meta verisi

Her benchmark; commit SHA, Node/pnpm, CPU, bellek, PostgreSQL/Redis sürümü, fixture boyutu, warm/cold koşulu, tekrar sayısı, p50, p95, max ve error count taşır.

## 3. Zorunlu senaryolar ve ilk eşikler

### PERF-PORT-001 — Ledger replay

- 10.000 posted/reversed transaction
- en az 100 instrument
- deterministic sequence

Kabul:

- p95 ≤ 5 saniye
- duplicate projection = 0
- final position/cash fixture eşleşmesi = 100%

### PERF-PORT-002 — Position valuation

- 1.000 position
- tek cutoff
- complete ve %5 missing-price varyantı

Kabul:

- complete p95 ≤ 3 saniye
- partial p95 ≤ 3.5 saniye
- missing fiyat sıfır kabul edilmez

### PERF-PORT-003 — Performance series

- 5 yıllık günlük valuation serisi
- çoklu cash flow
- TWR ve XIRR

Kabul:

- TWR p95 ≤ 1.5 saniye
- XIRR p95 ≤ 1 saniye
- solver failure kontrollü ve NaN/Infinity = 0

### PERF-PORT-004 — Risk analytics

- 5 yıllık günlük portföy ve benchmark serisi
- volatility, beta, drawdown, VaR, HHI

Kabul:

- tüm zorunlu metrikler p95 ≤ 3 saniye
- deterministic fixture sonucu = 100%
- NaN/Infinity = 0

### PERF-PORT-005 — CSV preview

- 10.000 satır
- valid, invalid ve duplicate karışımı

Kabul:

- p95 ≤ 8 saniye
- memory runaway yok
- error row count doğru
- commit öncesi transaction oluşmaz

### PERF-PORT-006 — Position pagination

- en az 1.000 pozisyon fixture
- 50 kayıt sayfa

Kabul:

- p95 ≤ 500 ms
- missing/duplicate row = 0
- ownership filter uygulanmış

## 4. Threshold yönetimi

Eşik değişikliği ayrı doküman değişikliği, önceki/yeni ölçüm, fixture veya donanım farkı ve gerekçe gerektirir. Başarısız testi geçirmek için görev içinde sessizce yükseltilemez.

## 5. Regresyon

Önceki kabul edilmiş baseline'a göre p95 %25'ten fazla kötüleşirse threshold geçse bile warning üretilir ve milestone raporunda açıklanır.

## 6. CI stratejisi

Her PR:

- küçük ledger fixture
- TWR fixture
- risk fixture
- pagination

Main/nightly veya milestone:

- 10k ledger
- 1k valuation
- 5 yıllık tam seri
- 10k CSV

## 7. GO kapısı

TASK-050 için tüm zorunlu senaryolar ölçülmeli, raporlanmalı ve eşikleri geçmelidir.
