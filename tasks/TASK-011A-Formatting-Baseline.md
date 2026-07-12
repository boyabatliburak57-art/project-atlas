# TASK-011A — Formatting Baseline Remediation

**Durum:** Hazır  
**Bağımlılık:** TASK-011

## Amaç

`pnpm format:check` başarısızlığını tüm v0.3 kapsamı için düzeltmek.

## Kapsam

- format kapsamını doğrulama
- başarısız dosyaları Prettier ile düzeltme
- root format script'ini doğrulama
- markdown format kapsamını koruma
- CI format check doğrulaması.

## Kapsam dışı

- kod davranışı değiştirme
- dosyaları format kontrolünden kaçırma
- generated olmayan dosyaları ignore etme.

## Kabul kriterleri

- `pnpm format:check` başarılı
- format komutu cache bağımsız doğrulanmış
- yalnızca format kaynaklı değişiklikler ayrı raporlanmış
- hiçbir dosyada anlam veya davranış değişikliği yok
- ignore listesine yeni istisna eklendiyse gerekçesi belgeli.

## T3 Code prompt

```text
TASK-011A görevini uygula.

Audit raporundaki format:check başarısızlığını incele.
Başarısız altı dosyayı ve varsa diğer format hatalarını Prettier ile düzelt.
Format kontrolünü geçmek için source veya markdown dosyalarını ignore etme.
Değişikliklerin yalnızca format olduğunu doğrula.
pnpm format:check komutunu cache dışı çalıştır ve sonucu raporla.
```
