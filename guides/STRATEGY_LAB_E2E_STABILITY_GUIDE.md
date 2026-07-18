# Strategy Lab E2E Stability Guide

## Kök neden sınıfları

- product bug
- data isolation
- race
- selector
- startup/readiness
- shared state
- queue timing
- cleanup
- resource contention

## Yasaklar

- skip/fixme/only
- arbitrary `waitForTimeout`
- yalnız retry artırmak
- tek-worker subset'i full suite yerine kabul etmek
- global paylaşılan strategy/run/user verisi

## İzolasyon

Her test unique user/namespace, strategy adı, idempotency key, deterministic fixture ve cleanup kullanmalıdır.

Beklemeler API response, terminal state, queue readiness ve UI condition üzerinden yapılmalıdır.

## Kararlılık kapısı

- normal configured worker count ile full suite art arda 3 PASS
- Strategy Lab subset art arda 5 PASS
- fail = 0
- not-run = 0
- skip/fixme/only = 0

## Kanıt

`reports/strategy-lab-e2e-stability.md` içinde command, worker count, tüm koşumlar, süreler, retry, root cause, fix ve artifact yolları bulunmalıdır.
