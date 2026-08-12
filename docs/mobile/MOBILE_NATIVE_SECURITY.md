# Mobile Native Security

TASK-100J hardens the existing iOS client without changing financial domain logic. Controls include Keychain-only auth, reinstall-safe session purge, memory-only sensitive caches, owner cleanup, app-switcher masking, local app lock, capture-risk mitigation, validated temporary files, share confirmation, strict deep links, production HTTPS/host lock, push privacy and centralized redaction.

Production iOS config is phone/portrait only, has no ATS cleartext exception, disables iTunes file sharing/open-in-place, declares Face ID purpose, has no background modes or Associated Domains, and contains no app groups/debug entitlement. Android/tablet remain deferred. Certificate pinning is `NOT_REQUIRED_BY_CURRENT_ARCHITECTURE`; ATS plus platform TLS and operational certificate rotation are preferred over a brittle custom implementation.

Device-integrity signals, if later supplied, are weak advisory risk signals only. They may warn or require reauthentication but never authenticate a user or bypass backend authorization. Current status is policy foundation without a jailbreak-certainty claim.

The redaction boundary recursively removes credentials, auth/reset/push tokens, signed URLs, portfolio/transaction values, support text, strategy AST and provider data before logger/crash adapters. Safe metadata is limited to reason code, request ID, route class, feature/status, duration and app version.

Limitations: universal-link production association, production APNs, live providers, transactional e-mail and reviewed legal content remain external gates. VoiceOver remains `ACCEPTED_PRODUCT_WAIVER / OPEN_TASK_100K`; final accessibility/performance/QA is not claimed here.
