# ADR-024 — Authoritative Feature Flags ve Auditli Kill Switch'ler

**Durum:** Accepted  
**Tarih:** 2026-07-20

## Bağlam

Release, experiment, entitlement, maintenance ve operational kill switch kararlarının API ve birden
fazla worker instance'ında aynı sonucu vermesi gerekir. Yalnız process environment veya Redis'te
tutulan flag, runtime değişikliklerinde tutarsızlık ve cache kaybında yanlış davranış yaratır.
Percentage rollout kararsızsa aynı kullanıcı her istekte farklı varyanta düşebilir.

Scanner/backtest create, alert/e-mail delivery, portfolio import, experiment, export ve refresh gibi
pahalı veya riskli yollar incident sırasında ayrı ayrı durdurulabilmelidir. Bu işlemler yetkisiz
kullanıcıya açılmamalı ve kim tarafından, neden, hangi önce/sonra state ile değiştirildiği
kanıtlanmalıdır.

## Karar

Feature flag ve kill switch'lerin authoritative store'u PostgreSQL'dir. Her flag immutable,
environment-scoped version kaydı; type, enabled state, targeting rules, rollout percentage, owner,
expiry/review date, reason ve changed-by bilgisi taşır. Redis yalnız hızlandırıcı cache ve
invalidation fan-out katmanıdır; source of truth değildir.

Evaluation deterministiktir. Percentage rollout versioned stable hash kullanır:

```text
hash(flagKey + flagVersion + environment + boundedSubjectKey) → [0, 100)
```

Targeting schema allowlist ve boyut sınırlarıyla doğrulanır; secret, e-mail veya serbest ifade/
çalıştırılabilir kod içermez. Evaluation yalnız gerekli user/resource context'ini alır ve sonucunu
flag version ile döndürür.

Redis cache miss/restart durumunda evaluator bounded PostgreSQL fallback kullanır ve cache'i günceller.
PostgreSQL de kullanılamıyorsa type bazlı önceden kaydedilmiş güvenli default uygulanır:

- release/experiment/entitlement flag'leri deny/disabled,
- yeni pahalı write/job create yolları ve delivery/refresh kill switch'leri fail-safe biçimde
  durdurulmuş,
- tamamlanmış private veriye ownership kontrollü read erişimi gereksiz yere kapatılmamış

olur. Fallback sonucu metric/log warning üretir ve secret/provider payload içermez.

Kill switch en az scanner run creation, alert evaluation, e-mail delivery, portfolio import,
backtest creation, experiment creation, export ve fundamentals/pattern refresh production
yollarında hem command kabul noktası hem gerekiyorsa worker execution/checkpoint sınırında uygulanır.
Mevcut tamamlanmış sonuçlar varsayılan olarak okunabilir kalır. Cancellation veya active-job
davranışı her switch'in versioned policy'sinde açıkça tanımlanır.

Flag değişikliği, kill switch, queue pause/resume, controlled retry/cancel ve release rollback ayrı
admin scope, RBAC/IDOR, CSRF/rate-limit ve explicit confirmation gerektirir. Her tehlikeli işlem
actor, reason, target, environment, before/after state, request/correlation ID ve timestamp ile
immutable operational audit event üretir. Arbitrary queue adı/payload, arbitrary DB query veya
secret görüntüleme desteklenmez. Terminal operation state ikinci kez sessizce değiştirilmez;
optimistic version conflict döner.

Expired flag CI/runtime warning ve admin raporu üretir. Flag kaldırma, kod referansı ve rollout
tamamlandıktan sonra ayrı lifecycle adımıdır; audit history silinmez.

## Gerekçe

- PostgreSQL durable version/audit kaydı instance'lar arasında tek karar kaynağı sağlar.
- Redis cache bounded request maliyeti sunarken kaybı doğruluk kaybına dönüşmez.
- Stable hash aynı subject için deterministik rollout sağlar.
- Type bazlı güvenli fallback, control-plane kesintisinde riskli yeni iş başlatılmasını önler.
- Admin confirmation ve immutable audit incident müdahalesini hesap verebilir kılar.

## Sonuçlar

### Olumlu

- API ve worker aynı flag version ve targeting semantiğini kullanır.
- Redis restart veya duplicate invalidation yanlış rollout üretmez.
- Incident sırasında riskli iş akışları bounded ve auditli biçimde durdurulabilir.
- Cross-environment ve cross-user flag sızıntısı RBAC/context kontrolleriyle test edilebilir.
- Tamamlanmış sonuçlara read erişimi operasyonel switch'ten gereksiz etkilenmez.

### Olumsuz

- PostgreSQL version store, cache invalidation ve fallback uygulaması ek runtime karmaşıklığı getirir.
- Fail-safe default control-plane kesintisinde bazı yeni işleri geçici olarak reddedebilir.
- Her production yolunun switch kontrol noktalarını ve lifecycle davranışını koruması gerekir.
- Flag cleanup yapılmazsa stale/expired flag teknik borcu oluşur.

## Değerlendirilen alternatifler

Environment-only flag, Redis-authoritative flag ve üçüncü taraf flag sağlayıcısına doğrudan domain
bağımlılığı değerlendirilmiştir. Environment-only runtime değişim/audit sağlamaz. Redis-authoritative
yaklaşım cache kaybında doğruluk riski taşır. Provider'a doğrudan bağımlılık taşınabilirliği ve
fallback kontrolünü azaltır. Bu nedenle PostgreSQL-authoritative, Redis-cached ve auditli model
seçilmiştir.
