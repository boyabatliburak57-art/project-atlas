# TASK-100I — Mobile Reports, Help, Support and Settings

**Durum:** BLOCKED_BY_TASK-100H  
**Bağımlılıklar:** TASK-100H

## Amaç

More yüzeyinde rapor, activity, help, support, preferences, security ve account lifecycle
işlevlerini tamamlamak.

## Mevcut durum

Owner-scoped reports/activity/support, help catalog/demo reset, legal/consent, preferences, export/
deletion ve admin APIs/web yüzeyleri vardır. Native share/download ve mobile settings yoktur.

## Kapsam

More; tüm report türleri; detail generatedAt/cutoff/methodology/revisions/warnings/download/share/
expiry; activity; help search/categories/glossary/context/demo reset/support; language/timezone/
market/benchmark/chart/notifications/quiet hours/reduced motion/biometric/security/export/deletion/
legal/version; authorized admin entry.

## Kapsam dışı

Legal approval iddiası, unrestricted local file persistence, admin authorizationı yalnız clientta
yapmak, unsupported report üretmek.

## Bağımlılıklar

Reports/navigation/help/support/preferences/legal/security APIs, native share/file adapters and
TASK-100J security policies.

## Mimari gereksinimler

Downloads temporary protected storage, expiry and cleanup policy use. Share sheet explicit user
action requires. Help content version/locale-aware. Settings server/local ownership is documented.

## API gereksinimleri

Cursor reports/activity, expiring download, safe metadata, support attachment lifecycle, export/
deletion state and admin RBAC remain typed/owner-scoped.

## UI/UX gereksinimleri

Report stale/partial/expiry warnings prominent; methodology/source revisions readable. Account
deletion is discoverable but destructive confirmation/verification is explicit.

## Güvenlik gereksinimleri

Report/support/export/deletion IDOR, file traversal/MIME/active content, share leakage, temp-file
cleanup, admin RBAC, internal-note isolation and sanitized activity metadata.

## Accessibility gereksinimleri

Search results/headings, glossary, forms, destructive confirmation, download progress and settings
controls expose correct roles/states/focus.

## Unit testleri

Report metadata/warning/expiry, secure file naming/cleanup, help search, setting validation,
deletion state and admin visibility.

## Integration testleri

Reports/activity/help/demo reset/support/preferences/export/deletion/legal/admin authorization.

## Mobile E2E testleri

Report share, help/support, setting changes, security entry, export, account deletion entry/cancel,
admin authorized/unauthorized.

## Visual regression testleri

More and all sub-surfaces/states light/dark across phone/tablet.

## Kabul kriterleri

Required settings/reports present; native share user-initiated; temp sensitive residue 0; IDOR/
admin bypass 0; legal placeholder approved claim 0; accessibility critical 0.

## Yasak yöntemler

Permanent public report URL; silent share; internal support note exposure; unverified delete;
client-only admin; placeholder legal approval.

## Çıktı raporu

`reports/mobile/task-100i-reports-help-settings.md`, file-security/IDOR and screenshot evidence.

## Ayrıntılı T3 Code uygulama prompt'u

```text
TASK-100I'yi uygula. More altında report/activity/help/support/settings/security/account/admin
routes oluştur ve mevcut typed APIs'i kullan. Report source/cutoff/methodology/revision/stale/
partial/expiry bilgilerini göster; native download/share'ı explicit action, protected temp file ve
cleanup ile uygula. Help/demo/support/account lifecycle ve server-backed admin guard ekle. Legal
placeholder'ı approved gösterme. Unit/integration/E2E/visual/a11y ile report/support/export/
deletion IDOR, file traversal, share leakage ve admin bypass testlerini çalıştır.
```
