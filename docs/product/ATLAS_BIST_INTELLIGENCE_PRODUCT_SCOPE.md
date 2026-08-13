# Atlas BIST Intelligence Product Scope

**Karar tarihi:** 2026-08-12
**Kapsam kararı:** `APPROVED_AND_DOCUMENTED`
**Authoritative başlangıç:** TASK-110A

## Ürün tanımı

Atlas is a BIST-focused investment research and market-intelligence platform combining market
data, company intelligence, institutional flows, event intelligence, screening, portfolio
analytics and strategy research in one connected mobile experience.

Atlas bir broker değildir; trade execution yapmaz, yatırım tavsiyesi üretmez, kullanıcı adına emir
oluşturmaz veya iletmez. Üretilen sinyal, skor, anomali, karşılaştırma ve tarihsel etki çıktıları
araştırma amaçlıdır. Her çıktı kaynak, veri zamanı, freshness, kapsam, metodoloji ve bilinen
sınırlamalarla açıklanabilir olmalıdır.

## Değişikliğin niteliği

Bu karar mevcut mobile v1 yeteneklerinin replacement'ı değildir. Authentication, Onboarding,
Market Overview, Search, Symbol Detail, Scanner, Watchlists, Alerts, Portfolio, Risk, Strategy Lab,
Backtests, Experiments, Reports, Help, Support, Settings, Offline ve Native Security korunur.
TASK-100A–TASK-100L kanıtı bu işlevler için tarihsel/güncel baseline'dır.

Yeni ürün kapsamı aşağıdaki bağlı araştırma alanlarını ekler:

1. KAP ve corporate-event intelligence: KAP Intelligence, Corporate Events, Financial Result
   Events, New Business Relationships, Buybacks, Dividends, Capital Actions ve IPO Center.
2. Institutional intelligence: AKD/Brokerage Distribution, Institutional Buyers/Sellers,
   institution-specific flow, money inflow/outflow, settlement/takas, foreign/institutional
   settlement, settlement trend ve anomaly.
3. BIST market structure: VBTS measures, gross settlement, single price, order-package measures,
   short-selling restrictions ve short-selling analytics.
4. Calendar intelligence: economic, earnings, dividend, corporate event, IPO ve VIOP expiry
   calendars.
5. Company intelligence: company timeline, peer analysis, company comparison, analyst
   expectations, fund positions ve institutional ownership.
6. Radar 2.0: fundamental, institutional, settlement, event ve anomaly scanners.
7. Fund intelligence: fund analytics ve fund comparison.
8. VIOP intelligence: futures basis, open interest, volume, rollover ve institutional VIOP flow.
9. Advanced market analysis: market depth/order-book analytics, advanced chart drawings,
   multi-symbol comparison ve chart workspaces.

The complete 53-capability ledger is maintained in
`reports/mobile/task-110a-existing-vs-new-capability-matrix.md`.

## Atlas differentiation layer

- **Atlas Pulse:** personalized, explainable market and company change summary.
- **Company Timeline:** one chronological surface over disclosures, results, actions, ownership and
  market events.
- **Event Impact Lab:** historical, reproducible post-event behavior analysis; not a forecast.
- **Atlas Anomaly Engine:** methodology-backed deviations with baseline, threshold and confidence
  context.
- **Atlas Market Regime:** descriptive market-state classification with versioned methodology.
- **Smart Inbox:** one prioritized, deduplicated notification and research queue.
- **Scanner → Backtest:** a scanner definition can seed a versioned research hypothesis.
- **Event → Historical Analysis:** an event cohort can seed reproducible historical analysis.
- **Advanced Company Compare:** shared metrics, peer cohorts and data-period alignment.
- **Cross-Module Research Navigation:** source-aware links preserve symbol, institution, event,
  interval and as-of context across modules.

None of these features may use recommendation language, suitability claims, personalized trade
instructions or implied certainty. No AI-chatbot visual identity is permitted.

## Product and UX objective

`MORE CAPABILITY / LESS PERCEIVED COMPLEXITY`

The experience uses progressive disclosure, contextual navigation, unified search, unified
notifications, domain hubs, a personalized home, shared components and shared data models. It must
not expose duplicated tools or an icon-wall "More" screen.

Primary navigation is limited to five tabs: `Home`, `Markets`, `Radar`, `Portfolio`, `Research`.
Global Search and Notifications/Smart Inbox are `GLOBAL_ACTION`; Settings/Account is
`PROFILE_LEVEL_NAVIGATION`. TASK-110B owns detailed route and navigation design.

## Data and provider rules

Analytics, scanners and views reuse canonical domains. AKD does not create separate analysis and
scanner stores; both consume `InstitutionalFlowDomain`. The same rule applies to settlement, KAP,
events, fundamentals, VIOP, alerts and comparison.

Every provider-backed feature is resolved through the capability registry with one of:
`SUPPORTED_LIVE`, `SUPPORTED_DELAYED`, `PROVIDER_REQUIRED`, `LICENSE_REQUIRED`,
`EXTERNAL_CONFIGURATION_REQUIRED`, `NOT_AVAILABLE`. Unknown, stale or unlicensed capability state
fails closed. Fake production data is prohibited; demo fixtures are isolated and visibly labeled.

## Delivery and audit sequence

```text
TASK-110A -> TASK-110B -> TASK-110C -> TASK-110D -> TASK-110E -> TASK-110F
-> TASK-110G -> TASK-110H -> TASK-110I -> TASK-110J -> TASK-110K -> TASK-110L
-> TASK-110M -> TASK-110N -> TASK-110O -> TASK-110P -> TASK-110Q -> TASK-110R
-> TASK-110S
```

Each task depends on the preceding task's accepted result. TASK-110R is the expanded feature-parity
audit; TASK-110S is the only next non-staging launch-completeness re-audit in this sequence.

## Unchanged release posture

```text
Production Readiness: NO-GO
Staging Gate: DEFERRED_EXTERNAL_GATE
Production Launch: BLOCKED
```

Existing provider credentials, licensing, legal, notification delivery, accessibility and external
staging blockers remain open. Scope documentation is not implementation or production evidence.
