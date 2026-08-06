# Mobile Alerts

The iOS alert surface covers price, indicator and immutable saved-scan alert contracts, active and
triggered states, enable/disable, history and delivery status. Portfolio/risk alerts remain TASK-100G
scope.

Crossing semantics and indicator evaluation are backend-authoritative. Mobile validates catalog
operators and bounds but never evaluates a crossing from local history. Missing indicator data is
`NOT_EVALUABLE`, not zero. Provider absence yields `PROVIDER_REQUIRED`; no trigger is fabricated.

Mutations use ownership, expected-version and idempotency controls. Enable rollback is explicit on
failure. Trigger history retains source revision, cutoff, observed value, delivery state and dedup key.
Raw worker/provider errors never reach the UI.
