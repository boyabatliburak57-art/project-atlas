# Mobile Backtest Reproducibility

Completed results expose strategy ID/revision, engine and methodology versions, dataset and benchmark revisions, universe snapshot, corporate-action mode, commission/slippage models, initial capital, optional seed and cutoff.

The backend enforces point-in-time universe membership, fundamentals `availableAt`, restatement policy, historical sessions, delisted coverage and corporate-action timing. Benchmark alignment uses exact date intersection without forward-fill. Mobile presents this evidence and never reimplements it.
