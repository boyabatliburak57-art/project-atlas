# Portfolio Performance Baseline Guide

Önerilen yapı:

```text
performance/portfolio/
├── fixtures/
├── scenarios/
├── thresholds/
└── runner/

reports/performance/
├── portfolio-baseline.json
└── portfolio-baseline.md
```

Runner warm-up, tekrar, p50/p95/max, threshold değerlendirmesi ve non-zero failure üretmelidir.

Dış provider veya internet kullanılmaz. Fixture deterministik olmalıdır. PostgreSQL/Redis kullanan application path atlanmamalıdır.
