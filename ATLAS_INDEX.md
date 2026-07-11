# Atlas Doküman İndeksi

Bu dosya Project Atlas repository'sindeki bağlayıcı belgelerin okunma sırasını tanımlar.

## Zorunlu temel belgeler

1. `README.md`
2. `T3_CODE_START_HERE.md`
3. `SYSTEM_PROMPT.md`
4. `docs/DOC-000-Project-Constitution.md`
5. `docs/DOC-001-Business-Requirements.md`
6. `docs/DOC-002-Product-Requirements.md`
7. `docs/DOC-003-Software-Requirements.md`
8. `docs/DOC-004-Technology-Stack.md`
9. `docs/DOC-005-Repository-and-Code-Standards.md`
10. `docs/DOC-006-Security-and-Privacy-Requirements.md`
11. `docs/DOC-007-Development-and-Release-Workflow.md`

## Mimari belgeler

1. `architecture/ARCH-001-System-Overview.md`
2. `architecture/ARCH-002-Market-Data-Engine.md`
3. `architecture/ADR-001-Modular-Monolith.md`
4. `architecture/ADR-002-TypeScript-NestJS-Backend.md`
5. `architecture/ADR-003-Versioned-Scan-Rule-AST.md`

## Veri ve API

1. `database/DB-001-Conceptual-Model.md`
2. `database/DB-002-Market-Data-Physical-Design.md`
3. `api/API-001-Overview.md`
4. `api/API-002-Instruments-and-Market-Data.md`

## Görev sırası

1. `TASK-001` Repository Validation
2. `TASK-002` Monorepo Scaffold
3. `TASK-003` Docker Development Environment
4. `TASK-004` Web App Scaffold
5. `TASK-005` API App Scaffold
6. `TASK-006` Worker App Scaffold
7. `TASK-007` Initial Database Schema
8. `TASK-008` Market Data Provider Abstraction
9. `TASK-009` BIST Instrument Import Pipeline
10. `TASK-010` OHLCV Ingestion Core

## Öncelik kuralı

Çelişki halinde:

1. Project Constitution
2. Kabul edilmiş ADR
3. Security Requirements
4. Software Requirements
5. Architecture/Database/API belgeleri
6. Product Requirements
7. Business Requirements
8. Task Card
9. Kod içi yorum

Alt seviye belge üst seviye belgeyi geçersiz kılamaz.

## T3 Code okuma kuralı

T3 Code her görevde tüm repository'yi körlemesine okumamalıdır.

Zorunlu başlangıç belgeleri ile görev kartında referans verilen ilgili belgeleri okumalı; etkilenen modülleri ve çelişkileri uygulamadan önce özetlemelidir.
