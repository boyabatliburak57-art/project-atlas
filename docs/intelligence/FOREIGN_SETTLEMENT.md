# Foreign Settlement

Foreign settlement is exposed only when the source supplies an explicit `FOREIGN`/`DOMESTIC` classification. Atlas never infers residency from an institution name, brand, code, or type. Unknown classification stays `UNKNOWN`.

The `settlement.foreign` capability is independent from `settlement.snapshot`. If unavailable or unlicensed, the API and mobile surface return a provider/capability state rather than estimating a ratio. Display, export, sharing, caching, and delay rules follow provenance license metadata.
