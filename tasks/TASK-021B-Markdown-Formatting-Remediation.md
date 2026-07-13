# TASK-021B — Markdown Formatting Remediation

**Durum:** Hazır  
**Bağımlılık:** TASK-021A

## Amaç

`pnpm format:check` tarafından raporlanan dokuz Markdown dosyasını ve varsa diğer format farklarını düzeltmek.

## Kurallar

- Önce başarısız dosyaların tam yollarını kaydet.
- Mevcut Prettier config ve sürümünü kullan.
- Ignore listesi veya format kapsamını değiştirme.
- Belge anlamını değiştirme.

## Kabul kriterleri

- `pnpm format:check` başarılı.
- `git diff --check` başarılı.
- Yeni ignore kuralı yok.
- Değişiklikler yalnız formatting niteliğinde.

## T3 Code prompt

```text
TASK-021B görevini uygula.
Milestone audit raporundaki dokuz Markdown format hatasını incele.
Önce başarısız dosyaları tam yollarıyla listele.
Repository'nin mevcut Prettier config'iyle formatla.
Ignore listesi veya script kapsamı değiştirme.
Sonunda pnpm format:check ve git diff --check çalıştır.
```
