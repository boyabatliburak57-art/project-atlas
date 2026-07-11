# TASK-002 — Monorepo Scaffold

**Durum:** Hazır  
**Bağımlılık:** TASK-001

## Amaç

Project Atlas uygulama kodu için minimal monorepo iskeleti oluşturmak.

## Teknoloji kararı

- pnpm workspaces
- Turborepo
- TypeScript
- `apps/web`
- `apps/api`
- `apps/worker`
- `packages/config`
- `packages/types`
- `packages/domain`
- `packages/validation`

## Gereksinimler

- root `package.json`
- `pnpm-workspace.yaml`
- `turbo.json`
- ortak TypeScript config
- ESLint ve Prettier
- `.editorconfig`
- `.gitignore`
- `.env.example`
- app ve package README dosyaları
- sabit Node sürümü

## Kabul kriterleri

- `pnpm install` başarılı
- `pnpm lint` çalışıyor
- `pnpm typecheck` çalışıyor
- workspace paketleri algılanıyor
- gerçek ürün özelliği eklenmiyor

## T3 Code prompt

```text
tasks/TASK-002-Monorepo-Scaffold.md görevini uygula. Önce temel dokümanları oku. pnpm workspace ve Turborepo tabanlı minimal iskelet oluştur. Henüz ürün özelliği geliştirme. Kurulum sonunda install, lint ve typecheck çalıştır. Eklediğin bağımlılıkları gerekçeleriyle raporla.
```
