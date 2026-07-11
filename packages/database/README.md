# Database

Project Atlas PostgreSQL şeması, Drizzle migration'ları ve başlangıç seed'i.

## Komutlar

```bash
pnpm --filter @atlas/database db:generate
pnpm --filter @atlas/database db:migrate
pnpm --filter @atlas/database db:seed
pnpm --filter @atlas/database test
```

Integration testi yalnızca adı `_test` ile biten izole bir PostgreSQL veritabanında çalışır:

```bash
TEST_DATABASE_URL=postgresql://atlas:<local-password>@127.0.0.1:5432/atlas_test \
  pnpm --filter @atlas/database test:integration
```

Test public şemayı silip yeniden oluşturduğu için development veya production veritabanı URL'si
kabul edilmez.

## Seed

Seed, `manual-import` kodlu inactive provider kaydını sabit UUID ve upsert ile oluşturur. Aynı
seed tekrar çalıştırılabilir ve duplicate kayıt üretmez.

## Geri dönüş

Migration'lar forward-only uygulanır. Geri dönüş için uygulama rollback'i, veri kaybetmeyen
compensating migration ve gerektiğinde doğrulanmış backup restore sırası izlenir. TimescaleDB,
partition ve destructive migration bu başlangıç paketinde yoktur.
