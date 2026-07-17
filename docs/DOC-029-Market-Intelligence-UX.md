# DOC-029 — Market Intelligence UX Requirements

**Sürüm:** 1.0  
**Durum:** Uygulamaya hazır

## 1. Ekranlar

- `/market`
- `/market/sectors`
- `/symbols/{symbol}`
- `/symbols/{symbol}/financials`
- `/symbols/{symbol}/patterns`

## 2. Market ekranı

- endeks kartları
- breadth özeti
- top gainers/losers
- volume leaders
- sector heatmap/table
- data freshness banner
- preset scan hızlı girişleri

## 3. Symbol detail

Sekmeler:

- Overview
- Chart
- Financials
- Patterns
- Scans
- Alerts

## 4. Chart UX

- timeframe seçimi
- adjustment seçimi
- indicator ekleme/çıkarma
- panel düzeni
- corporate action markers
- pattern markers
- tooltip
- keyboard erişimi
- metinsel son değer özeti

Chart canvas tek başına bilgi kaynağı değildir; tablo/metin alternatifi bulunur.

## 5. Financials UX

- annual/quarterly toggle
- dönem tablosu
- trend chart
- ratio cards
- formula/methodology tooltip
- restatement badge
- missing/notEvaluable state

## 6. Pattern UX

- candidate/confirmed/invalidated ayrımı
- evidence point listesi
- algorithm version
- detected bar ve data cutoff
- confidence açıklaması
- kesin tahmin olmadığı uyarısı

## 7. Entegrasyonlar

Sembol sayfasından:

- watchlist'e ekleme
- alarm oluşturma
- scanner condition'a ekleme
- portfolio işlem formuna symbol gönderme

mevcut yetkilere göre yapılabilir.

## 8. Erişilebilirlik

- keyboard navigation
- focus state
- chart text summary
- color-only olmayan up/down
- table semantics
- loading/partial/stale/error states
- reduced motion desteği

## 9. Kabul kriterleri

- Market ve symbol sayfası aynı cutoff bilgisini doğru gösterir.
- Chart overlay seçimi request contract'a yansır.
- Financial missing value 0 görünmez.
- Pattern adayları kanıtla gösterilir.
- Watchlist/alert entegrasyonu duplicate submit üretmez.
- Playwright ana akışları geçer.
