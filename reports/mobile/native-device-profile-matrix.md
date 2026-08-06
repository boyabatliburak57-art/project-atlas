# Native Device Profile Matrix — Mobile v1

```text
Required iOS Profiles: 1
Completed iOS Profiles: 1
Required Android Profiles: 0
Required Tablet Profiles: 0
Android Status: DEFERRED_V1_1
Tablet Status: DEFERRED_V1_1
```

| Profile                       | Platform | Native Required | Available Device                                               | Theme Runs   | Font Scale      | Orientation | Result                                   |
| ----------------------------- | -------- | --------------: | -------------------------------------------------------------- | ------------ | --------------- | ----------- | ---------------------------------------- |
| Small iPhone                  | iOS      |              No | iPhone 17e candidate, iOS 26.5                                 | Light        | Default + Large | Portrait    | DEFERRED_V1_1_NOT_RELEASE_GATED          |
| Standard iPhone               | iOS      |             Yes | iPhone 17, iOS 26.5, `1FAB01B5-2382-4275-AE5D-C5D78E4E56CA`    | Light + Dark | Default + Large | Portrait    | PASS — build/install/launch; Maestro 8/8 |
| Large iPhone                  | iOS      |              No | iPhone 17 Pro Max candidate, iOS 26.5                          | Light        | Default         | Portrait    | DEFERRED_V1_1_NOT_RELEASE_GATED          |
| Standard Android Phone API 36 | Android  |              No | FaceScanner_API36, API 36, 1080×2400, 420 dpi, `emulator-5554` | Light + Dark | Default + Large | Portrait    | DEFERRED_V1_1_NOT_RELEASE_GATED          |

Mobile v1 release evidence is limited to the standard iPhone. Historical Android and additional
iPhone results remain recorded in earlier reports but are not PASS claims or v1 release gates.
