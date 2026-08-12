# Mobile Native Security Test Matrix

| Control                      | Unit                              | Integration                | Native                       | Production Bundle              | Status |
| ---------------------------- | --------------------------------- | -------------------------- | ---------------------------- | ------------------------------ | ------ |
| Auth secret storage          | SecureStore adapter               | Session restore/logout     | Keychain config              | semantic scan                  | PASS   |
| AsyncStorage secret scan     | dependency/use scan               | repository scan            | N/A                          | export scan                    | PASS   |
| Cache ownership              | owner cache tests                 | auth private-query cleanup | user-switch flow             | no persisted private cache     | PASS   |
| Logout cleanup               | auth controller                   | private cache/device hook  | Maestro                      | no stale artifact              | PASS   |
| User-switch cleanup          | owner isolation                   | cache namespace            | Maestro                      | N/A                            | PASS   |
| App-switcher privacy         | lifecycle state                   | boundary component         | native background/foreground | screen-capture module included | PASS   |
| App lock                     | immediate/grace                   | biometric controller       | Maestro contract             | test adapter excluded          | PASS   |
| Biometric fallback           | cancel/lockout                    | reauth policy              | Maestro contract             | no mock adapter                | PASS   |
| Deep-link allowlist          | parser/bounds                     | route guard                | invalid-link flow            | no arbitrary router            | PASS   |
| Token deep-link hygiene      | consume parser                    | auth API contract          | cleanup flow                 | token scan                     | PASS   |
| API host lock                | environment tests                 | release config             | export config                | production scan                | PASS   |
| ATS                          | config validation                 | prebuild                   | Info.plist audit             | export config                  | PASS   |
| Report file ownership        | descriptor/share policy           | server owner revalidation  | download/share flow          | no storage secret              | PASS   |
| Temp file cleanup            | expiry/error/owner policy         | lifecycle cleanup contract | report flows                 | private cache only             | PASS   |
| Share security               | local artifact validation         | report contract            | confirmation flow            | no signed URL share            | PASS   |
| Clipboard                    | classification tests              | inventory                  | security settings            | no token copy surface          | PASS   |
| Push privacy                 | payload tests                     | destination ownership      | foreground/cold flows        | no financial payload           | PASS   |
| Listener cleanup             | controller counts                 | adapters                   | 20-cycle resource test       | N/A                            | PASS   |
| Production debug isolation   | compile-time fixture substitution | config scan                | production safe route        | semantic scan                  | PASS   |
| Logger redaction             | recursive tests                   | telemetry boundary         | N/A                          | sensitive string scan          | PASS   |
| Crash redaction              | context tests                     | crash boundary             | N/A                          | DSN/secret scan                | PASS   |
| Backup policy                | file class policy                 | cache location             | native config audit          | file sharing disabled          | PASS   |
| Cache migration              | schema tests                      | safe purge                 | upgrade contract             | version present                | PASS   |
| Device integrity signal      | advisory tests                    | auth independence          | settings evidence            | no bypass                      | PASS   |
| Offline mutation prohibition | policy/query tests                | online mutation mode       | offline flows                | no queue package               | PASS   |
