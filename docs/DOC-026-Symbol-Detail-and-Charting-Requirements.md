# DOC-026 — Symbol Detail and Charting Requirements

**Sürüm:** 1.0  
**Durum:** Uygulamaya hazır

## 1. Amaç

Tek bir BIST sembolü için kimlik, fiyat, grafik, indikatör, kurumsal aksiyon, tarama sinyali ve veri kalitesi bilgilerini birleşik fakat modüler bir deneyimde sunmak.

## 2. Sembol özeti

- symbol
- şirket adı
- ISIN, varsa
- sektör/pazar
- aktiflik durumu
- endeks üyelikleri
- son fiyat
- günlük değişim
- gün içi yüksek/düşük
- hacim
- data cutoff
- stale/partial

## 3. Grafik zaman dilimleri

İlk destek:

- 5m, provider destekliyorsa
- 15m
- 1h
- 1d
- 1w

Tarih aralığı ve maksimum bar sayısı backend limitlerine tabidir.

## 4. Fiyat serisi

Kullanıcı açıkça seçebilir:

- raw/unadjusted
- split adjusted
- total return adjusted, veri ve policy destekliyorsa

Farklı adjustment serileri aynı cache anahtarını kullanamaz.

## 5. Grafik katmanları

- volume
- SMA/EMA/WMA
- Bollinger Bands
- MACD
- RSI
- Stochastic
- ATR
- Supertrend
- support/resistance candidate
- pattern markers
- corporate action markers
- alert/transaction markers, kullanıcının kendi kaynakları için

UI indikatör formülü hesaplamaz; Indicator Engine sonuçlarını kullanır.

## 6. Grafik veri sözleşmesi

Grafik cevabı:

- bar serisi
- overlay serileri
- panel serileri
- markers
- data cutoff
- adjustment mode
- indicator versions
- warnings

alanlarını taşır.

Tüm seri timestamps aynı zaman eksenine hizalanmalıdır.

## 7. Corporate action marker

- split
- bonus share
- rights issue
- dividend
- symbol change

Marker source ve effective date bilgisi taşır. Aynı olay duplicate gösterilmez.

## 8. Sinyal özeti

Sembol için son closed bar üzerinde:

- scanner/preset eşleşmeleri
- aktif indikatör sinyalleri
- pattern candidates
- kullanıcının aktif alarm sayısı

sunulabilir.

Sinyal, kesin öneri olarak etiketlenmez.

## 9. Veri tutarlılığı

- Chart ve quote summary aynı mantıksal cutoff'u kullanır veya farkı açıkça gösterir.
- Eksik bar sıfır bar yapılmaz.
- Open bar ayrı işaretlenir.
- Indicator overlay version bilgisi saklanır.
- Corporate action adjustment policy versioned'dır.

## 10. Kullanıcı tercihleri

- varsayılan timeframe
- adjustment mode
- görünür overlay'ler
- chart density
- log/linear scale, desteklenirse

Tercihler kullanıcı ayarıdır; finansal hesap kuralı değildir.

## 11. Kabul kriterleri

- Raw ve adjusted seriler karışmıyor.
- Overlay uzunlukları ve timestamps hizalı.
- Open/closed bar ayrımı görünür.
- Corporate action marker duplicate değil.
- Indicator versions response içinde.
- Chart request limitleri ve ownership marker kontrolleri testli.
