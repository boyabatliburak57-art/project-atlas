# KAP Provider Contract

A provider supplies capability identity, allowlisted HTTPS hosts, delivery mode, license policy, schema-aware disclosure DTOs, and a bounded fetch method. Provider IDs are resolved server-side. Source URLs reject credentials and non-HTTPS or non-allowlisted hosts. Live status may only be declared by an authenticated and licensed adapter; current external status is `PROVIDER_REQUIRED_OR_LICENSE_REQUIRED`.
