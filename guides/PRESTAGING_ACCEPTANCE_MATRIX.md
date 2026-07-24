# Pre-Staging Acceptance Matrix

## Product

- onboarding/preferences
- navigation/search/command palette
- activity
- reports
- methodology visibility
- empty/loading/error states

## Security

- IDOR
- report ownership/download
- formula injection
- search/activity ownership
- rate limits
- no secrets

## Accessibility/localization

- keyboard/focus/dialog/table/chart/live region
- contrast/reduced motion
- tr-TR/timezone/date/number/currency

## Regression

- Scanner
- Alerts
- Portfolio
- Market Intelligence
- Strategy Lab
- Admin
- local containers
- dependency/container scans

Audit açıkça belirtmelidir:

```text
Production readiness remains NO-GO.
Staging evidence has not been replaced by local evidence.
```
