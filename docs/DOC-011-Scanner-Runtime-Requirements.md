# DOC-011 — Scanner Runtime Requirements

**Sürüm:** 1.0  
**Durum:** Uygulamaya hazır

## 1. Amaç

Scanner Runtime, Scanner Execution Planner tarafından üretilen planı BIST enstrüman evreni üzerinde çalıştırır; gerekli piyasa verisini ve indikatör sonuçlarını toplar, kuralları değerlendirir, açıklanabilir sonuçları saklar ve ilerleme durumunu kullanıcıya sunar.

## 2. Kapsam

- scan run oluşturma ve state machine
- idempotency
- universe snapshot
- tek mantıksal data cutoff
- senkron/asenkron çalışma kararı
- BullMQ worker ve batch çalışma
- indicator batch execution
- üç durumlu evaluation
- açıklama üretimi
- result persistence ve pagination
- progress, cancellation ve timeout
- retry ve retention

## 3. Run durumları

- `queued`
- `running`
- `completed`
- `failed`
- `cancelRequested`
- `cancelled`
- `expired`

Terminal durumlar tekrar aktif duruma dönmez. `completed` yalnızca zorunlu batch'lerin tamamı başarılı olduğunda oluşur.

## 4. Run oluşturma sırası

1. Kimlik doğrulama ve kaynak sahipliği
2. Entitlement ve kota
3. Idempotency key kontrolü
4. Rule AST validation
5. Execution plan
6. Complexity limit
7. Universe resolution
8. Data cutoff üretimi
9. Transaction içinde run kaydı
10. Queue dispatch

## 5. Universe snapshot

Run başlangıcındaki enstrüman evreni immutable olmalıdır. Snapshot; instrument ID'lerini veya yeniden üretilebilir snapshot referansını, filtreleri ve çözümleme zamanını saklar. Run devam ederken yeni listelenen veya durumu değişen semboller mevcut run'a eklenmez.

## 6. Data cutoff

Her run tek `dataCutoffAt` değeri kullanır. Farklı sembollerde veri gecikmesi ölçülür; stale policy warning veya `notEvaluable` üretebilir. Açık bar kullanımı run meta verisinde açıkça belirtilir.

## 7. Batch execution

Evren, konfigüre edilebilir batch'lere bölünür. Her batch:

1. cancellation durumunu kontrol eder,
2. barları yükler,
3. unique indicator taleplerini hesaplar,
4. operand değerlerini oluşturur,
5. evaluator çalıştırır,
6. result ve warning'leri idempotent yazar,
7. progress'i günceller.

## 8. Sonuç saklama

Varsayılan olarak `matched` sonuçlar ve politika gerektiriyorsa `notEvaluable` sonuçlar saklanır. Tüm `notMatched` sonuçların kalıcı saklanması varsayılan değildir. Result en az şunları içerir:

- instrument
- status
- rank, varsa
- data cutoff
- computed values
- explanation version
- warnings
- source batch

## 9. Açıklanabilirlik

Node bazlı açıklama:

- nodeId
- status
- current value
- previous value, gerekiyorsa
- operator
- timeframe
- notEvaluable reason
- warning

bilgilerini taşımalıdır. İç stack trace ve provider raw payload açıklamaya girmez.

## 10. Idempotency

Run anahtarı:

```text
user + idempotency key + normalized request hash
```

Aynı key ve aynı request aynı run'ı döndürür. Aynı key ve farklı request `IDEMPOTENCY_KEY_REUSED` üretir. Batch retry duplicate result üretmemelidir.

## 11. Cancellation

Kullanıcı yalnızca kendi run'ını iptal eder. Cancellation cooperative'dir; worker batch sınırlarında kontrol eder. Terminal run iptal edilemez. Partial result politikası açıkça belirtilir.

## 12. Retry ve timeout

Retry edilebilir: geçici DB/Redis, worker interruption ve geçici veri erişim hataları. Retry edilmez: invalid rule, entitlement, unsupported indicator, deterministic calculation error.

Timeout türleri queue wait, run execution ve batch timeout olarak ayrılır.

## 13. Progress

Progress monoton artmalıdır ve en az:

- total instruments
- processed instruments
- matched instruments
- notEvaluable count
- phase
- percent
- updatedAt

alanlarını taşımalıdır. Redis kaybı kalıcı run sonucunu kaybettirmemelidir.

## 14. Güvenlik

- Run/result/cancel endpointlerinde backend ownership kontrolü
- IDOR testleri
- Complexity ve quota uygulaması
- Rate limit
- Explanation sanitization
- Export için ayrı limit
- Admin erişimi için ayrı permission

## 15. Gözlemlenebilirlik

Metrikler: queue wait, execution duration, batch duration, processed/matched/notEvaluable, cache hit, cancellation, timeout ve failure code dağılımı.

Log alanları: `runId`, `batchId`, `jobId`, `userId`, `planVersion`, `ruleVersion`, `dataCutoffAt`, `correlationId`.

## 16. Kabul kriterleri

- State machine ve geçersiz transition testli
- Duplicate run ve duplicate result engelleniyor
- Universe snapshot ve data cutoff immutable
- Progress monoton
- Cancellation cooperative
- Redis progress kaybında PostgreSQL fallback
- Ownership/IDOR testleri başarılı
- Node bazlı explanation üretilebiliyor
