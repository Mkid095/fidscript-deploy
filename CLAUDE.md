# CLAUDE.md

FIDScript Deploy - AI Development Constitution

> **Operating mode (from 2026-06-16):** Hardening, not feature-chasing. The platform is being rebuilt dependency-first from Phase 0, with every phase verified on the VPS before advancing. See `docs/AUDIT.md` for why.

---

## Navigation

| Need | Go To |
|------|-------|
| **Start here — orient any agent/human (read first)** | `docs/START_HERE.md` |
| Why we reset + current honest state | `docs/AUDIT.md` |
| Roadmap, phase sequence, template, verification rubric | `docs/phases/README.md` |
| Current phase and status | `AGENT_STATUS.md` |
| Architecture decisions | `DECISIONS.md` |
| System architecture (⚠ aspirational target — see START_HERE) | `ARCHITECTURE.md` |
| All services overview (⚠ aspirational target) | `docs/SERVICE_CATALOG.md` |
| Complete file inventory | `PROJECT_INDEX.md` |

> **⚠ The design/spec docs (`ARCHITECTURE.md`, `docs/PRODUCT_REQUIREMENTS.md`,
> `docs/*_SPEC.md`, `docs/services/*.md`) describe the *intended* system, written before
> the hardening reset. They are the destination, not the present. Always cross-check
> against `docs/AUDIT.md` and the phase doc's "Current State" before assuming a feature works.**

---

## Service Specifications

| Service | Read First |
|---------|------------|
| Authentication | `docs/services/auth.md` |
| Projects | `docs/services/projects.md` |
| Deployments | `docs/services/deployments.md` |
| Storage | `docs/services/storage.md` |
| Email | `docs/services/email.md` |
| Database | `docs/services/database.md` |
| Realtime | `docs/services/realtime.md` |
| Functions | `docs/services/functions.md` |
| Queues | `docs/services/queues.md` |
| Cron | `docs/services/cron.md` |
| Domains | `docs/services/domains.md` |
| Monitoring | `docs/services/monitoring.md` |
| Logging | `docs/services/logging.md` |
| Skills | `docs/services/skills.md` |
| Templates | `docs/services/templates.md` |
| Integrations | `docs/services/integrations.md` |

---

## Phase Documents (restructured, dependency-correct)

| Phase | Title | Document |
|------:|-------|----------|
| 00 | Architecture & Build Foundation | `docs/phases/phase-00.md` |
| 01 | Installer & Infrastructure Stack | `docs/phases/phase-01.md` |
| 02 | Event Bus & Service Registry | `docs/phases/phase-02.md` |
| 03 | Identity & Access (platform auth) | `docs/phases/phase-03.md` |
| 04 | Projects Engine | `docs/phases/phase-04.md` |
| 05 | Storage Platform | `docs/phases/phase-05.md` |
| 06 | Deployment Engine | `docs/phases/phase-06.md` |
| 07 | Domains & TLS | `docs/phases/phase-07.md` |
| 08 | Database Platform | `docs/phases/phase-08.md` |
| 09 | Email Platform (Stalwart) | `docs/phases/phase-09.md` |
| 10 | Functions Runtime | `docs/phases/phase-10.md` |
| 11 | Queues Platform | `docs/phases/phase-11.md` |
| 12 | Scheduler Platform | `docs/phases/phase-12.md` |
| 13 | Realtime Platform | `docs/phases/phase-13.md` |
| 14 | Monitoring Platform | `docs/phases/phase-14.md` |
| 15 | Logging Platform | `docs/phases/phase-15.md` |
| 16 | SDK Platform | `docs/phases/phase-16.md` |
| 17 | MCP Platform | `docs/phases/phase-17.md` |
| 18 | CLI Platform | `docs/phases/phase-18.md` |
| 19 | Dashboard Platform | `docs/phases/phase-19.md` |
| 20 | Skills Platform | `docs/phases/phase-20.md` |
| 21 | Templates Platform | `docs/phases/phase-21.md` |
| 22 | AI Layer | `docs/phases/phase-22.md` |
| 23 | Marketplace | `docs/phases/phase-23.md` |

---

## Technical References

| Reference | Location |
|-----------|----------|
| API Specification | `docs/API_SPEC.md` |
| SDK Specification | `docs/SDK_SPEC.md` |
| MCP Tools | `docs/MCP_SPEC.md` |
| Data Model | `docs/DATA_MODEL.md` |
| Event Catalog | `docs/EVENT_CATALOG.md` |
| Design System | `docs/DESIGN_SYSTEM.md` |
| Integration Hub | `docs/INTEGRATION_HUB.md` |
| Platform Boundaries | `docs/PLATFORM_BOUNDARIES.md` |

---

## Development Rules

1. **Verify Before "Done"** - Nothing is complete until it compiles, runs, and passes its prove-it tests on the VPS. No exceptions.
2. **API First** - Every feature accessible via API before dashboard
3. **Event Driven** - All platform actions emit events; events must have real consumers (see Phase 02)
4. **Integration is a Deliverable** - Every phase declares its events, service-registry entry, and SDK/MCP/CLI/dashboard touchpoints
5. **Provider Abstraction** - Never hardcode external services
6. **MCP + SDK Compatible** - All features have MCP tools and SDK methods
7. **150 Line Limit** - Split files exceeding 150 lines
8. **Feature-Based Structure** - Files organized by feature
9. **No Emojis in UI** - Use text or icon components only
10. **No Secrets in Code/History** - Secrets via `_FILE` env or a secrets manager; never committed
11. **Tenant Isolation** - Every query scoped by project/owner; isolation is tested

---

## Startup Sequence

1. Read `docs/AUDIT.md` - Know the honest current state
2. Read `AGENT_STATUS.md` - Know which phase is `In Progress` / `Verified`
3. Read `docs/phases/README.md` - Know the roadmap and verification rubric
4. Read `docs/phases/phase-XX.md` - Know this phase's deliverables and exit criterion
5. Read relevant `docs/services/[service].md` - Know the service contract
6. Read related ADRs in `DECISIONS.md` - Know decisions made
7. Implement against the phase spec
8. **Verify on the VPS** against the phase's `## Verification` section
9. Commit the verified phase
10. Update `AGENT_STATUS.md`; update `DECISIONS.md` if a new ADR was created

---

## Source Structure

```
apps/
  api/            # NestJS API (23 modules) - the core
  dashboard/      # Next.js dashboard (Phase 19)
  mcp-server/     # MCP server for AI agents (Phase 17)
  sdk/            # TypeScript SDK (Phase 16; consolidate with packages/sdk)
packages/
  types/ shared/ events/ config/ ui/ eslint-config/   # shared workspace packages
installer/
  docker/ traefik/ config/ scripts/   # VPS install (Phase 01)
docs/
  AUDIT.md        # honest current state
  phases/         # roadmap + phase specs
  services/       # service contracts
```

---

## Infrastructure

**Cloudflare Domain:** deploy.fidscript.com

Configured during Phase 07 (Domains & TLS). DNS credentials are in Cloudflare (see memory: `cloudflare-config`) and must be wired into code in Phase 07 — they are **not** wired today.

---

*Last updated: 2026-06-16*
