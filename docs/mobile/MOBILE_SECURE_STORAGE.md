# Mobile Secure Storage

Session material is stored only through the `SecureStorage` abstraction backed by Expo SecureStore/iOS Keychain with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`. There is no plaintext fallback. AsyncStorage auth secrets, filesystem auth secrets, navigation/query-cache tokens and telemetry/log tokens are prohibited.

An installation marker in the application sandbox is checked before session restore. If the marker is absent, stale Keychain authentication is cleared before a new marker is created; this prevents unexpected restore after reinstall. The marker is not an identifier or secret and is not used for analytics. Keychain failure closes to `SECURE_STORAGE_UNAVAILABLE` and private caches are cleared.

Biometric opt-in is a local privacy gate, not backend identity proof. Strong biometrics are requested without device-passcode fallback. Cancellation remains locked, while lockout or enrollment changes require password reauthentication. Unavailability fails safely, and logout resets local state. Raw biometric data is never available to Atlas.

Bulk portfolio, strategy, backtest and report data is not placed in SecureStore. Temporary exports use the private cache directory and short retention. Custom encryption/key management is intentionally not implemented.
