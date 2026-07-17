# DOC-024 — Pagination and Regression Performance Gates

**Sürüm:** 1.0  
**Durum:** Uygulamaya hazır

## 1. Gerçek API yolu

Kullanıcıya dönük koleksiyon performansı yalnız repository adapter seviyesinde ölçülemez. Zorunlu yol:

```text
HTTP → auth/session → ownership → request validation → cursor validation
→ application service → repository → mapping → response serialization
```

## 2. Cursor sözleşmesi

Cursor:

- opaque ve versioned,
- sort alanı/direction bağlı,
- stable unique tie-breaker içeren,
- filter/query context hash taşıyan,
- portfolio ve user bağlamına bağlı,
- projection ledger version ile tutarlı

olmalıdır.

## 3. Stable pagination

Her sort:

```text
primary sort + unique tie-breaker
```

kullanır. Aynı primary değere sahip kayıtlar duplicate veya missing row üretmez.

## 4. Positions invariant'ları

- İlk, orta ve son sayfa doğru çalışır.
- `nextCursor` yalnız devam varsa döner.
- Başka portfolio/user cursor'ı reddedilir.
- Sort/filter mismatch reddedilir.
- Projection version değişirse restart/conflict davranışı oluşur.
- Tüm kayıtlar eksiksiz ve tekrarsız dolaşılır.
- Limit üst sınırı backend'dedir.

## 5. PERF-PORT-006

- 1.000 position fixture
- gerçek PostgreSQL
- gerçek API process
- auth/ownership/application/mapping dahil
- p95 ≤ 500 ms
- error = 0
- duplicate = 0
- missing = 0
- cursor invariant failure = 0

Adapter sorgu süresi ayrıca raporlanabilir; ana kapı gerçek API süresidir.

## 6. Watchlist regresyonu

Watchlist market summary aynı TASK-040 GO baseline fixture, endpoint, enrichment, stale/data-cutoff ve active alert count davranışıyla yeniden ölçülür.

Zorunlu eşik:

```text
p95 ≤ 750 ms
```

## 7. Optimizasyon sınırları

Kabul edilebilir:

- N+1 kaldırma
- bulk lookup
- grouped alert count
- DB-level cursor pagination
- gerekli kolonları seçme
- uygun composite/index-only index
- cutoff-aware cache

Kabul edilmez:

- alan kaldırma
- fixture küçültme
- threshold yükseltme
- ownership bypass
- gerçek dışı cache prewarm
