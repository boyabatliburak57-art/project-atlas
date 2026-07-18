# Decision Proposal — Backtesting Policies

Bu belge henüz ADR değildir.

TASK-062 sırasında repository'deki sonraki boş ve benzersiz ADR kimlikleri kullanılarak ayrı kararlar oluşturulmalıdır.

## Execution

Varsayılan:

```text
closed-bar signal
→ next available bar open execution
```

Same-bar close yalnız research mode ve açık uyarıyla desteklenebilir.

## Point-in-time data

Backtest tarihi universe membership, fundamentals publication date, corporate action effective date ve data revision snapshot kullanır.

## Deterministic event ordering

Aynı timestamp'teki event sırası açık ve versioned olmalıdır.

## Cost model

İlk default:

- percentage commission
- minimum commission
- fixed basis point slippage

Cost-free backtest yalnız açık seçim ve uyarıyla çalışır.

## Experiments

İlk optimization bounded grid search ve holdout desteğidir.

Random/Bayesian optimization kapsam dışıdır.

## Bias disclosure

Result survivorship coverage, point-in-time coverage, missing data, same-bar mode ve cost model uyarılarını taşır.
