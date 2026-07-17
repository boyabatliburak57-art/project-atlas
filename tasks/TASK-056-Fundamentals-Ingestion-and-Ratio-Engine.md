# TASK-056 — Fundamentals Ingestion and Ratio Engine

**Bağımlılık:** TASK-053

DOC-027'ye göre:

- provider abstraction/capabilities
- fake fundamentals provider
- normalized statement snapshots
- provider revision/restatement
- metric extraction
- TTM builder
- versioned ratio formulas
- quality statuses
- API endpoints
- fixtures/integration tests

İlk oran seti DOC-027 ile uyumlu olsun.

Zorunlu:

- missing != 0
- denominator policies
- unit/currency normalization
- restatement preservation
- TTM sufficient/insufficient
- NaN/Infinity yok
- market cutoff ratios
- PERF-MKT-005

Gerçek provider secret veya scraping ekleme.
