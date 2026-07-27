# TASK-100D — Mobile Authentication, Onboarding and Preferences

**Durum:** BLOCKED_BY_TASK-100C  
**Bağımlılıklar:** TASK-100B, TASK-100C

## Amaç

Güvenli mobil oturum, welcome ve resumable onboarding/preferences deneyimini tamamlamak.

## Mevcut durum

Server session rotation/revocation, preferences, consent, legal ve demo reset vardır. Native secure
storage, biometric unlock ve mobil onboarding yoktur.

## Kapsam

Atlas welcome; BIST açıklaması; Market analysis, Scanner/alerts, Portfolio/risk, Strategy
backtesting; Terms/Privacy; Investor ve Analyst/Strategy User; login/reset/session; locale/timezone,
market, benchmark, watchlist, scanner preset, notification, push permission, biometric, demo ve
completion adımları; partial resume; settings ile senkronizasyon.

## Kapsam dışı

Trader/live-execution konumlandırması, sosyal login, brokerage bağlantısı, gerçek push delivery.

## Bağımlılıklar

Typed auth/preferences/legal APIs, SecureStore ve Local Authentication adapterları; TASK-100F push
binding, TASK-100J hardening.

## Mimari gereksinimler

Onboarding state server-authoritative checkpoint + güvenli local draft birleşimidir. Oturum
rotasyonu tek-flight olur. Biometric yalnız cihazdaki oturumu açar; server auth yerine geçmez.

## API gereksinimleri

Checkpoint/resume idempotency, consent version/effective date, preference validation ve owner
isolation doğrulanır. Eksik push device binding TASK-100F'ye bırakılır.

## UI/UX gereksinimleri

10 adımda progress, back/resume, clear validation, keyboard/decimal locale, Terms/Privacy
unavailable-safe state. “Trader” ve canlı işlem vaadi yoktur.

## Güvenlik gereksinimleri

Token yalnız SecureStore; logout/reset/account invalidation wipe; biometric fallback device
credential/password; session expiry; screenshots/app switcher TASK-100J politikası; auth error
enumeration ve log secret leakage yok.

## Accessibility gereksinimleri

Form labels/errors announced, focus first invalid field, dynamic type, keyboard submit/back,
permission rationale screen-reader uyumlu.

## Unit testleri

Onboarding state machine/resume, locale/timezone validation, session rotation, secure storage,
biometric fallback ve route guard.

## Integration testleri

Login/preferences/consent/demo selection; logout revocation/wipe; expired session; partial resume.

## Mobile E2E testleri

First launch, login, full onboarding, interruption/resume, permission deny/grant, biometric
enable/fallback, settings revisit ve logout.

## Visual regression testleri

Welcome ve her onboarding state light/dark; error/loading/large text; phone/tablet.

## Kabul kriterleri

AsyncStorage token 0; onboarding resume kayıp 0; owner/consent IDOR 0; logout credential residue 0;
required welcome copy/links tam; accessibility critical 0.

## Yasak yöntemler

Plaintext token; biometric'i server authentication saymak; permission promptunu context olmadan
açmak; kullanıcı seçimini varsaymak; “Trader”/execution claim; legal placeholder'ı approved göstermek.

## Çıktı raporu

`reports/mobile/task-100d-auth-onboarding.md`, secure-storage inspection ve E2E matrisi.

## Ayrıntılı T3 Code uygulama prompt'u

```text
TASK-100D'yi uygula. Mevcut auth session, preference, consent/legal ve demo API sözleşmelerini typed
client üzerinden kullan. Welcome ve 10 adımlı resumable onboarding'i Investor ile Analyst/Strategy
User seçenekleriyle oluştur; Trader/live trade ifadesi kullanma. Tokenları yalnız SecureStore'da
tut, rotation'ı serialize et, logout/expiry'de temizle. Biometric'i local unlock olarak uygula ve
güvenli fallback ekle. Unit, integration, first-launch/onboarding E2E, visual ve accessibility
matrisini çalıştır; auth/consent IDOR ve log leakage testlerini raporla.
```
