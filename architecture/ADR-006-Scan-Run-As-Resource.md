# ADR-006 — Scan Run'ı Birinci Sınıf Resource Olarak Modelleme

**Durum:** Accepted  
**Tarih:** 2026-07-11

## Bağlam

Tarama; progress, cancellation, history, retry, retention ve result pagination gerektirir. Bazı taramalar HTTP request süresinden uzun çalışır.

## Karar

Her tarama isteği bir `ScanRun` resource'u oluşturur. Küçük taramalar senkron tamamlansa bile aynı resource modeli kullanılır.

## Sonuçlar

Olumlu: tek API modeli, geçmiş, audit, idempotency, pagination ve cancellation. Olumsuz: ek persistence ve state machine karmaşıklığı.

## Kural

HTTP request uzun hesaplamanın tek yaşam alanı değildir.
