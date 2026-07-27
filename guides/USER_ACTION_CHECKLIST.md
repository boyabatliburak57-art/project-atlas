# Kullanıcı Aksiyon Kontrol Listesi

## 1. Repository

- TASK-098 ve TASK-099 çalışma ağacı değişikliklerini incele
- bütün testleri çalıştır
- commit oluştur
- remote'a push et
- temiz `git status` ve commit SHA kaydet

## 2. Veri sağlayıcısı

- BIST market data sağlayıcısı seç
- Fundamentals ve corporate actions kapsamını doğrula
- Endeks/sektör üyeliği ve benchmark kapsamını doğrula
- API erişimi talep et
- Ticari lisans ve yeniden dağıtım hakkını yazılı al
- Rate limit, tarihsel veri, revision ve SLA bilgilerini al
- Credential'ları CI/secret store'a gir

## 3. E-posta

- Transactional e-mail sağlayıcısı seç
- Gönderim domain/subdomain belirle
- SPF/DKIM/DMARC kayıtlarını ekle
- Bounce/complaint webhook adreslerini tanımla
- Production API key ve webhook secret'ı secret store'a gir

## 4. Hukuk

Hukuk danışmanına ilet:

- şirket unvanı ve iletişim bilgileri
- veri sorumlusu/işleyen rolleri
- kullanılan sağlayıcılar ve veri aktarım ülkeleri
- saklama ve silme süreleri
- çerez/analytics kullanımı
- e-posta ve bildirim süreçleri
- kullanıcı verisi export/deletion süreçleri
- ürünün yatırım tavsiyesi olmadığı kapsam
- veri kaynakları ve metodolojiler

Yedi belgenin onaylı sürümünü ve yürürlük tarihini al.

## 5. Ticari kararlar

Ürün ücretli olacaksa karar ver:

- planlar
- trial
- kullanıcı/işlem kotaları
- faturalandırma
- ödeme sağlayıcısı
- kurumsal kullanım

Ücretsiz veya şirket içi olacaksa bunu roadmap'e açıkça kaydet.
