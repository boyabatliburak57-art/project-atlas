# TASK-062 — Backtesting Architecture Decisions

**Bağımlılık:** TASK-061

DECISION-PROPOSAL-Backtesting-Policies ve DOC-030–033 ile ARCH-013–015 belgelerini oku.

Repository'deki sonraki boş ADR kimlikleriyle şu kararları kaydet:

1. Closed-bar signal ve next-open default execution
2. Point-in-time data ve survivorship policy
3. Deterministic event ordering ve reproducibility
4. Default commission/slippage model
5. Bounded grid experiments ve holdout

Sabit ADR numarası varsayma. Existing ADR'leri yeniden numaralandırma.

Dosya adı, H1 ve ADR_INDEX uyumlu olsun.

`pnpm validate:adr`, format ve diff check çalıştır.

ADR failure varsa TASK-063'e geçme.
