# TASK-027 — Preset Scans and Seed Catalog

**Bağımlılık:** TASK-022, TASK-026

İlk kategori ve on preset'i versioned AST olarak seed et; katalog ve preset run endpointini oluştur.

## Kabul kriterleri

Seed idempotent, tüm AST'ler validator/planner'dan geçiyor, indicator versions mevcut, unpublished görünmüyor, source revision run'da saklanıyor.

```text
TASK-027 görevini uygula. DOC-012'deki presetleri ekle ve her birini registry/planner ile test et.
```
