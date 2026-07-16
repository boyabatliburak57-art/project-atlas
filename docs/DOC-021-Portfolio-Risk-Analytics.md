# DOC-021 — Portfolio Risk Analytics Requirements

**Sürüm:** 1.0  
**Durum:** Uygulamaya hazır

## 1. Amaç

Tarihsel oynaklık, düşüş, piyasa duyarlılığı ve yoğunlaşma riskini açıklanabilir metriklerle sunar. Gelecekteki kaybı garanti etmez.

## 2. Metrikler

### Volatilite

```text
dailyStdDev × sqrt(annualizationFactor)
```

Return convention ve annualization factor versioned policy olmalıdır.

### Beta

```text
covariance(portfolio, benchmark) / variance(benchmark)
```

Tarih hizalaması ve minimum gözlem zorunludur.

### Maksimum düşüş

```text
drawdown = currentValue / runningPeak - 1
```

Peak, trough, recovery ve current drawdown raporlanır.

### Historical VaR

İlk sürüm 95% ve 99%, 1 işlem günü horizon kullanır. Minimum gözlem gerekir. Kesin kayıp tahmini değildir.

### Expected Shortfall

VaR eşiği ötesindeki ortalama kayıp, veri yeterliyse sunulabilir.

### Yoğunlaşma

- En büyük pozisyon
- Top 3/5 ağırlığı
- HHI
- Sektör ağırlıkları
- Nakit kategorisi

## 3. Data quality

Eksik günler sıfır getiri sayılmaz. Forward-fill yalnız açık policy ile uygulanır. Stale/delisted/suspended veriler warning üretir.

## 4. Versioning

Return convention, annualization, quantile, alignment, benchmark ve formula implementation versioned olmalıdır.

## 5. Kabul kriterleri

Volatilite, beta, drawdown, VaR, expected shortfall, HHI, sektör ağırlığı, missing/stale data ve NaN/Infinity guard fixture testleri geçer.
