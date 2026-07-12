# Indicator Fixture Guide

## Fixture dizini

```text
packages/domain/src/indicators/fixtures/
├── common/
├── sma/
├── ema/
├── rsi/
└── macd/
```

## Örnek şema

```json
{
  "indicator": { "code": "RSI", "version": 1 },
  "parameters": { "period": 14 },
  "input": { "close": [] },
  "expected": { "value": [] },
  "tolerance": 0.000001,
  "firstValidIndex": 14,
  "notes": "Wilder smoothing"
}
```

## Kurallar

- Expected değer test sırasında aynı implementasyonla üretilmez.
- Kaynak veya matematiksel gerekçe belirtilir.
- Sonuç input ile aynı uzunluktadır.
- Warm-up `null` ile gösterilir.
- NaN JSON'a yazılmaz.
- Tolerans gerekçelendirilir.
- Seed yöntemi notlarda belirtilir.
