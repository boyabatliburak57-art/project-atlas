# ADR-021 — Provider-Neutral Production Deployment ve Rolling Release

**Durum:** Accepted  
**Tarih:** 2026-07-20

## Bağlam

Project Atlas web, API ve farklı iş yükü profillerine sahip worker süreçlerinden oluşur. API
latency/traffic ile scanner, alert, portfolio, market-intelligence ve backtest queue yükleri aynı
ölçekleme sinyaline sahip değildir. Local `compose.yaml` geliştirme için PostgreSQL ve Redis sağlar;
repository'de henüz production container image, IaC veya belirli bir cloud platformuna bağlı
deployment manifesti yoktur.

Production dağıtımının tekrarlanabilir, geri alınabilir ve tek bir sağlayıcının servis isimlerine
domain veya application katmanını bağlamayacak şekilde tanımlanması gerekir. Deployment sırasında
in-flight HTTP istekleri ile uzun süren worker job'larının kaybolmaması; release artifact'inin kaynak
commit ve migration setiyle doğrulanabilmesi gerekir.

## Karar

Project Atlas, **provider-neutral OCI container** yaklaşımıyla dağıtılır. Platforma özgü load
balancer, workload, secret manager, managed database, cache ve object-storage kaynakları IaC adapter
katmanında kalır. Belirli bir cloud sağlayıcısı bu ADR ile zorunlu tutulmaz. TASK-073 bir platform
adapter'ı seçerse provider-neutral service/config/storage sözleşmesini korur ve seçimin gerekçesini
manifest/runbook içinde açıklar.

Web/API ve worker süreçleri ayrı deployment birimleridir:

- API request latency, error rate ve CPU sinyalleriyle;
- genel worker pool queue lag ve active-job sayısıyla;
- memory-heavy backtest/experiment worker pool'u kendi queue lag, CPU ve memory sınırlarıyla

bağımsız ölçeklenir. API ve worker image'ları ayrı olabilir; ancak aynı release manifestinde
version-locked olmalı ve job payload compatibility version taşımaları gerekir.

Kalıcı altyapı sınırları şöyledir:

- managed PostgreSQL transactional ve authoritative state kaynağıdır;
- Redis cache, queue coordination ve hızlı progress için kullanılır, tek kalıcı doğruluk kaynağı
  değildir; kaybı reconciliation ile giderilir;
- object storage export, büyük series ve diğer tanımlı artifact'ler için kalıcı, şifreli,
  checksum/version/lifecycle kontrollü depodur;
- PostgreSQL ve Redis public ağa açılmaz; servis erişimi least-privilege network ve identity
  policy'leriyle sınırlandırılır.

Her release image'ı immutable digest ile referanslanır. Release kaydı en az source commit SHA,
image digest, build zamanı, SBOM, configuration schema version ve migration setini taşır. `latest`
etiketi production kimliği veya rollback referansı olamaz.

İlk production rollout stratejisi **health-gated rolling deployment**'dır. API rollout'u yeni
instance readiness sağlamadan eski kapasiteyi azaltmaz (`maxUnavailable = 0` semantiği). Worker
rollout'u pool bazında kademeli yapılır; eski ve yeni job contract sürümleri compatibility penceresi
boyunca birlikte çalışabilir. Error-rate, readiness veya SLO gate ihlalinde rollout durur ve önceki
immutable digest'e kontrollü rollback yapılır. Blue/green ve canary gelecekte aynı artifact/probe/
rollback sözleşmesini kullanan platform adapter seçenekleridir; bu ADR onları zorunlu kılmaz.

Probe semantiği ayrıdır:

- **liveness** yalnız process/event-loop deadlock gibi restart gerektiren yerel sağlığı ölçer;
  PostgreSQL veya Redis geçici kesintisi liveness failure yapılmaz;
- **readiness** instance'ın trafik veya job kabul edebilmesini ölçer; API için zorunlu PostgreSQL
  erişimi ve startup tamamlanması, worker için PostgreSQL/queue bağlantısı, contract compatibility
  ve drain durumu değerlendirilir. Redis fallback ile doğru cevap üretilebilen API yalnız cache
  kaybı nedeniyle unready olmaz;
- **startup** migration'ın ayrıca tamamlandığını varsayan uygulama başlangıcını, configuration
  validation'ı ve gerekli warm-up'ı kapsar; yavaş başlangıç liveness restart döngüsüne sokulmaz.

Termination sinyalinden sonra API önce readiness'i kapatır, yeni trafik almayı durdurur, in-flight
request'leri bounded grace period içinde tamamlar ve bağlantıları kapatır. Worker yeni job alımını
pause eder; active job'u checkpoint/batch sınırına kadar tamamlar veya güvenli ve idempotent requeue
yapar. Grace period sonunda belirsiz job sonucu terminal başarı sayılmaz; PostgreSQL state ve queue
reconciliation ile geri kazanılır.

Production rollout yalnız korumalı, kullanıcı/onay mercii tarafından açıkça onaylanan workflow ile
başlatılabilir. Bu ADR hiçbir gerçek production deploy işlemini başlatmaz.

## Gerekçe

- Provider-neutral container ve adapter sınırı platform seçimini domain kodundan ayırır.
- Ayrı API/worker deployment'ları farklı kapasite ve failure profillerini bağımsız yönetir.
- Immutable digest aynı artifact'in staging doğrulamasından production'a taşındığını kanıtlar.
- Rolling strateji ilk sürüm için blue/green altyapı maliyeti olmadan kontrollü kapasite geçişi
  sağlar.
- Ayrık probe semantiği dependency kesintilerinde restart fırtınasını ve hazır olmayan instance'a
  trafik yönlendirilmesini önler.
- Request/job drain, idempotency ve PostgreSQL authoritative state deployment sırasında veri kaybı
  veya duplicate sonuç riskini sınırlar.

## Sonuçlar

### Olumlu

- Aynı immutable artifact local dışındaki ortamlarda farklı secret/config ile kullanılabilir.
- API, genel worker ve ağır worker pool'ları bağımsız kapasite planına sahip olur.
- Redis ve telemetry kaybı durable business sonucunu kaybettirmez.
- Release, rollback ve job compatibility kanıtları audit edilebilir olur.
- Cloud değişikliği application/domain sözleşmesini değiştirmek zorunda kalmaz.

### Olumsuz

- Provider-neutral adapter ve version-locked image yönetimi ek IaC/CI karmaşıklığı getirir.
- Rolling deployment N ve N−1 application/job/schema uyumluluğu gerektirir.
- Uzun worker job'ları için checkpoint, drain timeout ve reconciliation operasyonel maliyet yaratır.
- Blue/green kadar anlık trafik geçişi sağlamaz; rollback tamamlanması rollout hızına bağlıdır.

## Değerlendirilen alternatifler

Tek process deployment, provider-specific uygulama bağımlılıkları, blue/green ve canary
değerlendirilmiştir. Tek process bağımsız ölçekleme ve failure isolation sağlamaz. Provider-specific
bağlantı domain'i gereksiz kilitler. Blue/green iki tam ortam maliyeti, canary ise başlangıçta daha
karmaşık traffic/SLO otomasyonu gerektirir. Bu nedenle ilk strateji provider-neutral, health-gated
rolling deployment olarak seçilmiştir.
