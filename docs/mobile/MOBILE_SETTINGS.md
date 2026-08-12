# Mobile Settings

Settings is the single mobile surface over existing account and preference contracts. It groups Account, Appearance, Market and Data, Notifications, Portfolio, Strategy Lab, Privacy, Security, Methodology, Help, Legal and About without duplicating domain settings.

Server-backed mutations use `expectedVersion`, rollback on failure and never queue offline. Appearance provides system/light/dark and reduced motion. Market/data options are capability-aware. Notification settings link to the TASK-100F implementation and distinguish system permission from channel preference. Portfolio privacy mode masks visual and accessibility values. Strategy defaults affect only new configurations.

Account shows invitation/admin-managed e-mail verification, locale/timezone and logout. Unsupported e-mail editing or public registration is not offered. Data export and account deletion use their existing owner-scoped request lifecycles; re-authentication and legal hold are not bypassed. Security exposes current biometric/session/reset controls while device integrity and native hardening remain TASK-100J.

About exposes only public app version, build, supported platform and user-safe provider status. Internal hostnames, auth configuration, provider keys and staging credentials are fail-closed in production.
