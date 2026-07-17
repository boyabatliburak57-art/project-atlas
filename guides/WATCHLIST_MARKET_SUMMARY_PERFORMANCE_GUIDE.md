# Watchlist Market Summary Performance Remediation Guide

## 1. Önce yeniden üret

TASK-040 GO baseline ile aynı fixture, endpoint, auth, enrichment, stale/data-cutoff, active alert count, warm/cold policy ve tekrar sayısını kullan.

## 2. Profil

Ölç:

- toplam request süresi
- query count
- DB time
- watchlist item query
- instrument lookup
- market data lookup
- active alert count
- mapping/serialization
- cache hit/miss

## 3. Öncelikli sorunlar

- item başına query
- latest bar N+1
- active alert count N+1
- full dataset yükleyip memory pagination
- eksik composite index
- gereksiz kolon/geçmiş bar yükleme
- duplicate request-scope lookup

## 4. Kabul edilen çözümler

- bounded bulk query
- grouped count
- DB-level pagination
- uygun index
- request-scope dedup
- cutoff-aware cache

Cache invalidation testleri:

- item add/remove
- new market bar
- alert activate/pause/delete
- watchlist update/delete

## 5. Kapı

Aynı baseline senaryosunda, en az iki bağımsız koşum:

```text
p95 ≤ 750 ms
error rate = 0
contract regression = 0
security regression = 0
```
