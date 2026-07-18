# TASK-070B — Experiment Production Worker Wiring

**Bağımlılık:** TASK-070A

Experiment orchestration'ı production BullMQ composition root'una bağla.

## Kapsam

- merkezi queue/job sabitleri
- processor registration
- production DI/bootstrap
- authoritative state'i DB'den yükleme
- child run create/reuse
- progress aggregation
- partial failure
- cancellation propagation
- retry/reconciliation
- terminal-state guard
- metrics/logging

## T3 Code prompt

```text
TASK-070B görevini uygula.

TASK-070 audit raporundaki production experiment worker wiring eksikliğini incele.

Mevcut experiment application/domain kodunu gerçek production BullMQ composition root'una bağla.
Yalnız test module oluşturma.

Producer job name, processor registration, dependencies, child-run orchestration, progress, cancellation, retry ve stuck-job reconciliation akışlarını tamamla.

Aynı binding duplicate child run üretmemeli.
Run reuse yalnız aynı snapshot ve policy hash ile yapılmalı.

Gerçek PostgreSQL/Redis ile queue → experiment processor → child runs → aggregate result integration testi ekle.
Production bootstrap'ta processor registration'ı ayrıca doğrula.

Format, lint, typecheck, worker integration, smoke ve build çalıştır.
```
