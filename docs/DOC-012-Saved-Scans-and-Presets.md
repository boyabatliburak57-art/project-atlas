# DOC-012 — Saved Scans and Preset Scans

**Sürüm:** 1.0  
**Durum:** Uygulamaya hazır

## 1. Amaç

Kullanıcının özel taramalarını saklamasını, immutable revision'larla değiştirmesini, kopyalamasını ve çalıştırmasını; yöneticinin kategorize edilmiş hazır taramalar yayınlamasını sağlar.

## 2. Saved scan

Alanlar: owner, name, description, visibility, status, current revision, tags, timestamps. Varsayılan visibility `private` olmalıdır.

## 3. Immutable revision

Rule AST güncellemesi yeni revision oluşturur. Eski revision değiştirilemez ve geçmiş run ile ilişkisini korur. Her revision rule version, AST, complexity ve oluşturma bilgisini taşır.

## 4. Optimistic concurrency

Update isteği `expectedRevision` veya ETag taşır. Eski revision üzerinden update `SAVED_SCAN_CONFLICT` üretir.

## 5. Clone

Clone yeni resource ve ownership oluşturur. Yetkisiz kullanıcı özel kaynağı clone edemez. Kaynak revision audit metadata olarak saklanabilir.

## 6. Soft delete ve restore

Silinen scan yeni run başlatamaz. Belirlenen süre içinde restore edilebilir. Geçmiş run'lar retention policy dahilinde erişilebilir kalabilir.

## 7. Preset scan yaşam döngüsü

- `draft`
- `review`
- `published`
- `archived`

Published revision immutable'dır. Yeni değişiklik yeni draft revision oluşturur.

## 8. İlk kategoriler

- Trend
- Momentum
- Volume
- Volatility
- Moving Average
- Breakout
- Overbought/Oversold
- Multi-Timeframe

## 9. İlk presetler

- RSI Oversold
- RSI Recovery
- EMA 20/50 Bullish Cross
- MACD Bullish Cross
- Price Above SMA 200
- Relative Volume Spike
- Bollinger Lower Band Recovery
- Donchian 20 Breakout
- Supertrend Positive
- ADX Trend Strength

Her preset kullanılan koşulları ve veri zamanını açıklamalıdır.

## 10. Yetki ve kota

Saved scan sahipliği backend'de uygulanır. Preset write/publish admin permission gerektirir. Paket bazında saved scan, revision retention, günlük run ve concurrent run limitleri uygulanabilir.

## 11. Audit

Create, revision, clone, delete/restore, visibility change, publish ve archive işlemleri audit log üretir.

## 12. Kabul kriterleri

- Revision immutable
- Concurrent update conflict testli
- Private scan IDOR testli
- Deleted scan run başlatamıyor
- Published preset doğrudan düzenlenemiyor
- Clone yeni ownership oluşturuyor
- Seed ve publication idempotent
