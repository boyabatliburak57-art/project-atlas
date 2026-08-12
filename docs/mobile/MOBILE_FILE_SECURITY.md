# Mobile File Security

Generated reports stay server-owned until an authenticated, owner-revalidated download. Native download accepts HTTPS only, rejects credentials in URLs, disables redirects, validates expiry, allowlisted MIME (`application/pdf`, `text/csv`), matching extension, non-empty content, 25 MiB maximum and optional SHA-256 checksum.

Validated bytes are written to the private cache directory using 128-bit random filenames with no e-mail, user name or resource ID. Files expire no later than 15 minutes and are deleted after failure, share completion/cancellation, expiry, logout, user switch or next cleanup. Failed/partial artifacts are removed. Files are not placed in public Documents and iOS file sharing/open-in-place are disabled.

Share requires an explicit user action, sensitive-content warning, renewed owner authorization and a currently tracked local file with matching size. Signed URLs, auth tokens and storage secrets are never shared. Advanced recipient-side control cannot be guaranteed after a user intentionally exports a file.

File import is `NOT_AVAILABLE` in mobile v1. Temporary/cache artifacts are intended to be backup-excluded by iOS cache semantics; auth remains in this-device-only Keychain storage.
