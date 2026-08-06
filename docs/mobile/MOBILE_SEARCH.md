# Mobile Global Search

Global Search uses authenticated `/search`, restricts the entity type to instruments, normalizes
Unicode with NFKC, requires two characters, caps queries at 80 characters and consumes the signed
server cursor. Exact symbols retain server ranking priority. Requests are cancellable and bounded at
20 results per page. The backend escapes SQL LIKE wildcards and owner-scopes private entity types.

Recent searches are bounded, deduplicated and cleared on account change. Raw queries are prohibited
from telemetry. Results expose instrument status and route only through the symbol allowlist.
