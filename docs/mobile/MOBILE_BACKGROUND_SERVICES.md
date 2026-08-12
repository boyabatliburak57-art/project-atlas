# Mobile Background Services

Background refresh is `NOT_REQUIRED_FOR_V1`. iOS background execution is best-effort and no financial correctness depends on it.

Allowlisted client background work is limited to safe notification handling and sensitive temporary-file cleanup. Scanner execution, alert evaluation, portfolio risk calculation, backtests, provider polling and continuous socket/polling loops remain backend worker responsibilities. The executable allowlist rejects these jobs with `BACKGROUND_FINANCIAL_TASK_PROHIBITED`.

Foreground/background and network listeners are centralized, deduplicated and cleaned on unmount/logout/account switch. Network restoration may trigger bounded reads but never mutation replay. Push destination ownership is revalidated after foreground, background or cold launch. Local notifications are not used (`NOT_APPLICABLE`).
