# Yerel Geliştirme Ortamı

Bu ortam yalnızca yerel geliştirme içindir. PostgreSQL ve Redis host üzerinde yalnızca
`127.0.0.1` adresine açılır.

## Gereksinimler

- Docker Engine veya Docker Desktop
- Docker Compose

## İlk kurulum

Örnek ortam dosyasını kopyalayın ve `POSTGRES_PASSWORD` ile `DATABASE_URL` içindeki
örnek parolayı yalnızca kendi yerel ortamınız için değiştirin:

```bash
cp .env.example .env
docker compose up -d
docker compose ps
```

`.env` Git tarafından yok sayılır ve repoya eklenmemelidir.

## Bağlantılar

PostgreSQL:

```text
postgresql://atlas:<local-password>@127.0.0.1:5432/atlas
```

Redis:

```text
redis://127.0.0.1:6379
```

Portlar `.env` içindeki `POSTGRES_PORT` ve `REDIS_PORT` değerleriyle değiştirilebilir.

## Sağlık kontrolü

```bash
docker compose ps
docker compose exec postgres pg_isready -U atlas -d atlas
docker compose exec redis redis-cli ping
```

## Servisleri durdurma

```bash
docker compose down
```

Bu komut named volume'leri silmez. Verileri bilinçli olarak silmek gerektiğinde ayrıca
`docker compose down --volumes` kullanılmalıdır.
