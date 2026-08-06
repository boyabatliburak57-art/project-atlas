# Mobile visual regression convention

TASK-100B defines the storage and determinism policy; feature baselines begin in TASK-100C.

- Baselines: `src/test/visual/baselines/<platform>/<device>/<theme>/`
- Diffs: `src/test/visual/diffs/` (CI artifact, never an accepted baseline)
- Profiles: small phone, standard phone, large phone, tablet portrait, tablet landscape
- Locale/timezone: `tr-TR` / `Europe/Istanbul`
- Appearance: explicit light or dark, never inherited from the CI host
- Time and network responses: deterministic fixtures
- Updates: reviewed screenshot changes only; no blanket baseline regeneration

No screenshot in this directory is product-completeness evidence until its feature task owns and
reviews the corresponding baseline.
