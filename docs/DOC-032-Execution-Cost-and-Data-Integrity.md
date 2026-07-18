# DOC-032 — Execution, Cost and Data Integrity Requirements

**Sürüm:** 1.0  
**Durum:** Uygulamaya hazır

## Fill modeli

Varsayılan:

```text
closed-bar signal
→ next available bar open fill
```

Fill:

- requested/filled quantity
- reference/fill price
- slippage
- commission
- fee/tax
- timestamp
- reason

taşır.

## Slippage

İlk model fixed basis points'tir. Alışta fiyatı artırır, satışta azaltır.

## Ücretler

- percentage commission
- minimum commission
- fixed fee
- market tax

Fill sonrası cash tekrar doğrulanır.

## Likidite

Opsiyonel participation limiti:

```text
filledQuantity ≤ barVolume × maxParticipationRate
```

Volume yoksa volume-aware model kullanılamaz.

## Survivorship bias

Bugünkü aktif evren geçmişe uygulanmaz.

- listing/delisting dates
- index membership effective dates
- market status dates

kullanılır.

## Point-in-time fundamentals

- period end
- publication date
- available revision

saklanır. Restatement geçmişe sızdırılmaz.

## Corporate actions

Announcement, ex-date, effective date ve payment date ayrılır. Adjusted price ile position adjustment çift uygulanmaz.

## Missing data

- missing bar sıfır getiri değildir
- stale bar fill üretmeyebilir
- listing öncesi veri yoktur
- delisting sonrası açık policy uygulanır

## Bias testleri

- look-ahead
- survivorship
- restatement leakage
- future index membership
- same-bar fill leakage
- adjustment double application
- delisting omission
- dividend double count

## Kabul kriterleri

- Cost fixtures geçer.
- Same-bar leakage engellenir.
- Historical universe testlidir.
- Publication date testlidir.
- Corporate action double application yoktur.
- Data revision run hash'ini değiştirir.
