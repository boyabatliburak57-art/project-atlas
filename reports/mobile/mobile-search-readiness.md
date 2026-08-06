# Mobile Search Readiness

Search uses the bounded authenticated server endpoint, Unicode normalization, two-character minimum,
LIKE escaping, signed cursor, cancellation and 20-row pages. Raw queries and recent history are not
telemetry payloads. Recent items are bounded/deduplicated and cleared across users. Provider absence
fails closed. Search injection and unbounded-query findings: 0.
