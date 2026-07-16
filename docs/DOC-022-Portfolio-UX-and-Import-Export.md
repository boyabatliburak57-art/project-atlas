# DOC-022 — Portfolio UX and Import/Export Requirements

**Sürüm:** 1.0  
**Durum:** Uygulamaya hazır

## 1. Ekranlar

- `/portfolios`
- `/portfolios/{id}`
- `/portfolios/{id}/transactions`
- `/portfolios/{id}/performance`
- `/portfolios/{id}/risk`
- `/portfolios/{id}/import`

## 2. Özet

Toplam değer, nakit, günlük değişim, realized/unrealized P&L, net contribution, TWR, benchmark farkı, data cutoff ve partial/stale warning.

## 3. CSV import

Akış: dosya seç, doğrula, preview, satır hataları, duplicate analizi, kullanıcı onayı, atomic commit ve sonuç raporu.

Varsayılan atomic import'tur. Partial mode kullanıcı tarafından açıkça seçilmelidir.

## 4. Güvenlik

Dosya boyutu/satır limiti, MIME/uzantı, encoding, formula injection, aşırı decimal, tarih ve hücre uzunluğu doğrulanır.

## 5. Export

Transactions, positions ve performance summary CSV. Formula injection'a karşı güvenli olmalıdır.

## 6. Risk ekranı

Volatility, beta, max drawdown, VaR, sektör yoğunlaşması, top positions, warnings ve methodology tooltip.

## 7. Kabul kriterleri

Manuel işlem, CSV preview/commit, invalid row, duplicate, formula injection, reversal, partial valuation ve risk methodology E2E testleri geçer.
