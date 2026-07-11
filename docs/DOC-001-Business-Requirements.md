# DOC-001 — Business Requirements Document

**Sürüm:** 1.0  
**Durum:** Taslak

## 1. İş amacı

BIST yatırımcılarının çok sayıda hisseyi manuel inceleme ihtiyacını azaltmak; teknik ve temel filtreleri aynı tarama motorunda birleştirmek; oluşan koşulları açıklanabilir ve tekrar üretilebilir sonuçlar halinde sunmak.

## 2. İş problemi

- Hazır tarama sayısının sınırlı olması
- Parametrelerin değiştirilememesi
- Çoklu zaman dilimi desteğinin yetersizliği
- Teknik ve temel verilerin ayrı araçlarda bulunması
- Sinyal mantığının kullanıcıya açıklanmaması
- Alarm ve geçmiş sinyal takibinin yetersizliği
- Veri zamanı ve gecikmenin belirsiz gösterilmesi

## 3. İş hedefleri

### BR-001 — Hızlı piyasa görünümü

Kullanıcı BIST evrenini trend, momentum, hacim, volatilite, kırılım ve temel değerleme kategorilerinde inceleyebilmelidir.

### BR-002 — Özelleştirilebilir tarama

Kullanıcı indikatör, parametre, zaman dilimi, operatör, karşılaştırma değeri ve AND/OR gruplarıyla tarama oluşturabilmelidir.

### BR-003 — Hazır taramalar

Yeni kullanıcılar teknik kural yazmadan anlaşılır hazır taramaları çalıştırabilmelidir.

### BR-004 — İzlenebilir sinyaller

Her eşleşmede hangi koşulların sağlandığı ve hesaplanan değerler gösterilmelidir.

### BR-005 — Alarm

Kullanıcı kayıtlı tarama veya sembol koşulu gerçekleştiğinde bildirim alabilmelidir.

### BR-006 — Üyelik modeli

Free, Premium ve Admin yetkileri backend tarafından yönetilmelidir.

### BR-007 — Yönetilebilir veri

Yönetici sembol evrenini, veri sağlayıcı durumunu, hazır taramaları ve kullanıcı yetkilerini yönetebilmelidir.

## 4. Hedef kullanıcılar

- Bireysel yatırımcı
- İleri teknik analiz kullanıcısı
- Profesyonel kullanıcı
- Sistem yöneticisi

## 5. İlk sürüm kapsamı

- kullanıcı hesabı ve oturum
- BIST sembol evreni
- veri sağlayıcı adaptörü
- OHLCV saklama
- teknik indikatör motoru
- tarama kuralı oluşturma
- hazır taramalar
- sonuç tablosu
- hisse detay ekranı
- watchlist
- alarm
- temel finansal filtreler
- admin ve paket temeli

## 6. Kapsam dışı

- otomatik emir gönderme
- broker entegrasyonu
- yatırım danışmanlığı
- kripto ve yabancı piyasalar
- yüksek frekanslı işlem altyapısı

## 7. Başarı ölçütleri

- tarama oluşturma tamamlama oranı
- hazır tarama kullanım oranı
- tarama sonuç süresi
- alarm teslim başarısı
- veri tazelik oranı
- hata oranı
- aktif kullanıcı ve premium dönüşüm oranı

## 8. İş riskleri

- veri lisans maliyeti
- sağlayıcı kesintisi
- yanlış veya gecikmiş veri
- kullanıcıların sonucu yatırım tavsiyesi olarak yorumlaması
- yoğun tarama taleplerinde performans düşüşü
- platformlar arası indikatör yuvarlama farkları
- mevzuat ve lisans gereksinimleri

## 9. İş ilkeleri

- Veri zamanı ve gecikme görünür olmalıdır.
- Açıklanamayan skor üretilmemelidir.
- Kullanıcı taraması ile sistem hazır taraması ayrılmalıdır.
- Premium sınırlar backend tarafından uygulanmalıdır.
- Kullanıcı verisi başka kullanıcıya gösterilmemelidir.
