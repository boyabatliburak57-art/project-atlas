# Mobile Preferences

TASK-100D exposes the basic server-backed preference subset: theme, locale, timezone, BIST market,
benchmark, number formatting, chart timeframe, notification summary, quiet hours, biometric
unlock, reduced motion, compact display, methodology detail level and onboarding reset.

Every mutation supplies `expectedVersion`. Optimistic UI must roll back on failure; version
conflicts display a reconciliation state. Exchange timezone and user timezone stay distinct.
Security notifications are policy-controlled, push binding is TASK-100F and full Settings is
TASK-100I.
