# ADR-028 — Provider Capability V2

Status: Accepted

## Decision

Product availability (`SUPPORTED_LIVE`, `SUPPORTED_DELAYED`, `PROVIDER_REQUIRED`, `LICENSE_REQUIRED`, `EXTERNAL_CONFIGURATION_REQUIRED`, `NOT_AVAILABLE`) is independent from operational health (`HEALTHY`, `DEGRADED`, `STALE`, `RATE_LIMITED`, `UNAVAILABLE`, `AUTH_ERROR`). Capability-specific ports replace expansion of the current market-data interface.

Production initialization is fail-closed: supported capability registration requires a real adapter and credential reference. Feature flags do not grant provider or license authorization.

## Consequences

No fixture or random fallback is permitted in production. Credentials remain referenced only by server composition roots. Provider-specific errors are redacted to safe public reason codes.
