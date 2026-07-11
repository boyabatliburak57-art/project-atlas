# Worker

Project Atlas BullMQ worker uygulaması.

## Yerel geliştirme

Redis'i başlatın, repository kökündeki `.env.example` dosyasını `.env` olarak kopyalayın
ve worker'ı çalıştırın:

```bash
docker compose up -d redis
pnpm --filter worker dev
```

Worker açılışta Redis bağlantısını doğrular, internal heartbeat işini kuyruğa ekler ve
`SIGINT`/`SIGTERM` sırasında yeni iş almayı durdurup aktif işi tamamlayarak kapanır.

## Queue standardı

Queue adları `atlas.<domain>.v<major>` biçimindedir:

- `atlas.system.v1`
- `atlas.system.dead-letter.v1`
- `atlas.market-data.v1`

Job adları `<domain>.<operation>.v<major>` biçimindedir. Heartbeat işi
`system.heartbeat.v1` adını kullanır.

Instrument senkronizasyon handler'ı `market-data.instrument-sync.v1` iş adını kullanır. Queue
payload yalnızca provider code ve dry-run bayrağı taşır; provider response veya secret taşımaz.

## İdempotent job örneği

Heartbeat producer aynı zaman aralığında deterministik `jobId` üretir:

```text
worker-heartbeat-<interval-bucket>
```

BullMQ aynı queue içinde aynı `jobId` değerini ikinci kez kabul etmediği için aynı mantıksal
heartbeat tekrar kuyruğa yazılmaz. Gerçek işlerde `jobId`, provider + instrument + timeframe +
requested range gibi doğal idempotency anahtarından türetilmelidir.

## Retry ve dead-letter

- Varsayılan 5 deneme
- Exponential backoff, 1 saniye başlangıç ve jitter
- Başarısız iş ana queue'da korunur
- Son denemeden sonra dead-letter queue'ya yalnızca güvenli metadata yazılır
- Ham payload, hata mesajı ve stack dead-letter kaydına kopyalanmaz

## Market data provider sınırı

`src/market-data/providers` dış sağlayıcıları worker/domain akışından ayırır:

- adapter çıktıları güvenilmeyen `unknown` veri olarak kabul edilir,
- capability, instrument ve bar yanıtları Zod ile normalize edilip doğrulanır,
- provider code registry üzerinden adapter'a çevrilir,
- retry edilebilir ve edilemez hatalar güvenli provider error kodlarına dönüştürülür,
- provider symbol yalnızca adapter/mapping sınırında kalır; internal instrument kimliği yerine
  geçmez.

Fake adapter yalnızca test ve sonraki ingest görevlerinin deterministik doğrulaması içindir.

## BIST instrument import

Instrument import pipeline:

- canonical BIST sembolünü normalize eder ve geçersiz karakteri reddeder,
- duplicate provider symbol ve duplicate ISIN kayıtlarını raporlar,
- instrument'ı mapping, ISIN veya aktif normalized symbol üzerinden eşleştirir,
- instrument ve provider mapping değişikliklerini transaction içinde uygular,
- sembol değişikliğinde eski sembolü history tablosuna yazar,
- provider listesinden eksilen aktif mapping'leri yalnızca deactivation adayı olarak raporlar,
- dry-run sırasında ingestion run dahil hiçbir veritabanı kaydı oluşturmaz,
- gerçek koşuları `ingestion_runs` tablosunda completed/failed durumuyla izler.

## Kontroller

```bash
pnpm --filter worker lint
pnpm --filter worker typecheck
pnpm --filter worker test
TEST_DATABASE_URL=postgresql://atlas:password@127.0.0.1:5432/atlas_test \
  pnpm --filter worker test:integration
pnpm --filter worker build
```

Gerçek provider entegrasyonu, indikatör, scanner veya alarm iş mantığı bu kapsamda yer almaz.
