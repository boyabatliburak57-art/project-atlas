# Mobile Biometric Security

Expo Local Authentication is an adapter for unlocking local secure session material. It never
replaces server authentication. Enablement requires explicit user action and recent password
reauthentication. Hardware, enrollment, cancel, failure and lockout states are distinct; password
fallback remains available.

No biometric material or detailed result is stored or sent to telemetry. Enrollment/security
changes require reauthentication. Logout disables access through cleanup hooks. Test adapters are
unit-only and are not reachable in production configuration.
