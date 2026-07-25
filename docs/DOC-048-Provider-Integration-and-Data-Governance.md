# DOC-048 — Provider Integration and Data Governance

## Zorunlu kabiliyetler

- Provider-neutral ports ve capability discovery
- Auth/rate-limit/retry taxonomy
- Raw-to-normalized mapping
- source timestamp, available-at, revision ve data cutoff
- lineage, reconciliation ve correction workflow
- provider outage fallback ve provider-switch compatibility

## Veri türleri

- instruments, OHLCV, index/sector membership
- corporate actions, fundamentals, benchmark
- trading calendar ve session metadata

## Kurallar

- Raw provider payload domain/API/UI'ya sızmaz.
- Eksik veri sıfır yapılmaz.
- Corrected data yeni revision oluşturur.
- Restatement geçmişe sızdırılmaz.
- Adjustment çift uygulanmaz.
- Credential repository'de saklanmaz.
- Licensing/redistribution kapsamı metadata ile izlenir.
