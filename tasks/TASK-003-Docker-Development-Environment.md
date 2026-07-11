# TASK-003 — Docker Development Environment

**Durum:** Hazır  
**Bağımlılık:** TASK-002

## Amaç

Yerel geliştirme için PostgreSQL ve Redis servislerini Docker Compose ile çalıştırmak.

## Gereksinimler

- `compose.yaml`
- PostgreSQL ve Redis named volume
- healthcheck
- `.env.example`
- değiştirilebilir portlar
- sabit servis isimleri
- local geliştirme README'si

## Kapsam dışı

- production deployment
- Kubernetes
- API migration
- gerçek piyasa verisi

## Kabul kriterleri

- `docker compose up -d` başarılı
- PostgreSQL ve Redis healthy
- `docker compose down` varsayılan olarak veriyi silmez
- secret değerler repoya yazılmaz
- bağlantı örnekleri belgelenir

## T3 Code prompt

```text
tasks/TASK-003-Docker-Development-Environment.md görevini uygula. Monorepo ve mimari belgelerini oku. Yalnızca local geliştirme için PostgreSQL ve Redis içeren compose.yaml oluştur. Healthcheck, named volume ve .env.example ekle. Production altyapısı oluşturma. Servisleri çalıştırıp sonucu raporla.
```
