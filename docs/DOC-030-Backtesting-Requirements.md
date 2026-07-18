# DOC-030 — Backtesting Requirements

**Sürüm:** 1.0  
**Durum:** Uygulamaya hazır  
**Pazar:** Borsa İstanbul payları

## 1. Amaç

Sürümlü teknik stratejileri geçmiş BIST verileri üzerinde deterministik ve tekrar üretilebilir şekilde çalıştırmak.

Backtest sonucu gelecek performans garantisi, yatırım tavsiyesi veya gerçek emir sonucu değildir.

## 2. Girdiler

- strategy revision
- universe definition
- date range
- timeframe
- adjustment mode
- initial capital
- position sizing
- execution policy
- cost model
- risk controls
- benchmark
- data snapshot/cutoff
- engine version

## 3. Strateji bileşenleri

- universe
- entry rule
- exit rule
- optional filter rule
- position sizing
- max concurrent positions
- re-entry policy
- max holding period
- stop loss
- take profit
- trailing stop
- rebalance schedule
- capital allocation

Entry ve exit kuralları Scanner AST'nin versioned ve backtest-safe alt kümesini kullanır.

## 4. No-look-ahead

- kapalı bar sinyali varsayılan
- sinyal barı ile execution barı ayrılır
- indicator warm-up uygulanır
- fundamental publication date kullanılır
- index membership effective dates kullanılır
- restatement geçmişte biliniyormuş gibi uygulanmaz

Varsayılan execution:

```text
closed-bar signal
→ next available bar open
```

## 5. Sermaye ve pozisyon

- fractional share kapalı
- short selling kapalı
- leverage kapalı
- negatif cash kapalı
- lot rounding versioned
- max position weight
- max concurrent positions
- cash reserve

## 6. Pozisyon boyutlandırma

- equal weight
- fixed cash
- fixed portfolio percentage
- volatility target, opsiyonel
- risk per trade, opsiyonel

## 7. İşlem sırası

Aynı barda deterministic sıra:

1. forced exits
2. stop/take-profit exits
3. strategy exits
4. rebalance sells
5. entries

Stable symbol veya explicit score tie-breaker kullanılır.

## 8. Veri eksikliği

Missing bar sıfır getiri sayılmaz ve fill üretmez. Suspension, delisting ve stale data davranışı versioned policy taşır.

## 9. Kurumsal aksiyon

- split ve bonus share pozisyonu düzeltir
- dividend cash/total return policy'ye göre işlenir
- duplicate corporate action uygulanmaz
- delisting liquidation policy versioned olur

## 10. Sonuç metrikleri

- ending equity
- total ve annualized return
- maximum drawdown
- volatility
- Sharpe, Sortino, Calmar
- win rate
- profit factor
- expectancy
- turnover
- exposure
- average holding period
- trade count
- fees
- slippage
- benchmark return

## 11. Reproducibility

Aynı strategy revision, data snapshot, engine version, policy ve parameters aynı sonucu üretir.

## 12. Runtime

- queued
- running
- completed
- failed
- cancelRequested
- cancelled
- expired

Cooperative cancellation, retry-safe checkpoint ve duplicate result prevention zorunludur.

## 13. Güvenlik

- ownership/IDOR
- complexity/date/universe limits
- concurrent run limit
- experiment combination limit
- no eval/SQL/free code
- export rate limit

## 14. Kabul kriterleri

- No-look-ahead fixtures geçer.
- Sonuç deterministiktir.
- Cost/slippage uygulanır.
- Corporate action yapay P&L üretmez.
- Missing bar sıfır sayılmaz.
- Duplicate fill/trade yoktur.
- Cancellation/idempotency testlidir.
