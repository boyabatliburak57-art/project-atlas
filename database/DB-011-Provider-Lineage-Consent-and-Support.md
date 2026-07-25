# DB-011 — Provider Lineage, Consent and Support

Önerilen tablolar:

- provider_connections
- provider_ingestion_runs
- provider_data_revisions
- data_quality_findings
- data_correction_requests
- user_document_consents
- communication_templates
- communication_delivery_attempts
- support_requests
- support_request_events

Credentials yalnız secret-store reference olarak tutulur. Revision/dedup constraints, consent/support audit ve safe attachments zorunludur.
