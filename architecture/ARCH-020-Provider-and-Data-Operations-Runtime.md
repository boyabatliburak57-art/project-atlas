# ARCH-020 — Provider and Data Operations Runtime

```text
Provider Adapter → Ingestion → Raw-safe Boundary → Normalization
→ Validation → Revision/Reconciliation → Normalized Store
→ Read Models → Quality Metrics/Correction Operations
```

Bileşenler: Provider Registry, Capability Resolver, Scheduler, Normalizer, Reconciliation Engine, Data Quality Evaluator, Correction Workflow ve Provider Health Read Model.

PostgreSQL normalized truth, Redis optimization only; replay idempotent ve revision evidence immutable olmalıdır.
