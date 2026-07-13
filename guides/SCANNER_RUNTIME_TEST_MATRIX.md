# Scanner Runtime Test Matrix

## Run creation

- sync/async plan
- invalid AST
- complexity/entitlement exceeded
- same idempotency + same request
- same idempotency + different request
- empty universe
- stale data warning

## State machine

- queued → running
- queued/running → cancel_requested → cancelled
- running → completed/failed
- terminal transition rejected

## Batch

- single/multiple batch
- retry duplicate prevention
- progress monotonicity
- one instrument notEvaluable
- system failure
- cancellation between batches

## Ownership

- owner access
- other user denied
- admin only with permission

## Saved scans

- create/update revision
- stale revision conflict
- clone
- soft delete/restore
- private access denial

## Presets

- draft invisible
- publish immutable
- archive
- seed idempotency
- AST and indicator version validation

## API/UI

- OpenAPI
- pagination
- invalid cursor
- duplicate submit
- terminal polling stop
- AST round-trip
- explanation
- no matches/cancelled/error states
