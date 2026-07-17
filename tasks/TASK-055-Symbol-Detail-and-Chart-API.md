# TASK-055 — Symbol Detail and Chart API

**Bağımlılık:** TASK-053, mevcut Indicator Engine

DOC-026, ARCH-011, API-007 ve CHART_DATA_CONTRACT'a göre oluştur:

- symbol profile/quote
- chart bars
- adjustment mode
- indicator overlays
- panel outputs
- corporate action markers
- pattern marker port
- user alert/transaction markers with ownership
- cache
- OpenAPI/tests

Zorunlu:

- raw/adjusted cache ayrımı
- timestamp alignment
- indicator version meta
- open/closed bar
- overlay/range limits
- user marker IDOR
- PERF-MKT-003 ve PERF-MKT-004

UI geliştirme.
