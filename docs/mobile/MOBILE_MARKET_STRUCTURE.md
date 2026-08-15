# Mobile Market Structure

## Ownership

Market Structure is owned by `Markets → Piyasa Yapısı`. It does not add a primary tab or independent VBTS/Brüt Takas/Tek Fiyat products. Local navigation is limited to `Özet`, `Tedbirler`, and `Açığa Satış`.

## Product contract

The mobile client consumes TASK-110F1 canonical responses. It never resolves active state, selects the latest revision, or derives regulatory meaning locally. The interface distinguishes `Yayınlandı`, `Başlangıç`, and `Bitiş`, and renders server statuses as `Yaklaşan`, `Aktif`, `Sona Erdi`, `Düzeltildi`, `Önceki Sürüm`, or `İptal Edildi`.

The detail view uses a compact effective-period rail. This is a temporal reading aid, not a risk or price-direction indicator. Market measures use neutral state treatment and text labels; color alone never communicates state.

## Routes

- `/markets/market-structure`: overview
- `/markets/market-structure/measures`: bounded list and filters
- `/markets/market-structure/short-selling`: restriction/activity distinction
- `/markets/market-structure/:symbol`: symbol measure detail and bounded history

Symbol Detail contains only a compact summary and canonical detail CTA. Watchlist and portfolio filters reuse existing user-scoped ownership; no Market Structure watchlist exists.

## States and cache

`PROVIDER_REQUIRED`, `LICENSE_REQUIRED`, `NOT_AVAILABLE`, delayed/stale data, and no-data states are distinct. No-data is shown only after supported provider coverage; provider failure is never translated to “Tedbir bulunmuyor.” Read-only caching is permitted only when the response license permits it, and stale cached data must not claim current active status.

Test fixtures are compile-time excluded from production and require the local E2E harness plus `fixture=1`.
