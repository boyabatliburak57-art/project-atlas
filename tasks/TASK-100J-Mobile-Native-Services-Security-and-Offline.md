# TASK-100J — Mobile Native Services, Security and Offline

**Durum:** BLOCKED_BY_TASK-100I  
**Bağımlılıklar:** TASK-100I

## Amaç

Native lifecycle, security, provider gating, offline cache ve operational adapterları production
iddiası üretmeden sertleştirmek.

## Mevcut durum

Backend auth/RBAC/IDOR/audit/feature flags/telemetry vardır. SecureStore, biometric, app links,
privacy mask, native offline, update enforcement ve mobile telemetry adapterları eksiktir.

## Kapsam

SecureStore; biometric; push/link hardening; share; background refresh; app-state/network; read-only
timestamped offline cache; screenshot/app-switcher/clipboard policies; explicit policy varsa root/
jailbreak signal; crash/performance adapters; update/version enforcement; authoritative
capabilities for futures/FX/news/realtime/fundamentals/actions/e-mail; unavailable reason/help.

## Kapsam dışı

Safe queue tasarlanmadan offline mutations; certificate pinning'i plansız zorlamak; root detection
ile tek başına block; vendor/staging credential; production readiness.

## Bağımlılıklar

All feature tasks, backend flags/provider registry, security/telemetry conventions, platform policy
decisions.

## Mimari gereksinimler

Native services adapter interfaces behind composition root. Server is flag/capability authority.
Cache is bounded, minimum-data, read-only and records fetchedAt/source cutoff. Foreground refetch
does not claim freshness until success.

## API gereksinimleri

Mobile bootstrap/version/capability reason contract, device ownership and sanitized errors.
Certificate/network policy documented per environment; API remains TLS-only.

## UI/UX gereksinimleri

Offline/Stale/Unavailable/Credential-required banners with reason code/help. App-switcher mask
sensitive screens. Update block only for server-defined minimum compatible version.

## Güvenlik gereksinimleri

AsyncStorage token scan; logout wipe; deep-link auth; screenshot leakage; app-switcher mask;
certificate/TLS; error/log/crash redaction; IDOR; token ownership; biometric fallback; expiry;
background/foreground; clipboard minimization. Admin stays server-authorized.

## Accessibility gereksinimleri

Banners announced once, privacy/update modals focus correctly, biometric fallback accessible,
reduced motion preserved and connectivity state not color-only.

## Unit testleri

Secure storage, offline state machine, capability gates, link guards, app state, cache timestamps/
eviction, version policy and telemetry redaction.

## Integration testleri

Logout/device revoke, offline/online refresh, background/foreground expiry, bootstrap/flags,
provider unavailable and crash adapter sanitization.

## Mobile E2E testleri

Offline read-only flows, mutation rejection, deep links logged-in/out, privacy mask, biometric
fallback, forced/optional update, provider unavailable and logout.

## Visual regression testleri

All offline/stale/unavailable/update/privacy states light/dark/device matrix.

## Kabul kriterleri

AsyncStorage token 0; sensitive cache/log/crash leak 0; unauthorized deep-link resource 0; fake
provider claim 0; offline auto financial mutation 0; server/client flag divergence 0.

## Yasak yöntemler

Secret in AsyncStorage/log/crash; fake freshness; client flag override; silent offline mutation;
blanket insecure certificate bypass; opaque “not available” without reason/help.

## Çıktı raporu

`reports/mobile/task-100j-native-security-offline.md`, threat/control matrix and leakage evidence.

## Ayrıntılı T3 Code uygulama prompt'u

```text
TASK-100J'yi uygula. Mobile native service adapters, SecureStore, app-state/network/background,
read-only timestamped offline cache, privacy mask, link/share, telemetry and version enforcement
kur. Backend authoritative feature/capability bootstrap ile futures/FX/news/realtime/fundamentals/
actions/e-mail gating yap; reason code/help göster ve fake veri kullanma. Financial mutations
offline fail-closed kalsın. Threat model üzerinden AsyncStorage/token, logout, deep-link, IDOR,
device ownership, biometric fallback, screenshot/app switcher, TLS, error/log/crash leakage ve
foreground expiry testlerini çalıştır. Production/staging kanıtı iddia etme.
```
