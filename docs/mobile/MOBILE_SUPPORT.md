# Mobile Support

Support offers Help Center, contact, request history and separate security/privacy categories. A request includes bounded category, subject and sanitized description plus an optional related resource. Duplicate submit is blocked; success is shown only after the backend creates the owner-scoped request.

Diagnostic context is opt-in and allowlisted to app/build, OS, device class, screen, request ID, capability state and safe reason code. Tokens, session IDs, e-mail, financial values, strategy AST, watchlists, provider payloads and push tokens are excluded. Subject and description are never telemetry payloads.

History uses owner-scoped cursor pagination and exposes public statuses only. Cross-user lookup returns the same safe not-found behavior. Support e-mail remains `SANDBOX_INTEGRATION`; backend request persistence does not claim live production delivery.
