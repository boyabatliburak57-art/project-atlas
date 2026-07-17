# Chart Data Contract

## Response sections

- instrument
- timeframe
- adjustmentMode
- bars
- overlays
- panels
- markers
- metadata
- warnings

## Bar

```json
{
  "time": 1783987200,
  "open": "100.10",
  "high": "104.20",
  "low": "99.80",
  "close": "103.75",
  "volume": "12345678",
  "isClosed": true
}
```

## Overlay

- id
- indicatorCode/version
- parameters
- outputName
- points
- panel

## Marker

- time
- type
- label
- sourceType
- sourceId, yalnız yetkili kullanıcı kaynağıysa
- metadataVersion

## Invariant'lar

- timestamps ascending
- duplicate timestamp yok
- overlay point timestamps bar ekseniyle uyumlu
- NaN/Infinity yok
- raw ve adjusted aynı response'ta karıştırılmaz
- user marker ownership zorunlu
