# DOC-035 — Backtest Metrics and Benchmark Quality Gates

**Sürüm:** 1.0  
**Durum:** Uygulamaya hazır

## Zorunlu metrikler

- total return
- annualized return
- annualized volatility
- Sharpe ratio
- Sortino ratio
- Calmar ratio
- expectancy
- profit factor
- turnover
- benchmark return
- excess return

Her metrik `value`, `status`, `reasonCode`, `observationCount`, `methodologyVersion` ve `warnings` taşımalıdır.

## Annualized return

```text
(endingEquity / initialCapital) ^ (annualizationDays / elapsedDays) - 1
```

Çok kısa dönem, non-positive sermaye veya geçersiz sonuç açık `notEvaluable` üretir.

## Volatility

```text
stdDev(periodicReturns) × sqrt(periodsPerYear)
```

Return convention, sample/population tercihi ve annualization factor versioned olmalıdır.

## Sharpe

```text
(meanReturn - periodicRiskFreeRate) / stdDev × sqrt(periodsPerYear)
```

Volatility sıfırsa Infinity yerine `notEvaluable`.

## Sortino

```text
(meanReturn - targetPeriodicReturn) / downsideDeviation × sqrt(periodsPerYear)
```

Downside deviation sıfırsa açık status/reason.

## Calmar

```text
annualizedReturn / abs(maximumDrawdown)
```

Drawdown sıfırsa Infinity yasaktır.

## Expectancy

Tercih edilen versioned formül:

```text
sum(netTradePnL) / closedTradeCount
```

Zero closed trade: `notEvaluable`.

## Turnover

Sabit değer değildir.

İlk policy:

```text
sum(abs(fillNotional)) / averagePortfolioEquity
```

One-way/gross ve annualization tercihi methodology içinde görünür olmalıdır. Synthetic corporate-action fills hariç tutulmalıdır.

## Benchmark

Aynı date range, data cutoff, adjustment mode ve trading-day alignment kullanılır.

```text
benchmarkReturn = ending / starting - 1
excessReturn = strategyTotalReturn - benchmarkReturn
```

Ayrı metodoloji olmadan `alpha` adı kullanılmaz.

## Zorunlu fixture'lar

- bilinen annualized return
- bilinen volatility
- Sharpe/Sortino/Calmar
- zero volatility/drawdown
- mixed win/loss expectancy
- zero trades
- bilinen turnover
- fee/slippage etkisi
- benchmark eşit/üstün/zayıf
- missing benchmark
- NaN/Infinity guard

## Kabul

Placeholder yok, turnover gerçek fill/equity verisinden hesaplanıyor, benchmark hizası testli ve methodology persistence/API'de mevcut.
