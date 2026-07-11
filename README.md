# Project Atlas

Project Atlas, Borsa İstanbul (BIST) paylarını teknik ve temel verilerle tarayan; hazır ve kullanıcı tanımlı taramalar, alarm, izleme listesi, portföy ve ileride backtest yetenekleri sunacak modüler bir web uygulamasıdır.

## İlk sürüm kapsamı

- BIST sembol evreni ve şirket ana verisi
- OHLCV piyasa verisi entegrasyonu
- Teknik indikatör motoru
- Özelleştirilebilir tarama motoru
- Hazır taramalar ve kategoriler
- Çoklu zaman dilimi
- Hisse detay ekranı
- Watchlist ve favoriler
- Alarm sistemi
- Temel finansal filtreler
- Portföy takibi
- Admin, paket ve yetki temeli

## Kapsam dışı

- Otomatik emir iletimi
- Aracı kurum hesabına bağlanma
- Yatırım danışmanlığı
- ABD piyasaları, kripto, VİOP ve Forex

## Okuma sırası

1. `ATLAS_INDEX.md`
2. `T3_CODE_START_HERE.md`
3. `SYSTEM_PROMPT.md`
4. `docs/` içindeki belgeler
5. `architecture/`, `database/` ve `api/` belgeleri
6. Uygulanacak `tasks/TASK-xxx.md`

**Sürüm:** 0.1.0-foundation  
**Aşama:** Dokümantasyon ve temel proje hazırlığı

## Geliştirme

Gereksinimler:

- Node.js `22.14.0`
- pnpm `9.15.4`

Temel komutlar:

```bash
pnpm install
pnpm lint
pnpm typecheck
```

Monorepo; `apps/web`, `apps/api`, `apps/worker` ile `packages/config`, `packages/types`,
`packages/domain` ve `packages/validation` workspace'lerinden oluşur. Framework ve ürün
özellikleri henüz kurulmamıştır.

PostgreSQL ve Redis içeren yerel Docker ortamı için
[`guides/LOCAL_DEVELOPMENT.md`](guides/LOCAL_DEVELOPMENT.md) belgesini izleyin.
