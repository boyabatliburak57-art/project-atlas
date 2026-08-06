# Native Validation Environment Preflight

**Executed:** 2026-07-28  
**Decision:** PASS

| Requirement                | Detected Version/Device                                       | Status                     | Evidence                                                  | Required Action                                                |
| -------------------------- | ------------------------------------------------------------- | -------------------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| Node                       | v22.14.0                                                      | PASS                       | `node --version`                                          | None                                                           |
| pnpm                       | 9.15.4                                                        | PASS_WITH_NOTE             | `pnpm --version`                                          | Use repository-pinned package manager for subsequent execution |
| Java                       | OpenJDK 17.0.19                                               | PASS                       | `java -version`; `JAVA_HOME=/opt/homebrew/opt/openjdk@17` | None                                                           |
| Xcode developer directory  | `/Applications/Xcode.app/Contents/Developer`                  | PASS                       | `xcode-select -p`                                         | None                                                           |
| Xcode                      | 26.5 (17F42)                                                  | PASS                       | `xcodebuild -version`                                     | None                                                           |
| iOS runtime                | iOS 26.5 (23F77)                                              | PASS                       | `xcrun simctl list runtimes`                              | None                                                           |
| iOS phone simulator        | iPhone 17, iOS 26.5, `1FAB01B5-2382-4275-AE5D-C5D78E4E56CA`   | PASS                       | Simulator booted successfully                             | None                                                           |
| iPad simulator             | iPad Pro/Air/mini/iPad models                                 | PASS                       | Available devices; all shutdown                           | Boot during a future validated run                             |
| Android SDK/ADB            | ADB 1.0.41, platform-tools 37.0.0                             | PASS                       | `adb version`                                             | None                                                           |
| Android phone AVD          | `FaceScanner_API36`; medium phone, API 36, 1080×2400, 420 dpi | PASS                       | AVD config `hw.device.name=medium_phone`                  | Boot during a future validated run                             |
| Android tablet AVD         | None                                                          | NOT_REQUIRED_FOR_MOBILE_V1 | Phone-only scope decision                                 | Deferred to v1.1                                               |
| Connected Android device   | `emulator-5554` / `FaceScanner_API36`                         | PASS                       | `adb devices`; boot completion confirmed                  | None                                                           |
| Maestro                    | 2.7.0                                                         | PASS                       | `$HOME/.maestro/bin/maestro --version`; help executable   | Add `$HOME/.maestro/bin` to interactive PATH                   |
| Free disk for native build | 31 GiB before sequential rerun                                | PASS                       | `df -h /System/Volumes/Data`                              | None                                                           |
| Expo Doctor                | 20/20 checks                                                  | PASS                       | `pnpm --filter @atlas/mobile exec expo-doctor`            | None                                                           |
| Expo public config         | SDK 57; iOS/Android; `com.atlasfinance.mobile`                | PASS_WITH_NOTE             | `expo config --type public`                               | Identifier remains `PLACEHOLDER_NOT_STORE_APPROVED`            |

Maestro 2.7.0 is installed and all eight v1 phone flow files passed `maestro check-syntax`.
Android Tablet AVD: `NOT_REQUIRED_FOR_MOBILE_V1`. Tablet Validation: `DEFERRED_TO_V1_1`.

Native execution was attempted after both phone simulators were booted. The iOS compilation
reached native pod compilation but failed with `errno=28` while writing `libRNScreens.a`. The
task-owned Xcode build products were cleaned with `xcodebuild clean`, increasing free space from
1.7 GiB to 2.5 GiB. Android compilation reached the required NDK 27.1 installation, but the
download was stopped before exhausting the remaining disk. No build, screenshot, accessibility,
visual-diff, or Maestro execution result is marked PASS.

In the later sequential rerun, free space increased to 31 GiB. iOS build/install/launch passed
first. Only after iOS execution ended was Android started; the incomplete NDK was repaired through
`sdkmanager`, and Android build/install/launch passed. Native preflight is therefore PASS, while
the TASK-100C gate remains NO-GO because the full Maestro, device-profile, accessibility and visual
requirements did not pass.
