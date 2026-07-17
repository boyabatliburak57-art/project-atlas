# DOC-028 — Technical Pattern Detection Requirements

**Sürüm:** 1.0  
**Durum:** Uygulamaya hazır

## 1. Amaç

Fiyat ve hacim serileri üzerinde deterministik, versioned ve açıklanabilir teknik formasyon adayları üretmek.

Pattern sonucu kesin tahmin değil, algoritmik adaydır.

## 2. İlk pattern seti

### Mum formasyonları

- doji
- hammer
- inverted hammer
- bullish engulfing
- bearish engulfing

### Trend ve kırılım adayları

- 20/55 period high breakout
- 20/55 period low breakdown
- golden cross
- death cross
- volume-confirmed breakout

### Geometrik adaylar

- double top candidate
- double bottom candidate
- ascending triangle candidate
- descending triangle candidate

Geometrik pattern'ler `candidate` statüsündedir ve kanıt noktalarıyla döner.

## 3. Input

- ordered closed-bar series
- timeframe
- adjustment mode
- optional volume
- algorithm parameters
- data cutoff

Intrabar pattern ayrı feature flag/policy olmadan çalışmaz.

## 4. Çıktı

Her detection:

- pattern code
- algorithm version
- instrument
- timeframe
- start/end bar
- detectedAt
- status: candidate/confirmed/invalidated
- direction
- confidenceScore, açıklanabilir formül varsa
- evidence points
- breakout level, varsa
- invalidation level, varsa
- volume confirmation
- warnings

## 5. Confidence

Confidence gizli AI skoru değildir.

Kullanılırsa:

- açık bileşenler
- versioned ağırlıklar
- 0–100 ölçeği
- minimum evidence

ile hesaplanır.

## 6. Look-ahead bias yasağı

Detection yalnız detection barına kadar mevcut veriyi kullanır.

Future barlar:

- candidate üretiminde kullanılmaz,
- yalnız sonradan confirmed/invalidated statüsünü güncelleyebilir.

## 7. Deduplication

Aynı pattern instance için:

```text
instrument + timeframe + patternCode + version
+ startBar + keyEvidenceHash
```

kullanılır.

## 8. Scanner entegrasyonu

Pattern operand:

- pattern exists
- pattern confirmed
- confidence GTE
- detected within N bars

şeklinde Scanner AST'ye sonraki görevde bağlanabilir. v0.7 içinde katalog ve read API yeterlidir; AST genişlemesi açık task kapsamına alınırsa version migration gerekir.

## 9. Test gereksinimleri

- synthetic positive fixture
- near-miss negative fixture
- no look-ahead
- duplicate prevention
- adjustment consistency
- missing volume
- short input
- constant series
- algorithm version
- deterministic output

## 10. Kabul kriterleri

- Pattern'ler kanıt noktalarıyla döner.
- Look-ahead testleri geçer.
- Geometrik adaylar kesin pattern olarak sunulmaz.
- Duplicate instance oluşmaz.
- Public çıktıda NaN/Infinity yoktur.
