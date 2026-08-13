# BIST Intelligence Identity Resolution

External mappings use `(provider, entityType, externalId, validity period)` and point to canonical IDs. Supported entity types are instrument, company, institution, fund and derivative contract. Mapping status, confidence, source and manual review state are retained.

Canonical institution IDs are Atlas UUIDs, never brokerage vendor IDs. Institution taxonomy supports brokerage, custodian, fund manager, fund, foreign custodian and other; validity periods support aliases, mergers and name changes. Derivative contracts have independent identity and an explicit `underlyingInstrumentId` relation.

Only a valid `RESOLVED` mapping may normalize. Unknown or ambiguous identities return `UNRESOLVED_IDENTITY`; the pipeline rejects/quarantines the record instead of creating an accidental canonical entity.
