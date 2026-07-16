# DOC-020 — Portfolio Valuation and Performance Requirements

**Sürüm:** 1.0  
**Durum:** Uygulamaya hazır

## 1. Değerleme

Her değerleme `valuationAt`, `dataCutoffAt`, fiyat politikası, stale durumu ve eksik fiyat uyarısı taşır.

Varsayılan fiyat son kullanılabilir kapalı günlük bar kapanışıdır. Intraday değer yalnız preview olabilir.

```text
positionMarketValue = quantity × selectedMarketPrice
portfolioValue = cashBalance + sum(positionMarketValue)
```

Eksik fiyat sıfır kabul edilmez; snapshot `partial` veya `notEvaluable` olur.

## 2. Kâr/zarar

```text
unrealizedPnL = positionMarketValue - remainingQuantity × averageCost
```

Gerçekleşen P&L; satış, fee, tax ve temettü hareketlerinden türetilir.

## 3. Zaman ağırlıklı getiri

Dış nakit akışlarının etkisini ayırır.

```text
TWR = product(1 + subperiodReturn) - 1
```

## 4. Para ağırlıklı getiri

XIRR/MWR düzensiz nakit akışlarını kullanır. Solver tolerans ve maksimum iterasyon taşır. Çözümsüz veya çoklu sonuçta açık `notEvaluable` döner.

## 5. Benchmark

BIST 100, BIST 30 veya desteklenen seçili endeks; aynı tarih aralığı, para birimi ve cutoff ile karşılaştırılır.

## 6. Getiri dönemleri

Today, 1W, 1M, 3M, YTD, 1Y, since inception ve custom range.

## 7. Corporate action etkisi

Split/bonus share yapay P&L üretmez. Temettü total return içinde dahil edilebilir. Price return ve total return ayrılır.

## 8. Rebuild

Geçmiş tarihli işlem, reversal, corporate action veya fiyat revizyonu rebuild tetikler. Rebuild idempotent olmalıdır.

## 9. Cache

```text
portfolioId + ledgerVersion + valuationDate + dataCutoff + policyVersion
```

## 10. Kabul kriterleri

- Snapshot tek cutoff kullanır.
- TWR fixture testlidir.
- XIRR convergence/failure testlidir.
- Split yapay P&L üretmez.
- Benchmark hizalaması testlidir.
- Rebuild aynı sonucu üretir.
