# Mobile Visual Regression Baseline

```text
Required Phone Profiles: 4
Executed Phone Profiles: 2 (runtime only; not approved baselines)
Required Native Phone Screenshots: >=32
Native Phone Screenshots: 0
Tablet Native Baselines: DEFERRED_V1_1
Tablet Baseline Requirement for v1: 0
Visual Diff: NOT_RUN
```

| Evidence                           | Result                                                     |
| ---------------------------------- | ---------------------------------------------------------- |
| Required native profiles           | 4                                                          |
| Native screenshots present         | 0                                                          |
| Native screenshots tested          | 0                                                          |
| Visual diff                        | FAIL — baselines missing                                   |
| Web screenshots accepted as native | 0                                                          |
| Update guard                       | PASS — explicit `ATLAS_UPDATE_VISUAL_BASELINES=1` required |

An iPhone 17 and Android API 36 phone were booted sequentially, and Maestro emitted native failure
artifacts. Those diagnostic screenshots are not deterministic reviewed baselines and are not
counted toward the required 32. The baseline update and independent second visual-diff run were
not executed.

The deterministic contract remains `tr-TR`, `Europe/Istanbul`, fixed fixtures/time/network,
reduced motion and platform-specific baselines. This report is a blocker, not staging evidence.

TASK-100C-R2 failed preflight before generation and remains historical. The latest R3 execution
has 2/4 runtime profiles, zero approved baselines and `Visual Diff: NOT_RUN`.

TASK-100C-R4 did not approve diagnostic Maestro screenshots as baselines. Approved native
screenshots remain 0/32 and the independent visual diff remains `NOT_RUN`.

## TASK-100C-R5 iOS-only gate

- Required native profile: iPhone 17 / iOS 26.5 (1 profile)
- Android/tablet baselines: `DEFERRED_V1_1_NOT_RELEASE_GATED`
- Required native iOS screenshots: 12
- Approved native iOS screenshots: 0
- Baseline update: NOT_RUN
- Independent visual test: NOT_RUN
- Result: INCOMPLETE

The validator now requires 12 PNGs, native profile metadata, exact file-set equality and SHA-256
comparison. Diagnostic Maestro images are not promoted to baselines. Capture and the independent
second run remain pending.

## TASK-100C-R5 completion — 2026-07-31

- Required profile iPhone 17 / iOS 26.5: 1/1
- Native iOS screenshots: 12
- Baseline update: PASS
- Independent normal visual test: PASS
- Missing/unexpected screenshots: 0/0
- Visual differences: 0
- Metadata errors and masked navigation/financial areas: 0
- Artifacts: `apps/mobile/src/test/visual/{baselines,current}/iphone-17-ios-26.5`
- Android/tablet: `DEFERRED_V1_1_NOT_RELEASE_GATED`

Result: `PASS`

## TASK-100E completion — 2026-08-05

- Required iOS profile: iPhone 17 / iOS 26.5: 1/1
- Existing reviewed screenshots: 28
- New TASK-100E native screenshots: 20
- Total native iOS screenshots: 48
- Baseline update: `ATLAS_UPDATE_VISUAL_BASELINES=1 pnpm --filter @atlas/mobile visual:update`
- Independent normal test: `pnpm --filter @atlas/mobile visual:test`
- Missing/unexpected screenshots: 0/0
- Visual differences: 0
- Metadata/hash errors: 0
- Normal-test baseline changes: 0
- Navigation/financial masking: 0
- Result: `PASS`

Android and tablet visual suites remain `DEFERRED_V1_1_NOT_RELEASE_GATED`.

## TASK-100G completion — 2026-08-06

- Required iOS profile: iPhone 17 / iOS 26.5: 1/1
- Existing reviewed screenshots: 68
- New TASK-100G native screenshots: 20
- Total native iOS screenshots: 88
- Explicit baseline update and independent diff: PASS
- Missing/unexpected/different/metadata errors: 0/0/0/0
- Normal-test baseline mutation: 0
- Android/tablet: `DEFERRED_V1_1_NOT_RELEASE_GATED`

## TASK-100F completion — 2026-08-06

- Required iOS profile: iPhone 17 / iOS 26.5: 1/1
- Existing reviewed screenshots: 48
- New TASK-100F native screenshots: 20
- Total native iOS screenshots: 68
- Missing/unexpected screenshots: 0/0
- Visual differences and metadata errors: 0
- Normal-test baseline changes: 0
- Explicit update then independent test: PASS
- Result: `PASS`

Android and tablet visual suites remain `DEFERRED_V1_1_NOT_RELEASE_GATED`.
