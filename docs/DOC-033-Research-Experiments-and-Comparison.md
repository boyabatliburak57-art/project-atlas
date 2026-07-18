# DOC-033 — Research Experiments and Comparison

**Sürüm:** 1.0  
**Durum:** Uygulamaya hazır

## Experiment türleri

- single backtest
- grid parameter sweep
- strategy comparison
- universe comparison
- period comparison
- cost-model comparison
- benchmark comparison

## Complexity

```text
combinations × universe size × bars × strategy complexity
```

Backend limitleri combination, symbols, bars, concurrency ve retention üzerinde uygulanır.

## Overfitting uyarıları

- çok deneme
- düşük trade count
- best/median farkı
- out-of-sample bozulma
- yüksek turnover
- cost sensitivity
- parameter instability

## Train/test

- in-sample
- out-of-sample
- holdout

İlk sürümde desteklenir. Walk-forward sonraki sürüme bırakılabilir.

## Karşılaştırma

- return
- drawdown
- Sharpe/Sortino/Calmar
- trade count
- win rate
- profit factor
- turnover
- exposure
- costs
- benchmark excess
- out-of-sample result

Tek metrik otomatik yatırım önerisi üretmez.

## Reproducibility

Experiment strategy revisions, bindings, data snapshot, engine/policies ve result hashes taşır.

## Cancellation

Partial status completed/failed/cancelled combination sayılarını gösterir.

## Export

Summary, trades, equity ve matrix CSV. Formula injection koruması zorunludur.

## Kabul kriterleri

- Combination count doğru.
- Duplicate binding duplicate run üretmez.
- Holdout leakage yoktur.
- Cancellation partial status testlidir.
- Export güvenlidir.
