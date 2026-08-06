# Mobile Dependency and Compatibility Matrix

Versions are pinned to the Expo SDK 57 stable template or repository-compatible stable releases;
no force or legacy peer override was used.

| Dependency                      | Version | Reason                           | Expo Compatibility       | Existing Stack Compatibility                  | Risk   |
| ------------------------------- | ------: | -------------------------------- | ------------------------ | --------------------------------------------- | ------ |
| expo                            | ~57.0.9 | Managed runtime/tooling          | SDK 57 Doctor-compatible | Node 22.14 satisfies minimum 22.13            | LOW    |
| react-native                    |  0.86.2 | Native runtime                   | SDK 57 Doctor target     | New Architecture mandatory                    | MEDIUM |
| react/react-dom                 |  19.2.3 | UI runtime                       | SDK 57 target            | Separate workspace resolution from web 19.2.7 | LOW    |
| expo-router                     | ~57.0.9 | Typed file routes/deep links     | SDK 57 bundled           | No external navigation imports                | LOW    |
| expo-secure-store               | ~57.0.1 | Session secret storage           | SDK 57                   | Adapter isolated                              | LOW    |
| expo-notifications              | ~57.0.8 | Permission/push foundation       | SDK 57                   | Delivery backend deferred                     | MEDIUM |
| expo-local-authentication       | ~57.0.2 | Biometric foundation             | SDK 57                   | Local unlock only                             | LOW    |
| expo-linking                    | ~57.0.4 | App/deep links                   | SDK 57                   | Allowlist parser shared with guards           | LOW    |
| expo-application                | ~57.0.2 | App version metadata             | SDK 57                   | Provider adapter boundary                     | LOW    |
| expo-constants                  | ~57.0.8 | Runtime config metadata          | SDK 57                   | Public config only                            | LOW    |
| expo-device                     | ~57.0.1 | Device capability metadata       | SDK 57                   | No identifier telemetry                       | LOW    |
| expo-splash-screen              | ~57.0.5 | Launch foundation                | SDK 57                   | Final asset deferred                          | LOW    |
| expo-status-bar                 | ~57.0.1 | System UI                        | SDK 57                   | Shell only                                    | LOW    |
| expo-system-ui                  | ~57.0.2 | Platform theme foundation        | SDK 57                   | Token adapter boundary                        | LOW    |
| react-native-gesture-handler    | ~2.32.0 | Router/native gestures           | SDK 57 template          | New Architecture compatible                   | LOW    |
| react-native-reanimated         |   4.5.1 | Router/motion runtime            | SDK 57 Doctor target     | Reduced motion policy required                | MEDIUM |
| react-native-worklets           |  0.10.1 | Reanimated runtime               | SDK 57 Doctor target     | Native build validation required              | MEDIUM |
| react-native-safe-area-context  |  ~5.7.0 | Safe-area provider               | SDK 57 template          | Root provider                                 | LOW    |
| react-native-screens            | ~4.26.0 | Native route screens             | SDK 57 template          | Expo Router peer                              | LOW    |
| react-native-web                | ~0.21.0 | Expo tooling compatibility       | SDK 57 target            | Not a WebView/product web surface             | LOW    |
| @tanstack/react-query           | 5.101.4 | Server-state policy              | Platform neutral         | Web already uses 5.101.x                      | LOW    |
| react-hook-form                 |  7.83.0 | Future form foundation           | React Native compatible  | No form UI in TASK-100B                       | LOW    |
| zod                             |   4.4.3 | Runtime config/schema validation | Platform neutral         | Exact repository version                      | LOW    |
| @react-native-community/netinfo |  12.0.1 | Network transitions              | Expo-compatible library  | Adapter isolated                              | LOW    |
| @testing-library/react-native   |  14.0.1 | Component/accessibility tests    | RN >=0.78, React >=19    | TASK-100C use                                 | LOW    |
| react-test-renderer             |  19.2.3 | Testing peer                     | Matches mobile React     | Separate from web                             | LOW    |
| expo-doctor                     |  1.20.1 | Dependency/config validation     | 20/20 checks             | CI command                                    | LOW    |
| tsx                             |  4.23.0 | Config/smoke scripts             | Node-side only           | Existing repo version                         | LOW    |
| vitest                          |  4.1.10 | Unit/integration tests           | Pure foundation modules  | Exact repo version                            | LOW    |

TypeScript remains repository-pinned 5.9.3 instead of the SDK template's TypeScript 6 preview-era
selection. Strict typecheck, Metro export and Expo Doctor pass with 5.9.3, avoiding an unrelated
monorepo compiler migration.
