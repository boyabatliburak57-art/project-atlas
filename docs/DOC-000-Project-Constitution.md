# DOC-000 — Project Constitution

**Sürüm:** 1.0  
**Durum:** Onaylı  
**Bağlayıcılık:** Zorunlu

## 1. Ürün odağı

Project Atlas'ın ilk sürümü yalnızca Borsa İstanbul pay piyasasına odaklanır. Başka piyasalar için gereksiz erken genelleştirme yapılmaz; ancak modül sınırları gelecekte genişlemeyi engellemeyecek şekilde korunur.

## 2. Yatırım tavsiyesi sınırı

Platform analiz, sınıflandırma, puanlama, tarama ve alarm üretir. Kesin alım veya satım tavsiyesi verdiğini iddia etmez. Her sinyal kullanılan kuralı, zaman dilimini, veri zamanını ve gecikme bilgisini gösterebilmelidir.

## 3. Tek doğruluk kaynağı

Git repository içindeki onaylı dokümanlar tek doğruluk kaynağıdır. Sohbet mesajı, geçici not veya kod içi varsayım dokümanların önüne geçemez.

## 4. Mimari yaklaşım

İlk sürüm modüler monolith olarak geliştirilir. Operasyonel sadelik, test kolaylığı ve düşük altyapı maliyeti önceliklidir. Ağır işler worker süreçlerine ayrılabilir.

## 5. Modül sınırları

- Identity & Access
- Instrument Master
- Market Data
- Indicator Engine
- Scanner Engine
- Saved Scans
- Alerts
- Watchlists
- Fundamentals
- Portfolio
- Backtest
- Billing & Entitlements
- Admin
- Audit & Observability

Her modül açık arayüzlere ve kendi iş kurallarına sahip olur.

## 6. Veri doğruluğu

- Ham piyasa verisi ile türetilmiş veri ayrılır.
- Sağlayıcı, piyasa zamanı, ingest zamanı ve gecikme bilgisi saklanır.
- Kurumsal aksiyonlar izlenir.
- İndikatör hesapları yeniden üretilebilir olmalıdır.
- Eksik veri sessizce sıfırla doldurulmaz.
- Kapanmamış bar, kapanmış bar gibi değerlendirilmez.

## 7. Güvenlik

- En az ayrıcalık ilkesi uygulanır.
- Yetkilendirme backend tarafında uygulanır.
- Hassas veri loglanmaz.
- Secret değerler repoya eklenmez.
- Yönetici işlemleri audit log'a yazılır.
- Rate limit ve güvenli oturum yönetimi uygulanır.

## 8. Test

Kritik finansal hesaplamalar referans veri setleriyle doğrulanır. Unit, integration, contract, end-to-end, performance ve migration testleri ihtiyaca göre uygulanır. Yalnızca test kapsam yüzdesi kalite göstergesi sayılmaz.

## 9. Performans

Yaklaşık 600 sembollük BIST evreninde sık kullanılan taramalar cache veya ön hesaplamayla hızlı sunulur. Ağır kullanıcı taramaları kuyruk üzerinden çalıştırılabilir. Mutlak ve ölçülmemiş performans vaatleri verilmez.

## 10. İzlenebilirlik

Kritik işlemlerde request/correlation id, kullanıcı veya servis kimliği, zaman, modül, sonuç, hata kodu ve veri kesim zamanı kaydedilir.

## 11. Değişiklik yönetimi

Mimari kararlar ADR ile kayıt altına alınır. Gereksinim değişikliklerinde etki, migration, geriye uyumluluk ve sürüm notu değerlendirilir.
