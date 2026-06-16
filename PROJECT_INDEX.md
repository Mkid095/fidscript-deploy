# Project Index

Complete file inventory for FIDScript Deploy.

---

## Quick Navigation

| Need | Go To |
|------|-------|
| AI Agent Constitution | `CLAUDE.md` |
| Current Status | `AGENT_STATUS.md` |
| Architecture Decisions | `DECISIONS.md` |
| System Design | `ARCHITECTURE.md` |
| All Services | `docs/SERVICE_CATALOG.md` |
| All Files Below | See below |

---

## Root Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | AI Development Constitution |
| `AGENT_STATUS.md` | Development state tracker |
| `DECISIONS.md` | Architecture Decision Records |
| `ARCHITECTURE.md` | System architecture |
| `README.md` | Project overview |
| `PROJECT_INDEX.md` | This file - Complete file inventory |
| `CONTRIBUTING.md` | Contribution guidelines |
| `DEVELOPMENT.md` | Development setup guide |
| `package.json` | Root package configuration |
| `pnpm-workspace.yaml` | pnpm monorepo config |
| `turbo.json` | Build orchestration |
| `tsconfig.base.json` | Shared TypeScript config |
| `.env.example` | Environment variables template |
| `.eslintrc.js` | ESLint configuration |
| `.prettierrc` | Prettier configuration |
| `.gitignore` | Git ignore patterns |

---

## Monorepo Structure (`apps/` and `packages/`)

### Apps

| App | Path | Description |
|-----|------|-------------|
| Dashboard | `apps/dashboard/` | Next.js 15 frontend |
| API | `apps/api/` | NestJS 10 backend |

### Packages

| Package | Path | Description |
|---------|------|-------------|
| SDK | `packages/sdk/` | TypeScript SDK client |
| Types | `packages/types/` | TypeScript type definitions |
| Events | `packages/events/` | Platform event definitions |
| Shared | `packages/shared/` | Shared utilities |
| Config | `packages/config/` | Configuration schema |
| UI | `packages/ui/` | Shared UI components |
| ESLint Config | `packages/eslint-config/` | ESLint rules |

---

## Prototype Source (`src/`)

**STATUS:** Legacy - Will be migrated to apps/ structure

```
src/
  features/           # Feature-based components (refactored)
  pages/             # Route pages (re-exports)
  App.tsx           # Root component
  index.css         # Global styles
```

---

## Documentation (`docs/`)

### Core Architecture Docs

| File | Purpose |
|------|---------|
| `PRODUCT_REQUIREMENTS.md` | Vision & goals |
| `SERVICE_CATALOG.md` | 17 service overview |
| `DATA_MODEL.md` | Entity definitions |
| `EVENT_CATALOG.md` | 60+ events |
| `DESIGN_SYSTEM.md` | UI standards |
| `INTEGRATION_HUB.md` | Provider abstraction |
| `PLATFORM_BOUNDARIES.md` | Scope definition |
| `API_SPEC.md` | REST API reference |
| `SDK_SPEC.md` | TypeScript SDK spec |
| `MCP_SPEC.md` | MCP tools |

### Service Specifications (`docs/services/`)

| Service | File |
|---------|------|
| Authentication | `auth.md` |
| Projects | `projects.md` |
| Deployments | `deployments.md` |
| Storage | `storage.md` |
| Email | `email.md` |
| Database | `database.md` |
| Realtime | `realtime.md` |
| Functions | `functions.md` |
| Queues | `queues.md` |
| Cron | `cron.md` |
| Domains | `domains.md` |
| Monitoring | `monitoring.md` |
| Logging | `logging.md` |
| Skills | `skills.md` |
| Templates | `templates.md` |
| Integrations | `integrations.md` |

### Phase Documents (`docs/phases/`)

All 24 phases documented: phase-00.md through phase-23.md

---

## Phase Status

| Phase | Status |
|-------|--------|
| Phase 00 - Architecture First | COMPLETE |
| Phase 01 - Repository Architecture | COMPLETE |
| Phase 02 - Installer System | NEXT |

---

## Last Updated

2026-06-16

Phase 01 (Repository Architecture) COMPLETE

Monorepo structure established with pnpm workspaces.
