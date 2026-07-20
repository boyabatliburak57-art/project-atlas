# ADR-023 — Backup, PITR ve Restore Rehearsal Politikası

**Durum:** Accepted  
**Tarih:** 2026-07-20

## Bağlam

PostgreSQL posted ledger, run/result state, revisions, audit ve diğer transactional veriler için
authoritative kaynaktır. Redis cache/queue koordinasyonu için yeniden üretilebilir olsa da export,
backtest series ve benzeri büyük artifact'ler object storage'da kalıcı olabilir. Backup job'ının
başarılı görünmesi, verinin belirlenen sürede ve uygulamayla uyumlu biçimde geri yüklenebildiğini
kanıtlamaz.

Bad migration, accidental delete, database corruption, infrastructure outage, secret compromise ve
object deletion gibi senaryolar farklı restore sırası ve doğrulama gerektirir. RPO/RTO hedefleri
yalnız yapılandırma değeri değil, düzenli rehearsal ile ölçülen operasyonel sözleşme olmalıdır.

## Karar

Production PostgreSQL, encrypted automated backup ve point-in-time recovery destekleyen managed
veya eşdeğer bir servis kullanır. Başlangıç hedefleri:

```text
RPO ≤ 15 dakika
RTO ≤ 2 saat
```

WAL/log shipping veya eşdeğer PITR mekanizması RPO hedefini karşılayacak sıklıkta çalışır. Backup
kopyaları primary failure domain'inden ayrılır, encryption-at-rest ve in-transit kullanır, retention
policy'si versioned'dır ve restore credential'ları normal application credential'larından ayrıdır.
Provider seçimi bu ADR'nin parçası değildir; IaC adapter bu yetenekleri doğrulamalıdır.

Bir backup yalnız aşağıdaki isolated restore rehearsal tamamlandığında **başarılı ve kullanılabilir**
kabul edilir:

1. hedef timestamp/backup reference ile izole ortama restore,
2. checksum ve schema/migration compatibility kontrolü,
3. kritik tablo row count ve foreign-key/unique invariant kontrolleri,
4. posted ledger/projection, durable run/result ve audit gibi temel business invariant sorguları,
5. uygulamanın uyumlu immutable image'ı ile health ve synthetic smoke,
6. achieved RPO/RTO ölçümü ve immutable recovery-drill kaydı.

Backup job success tek başına release gate'i geçirmez. Tam restore rehearsal en az aylık ve yüksek
riskli/destructive migration öncesinde yapılır. Başarısız veya hedefi aşan drill backup gate'ini
FAIL yapar; production rollout onaylanmaz veya açık incident/risk exception gerektirir.

Object storage'daki kalıcı artifact'ler versioning, encryption, checksum, lifecycle, orphan cleanup
ve periyodik restore örneklemesi kullanır. Deployment configuration ve release metadata source
control/secure configuration store üzerinden yeniden kurulabilir olmalıdır. Secret değerler backup
raporu veya loguna yazılmaz.

Redis authoritative backup kapsamına alınmaz. Redis kaybında PostgreSQL durable state'ten queue,
cache ve progress reconciliation yapılır; completed result kaybı veya duplicate durable result
oluşmaması test edilir. Redis backup'ı platform tarafından sağlansa bile PostgreSQL restore yerine
geçmez.

Recovery sırası secrets/config → PostgreSQL → schema-compatible immutable application image →
workers → object artifacts → reconciliation → cache rebuild → synthetic validation biçimindedir.
Retention/deletion job'ları idempotent, batch-limited, auditli ve legal/security hold aware çalışır.

## Gerekçe

- PITR on beş dakikalık veri kaybı hedefini ölçülebilir kılar.
- İki saatlik RTO kapasite, runbook ve on-call hazırlığı için açık sınır sağlar.
- Restore rehearsal, bozuk/eksik backup'ın ancak incident sırasında fark edilmesini önler.
- Business invariant ve application smoke yalnız byte restore değil kullanılabilir sistem kanıtı
  üretir.
- Redis'i ephemeral kabul etmek cache/queue durumunu transactional truth ile karıştırmaz.

## Sonuçlar

### Olumlu

- Recovery kabiliyeti job status yerine ölçülmüş RPO/RTO ve uygulama doğrulamasıyla kanıtlanır.
- Database, object artifact ve configuration için açık restore sırası oluşur.
- Bad migration ve accidental delete senaryoları release öncesinde prova edilebilir.
- Backup credential ve log güvenliği application erişiminden ayrılır.

### Olumsuz

- PITR, ayrı failure domain ve aylık isolated drill altyapı maliyeti getirir.
- Büyük veri setlerinde iki saatlik RTO kapasite rezervi ve otomasyon gerektirir.
- Object artifact restore örneklemesi ve checksum katalogları ek operasyonel state yaratır.
- Başarısız drill release takvimini durdurabilir.

## Değerlendirilen alternatifler

Yalnız günlük snapshot, yalnız provider backup-success statüsü ve Redis'i kalıcı truth olarak restore
etme değerlendirilmiştir. Günlük snapshot RPO hedefini karşılamaz; job success restore edilebilirliği
kanıtlamaz; Redis state'i PostgreSQL business truth'unun yerine geçemez. Bu nedenle PITR ve zorunlu
restore rehearsal seçilmiştir.
