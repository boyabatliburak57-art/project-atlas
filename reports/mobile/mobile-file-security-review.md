# Mobile File Security Review

| Control                                  | Result                                           |
| ---------------------------------------- | ------------------------------------------------ |
| Owner revalidation before download/share | PASS                                             |
| HTTPS-only URL                           | PASS                                             |
| Redirect policy                          | `error` / bounded fail-closed                    |
| Expiry                                   | Checked before download and share                |
| MIME/extension allowlist                 | PDF and CSV only                                 |
| Maximum size                             | 25 MiB                                           |
| Integrity                                | Optional server SHA-256, always locally computed |
| Filename                                 | 128-bit random; no PII/resource identifier       |
| Location                                 | Private iOS cache directory                      |
| Retention                                | Maximum 15 minutes; error/share/logout cleanup   |
| Path traversal/arbitrary scheme          | Rejected                                         |
| Public Documents/file sharing            | Disabled                                         |
| Signed URL sharing                       | Prohibited                                       |
| File import                              | NOT_AVAILABLE                                    |

No storage credential or home-grown cryptography is present in the mobile bundle.
