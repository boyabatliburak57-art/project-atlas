# Mobile App Lifecycle

`AppLifecycleController` is the single application state fan-out for `active`, `inactive` and `background`. Duplicate state events are ignored and subscriptions return deterministic cleanup callbacks. The native connector owns one AppState listener.

Inactive/background transitions display a neutral Atlas privacy cover and enable the platform app-switcher protection overlay. Foreground removes the cover, evaluates the monotonic app-lock grace policy and permits bounded query refresh. The app lock supports Off, Immediately and short grace period; it remains separate from the backend session and has biometric plus password reauthentication fallback.

Screen capture is risk-mitigated with platform capability/listener support and sensitive-view masking policy. Atlas does not claim reliable absolute screenshot blocking on iOS. Memory pressure may discard disposable list/chart/cache data, but never auth state or silently submitted forms.

Logout and account switch cancel private queries, purge private owner namespaces, remove pending private file/link/push context, revoke device ownership through the existing backend contract, and prevent back navigation from showing protected content.
