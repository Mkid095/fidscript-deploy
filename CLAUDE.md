# CLAUDE.md

FIDScript Deploy - AI Development Constitution

---

## Navigation

| Need | Go To |
|------|-------|
| Current phase and status | `AGENT_STATUS.md` |
| Architecture decisions | `DECISIONS.md` |
| System architecture | `ARCHITECTURE.md` |
| All services overview | `docs/SERVICE_CATALOG.md` |
| Complete file inventory | `PROJECT_INDEX.md` |

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

## Phase Documents

| Phase | Document |
|-------|----------|
| Phase 00 (Architecture First) | `docs/phases/phase-00.md` |
| Phase 01 (Repository Architecture) | `docs/phases/phase-01.md` |
| Phase 02 (Installer System) | `docs/phases/phase-02.md` |
| Phase 03 (Identity & Access) | `docs/phases/phase-03.md` |
| Phase 04 (Projects Engine) | `docs/phases/phase-04.md` |
| Phase 05 (Infrastructure Foundation) | `docs/phases/phase-05.md` |
| Phase 06 (Deployment Engine) | `docs/phases/phase-06.md` |
| Phase 07 (Domain Management) | `docs/phases/phase-07.md` |
| Phase 08-23 | `docs/phases/phase-XX.md` |

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

1. **API First** - Every feature accessible via API before dashboard
2. **Event Driven** - All platform actions generate events
3. **Documentation First** - Read existing docs before implementing
4. **Provider Abstraction** - Never hardcode external services
5. **MCP Compatible** - All features have MCP tools
6. **SDK Compatible** - All features have SDK methods
7. **150 Line Limit** - Split files exceeding 150 lines
8. **Feature-Based Structure** - Files organized by feature
9. **No Emojis in UI** - Use text or icon components only
10. **Backend First** - Test backend before frontend components

---

## Startup Sequence

1. Read `AGENT_STATUS.md` - Know current phase
2. Read `docs/phases/phase-XX.md` - Know phase deliverables
3. Read relevant `docs/services/[service].md` - Know service spec
4. Read related ADRs in `DECISIONS.md` - Know decisions made
5. Implement feature
6. Write tests
7. Update `AGENT_STATUS.md`
8. Update `DECISIONS.md` if new ADR created

---

## Source Structure

```
src/
  pages/          # Route pages
  components/     # Shared components
  services/       # API service layer
  hooks/          # React hooks
  types/          # TypeScript types
  utils/          # Utility functions
  features/       # Feature-based modules
```

---

## Infrastructure

**Cloudflare Domain:** deploy.fidscript.com

Configured during Phase 07 (Domain Management).

---

*Last updated: 2026-06-16*
