# DOC-019 — Portfolio and Transaction Requirements

**Sürüm:** 1.0  
**Durum:** Uygulamaya hazır  
**Pazar kapsamı:** Borsa İstanbul payları

## 1. Amaç

Kullanıcının bir veya daha fazla portföy oluşturmasını, işlemlerini manuel veya CSV ile kaydetmesini ve pozisyonlarını yeniden üretilebilir bir hareket defteri üzerinden izleyebilmesini sağlar.

## 2. Ürün sınırı

Project Atlas portföy modülü kişisel analiz aracıdır. Aracı kurum mutabakatı, otomatik emir, resmî muhasebe, vergi hesabı ve yatırım danışmanlığı yapmaz.

## 3. Portföy

Temel alanlar: kullanıcı, ad, açıklama, raporlama para birimi, varsayılan benchmark, durum, oluşturulma/güncellenme ve soft delete zamanı.

İlk sürüm raporlama para birimi TRY'dir.

## 4. İşlem türleri

- `buy`
- `sell`
- `cashDeposit`
- `cashWithdrawal`
- `dividend`
- `fee`
- `tax`
- `split`
- `bonusShare`
- `rightsIssue`
- `adjustment`

`adjustment` yalnız açık gerekçe ve audit bilgisi ile kullanılabilir.

## 5. Alış ve satış

Alış alanları: instrument, trade time, settlement time, quantity, unit price, commission, tax, external reference ve note.

Satış miktarı mevcut pozisyonu aşamaz. Short selling v0.6 kapsamı dışındadır.

## 6. Maliyet yöntemi

İlk analitik maliyet yöntemi **Moving Weighted Average Cost** olacaktır.

```text
newCostBasis =
(previousQuantity × previousAverageCost
 + buyQuantity × buyUnitPrice
 + allocatedBuyFees)
 / newQuantity
```

Satış kalan birim maliyeti değiştirmez.

```text
realizedPnL = sellNetProceeds - soldQuantity × currentAverageCost
```

Bu yöntem vergi veya yasal muhasebe yöntemi olarak sunulmaz.

## 7. Para ve miktar

- Kalıcı veride binary float yoktur.
- Para ve miktar `numeric/decimal` kullanır.
- API değerleri decimal string taşıyabilir.
- Ara hesaplamalarda gereksiz yuvarlama yapılmaz.

## 8. Nakit defteri

Nakit bakiye deposit, withdrawal, buy, sell, dividend, fee, tax ve adjustment hareketlerinden türetilir.

## 9. Kurumsal aksiyonlar

Split ve bonus share miktar/maliyet ilişkisini düzeltir; toplam maliyet değişmez. Rights issue yeni pay ve ödeme hareketi olarak işlenir. Dividend nakit geliri oluşturur.

## 10. Immutable ledger

Finalized işlem overwrite edilmez. Düzeltme reversal ve replacement transaction ile yapılır.

Durumlar:

- `draft`
- `posted`
- `reversed`
- `deleted`

## 11. Idempotency

```text
portfolioId + source + externalReference + normalizedTransactionHash
```

Aynı key ve farklı içerik conflict üretir.

## 12. Projection

Position ve cash kayıtları ledger'dan türetilmiş projection'dır. Tek doğruluk kaynağı posted transaction ledger'dır.

## 13. Snapshot

Snapshot; quantity, average cost, market price, market value, unrealized P&L, cash, total value ve data cutoff taşır.

## 14. Güvenlik

Ownership, IDOR, CSV formula injection, note XSS, dosya/satır limiti, decimal overflow ve audit log zorunludur.

## 15. Kabul kriterleri

- Ledger deterministic yeniden üretilebilir.
- Weighted average cost fixture testleri geçer.
- Satış pozisyonu aşamaz.
- Reversal eski işlemi sessizce değiştirmez.
- Duplicate import duplicate transaction üretmez.
- Projection rebuild edilebilir.
