# Atlas Mobile

Architecture scaffold only. Home, Markets, Search, Portfolio and More are explicit placeholders;
feature completion begins with TASK-100C.

## Prerequisites

- Node 22.14.0 and pnpm 9.15.4
- Xcode/iOS Simulator or Android Studio/emulator for native launch
- Expo development build or Expo Go where the selected native modules are supported

Copy `.env.example` to a local ignored `.env` and set `EXPO_PUBLIC_API_BASE_URL`. Android emulator
usually reaches the host at `http://10.0.2.2:3001/api/v1`; iOS Simulator uses
`http://127.0.0.1:3001/api/v1`. A physical device needs a reachable LAN or approved development
endpoint.

## Commands

```text
pnpm mobile:start
pnpm mobile:ios
pnpm mobile:android
pnpm mobile:doctor
pnpm mobile:typecheck
pnpm mobile:test
pnpm mobile:test:integration
pnpm mobile:e2e
pnpm mobile:prebuild:check
pnpm mobile:build:local
```

Use `npx uri-scheme open "atlas://symbol/THYAO" --ios` or the Android equivalent for allowlisted
deep-link testing. Invalid and unknown routes must fall back safely.

To reset auth state, use the application logout path or uninstall the development application.
Never move session data to AsyncStorage, a plaintext file or an `EXPO_PUBLIC_*` value. Public Expo
configuration must contain no provider, database, signing or telemetry credentials.

## Troubleshooting

- Run `pnpm mobile:doctor` after dependency changes.
- A release config without `EXPO_PUBLIC_API_BASE_URL` must fail.
- Clear Metro with `pnpm mobile:start -- --clear` when workspace resolution is stale.
- Store signing and the current bundle/package identifier are not approved in this scaffold.
