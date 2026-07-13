# DOC-013 — Scanner User Experience Requirements

**Sürüm:** 1.0  
**Durum:** Uygulamaya hazır

## 1. Amaç

Kullanıcının kod yazmadan BIST tarama kuralı oluşturmasını, doğrulamasını, çalıştırmasını ve sonuçların neden eşleştiğini anlamasını sağlar.

## 2. Sayfa yapısı

```text
Scanner
├── Universe Panel
├── Rule Builder
├── Validation Summary
├── Run Controls
├── Progress
├── Results Table
└── Result Detail Drawer
```

## 3. Universe panel

- aktif BIST hisseleri
- endeks
- sektör
- pazar
- include symbols
- exclude symbols

## 4. Rule builder

Kullanıcı group ve condition ekleyebilir; AND/OR seçebilir; node taşıyabilir, kopyalayabilir ve silebilir. Condition akışı: left operand, timeframe, params, operator, right operand/value.

Indikatör ve operatör katalogları API'den alınır; UI hard-code etmez.

## 5. Validation

Local schema ve server validation birlikte kullanılabilir. Hata ilgili node üzerinde, özet panelinde ve erişilebilir metinle gösterilir. Complexity `Low`, `Medium`, `High` veya plan limitini aşıyor şeklinde sunulur.

## 6. Run

Run butonu invalid rule'da devre dışıdır. Duplicate submit idempotency key ile engellenir. Async run progress görünümüne geçer.

## 7. Progress fazları

- queued
- preparing data
- calculating indicators
- evaluating
- finalizing

Sahte progress gösterilmez; yüzde monoton ilerler.

## 8. Sonuç tablosu

Varsayılan kolonlar: symbol, company, last price, daily change, volume, relative volume, matched conditions ve data time. Kullanıcı sort, column visibility, density ve watchlist action kullanabilir.

## 9. Result detail

Her node için status, current/previous value, timeframe, operator, warning ve data cutoff gösterilir. `notEvaluable`, `notMatched` durumundan görsel ve metinsel olarak ayrılır.

## 10. Empty/error states

- no matches
- empty universe
- stale/partial data
- cancelled
- failed
- expired
- access denied

No matches hata gibi gösterilmez.

## 11. Saved scan

Kullanıcı taramayı name, description ve tags ile kaydedebilir. Revision conflict anlaşılır biçimde gösterilir.

## 12. Erişilebilirlik

Keyboard navigation, visible focus, labels, error association, screen reader status, modal focus trap ve color-only olmayan durum anlatımı zorunludur.

## 13. Kabul kriterleri

- AST API ile round-trip yapıyor
- Node hataları ilgili editöre bağlı
- Duplicate run oluşmuyor
- Progress terminal durumda duruyor
- Result explanation açılıyor
- notEvaluable ayrı gösteriliyor
- Temel akış Playwright E2E ile doğrulanıyor
