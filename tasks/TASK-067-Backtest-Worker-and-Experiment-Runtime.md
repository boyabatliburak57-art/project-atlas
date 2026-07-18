# TASK-067 — Backtest Worker and Experiment Runtime

**Bağımlılık:** TASK-063, TASK-066

Oluştur:

- run application service
- idempotency
- reliable enqueue
- snapshot resolver
- BullMQ processor
- checkpoint/retry
- result persistence
- progress
- cancellation
- metrics/logs
- grid combination generator
- run dedup/reuse
- experiment partial failure/cancel

Kabul:

- queue-to-result E2E
- retry duplicate fill/result yok
- terminal state doğru
- cancellation cooperative
- Redis loss result loss değil
- grid count deterministic
- duplicate binding run yok
- partial experiment status
