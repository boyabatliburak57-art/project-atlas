# BIST Intelligence License and Redistribution Model

License classes: `INTERNAL_ONLY`, `DISPLAY_ALLOWED`, `DELAYED_DISPLAY_ONLY`, `DERIVED_DISPLAY_ALLOWED`, `UNKNOWN_REQUIRES_REVIEW`. Restrictions: `REDISTRIBUTION_PROHIBITED`, `EXPORT_PROHIBITED`, `SHARE_PROHIBITED`, `DISPLAY_ALLOWED`.

License policy is record provenance, not a secret/config flag. Display, export, share and redistribution must evaluate the policy independently. Unknown/internal data fails closed. Delayed-only data can be displayed only in delayed mode. Feature flags cannot override these checks.

Signed source links must honor source policy. Provider credentials stay in server secret references and never enter mobile bundles, query parameters, metrics or public error responses.
