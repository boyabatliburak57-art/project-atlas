# Mobile Visual Regression

Mobile v1 native baselines target small, standard and large iPhone profiles plus one standard
Android API 36 phone. Android width extremes retain responsive component coverage. Tablet native
baselines are deferred to v1.1 and have a v1 requirement of zero. Metadata records simulator
model, OS, viewport, theme, `tr-TR`, `Europe/Istanbul`, font scale, fixture version and SHA-256.

Generation requires a native simulator runner, fixed clock/network/status bar, reduced motion and
`DEMO_UI_FIXTURE · NOT_LIVE_MARKET_DATA`. Normal tests are read-only and fail on missing/different
images. Updates require `ATLAS_UPDATE_VISUAL_BASELINES=1`, an explicit update command and human
review; CI never updates a baseline.

Pixel tolerance is 0.2% with per-channel threshold 0.1. Financial values, labels, warnings and
navigation cannot be masked. Only documented OS-owned status regions may be narrowly masked.
Platform anti-aliasing is isolated by platform-specific baselines; fonts are system fonts.
Failure artifacts retain expected, actual, diff and metadata for 30 days. Mobile QA owns triage
with design and accessibility review for intentional changes.
