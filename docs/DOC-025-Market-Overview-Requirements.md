# DOC-025 — Market Overview Requirements

**Sürüm:** 1.0  
**Durum:** Uygulamaya hazır  
**Pazar:** Borsa İstanbul

## 1. Amaç

Kullanıcıya BIST'in mevcut durumunu tek ekranda, tek mantıksal veri cutoff'u ve açık tazelik bilgisiyle sunmak.

## 2. Piyasa özeti

- desteklenen BIST endeksleri
- son değer
- günlük değişim
- günlük yüzde değişim
- veri zamanı
- stale durumu
- piyasa açık/kapalı durumu, takvim modülü destekliyorsa

## 3. Piyasa genişliği

- yükselen sembol sayısı
- düşen sembol sayısı
- değişmeyen sembol sayısı
- yeni 20/52 haftalık zirve
- yeni 20/52 haftalık dip
- SMA20/SMA50/SMA200 üzerinde sembol oranı
- pozitif/negatif hacim oranı

Eksik verili semboller paydada sessizce kullanılmaz; `evaluatedCount` ve `excludedCount` ayrı döner.

## 4. Lider listeleri

- en çok yükselenler
- en çok düşenler
- en yüksek hacim
- en yüksek göreli hacim
- en yüksek işlem değeri, veri destekliyorsa
- volatilite liderleri
- yeni breakout adayları

Listeler:

- cursor pagination,
- stable sort,
- aynı cutoff,
- BIST active universe

kullanır.

## 5. Sektör görünümü

- sektör günlük getirisi
- sektör içi yükselen/düşen sayısı
- toplam işlem hacmi
- breadth oranı
- en güçlü/en zayıf sektörler

Sektör karşılaştırması ağırlıklandırma yöntemini açıkça belirtir.

## 6. Veri tazeliği

Her blok:

- `dataCutoffAt`
- `sourceTimestamp`
- `stale`
- `partial`
- `excludedCount`

alanlarını taşıyabilir.

Farklı cutoff değerleri tek birleşik kartta sessizce karıştırılmaz.

## 7. Read model

Piyasa ana ekranı ağır çalışma zamanı hesaplarını her request'te yapmaz.

Ön hesaplanabilir:

- index summary
- breadth snapshot
- sector snapshot
- top-list snapshot

Read model kaynak market data ve indicator version bilgisi taşır.

## 8. Cache

Cache anahtarı en az:

```text
market
+ universeVersion
+ dataCutoffAt
+ calculationPolicyVersion
+ filter/sort/cursor
```

bileşenlerini içerir.

## 9. Güvenlik

- Public/free endpointler rate limited.
- Provider kodu ve ham hata kullanıcıya gösterilmez.
- Admin olmayan kullanıcı internal quality issue ayrıntısını göremez.
- Query limitleri backend'de uygulanır.

## 10. Kabul kriterleri

- Tüm kartlar açık veri cutoff'u gösterir.
- Breadth paydası ve excluded count testlidir.
- Top listelerde duplicate/missing row yoktur.
- Sector aggregation deterministiktir.
- Cache invalidation yeni closed bar ile çalışır.
- Stale/partial davranışı testlidir.
