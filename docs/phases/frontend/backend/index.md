# Backend Inventory — the frontend's source of truth

> **Purpose.** Every frontend spec cross-references endpoints here by stable ID (`AUTH-04`, `DEPL-02`, …).
> This is the **accurate** map of what the API actually does today — audited from code on 2026-06-20, not
> assumed. If a spec references an ID that isn't here, the endpoint doesn't exist (yet) and the spec must
> say so. **Nothing in a spec may be invented.**
>
> Global API prefix: `/api/v1`. ValidationPipe: `whitelist + transform + forbidNonWhitelisted`.

## Module → file map

| File | Modules | Route IDs |
|------|---------|-----------|
| `auth.md` | platform auth, BaaS app-auth, crypto | `AUTH-*`, `APPAUTH-*` |
| `projects-deployments-domains.md` | projects, deployments, domains | `PROJ-*`, `DEPL-*`, `DOM-*` |
| `data.md` | storage, databases, email | `STOR-*`, `DB-*`, `MAIL-*` |
| `compute.md` | functions, queues, scheduler/cron, realtime | `FN-*`, `QUEUE-*`, `CRON-*`, `RT-*` |
| `surfaces.md` | monitoring, logging, templates, ai, marketplace, registry/health, MCP, SDK, CLI | `MON-*`, `LOG-*`, `TMPL-*`, `AI-*`, `MKT-*`, `SVC-*`, `MCP-*` |

## Global conventions (document once, reference everywhere)

- **Event bus** is a custom `EventService` (NOT NestJS `EventEmitter2`). Every event has the uniform
  envelope `{ id, type, timestamp, actorId, actorType, resourceType, resourceId, metadata }`. Frontend
  realtime consumes these via the socket bridge (see `compute.md` → Realtime).
- **Auth**: class-level `@UseGuards(JwtAuthGuard)` almost everywhere. `req.user = { userId }` for
  platform tokens; app-user tokens carry `scope:'app'` + `projectId` and are read by `AppJwtGuard`.
- **Roles**: `owner` (implicit via `project.ownerId`), `admin`, `developer`, `viewer`. Enforced ad-hoc
  inside services (`ProjectAccessService.checkPermission([roles])`) — **no role decorators exist**.
  Notably: in Projects, `developer`/`viewer` grant nothing beyond read; in Deployments/Domains the role
  is **ignored** (any member passes). Document the effective permission per screen.
- **Project scoping**: most resource routes are `/projects/:projectId/...`. Tenant isolation relies on
  the path `projectId` + an owner/member check — see "Security caveats" below for gaps.

## Public routes (no JWT)

- `POST /api/v1/auth/{register,login,refresh,magic-link,verify-magic-link,mfa/challenge}`
- `POST /api/v1/projects/:projectId/auth/{register,login,magic-link,verify-magic-link,magic-code,verify-magic-code,refresh}`, `GET .../auth/oauth/:provider{,/callback}`
- `POST /api/v1/invitations/accept` (PROJ-22)
- `POST /api/v1/logs/ingest` — auth by `X-API-Key: fpk_…` (no JWT)
- `POST /api/v1/email/{inbound/webhook,events/bounce,events/complaint}` — Stalwart webhooks (optional HMAC)
- `GET /metrics` (Prometheus, outside `/api/v1`), `GET /api/v1/marketplace*` (public reads)
- `GET /api/v1/services*`, `GET /api/v1/health*` (registry + health, fully public)

## Realtime event catalog (what the socket bridge fans out)

The `RealtimeBridgeService` subscribes to **every** platform event (`@OnEvent('**')`) and broadcasts to
`project:<projectId>` rooms. Families: `identity.*`, `auth.*`, `projects.*`, `deployments.*`,
`domain.*`, `storage.*`, `database.*`, `email.*`, `function.*`, `queues.*`, `cron.*`, `realtime.*`,
`monitoring.*`, `logs.*`, `template.*`/`templates.*`, `ai.*`, `marketplace.*`. Exact strings are listed
per module in the cluster files. (Note: naming is inconsistent — `template.created` vs
`templates.template.applied`; flag for normalization, do not "fix" silently.)

## Security caveats & known gaps (HONEST — document, don't hide)

These must be reflected in specs (e.g. F02, F04, F11) and are candidates for backend hardening:

1. **DOM-05 / DOM-06** (`connect-cloudflare`, delete domain) have **no project-access check** — any
   authenticated user can act on any project's domains / store Cloudflare credentials.
2. **Email services** mostly rely on `projectId` path-scoping in Prisma queries, with **no explicit
   owner/member check** — an authenticated user passing an arbitrary `projectId` can read/operate that
   project's email resources if they can guess IDs.
3. **STOR-08** (`public-url`) skips the per-user access check.
4. **MKT-09** (`PATCH marketplace/items/:id`) does not verify ownership before update.
5. **Email webhooks** (MAIL-32/33/34) are "secured" only by optional HMAC; **if `STALWART_WEBHOOK_SECRET`
   is unset, signature verification is skipped and the routes are fully open.**
6. **Platform magic-link is broken** (AUTH-05/06): `verifyMagicLink` queries `where:{user:{email:token}}`
   — treats the token as the email, never matches. Use magic-**code** (APPAUTH-05/06) instead.
7. **App-auth `createRole` is dead code** (no `@Post`); AppRoles can't be created except via assign.
8. **Functions** `php/go/rust` runtimes are declared in the enum but **have no runtime implementation**
   (only `nodejs`/`python` execute).
9. **AuthApiKeyService.validateApiKey** is an O(N) bcrypt scan (no indexed lookup) — affects API-key perf.
10. **Precondition failures** in Deployments lifecycle/rollback throw plain `Error` → surface as HTTP 500
    (not 4xx). Specs must handle 500s on those actions.
11. **Skills module does not exist** (Phase 20 unbuilt) — no routes; do not spec a Skills screen against
    live endpoints. **AI/templates/marketplace** are present.

## Not implemented / stubs (do not build UI that assumes these work)

- Skills (no module). · `archive` deploy source (throws). · Functions php/go/rust execution.
- Stalwart `deleteAccount` / `setAccountPassword` / `setAccountStatus` are no-ops in v0.15.5 (mailbox
  "suspend" only flips a DB flag). · App magic-link (use magic-code).
