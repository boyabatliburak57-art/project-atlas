# TASK-028 — Scanner Progress Delivery

**Bağımlılık:** TASK-024, TASK-025

Polling tabanlı progress DTO, Redis adapter, PostgreSQL fallback, monotonic progress, terminal stop ve ownership testlerini oluştur. SSE yalnız temiz ve testli olacaksa eklenebilir.

## Kabul kriterleri

Progress geriye gitmez; Redis unavailable fallback; terminal polling sabit; başka kullanıcı erişemez; stale progress algılanır.

```text
TASK-028 görevini uygula. Gereksiz WebSocket ekleme. Önce polling'i eksiksiz tamamla.
```
