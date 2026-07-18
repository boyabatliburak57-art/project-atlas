# TASK-070A — Backtest Metrics Remediation

**Bağımlılık:** TASK-070 NO-GO

Eksik annualized return, volatility, Sharpe, Sortino, Calmar, expectancy, benchmark return/excess ve gerçek turnover metriklerini tamamla.

## Kurallar

- Placeholder/sabit değer yok.
- Turnover sabit `0` olmayacak.
- NaN/Infinity yok.
- Yetersiz veri `notEvaluable`.
- Risk-free rate, annualization ve formula version görünür.
- Benchmark aynı cutoff/adjustment/date alignment kullanır.
- Persistence, API ve UI mapping güncellenir.

## T3 Code prompt

```text
TASK-070A görevini uygula.

Önce TASK-070 audit raporunu ve DOC-035'i oku.

Annualized return, volatility, Sharpe, Sortino, Calmar, expectancy, benchmark return ve excess return implementasyonlarını tamamla.

Turnover'ın sabit 0 döndüğü yolu kaldır; gerçek fill notional ve average equity üzerinden versioned formula kullan.

Her metric value/status/reasonCode/observationCount/methodologyVersion taşısın.
NaN/Infinity public veya persistent çıktıya çıkmasın.

DOC-035'teki tüm fixture'ları ekle.
Persistence, summary API ve web mapping'i güncelle.

Unit, fixture, integration, API contract, format, lint, typecheck ve build çalıştır.
Placeholder veya eksik metric kalırsa TASK-070B'ye geçme.
```
