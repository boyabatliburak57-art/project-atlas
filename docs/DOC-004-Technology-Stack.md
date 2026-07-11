# DOC-004 — Technology Stack and Engineering Decisions

**Sürüm:** 1.0  
**Durum:** Onay için hazır  
**Kapsam:** MVP ve ilk production sürümü

## 1. Amaç

Bu belge, Project Atlas'ın ilk sürümünde kullanılacak teknoloji tercihlerini, tercih nedenlerini ve kullanım sınırlarını tanımlar.

Amaç en fazla teknoloji kullanmak değil; BIST odaklı tarama ürününü güvenilir, test edilebilir ve yönetilebilir şekilde geliştirmektir.

## 2. Mimari başlangıç noktası

Project Atlas ilk aşamada:

- modüler monolith,
- tek repository,
- ayrı web, API ve worker uygulamaları,
- ortak domain paketleri,
- PostgreSQL ve Redis,
- Docker tabanlı yerel geliştirme

yaklaşımıyla geliştirilecektir.

Mikroservis mimarisine başlangıçta geçilmeyecektir.

## 3. Repository ve package yönetimi

### Karar

- Monorepo: `pnpm workspaces`
- Build orchestration: `Turborepo`
- Package manager: `pnpm`
- Node sürümü: repository içinde sabitlenecek
- Kilit dosyası: `pnpm-lock.yaml` commit edilecek

### Gerekçe

- frontend, backend ve worker arasında ortak tiplerin paylaşılması,
- tek komutla lint, test ve build,
- görev bazlı cache,
- daha kolay dependency yönetimi.

## 4. Frontend

### Temel teknoloji

- Next.js
- React
- TypeScript strict mode
- Tailwind CSS
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod
- Zustand yalnızca gerekli yerel durumlarda
- TradingView Lightweight Charts veya lisans uyumlu eşdeğer

### İlkeler

- Server state, TanStack Query ile yönetilir.
- Form doğrulama, frontend ve backend arasında ortak Zod şemalarıyla mümkün olduğunca paylaşılır.
- İş kuralları React bileşenlerinde tutulmaz.
- Büyük sonuç tablolarında sanallaştırma kullanılabilir.
- Grafik kütüphanesi provider verisine doğrudan bağlanmaz; normalize edilmiş chart modelini kullanır.
- UI bileşenleri erişilebilirlik gereksinimlerini karşılamalıdır.

### Kapsam dışı

- İlk aşamada native mobil uygulama
- Karmaşık client-side global store
- UI içinde indikatör hesaplama
- Tarayıcı içinde büyük veri işleme

## 5. Backend

### Temel teknoloji

- NestJS
- TypeScript strict mode
- REST API
- OpenAPI
- Zod veya class-validator kullanımına ilişkin tek bir standart seçilecek
- Prisma veya Drizzle arasında fiziksel veri tasarımı sırasında tek seçim yapılacak
- BullMQ
- structured logging
- OpenTelemetry uyumlu izlenebilirlik

### İlkeler

- Controller yalnızca taşıma ve doğrulama katmanıdır.
- Domain kuralları application/domain katmanında tutulur.
- Repository arayüzleri domain ile altyapıyı ayırır.
- Provider entegrasyonları adapter katmanındadır.
- Uzun süren işlemler request lifecycle içinde çalıştırılmaz.
- Her endpoint için açık hata kodu bulunur.

## 6. Worker

Worker uygulaması aşağıdaki görevleri çalıştırır:

- piyasa verisi ingest,
- veri doğrulama,
- bar aggregation,
- indikatör hesaplama,
- hazır tarama ön hesaplama,
- ağır kullanıcı taraması,
- alarm değerlendirme,
- dışa aktarma,
- bildirim gönderme.

Worker işlemleri idempotent olacak şekilde tasarlanır.

## 7. Veri katmanı

### PostgreSQL

Saklanacak ana veriler:

- kullanıcılar,
- yetkiler,
- sembol ana verisi,
- fiyat barları,
- temel analiz verileri,
- kayıtlı taramalar,
- tarama çalıştırmaları,
- alarmlar,
- portföy işlemleri,
- denetim kayıtları.

### Redis

Kullanım alanları:

- job queue,
- kısa ömürlü cache,
- rate limit sayaçları,
- distributed lock,
- alarm deduplication,
- scan progress.

Redis, kalıcı iş verisinin tek kaynağı olmayacaktır.

### TimescaleDB değerlendirmesi

İlk migration'da zorunlu değildir.

Aşağıdaki metrikler ölçüldükten sonra değerlendirilir:

- fiyat barı toplam satır sayısı,
- sorgu gecikmesi,
- retention ihtiyacı,
- compression kazancı,
- operasyonel maliyet.

## 8. Kimlik doğrulama

İlk sürüm:

- e-posta ve parola,
- access token,
- refresh token rotation,
- e-posta doğrulama,
- parola sıfırlama,
- hesap kilitleme/rate limit.

Parolalar Argon2id veya eşdeğer güncel yöntemle hash edilir.

## 9. Test araçları

- Unit test: Vitest veya Jest; monorepo genelinde tek standart
- API integration: Supertest veya eşdeğer
- End-to-end: Playwright
- Database integration: gerçek PostgreSQL test container veya izole test veritabanı
- Contract test: OpenAPI doğrulama
- Performance: k6 veya eşdeğer
- Static analysis: ESLint, TypeScript, dependency boundary kontrolü

## 10. DevOps

İlk aşama:

- Docker Compose local ortam
- GitHub Actions CI
- lint
- typecheck
- unit test
- integration test
- build
- migration validation
- dependency audit

Production platformu ayrı deployment dokümanında kararlaştırılacaktır.

## 11. Versiyon politikası

- Exact sürümler lock file ile sabitlenir.
- Framework major sürüm yükseltmeleri ayrı görev olarak yapılır.
- Otomatik dependency yükseltmeleri doğrudan merge edilmez.
- Kritik güvenlik güncellemeleri öncelikli değerlendirilir.
- Sürüm seçimi yapılırken resmi destek ve uyumluluk belgeleri doğrulanır.

## 12. Yasaklı başlangıç tercihleri

Aşağıdakiler ölçülmüş ihtiyaç olmadan eklenmez:

- Kubernetes
- Kafka
- birden fazla SQL veritabanı
- mikroservisler
- GraphQL
- Elasticsearch
- ayrı feature store
- çoklu bulut
- event sourcing
- CQRS'in tüm sisteme uygulanması

## 13. Kabul kriterleri

- Her teknoloji için kullanım amacı tanımlıdır.
- Uygulama, veri ve worker sınırları açıktır.
- Kalıcı veri ile cache ayrılmıştır.
- İlk sürümde gereksiz dağıtık sistem bileşeni bulunmaz.
- Teknoloji seçimi görev kartlarıyla uygulanabilir durumdadır.
