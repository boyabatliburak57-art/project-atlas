# ARCH-012 — Pattern Detection Runtime

**Durum:** Uygulamaya hazır

```mermaid
flowchart LR
    BAR[Closed Bars] --> R[Pattern Registry]
    R --> E[Pattern Executor]
    E --> V[Evidence Validator]
    V --> D[Deduplicator]
    D --> P[(Pattern Instances)]
    P --> API[Pattern API]
    P --> CHART[Chart Markers]
```

## İlkeler

- Pattern definitions saf ve versioned'dır.
- Worker yalnız closed-bar eventlerinde ilgili timeframe'i değerlendirir.
- Detection ve confirmation ayrı state transition'lardır.
- Future data candidate creation'da kullanılamaz.
- Evidence points ve parametreler persistence içinde versionlanır.
- Algorithm error tek symbol/timeframe'i notEvaluable yapabilir; sistemik hata retry edilir.
