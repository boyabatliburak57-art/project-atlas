# T3 Code Execution Checklist

Her görevde aşağıdaki liste kullanılır.

## Başlamadan önce

- [ ] `ATLAS_INDEX.md` okundu
- [ ] `SYSTEM_PROMPT.md` okundu
- [ ] İlgili DOC/ARCH/DB/API belgeleri okundu
- [ ] Görev bağımlılıkları tamamlandı
- [ ] Çelişki kontrolü yapıldı
- [ ] Etkilenecek dosyalar listelendi
- [ ] Yeni dependency gerekçelendirildi

## Uygulama

- [ ] Modül sınırları korundu
- [ ] Input validation eklendi
- [ ] Hata kodları eklendi
- [ ] Loglama eklendi
- [ ] Secret eklenmedi
- [ ] Migration gerekiyorsa oluşturuldu
- [ ] Idempotency değerlendirildi
- [ ] Timezone UTC kullanıldı
- [ ] Decimal yaklaşımı korundu

## Test

- [ ] Unit test
- [ ] Integration test, ilgiliyse
- [ ] Edge case
- [ ] Yetkilendirme testi
- [ ] Hata senaryosu
- [ ] Lint
- [ ] Typecheck
- [ ] Build

## Kapanış

- [ ] Doküman güncellendi
- [ ] Changelog güncellendi
- [ ] Değişen dosyalar raporlandı
- [ ] Bilinen sınırlamalar yazıldı
- [ ] Sonraki görev önerildi
