# Mobile Device Registration Matrix

| Capability            | Client             | Backend            | External Credential | Security             | Tests         | Status        |
| --------------------- | ------------------ | ------------------ | ------------------- | -------------------- | ------------- | ------------- |
| Permission states     | Expo Notifications | n/a                | none                | contextual prompt    | unit/E2E      | PASS          |
| Register              | iOS adapter        | owner-scoped API   | APNs external       | encrypted token      | unit/API      | PASS          |
| Rotate                | iOS adapter        | atomic replacement | APNs external       | old material revoked | unit/API      | PASS          |
| Logout/user switch    | cleanup hook       | revoke-all         | none                | owner-scoped         | unit/API      | PASS          |
| Invalid token cleanup | listener/service   | revoke             | provider external   | no token output      | unit          | PASS          |
| Live delivery         | integrated client  | delivery contract  | required            | environment isolated | contract only | NOT_VALIDATED |
