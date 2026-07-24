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

## v0.10 pre-staging release gate

- [ ] Production Readiness durumu `NO-GO` olarak korunuyor
- [ ] Staging gate durumu `DEFERRED_EXTERNAL_GATE` olarak görünür
- [ ] Production launch blocked
- [ ] Yerel test, local container/load veya tarihsel DAST staging kanıtı olarak kullanılmadı
- [ ] Pre-staging artifact'leri `PRE_STAGING_ONLY` ve `NOT_APPROVED_FOR_PRODUCTION` olarak etiketlendi
- [ ] TASK-080S/TASK-080P yalnız gerçek staging erişimi ve yetkileri sağlandığında yeniden açılacak
- [ ] Registry-backed digest ve previous known-good digest mevcut
- [ ] Staging PostgreSQL, Redis, object storage ve synthetic kullanıcı erişimleri doğrulandı
- [ ] Load, chaos ve current RC DAST yetkileri doğrulandı

Bu checklist'teki ertelenmiş staging maddeleri tamamlanmadan production ready, production approved,
staging validated veya v1.0 launch approved iddiası üretilemez.
