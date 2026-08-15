# KAP Revision Model

Disclosure revisions are immutable. Natural identity is provider, external disclosure ID, and provider revision. Correction links are stored separately, allowing a correction to arrive before its parent; the link is `AWAITING_PREVIOUS_REVISION` until catch-up resolves it to `COMPLETE`. Withdrawn and superseded history is retained. Latest feeds derive lifecycle state without rewriting evidence.
