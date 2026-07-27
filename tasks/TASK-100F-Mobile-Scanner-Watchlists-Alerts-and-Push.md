# TASK-100F — Mobile Scanner, Watchlists, Alerts and Push

**Durum:** BLOCKED_BY_TASK-100E  
**Bağımlılıklar:** TASK-100D, TASK-100E

## Amaç

Scanner, watchlists, alerts ve güvenli native push akışlarını mobile sunmak.

## Mevcut durum

Scanner worker/API, saved scans/presets, watchlist, alert evaluation, in-app notification, quiet
hours ve sandbox e-mail vardır. Push device modeli/delivery/deep link yoktur.

## Kapsam

Saved/Create/History; presetler; bottom-sheet grouped AND/OR filter builder, validation, preview,
save/run; cursor results/actions; multi-watchlist CRUD/reorder; supported alert types/states/
delivery; push permission/token refresh/user-device binding/logout invalidation/dedupe/quiet hours/
preferences; symbol/alert/scan/report/backtest deep links.

## Kapsam dışı

Unsupported fundamentals/dividend/risk alertlerini var göstermek; sandbox e-maili production
saymak; background financial mutation.

## Bağımlılıklar

Scanner/alerts/watchlists/notifications APIs/workers, Expo Notifications, capability policy,
TASK-100J app-link/security.

## Mimari gereksinimler

Push token is owner/device/install scoped, hashed/redacted where appropriate and revocable. Delivery
idempotency prevents duplicates. Results use opaque server cursor. Filter AST remains versioned
domain contract; UI does not reinterpret evaluator rules.

## API gereksinimleri

Device register/rotate/revoke, channel preferences and push receipts require OpenAPI, database
ownership constraints, audit and worker adapter. Deep-link payload is typed target + opaque ID only.

## UI/UX gereksinimleri

Scanner Search ana özelliğidir. Watchlists/alerts Markets ve More'dan erişilir. Matched conditions,
preview count, progress, error/cancel ve alert last-evaluated/value/trigger/channel görünürdür.

## Güvenlik gereksinimleri

Device-token takeover/IDOR, replay, logout revocation, notification preview privacy, unsafe link,
payload injection and log leakage tests. Server reauthorizes target on tap.

## Accessibility gereksinimleri

Bottom sheet focus trap/restore, chip selected state, reorder alternatives, alert state text,
screen-reader result summaries and touch targets.

## Unit testleri

AST builder/validation, cursor accumulation, notification link parser, dedupe/idempotency, token
rotation/revocation, quiet-hour calculation.

## Integration testleri

Scanner save/run/history/results, watchlist CRUD, alert lifecycle, device ownership, worker push
attempt/receipt and capability gates.

## Mobile E2E testleri

Scanner create/run, result actions, watchlist, alert, permission deny/grant, simulated push links,
logout invalidation and offline fail-closed.

## Visual regression testleri

Scanner tabs/builder/results, watchlists, alerts/preferences and push rationale light/dark/device
matrix.

## Kabul kriterleri

Real cursor pagination; duplicate push 0; device-token/alert/watchlist/scan IDOR 0; logout-bound
token active 0; sandbox e-mail production claim 0; required routes open after reauthorization.

## Yasak yöntemler

Client-side fake scan result; offset pretending cursor; unowned token upsert; secrets in push body;
automatic offline create/update; production e-mail claim.

## Çıktı raporu

`reports/mobile/task-100f-scanner-alerts-push.md`, delivery/provider matrix and IDOR evidence.

## Ayrıntılı T3 Code uygulama prompt'u

```text
TASK-100F'yi uygula. Mevcut versioned scanner AST/runtime, watchlist ve alert contracts'ı koru.
Mobile Scanner Saved/Create/History, accessible bottom-sheet builder ve real cursor results ekle.
Watchlist/alerts dual navigationı tamamla. Push device register/rotate/revoke, worker delivery,
dedupe, quiet hours, channel preferences ve typed deep links'i owner-scoped OpenAPI/database
contracts ile kur. Push tap hedefini serverda yeniden yetkilendir. Sandbox e-maili production
gösterme. Unit/integration/E2E/visual/a11y, token ownership, IDOR ve leakage testlerini raporla.
```
