# TASK-110B Navigation V2 Visual Migration

## Canonical device contract

- Device: `iPhone 17 Atlas Validation`
- Simulator UDID: `14D95876-46F5-42E2-87D6-E19514DACFD1`
- OS: `iOS 26.5`
- Orientation: portrait
- Native screenshot resolution: `1206 × 2622` pixels at `3×`
- Locale / timezone: `tr-TR` / `Europe/Istanbul`
- Dynamic Type: system default for the required 12-screen set
- Status bar clock: frozen at `09:41`
- Source: current `375a193+WORKTREE`
- Fixture: `DEMO_UI_FIXTURE_NO_USER_OR_FINANCIAL_DATA_v5`

The captures contain deterministic test-only UI data. They contain no real user data and do not
advertise provider-gated financial fixtures as production-live capability.

## Explicit review

| Candidate          | Generated | Reviewed | Approved | Approval reason                                                                      |
| ------------------ | --------- | -------- | -------- | ------------------------------------------------------------------------------------ |
| Home V2 — light    | `YES`     | `YES`    | `YES`    | Top/bottom safe areas, five-tab chrome and header actions are clear.                 |
| Home V2 — dark     | `YES`     | `YES`    | `YES`    | Semantic header foreground and icon surfaces retain deterministic contrast.          |
| Markets V2 — light | `YES`     | `YES`    | `YES`    | Header is below system chrome and content is not clipped.                            |
| Markets V2 — dark  | `YES`     | `YES`    | `YES`    | Title, actions, borders and selected tab remain legible.                             |
| Radar V2 — light   | `YES`     | `YES`    | `YES`    | Canonical Radar ownership and bottom-tab clearance are visible.                      |
| Radar V2 — dark    | `YES`     | `YES`    | `YES`    | Header/action contrast and selected-tab treatment pass review.                       |
| Portfolio V2       | `YES`     | `YES`    | `YES`    | Header and scroll content use one inset owner; no overlap is present.                |
| Research V2        | `YES`     | `YES`    | `YES`    | Canonical Research entries, header and safe areas are intact.                        |
| Global Search      | `YES`     | `YES`    | `YES`    | Full-screen global action owns top and bottom safe areas without collision.          |
| Smart Inbox        | `YES`     | `YES`    | `YES`    | Header, empty state and global-route presentation are unobstructed.                  |
| Profile Menu       | `YES`     | `YES`    | `YES`    | Profile-level destinations and logout remain visible and reachable.                  |
| Scanner via Radar  | `YES`     | `YES`    | `YES`    | Existing Scanner header/content and last actions clear the shared navigation chrome. |

Generated: `12`; Reviewed: `12`; Approved: `12`; Rejected final screens: `0`.

## Baseline migration

The pre-migration run was compared against all 156 frozen historical images and produced zero
pre-existing differences. Only the 12 reviewed Navigation V2 images were then copied explicitly;
normal visual-test execution was not used to update the baseline.

| Baseline field          | Result |
| ----------------------- | ------ |
| Previous baseline count | `156`  |
| Replaced baselines      | `0`    |
| Added baselines         | `12`   |
| Removed baselines       | `0`    |
| Unexpected removals     | `0`    |
| Final baseline count    | `168`  |

## Independent clean verification

After migration the approved baseline was hashed and frozen. A new process/session regenerated the
12 Navigation V2 candidates. One transient development refresh overlay was rejected before the
independent run; the stable candidate was regenerated and reviewed. No rejected image entered the
baseline.

| Gate                                 | Result         |
| ------------------------------------ | -------------- |
| Required Navigation V2 screens       | `12/12`        |
| Full native comparison               | `168/168 PASS` |
| Missing baselines                    | `0`            |
| Unexpected screenshots               | `0`            |
| Unreviewed differences               | `0`            |
| Final visual differences             | `0`            |
| Metadata errors                      | `0`            |
| Baseline mutation during normal test | `0`            |

Native Visual Migration: `PASS`.
Independent Native Visual Diff: `PASS`.
