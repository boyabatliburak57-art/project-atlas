# Project Atlas v0.3.1 — Foundation Remediation Plan

**Durum:** Zorunlu  
**Kaynak:** `reports/foundation-milestone-audit.md`  
**Geçiş kararı:** NO-GO  
**Hedef:** TASK-012 öncesi tüm kritik foundation bulgularını kapatmak

## 1. Audit özeti

Audit sonucu:

- passed: 5
- failed: 1
- deviation: 4

TASK-012 ve sonraki Indicator Engine görevlerine, bu plandaki geçiş kapısı tamamlanmadan başlanmamalıdır.

## 2. Zorunlu düzeltmeler

### REM-001 — Formatting baseline

`pnpm format:check` başarısız olan dosyalar Prettier ile düzeltilmelidir.

Kural:

- Format kontrolü dosya atlayarak geçirilmez.
- Ignore listesine yalnızca gerçekten generated dosyalar eklenebilir.
- Doküman ve kaynak dosyaları format kontrolünün dışında bırakılmaz.

İlgili görev: `TASK-011A`

### REM-002 — ADR kimlik çakışması

İki kabul edilmiş belge aynı `ADR-004` kimliğini kullanmaktadır.

Kural:

- İçerik kaybolmadan benzersiz kimlik atanmalı.
- Tüm referanslar güncellenmeli.
- ADR index oluşturulmalı.
- Gelecekte duplicate kimliği CI doğrulamalıdır.

İlgili görev: `TASK-011B`

### REM-003 — Secret scanning

Repository'de dedicated secret scanner ve CI secret-scan workflow bulunmamaktadır.

Kural:

- Geçmişte commit edilmiş olası secret'lar da kontrol edilmelidir.
- CI içinde pull request ve main push üzerinde çalışmalıdır.
- False positive suppression merkezi ve gerekçeli olmalıdır.
- Scanner bulunamadığında kontrol sessizce geçmemelidir.

İlgili görev: `TASK-011C`

### REM-004 — Node sürümü sapması

Audit ortamı Node `25.8.1`, repository hedefi `22.14.0` kullanmaktadır.

Kural:

- Local ve CI sürümleri repository tarafından belirlenmeli.
- Yanlış sürümde açık uyarı veya fail-fast olmalıdır.
- T3 Code doğrulama komutlarını hedef sürümde çalıştırmalıdır.

İlgili görev: `TASK-011D`

### REM-005 — Worker composition root

TASK-009 ve TASK-010 handler'ları mevcut olsa da BullMQ market-data worker composition root'una bağlı değildir.

Kural:

- Handler'ın yalnızca var olması görevin tamamlandığı anlamına gelmez.
- Queue registration, processor binding, dependency wiring ve smoke/integration test bulunmalıdır.
- Gerçek provider entegrasyonu eklenmez.
- Fake provider ile uçtan uca job akışı doğrulanır.

İlgili görev: `TASK-011E`

## 3. Uygulama sırası

1. `TASK-011A-Formatting-Baseline.md`
2. `TASK-011B-ADR-Identifier-Remediation.md`
3. `TASK-011C-Secret-Scanning-and-CI.md`
4. `TASK-011D-Node-Version-Enforcement.md`
5. `TASK-011E-Market-Data-Worker-Wiring.md`
6. `TASK-011F-Foundation-Reaudit.md`

TASK-011F sonucu GO olmadan TASK-012 uygulanmaz.

## 4. Kabul kapısı

Aşağıdakilerin tamamı sağlanmalıdır:

- `pnpm format:check` başarılı
- ADR kimlikleri benzersiz
- ADR index doğrulaması başarılı
- local secret scan başarılı
- CI secret scan workflow mevcut ve çalışıyor
- Node hedef sürümde doğrulama yapılmış
- worker market-data job'ları composition root'a bağlı
- fake provider job flow integration testi başarılı
- lint/typecheck/test/build başarılı
- audit raporu GO sonucu veriyor
