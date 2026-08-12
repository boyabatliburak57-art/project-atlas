# Mobile Backtest Metrics

The UI renders backend metric envelopes containing value, status, reason code, observation count, methodology version and cutoff. Supported evidence covers total and annualized return, annualized volatility, Sharpe, Sortino, maximum drawdown, Calmar, expectancy, profit factor, turnover, fees, slippage, benchmark and excess return.

The authoritative policy uses 252 observations for volatility annualization, explicit zero annual risk-free rate, explicit zero downside target, and gross fill notional divided by average equity for turnover. Synthetic corporate-action fills are excluded. Missing metrics render `NOT_EVALUABLE`; they never render as zero, NaN, or Infinity.
