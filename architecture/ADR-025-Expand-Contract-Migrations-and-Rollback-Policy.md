# ADR-025 — Expand/Contract Migration ve Rollback Politikası

**Durum:** Accepted  
**Tarih:** 2026-07-20

## Bağlam

Health-gated rolling deployment sırasında eski ve yeni API/worker instance'ları kısa süre birlikte
çalışır. Bir migration mevcut column/table/constraint'i aynı release içinde kaldırır veya anlamını
değiştirirse eski image yeni schema ile, yeni image eski schema ile çalışamayabilir. Büyük tablo DDL
işlemleri lock, latency ve availability riskini artırır.

Application image rollback'i database state'ini otomatik geri almaz. Özellikle destructive migration
sonrasında migration down çalıştırmak veri kaybını büyütebilir. Release öncesinde compatibility,
backup/PITR ve forward-fix/rollback sınırlarının açık olması gerekir.

## Karar

Tüm production migration'ları immutable, sıralı ve checksum doğrulamalıdır. Migration ayrı,
korumalı ve kullanıcı/onay mercii tarafından onaylanan job olarak application rollout'undan önce
veya açık release adımında çalışır; application instance'larının startup sırasında yarışarak schema
değiştirmesine izin verilmez.

Destructive veya semantik olarak uyumsuz değişiklikler için **expand/contract zorunludur**:

1. **Expand release:** additive nullable column/table/index veya uyumlu constraint eklenir. DDL
   eski application ile çalışmalıdır.
2. **Dual-compatible application:** yeni image eski/yeni representation'ı okuyabilir; gerektiğinde
   bounded dual-write veya versioned adapter kullanır.
3. **Backfill/reconciliation:** idempotent, resumable, batch-limited job ile veri taşınır; progress,
   error ve invariant sayıları kaydedilir.
4. **Read switch ve doğrulama:** yeni representation authoritative yapılır; row count, checksum ve
   business invariant'lar doğrulanır.
5. **Contract release:** eski column/table/index veya compatibility kodu ancak ayrı release'te,
   eski image/job contract artık çalışmıyorken kaldırılır.

Rolling deployment için schema ve job contract en az aktif release `N` ile rollback hedefi `N−1`
arasında uyumludur. Rename doğrudan uygulanmaz; add/copy/read-switch/drop dizisi kullanılır. `NOT
NULL`, unique veya foreign-key constraint önce veri doğrulaması ve platform destekliyorsa
non-blocking/not-valid aşamasıyla eklenir. Büyük index/table işlemleri online/concurrent strateji veya
bakım planı gerektirir.

Her migration metadata/runbook girdisi şunları taşır:

- beklenen süre ve etkilenen row/table tahmini,
- lock timeout ve statement timeout,
- transaction sınırı,
- large-table/backfill batch stratejisi,
- N/N−1 compatibility kanıtı,
- backup/PITR ve son başarılı restore-drill referansı,
- pre/post invariant sorguları,
- application rollback, migration rollback ve forward-fix planı.

Migration önce ephemeral/clean database, sonra production-benzeri staging kopyasında dry-run edilir.
Lock süresi, disk büyümesi ve runtime ölçülür. İlgili backup/restore gate PASS değilse destructive
migration production'a ilerlemez.

Rollback politikası aşamaya bağlıdır:

- yalnız additive expand uygulanmış ve yeni application başarısızsa trafik önceki immutable image'a
  döndürülür; uyumlu additive schema yerinde kalabilir;
- backfill sırasında hata oluşursa job checkpoint'ten idempotent sürer veya güvenli biçimde durur;
- contract/destructive adım sonrasında otomatik down migration varsayılmaz. Veri kaybı riski varsa
  forward-fix tercih edilir; PITR restore ancak incident/DR runbook'u ve açık onayla uygulanır;
- rollback release record, operator, reason, digest, migration state ve validation sonucuyla
  auditlenir.

Bir down migration'ın repository'de bulunması onun production'da otomatik ve güvenli olduğu
anlamına gelmez. Cache invalidation, worker drain/requeue ve feature-flag/kill-switch mitigation
rollback planına dahil edilir.

Bu ADR migration veya production deployment çalıştırmaz; yalnız TASK-073 ve sonraki görevlerin
manifest/workflow politikasını belirler.

## Gerekçe

- Expand/contract eski ve yeni instance'ların rolling rollout sırasında aynı schema ile çalışmasını
  sağlar.
- Ayrı backfill ve contract adımları lock süresi ile veri kaybı riskini sınırlar.
- N/N−1 compatibility gerçek image rollback seçeneğini korur.
- Backup/restore ve invariant gate'i destructive DDL'i doğrulanmış recovery kabiliyetine bağlar.
- Forward-fix tercihi yanlış down migration ile ikinci veri kaybını önler.

## Sonuçlar

### Olumlu

- Schema değişiklikleri kontrollü downtime ve rollback hedefiyle planlanır.
- Büyük veri dönüşümleri gözlemlenebilir, resumable ve idempotent olur.
- Migration ve application rollout sorumlulukları ayrılır.
- Destructive değişikliklerin backup, compatibility ve onay kanıtları audit edilebilir.

### Olumsuz

- Basit görünen rename/drop değişiklikleri birden fazla release gerektirir.
- Geçici dual schema ve dual-read/write kodu bakım yükü oluşturur.
- Backfill için ek storage, queue kapasitesi ve reconciliation süresi gerekir.
- Contract cleanup gecikirse eski schema teknik borç olarak kalabilir.

## Değerlendirilen alternatifler

Startup-time auto-migration, aynı release'te destructive DDL ve production'da otomatik down rollback
değerlendirilmiştir. İlki replica yarışına ve kontrolsüz lock'a; ikincisi N/N−1 uyumsuzluğuna;
üçüncüsü geri dönüşsüz veri kaybına yol açabilir. Bu nedenle ayrı migration job ve zorunlu
expand/contract politikası seçilmiştir.
