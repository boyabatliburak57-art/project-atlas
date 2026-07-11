# API-002 — Instruments and Market Data API

**Sürüm:** 1.0  
**Durum:** Taslak  
**Base:** `/api/v1`

## 1. Instruments listesi

### `GET /instruments`

Query:

- `search`
- `sectorId`
- `marketCode`
- `status`
- `indexCode`
- `cursor`
- `limit`

Yanıt öğesi:

```json
{
  "id": "uuid",
  "symbol": "THYAO",
  "name": "Türk Hava Yolları A.O.",
  "marketCode": "BIST",
  "currencyCode": "TRY",
  "status": "active",
  "sector": {
    "id": "uuid",
    "name": "Ulaştırma"
  }
}
```

## 2. Instrument ayrıntısı

### `GET /instruments/{symbol}`

- sembol normalize edilir,
- bulunamazsa `INSTRUMENT_NOT_FOUND`,
- eski sembol alias ile eşleşirse canonical symbol döndürülebilir.

## 3. Bar verisi

### `GET /instruments/{symbol}/bars`

Query:

- `timeframe`
- `from`
- `to`
- `limit`
- `adjustment`
- `includeOpenBar`

Yanıt:

```json
{
  "data": [
    {
      "openTime": "2026-07-10T00:00:00Z",
      "closeTime": "2026-07-10T20:00:00Z",
      "open": "100.10",
      "high": "104.20",
      "low": "99.80",
      "close": "103.75",
      "volume": "12345678",
      "isClosed": true
    }
  ],
  "meta": {
    "symbol": "THYAO",
    "timeframe": "1d",
    "provider": "provider-code",
    "dataCutoffAt": "2026-07-10T20:00:00Z",
    "stale": false,
    "requestId": "req_..."
  }
}
```

## 4. Desteklenen timeframe

### `GET /market-data/timeframes`

Kullanıcı paketinden bağımsız teknik destek bilgisini döner.

## 5. Veri durumu

### `GET /market-data/status`

Public yanıtta yalnızca genel sağlık verisi gösterilir.

Admin ayrıntı endpointi ayrı permission gerektirir.

## 6. Hata kodları

- `INSTRUMENT_NOT_FOUND`
- `TIMEFRAME_NOT_SUPPORTED`
- `DATE_RANGE_INVALID`
- `DATE_RANGE_TOO_LARGE`
- `MARKET_DATA_NOT_AVAILABLE`
- `MARKET_DATA_STALE`
- `PROVIDER_UNAVAILABLE`

## 7. Güvenlik

- Public endpointlerde rate limit.
- Çok geniş tarih aralığı sınırlandırılır.
- Provider credential veya ham hata yanıtı döndürülmez.
- Admin olmayan kullanıcı provider iç detaylarını göremez.

## 8. Cache

Instrument listesi kısa süreli cache edilebilir.

Bar cache anahtarı:

```text
instrument + timeframe + range + adjustment + includeOpenBar
```

Açık bar içeren cache kısa ömürlü olmalıdır.
