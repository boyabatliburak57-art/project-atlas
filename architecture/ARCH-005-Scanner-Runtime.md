# ARCH-005 — Scanner Runtime Architecture

**Durum:** Uygulamaya hazır

## Bileşenler

```mermaid
flowchart LR
    API[Scanner API] --> APP[Scan Run Application Service]
    APP --> VAL[Rule Validator]
    APP --> PLAN[Execution Planner]
    APP --> RUN[(Scan Run Repository)]
    APP --> Q[Scan Queue]
    Q --> W[Scanner Worker]
    W --> U[Universe Reader]
    W --> M[Market Data Reader]
    W --> I[Indicator Batch Executor]
    W --> E[Scanner Evaluator]
    E --> X[Explanation Builder]
    X --> R[(Scan Result Repository)]
    W --> P[Progress Store]
    API --> P
    API --> R
```

## Run creation transaction

Transaction içinde idempotency, run insert, normalized rule, execution plan, universe snapshot reference ve initial state saklanır. Queue tek doğruluk kaynağı değildir; PostgreSQL run state kaynağıdır.

Queue publish başarısızlığı reconciliation ile tekrar denenebilir. Transactional outbox sonraki ölçülmüş ihtiyaçta değerlendirilebilir.

## Worker batch akışı

```mermaid
sequenceDiagram
    participant W as Worker
    participant DB as PostgreSQL
    participant IND as Indicator Engine
    participant REDIS as Progress Store
    W->>DB: Load run and next batch
    W->>DB: Check cancellation
    W->>DB: Load bars
    W->>IND: Calculate unique indicator requests
    IND-->>W: Indicator results
    W->>W: Evaluate normalized AST
    W->>DB: Upsert results and durable progress
    W->>REDIS: Publish fast progress
```

## Idempotency

Batch identity: `runId + batchIndex + planVersion`. Result unique constraint: `scanRunId + instrumentId`. Retry duplicate result üretmez.

## Cancellation

API DB'de `cancelRequested` işaretler. Worker batch sınırlarında kontrol eder. Terminal state'e geçiş domain state machine tarafından yönetilir.

## Failure isolation

Tek instrument hatası policy'ye göre `notEvaluable` + warning üretebilir. Sistemik veri, registry veya persistence hatası run'ı failed yapar.

## Progress

Redis hızlı progress içindir; terminal state ve güvenilir processed count PostgreSQL'de tutulur. Redis kaybı run sonucunu bozmaz.
