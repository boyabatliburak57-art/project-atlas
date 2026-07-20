# ADR-022 — SLO, Error Budget ve Telemetry Standardı

**Durum:** Accepted  
**Tarih:** 2026-07-20

## Bağlam

HTTP isteğiyle başlayıp PostgreSQL, Redis ve BullMQ worker'larına uzanan scanner, alert, portfolio,
market-intelligence, backtest ve experiment akışları yalnız process loglarıyla güvenilir biçimde
işletilemez. Release başarısının availability, latency, terminal job güvenilirliği ve veri tazeliği
üzerinden ölçülmesi; SLO ihlalinin release kararına bağlanması gerekir.

Kontrolsüz metric label'ları kullanıcı, resource, symbol veya run sayısıyla büyüyerek telemetry
maliyetini ve sorgu güvenilirliğini bozabilir. Log/trace içine token, cookie, connection string,
provider payload veya kullanıcı finansal verisinin yazılması güvenlik ihlali oluşturur.

## Karar

Telemetry standardı OpenTelemetry uyumlu abstraction üzerine kurulur. API ve worker süreçleri JSON
structured log, bounded-cardinality metric ve distributed trace üretir. HTTP request/correlation
context'i queue job metadata'sına aktarılır; trace zinciri HTTP → database/cache ve create → worker
→ persistence akışlarında korunur. Telemetry backend'i değiştirilebilir ve telemetry kaybı business
işleminin doğruluğunu veya kalıcı sonucunu değiştiremez.

Başlangıç SLO seti şöyledir:

- production API availability: rolling 30 günde **≥ %99,9**; availability error budget aynı
  pencerede en fazla **%0,1** başarısız eligible request'tir;
- read, write, heavy-job-create ve result-pagination latency: ilgili endpoint için kabul edilmiş
  milestone p95 threshold'u aşılmaz; mevcut threshold'lar alt SLI ve release gate olarak aynen
  korunur;
- durable worker successful terminal rate: validation/user cancellation hariç eligible job'larda
  rolling 30 günde **≥ %99,5**;
- kritik veri tazeliği: versioned market/fundamentals/snapshot freshness policy'sindeki cutoff ve
  lag sınırları korunur; stale/partial cevap oranı ayrıca ölçülür ve taze gibi raporlanmaz;
- kritik kullanıcı yolculukları scanner completion, alert delivery, portfolio recalculation ve
  backtest completion başarı/latency SLI'larıyla izlenir.

Planlı bakımın availability hesabından çıkarılması ancak önceden ilan edilmiş, auditli maintenance
policy ve ölçüm etiketiyle mümkündür. SLO/error-budget hesaplama policy'si versioned'dır. Error budget
tüketim hızı ve kalan budget dashboard'da görünür. Budget tükenmesi veya hızlı burn alert'i release
freeze/risk review başlatır; devam kararı süreli, gerekçeli ve auditli exception gerektirir.

Metric label cardinality allowlist ile sınırlandırılır. Environment, service, release, route
template, HTTP method/status class, queue, job type, outcome ve bounded error category label olabilir.
User ID, e-mail, raw resource/run/job ID, symbol, free-form error/message, URL path ve request payload
metric label olamaz. Per-resource korelasyon yalnız erişim kontrollü log/trace alanlarında ve
sampling/retention policy'siyle kullanılır.

Log ve trace redaction merkezi, default-deny ve testlidir. Password, token, authorization header,
cookie, connection string, secret environment value, raw provider payload, full upload ve gereksiz
PII/finansal not hiçbir log, span attribute veya exception event'ine yazılmaz. Safe actor/resource
kimlikleri gerekiyorsa pseudonymous/bounded representation kullanır. Error stack yalnız güvenli
internal telemetry'ye, redaction sonrasında ve production erişim kontrolüyle gönderilebilir; public
response'a çıkmaz.

Trace sampling versioned ve maliyet kontrollüdür: error ve seçili kritik journey trace'leri
önceliklendirilir, normal trafik probabilistic/head veya tail sampling kullanabilir. Sampling kararı
SLO metric'lerini değiştirmez; availability/latency metrikleri sampled trace sayısından türetilmez.

Her kritik alert severity, owner, runbook linki, dedup/grouping key, cooldown ve recovery bildirimi
taşır. Runbook'suz kritik alert veya kullanıcı/resource kimliğine göre sınırsız alert serisi kabul
edilmez.

## Gerekçe

- Açık SLO ve error budget release hızını ölçülebilir güvenilirlik sınırına bağlar.
- Mevcut milestone threshold'larını korumak önceki performans sözleşmelerinin gevşemesini önler.
- OpenTelemetry uyumlu abstraction telemetry sağlayıcısına bağımlılığı sınırlar.
- Bounded label allowlist cardinality patlamasını ve kullanıcı verisinin metric'e sızmasını önler.
- Merkezi redaction, aynı güvenlik politikasını log, trace ve hata yollarında uygular.

## Sonuçlar

### Olumlu

- API, queue ve worker yolculukları release/commit bağlamıyla uçtan uca izlenebilir.
- Availability, latency, worker reliability ve freshness ayrı failure alanları olarak görünür.
- Error-budget burn operasyonel öncelik ve rollout kararına doğrudan bağlanır.
- Secret/PII leakage ve yüksek cardinality riski test edilebilir kurallara dönüşür.

### Olumsuz

- Telemetry collector, dashboard, alert ve SLO hesaplama altyapısı işletim maliyeti getirir.
- Redaction ve cardinality allowlist yeni alanlar eklendikçe bakım gerektirir.
- %99,5 worker terminal hedefi workload eligibility ve cancellation sınıflandırmasının doğru
  tutulmasını gerektirir.
- Sampling nedeniyle tekil başarılı request'lerin tüm span ayrıntıları her zaman bulunmayabilir.

## Değerlendirilen alternatifler

Yalnız application logları, vendor-specific telemetry SDK'sı ve sınırsız per-user/per-resource
metric label'ları değerlendirilmiştir. İlki distributed akışı ve SLO'yu kanıtlamaz; ikincisi
sağlayıcı kilidi yaratır; üçüncüsü maliyet, gizlilik ve cardinality riski taşır. Bu nedenle
OpenTelemetry uyumlu, bounded ve redaction-first standart seçilmiştir.
