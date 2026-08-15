# TASK-110E Native Visual Result

## Device contract

- Device: iPhone 17 Atlas Validation
- Simulator UDID: `14D95876-46F5-42E2-87D6-E19514DACFD1`
- OS: iOS 26.5
- Orientation / scale: portrait / native simulator scale
- Locale / timezone: `tr-TR` / `Europe/Istanbul`
- Themes: light and dark
- Dynamic Type: system default; repository accessibility baseline remains covered
- Reduced Motion: enabled for TASK-110E captures
- Source commit at capture: `5bd00e7770263760202e113fefd16de82bd0ef21`

## Candidate review

| Screen                        | Generated | Reviewed | Approved | Reason                                                                  |
| ----------------------------- | --------- | -------- | -------- | ----------------------------------------------------------------------- |
| Institutional Overview light  | YES       | YES      | YES      | Dense hierarchy, safe area, local navigation, and freshness are clear.  |
| Institutional Overview dark   | YES       | YES      | YES      | Semantic dark colors retain text, icon, divider, and status contrast.   |
| Provider required             | YES       | YES      | YES      | One coherent fail-closed state; no fixture values or empty card wall.   |
| AKD symbol                    | YES       | YES      | YES      | Trade-date semantics and signed money-flow values are explicit.         |
| AKD top buyers                | YES       | YES      | YES      | Compact aligned ranking with non-color Net Alım semantics.              |
| AKD top sellers               | YES       | YES      | YES      | Compact aligned ranking with non-color Net Satım semantics.             |
| AKD all institutions          | YES       | YES      | YES      | Bounded list remains readable and does not expose provider IDs.         |
| AKD history                   | YES       | YES      | YES      | Trading-day window, coverage, and methodology remain visible.           |
| Institution search            | YES       | YES      | YES      | Canonical institution results are clear and safely bounded.             |
| Institution detail            | YES       | YES      | YES      | Overview and coverage use progressive disclosure without a score.       |
| Institution top bought        | YES       | YES      | YES      | Instrument ranking and signed values are legible and aligned.           |
| Institution top sold          | YES       | YES      | YES      | Negative direction is expressed by sign and text, not color alone.      |
| Net money flow                | YES       | YES      | YES      | Methodology is descriptive and avoids investment-advice language.       |
| Takas overview                | YES       | YES      | YES      | Settlement-date semantics are visually distinct from AKD.               |
| Takas top holders             | YES       | YES      | YES      | Holding quantity/ratio hierarchy is compact and scannable.              |
| Takas change                  | YES       | YES      | YES      | Increase/decrease direction is explicit without unsupported zeroes.     |
| Takas trend                   | YES       | YES      | YES      | Historical settlement snapshots are bounded and clearly dated.          |
| Foreign Takas                 | YES       | YES      | YES      | Provider classification and gated availability are explicit.            |
| Partial coverage              | YES       | YES      | YES      | Coverage limitation is visible without presenting missing data as zero. |
| Company Institutional summary | YES       | YES      | YES      | Contextual summary links to the canonical Institutional destination.    |

## Migration and independent verification

- Previous baselines: 184
- Candidates generated / reviewed / approved: 20 / 20 / 20
- Rejected final candidates: 0
- Replaced baselines: 0
- Added baselines: 20
- Removed baselines: 0
- Final baselines: 204
- Missing baselines: 0
- Unexpected screenshots: 0
- Unreviewed differences: 0
- Visual differences: 0
- Metadata errors: 0
- Independent native visual diff: 204/204 PASS
- Baseline mutation during normal test: 0
- Frozen metadata hash before/after: `97f4c974a4edf4bd5f76ddcecf8a11da70ad18e0`

Result: **PASS**.
