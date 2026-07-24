# ARCH-019 — Pre-Staging Product Completion Architecture

Bileşenler:

- User Preferences Service
- Global Search Aggregator
- Activity Read Model
- Report Center Orchestrator
- Methodology Metadata Adapter
- Accessibility/Localization UI Layer
- Local RC Audit Runner

İlkeler:

- mevcut domain kaynakları değişmez
- search ownership filtreli servislerden gelir
- activity transaction kaynağı değildir
- reports arbitrary file path kabul etmez
- staging gate ayrı blocker olarak kalır
