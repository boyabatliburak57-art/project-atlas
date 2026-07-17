# ARCH-011 — Chart Data and Overlay Runtime

**Durum:** Uygulamaya hazır

```mermaid
flowchart LR
    REQ[Chart Request] --> APP[Chart Application Service]
    APP --> BAR[Market Data Reader]
    APP --> CA[Corporate Actions]
    APP --> IND[Indicator Batch Executor]
    APP --> PAT[Pattern Reader]
    BAR --> MAP[Chart Mapper]
    CA --> MAP
    IND --> MAP
    PAT --> MAP
    MAP --> API[Chart Response]
```

## İlkeler

- Chart application service indicator hesaplarını deduplicate eder.
- Raw/adjusted seri policy aynı request içinde açıkça belirlenir.
- Bar, overlay ve marker timestamps normalize edilir.
- Kullanıcıya özel transaction/alert marker'ları ownership kontrolü sonrası eklenir.
- Cache anahtarı indicator versions ve params hash içerir.
- Maksimum bar/overlay/pattern limiti uygulanır.
