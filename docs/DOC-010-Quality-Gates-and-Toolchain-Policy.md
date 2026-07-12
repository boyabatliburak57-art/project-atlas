# DOC-010 — Quality Gates and Toolchain Policy

**Sürüm:** 1.0  
**Durum:** Onay için hazır

## 1. Amaç

Bu belge Project Atlas'ta geliştirme görevlerinin tamamlanmış sayılması için gereken minimum kalite kapılarını ve araç sürümü politikalarını tanımlar.

## 2. Zorunlu kalite kapıları

Her merge öncesi:

- format check
- lint
- typecheck
- unit tests
- ilgili integration tests
- build
- OpenAPI validation, ilgiliyse
- migration validation, ilgiliyse
- secret scan
- production dependency audit
- forbidden test modifier scan
- ADR identifier validation

çalışmalıdır.

## 3. Format kapısı

Format kontrolü tüm source, config ve markdown dosyalarını kapsamalıdır.

Generated dosyalar yalnızca:

- açıkça tanımlı path,
- otomatik yeniden üretilebilirlik,
- gerekçeli ignore

ile hariç tutulabilir.

Başarısız format kontrolü merge'i engeller.

## 4. Test modifier kapısı

Aşağıdaki kullanımlar CI'da aranmalıdır:

- `.skip`
- `.only`
- `describe.skip`
- `it.skip`
- `test.skip`
- `describe.only`
- `it.only`
- `test.only`

Gerekçeli quarantine mekanizması ayrı politika olmadan kullanılmaz.

## 5. Node sürümü

Repository hedef Node sürümü tek doğruluk kaynağından yönetilir.

Önerilen kaynaklar:

- `.nvmrc`
- `.node-version`
- `package.json#engines`
- CI setup-node

Bu kaynaklar aynı major/minor hedefini göstermelidir.

Yanlış major sürümde:

- install veya validation açıkça hata vermeli,
- en azından CI kesin olarak hedef sürümde çalışmalıdır.

## 6. Secret scanning

Secret scan iki aşamalıdır:

### Local/repository scan

- mevcut çalışma ağacı,
- mümkünse git geçmişi,
- bilinen secret pattern'leri

kontrol edilir.

### CI scan

- pull request,
- main push,
- manuel workflow

üzerinde çalışır.

Scanner başarısız veya bulunamazsa job başarısız olur.

## 7. ADR doğrulama

CI script'i:

- ADR dosya kimliklerini,
- başlık kimliklerini,
- `ADR_INDEX.md` kayıtlarını,
- duplicate numaraları

doğrular.

## 8. Cache dışı doğrulama

Milestone audit sırasında build orchestration cache'i kritik kontrolleri gizlememelidir.

Audit komutları gerektiğinde cache bypass ederek çalıştırılır.

## 9. Raporlama

Her milestone audit:

- tool versions,
- operating system,
- Node version,
- pnpm version,
- Docker version,
- commit SHA,
- executed commands

bilgisini içermelidir.

## 10. Geçiş kuralı

Quality gate sonucu NO-GO ise sonraki milestone görevine geçilmez.

Eksik kontrol "not verifiable" ise kritikliği değerlendirilir. Security gate'lerde `not verifiable` varsayılan olarak geçişi engeller.
