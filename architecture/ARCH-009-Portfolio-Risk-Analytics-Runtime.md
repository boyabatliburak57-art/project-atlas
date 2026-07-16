# ARCH-009 — Portfolio Risk Analytics Runtime

**Durum:** Uygulamaya hazır

```mermaid
flowchart LR
    SNAP[Valuation Series] --> RET[Return Builder]
    BENCH[Benchmark Bars] --> ALIGN[Series Aligner]
    RET --> ALIGN
    ALIGN --> VOL[Volatility]
    ALIGN --> BETA[Beta/Correlation]
    RET --> DD[Drawdown]
    RET --> VAR[Historical VaR/ES]
    POS[Position Weights] --> CONC[Concentration]
    VOL --> RES[Risk Snapshot]
    BETA --> RES
    DD --> RES
    VAR --> RES
    CONC --> RES
```

Risk matematiği saf fonksiyonlarda tutulur.

Snapshot anahtarı:

```text
portfolioId + ledgerVersion + valuationSeriesVersion + analysisRange
+ benchmark + riskPolicyVersion + dataCutoff
```

Her metrik value, status, reason, observationCount ve methodologyVersion taşır. Bir metrik hesaplanamıyorsa tüm ekran düşmez.
