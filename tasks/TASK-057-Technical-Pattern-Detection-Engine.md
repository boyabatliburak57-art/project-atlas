# TASK-057 — Technical Pattern Detection Engine

**Bağımlılık:** TASK-053, Market Data ve Indicator Engine

DOC-028 ve ARCH-012'ye göre framework bağımsız, versioned pattern registry/executor oluştur.

İlk mandatory set:

- doji
- hammer
- bullish/bearish engulfing
- 20/55 high breakout
- 20/55 low breakdown
- golden/death cross
- volume-confirmed breakout
- double top/bottom candidate
- ascending/descending triangle candidate

Kapsam:

- definition/parameter schema
- evidence points
- candidate/confirmed/invalidated
- no-look-ahead tests
- dedup
- worker closed-bar integration
- persistence
- catalog/read API
- chart markers
- fixtures
- PERF-MKT-006

Geometrik pattern'leri kesin tahmin olarak etiketleme.
