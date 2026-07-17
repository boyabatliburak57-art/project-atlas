# TASK-052 — Market Intelligence Architecture Decisions

**Bağımlılık:** TASK-051

`DECISION-PROPOSAL-Market-Intelligence-Policies.md` içindeki dört kararı repository'deki sonraki boş ADR kimlikleriyle kaydet:

1. Market snapshot read model
2. Chart adjustment ve cutoff policy
3. Fundamentals revision ve ratio versioning
4. Pattern candidate/no-look-ahead semantiği

Kurallar:

- Sabit ADR numarası varsayma.
- Existing ADR'leri yeniden numaralandırma.
- Dosya adı, H1 ve ADR_INDEX uyumlu olsun.
- `pnpm validate:adr` PASS olmadan TASK-053'e geçme.
