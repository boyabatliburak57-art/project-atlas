# TASK-110E — Institutional Intelligence

**Durum:** BLOCKED_BY_TASK-110D
**Bağımlılıklar:** TASK-110D = `GO_FOR_TASK_110E`

## Amaç

AKD/broker distribution, institutional buyer/seller and money flow ile takas/foreign/institutional
settlement, trend and anomaly capabilities'i kurmak.

## Gereksinimler

Analytics and scanner views consume `InstitutionalFlowDomain` and `SettlementDomain`. Institution
mapping, aggregation windows, net/gross definitions, corrections, delay, coverage and methodology
must be explicit. License-sensitive data defaults to `LICENSE_REQUIRED`.

## Test ve kabul

Verify identity changes, incomplete broker coverage, late corrections, time-window consistency,
license/entitlement denial and scanner/view parity. Ten capabilities pass with fake production data
zero; result is `GO_FOR_TASK_110F`.
