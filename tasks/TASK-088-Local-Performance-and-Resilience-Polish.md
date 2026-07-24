# TASK-088 — Local Performance and Resilience Polish

Staging kanıtı yerine geçmemek üzere local/CI regresyonlarını çalıştır ve düzelt:

- API query counts
- N+1
- bundle size
- route-level loading
- cache correctness
- worker restart local integration
- Redis local restart
- PostgreSQL reconnect local integration
- report generation limits
- search/activity/report pagination
- memory leak smoke

Rapor:

`reports/prestaging-local-performance.md`

Açıkça `NOT_STAGING_EVIDENCE` etiketi taşımalı.
