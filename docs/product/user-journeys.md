# User Journeys — FIDScript

> **Purpose.** The complete flows every persona follows, from first contact to daily work. Each journey
> is the source of truth for the screens, components, and events it touches. Gaps in these flows = gaps
> in the product. Cross-reference `backend/` inventory IDs and the per-service specs in
> `docs/product/services/`.

Conventions: every journey lists **Trigger**, **Preconditions**, **Steps** (numbered), **Branches**
(error / alternate paths), **Success criteria**, and **Touches** (screens + endpoints).

---

## Journey 1 — Fresh VPS to production-ready platform

The headline journey. The user has a clean Ubuntu VPS and has never seen FIDScript.

**Trigger:** A developer rents a VPS (Ubuntu 22.04/24.04, root, ≥ 4 GB RAM).
**Preconditions:** DNS A record `deploy.example.com → <VPS-IP>` and wildcard `*.apps.example.com`
*(optional but recommended — installer accepts an IP fallback).*

```
1. SSH into the VPS as root.
2. Run the installer:
     curl -sSL https://deploy.fidscript.com/install.sh | bash
   ↳ Branch — fresh box:
     installer detects Ubuntu 22.04/24.04, installs Docker + Compose + git if missing,
     clones the repo, runs the setup wizard.
   ↳ Branch — DNS not yet live:
     installer falls back to http://<VPS-IP> for the immediate dashboard URL.
3. Setup wizard (run_setup):
   - Prompts: domain, admin email, admin password (≥ 12 chars), storage path (default /data/fidscript),
     Cloudflare API token (required for DNS-01 ACME + DNS automation), server IP (auto-detected).
   - Generates secrets (Postgres, Redis, MinIO, JWT, Stalwart), writes .env, creates Cloudflare
     A records for `deploy`, `jmap`, `storage`, and wildcard `*.apps.<domain>`.
   - Renders Traefik dynamic.yml + traefik.yml (letsencrypt-dns via Cloudflare + letsencrypt-http
     fallback), Stalwart config.toml (with bcrypt-hashed admin token), and pgbouncer userlist.
4. Stack starts (deploy_stack): docker compose up -d --build, waits up to 180s for healthy,
   runs Prisma migrate deploy, seeds the admin account, reloads Traefik.
   ↳ Error — service unhealthy at 180s:
     banner warns "Some services not healthy yet"; installer continues, prints access URL +
     health-check command. User investigates.
5. Install completes. Terminal prints:
   ┌──────────────────────────────────────────────┐
   │  FIDScript Deploy is running!              │
   │  Access URL   : https://deploy.example.com  │
   │  Admin email  : admin@example.com           │
   │  Password     : <printed-once>               │
   │  First login will prompt you to change...   │
   └──────────────────────────────────────────────┘
6. User opens the URL → first-run onboarding screen (Journey 1a).
```

**Journey 1a — First-run onboarding (before login)**

**Touches:** `/onboarding` (first-run, unauthenticated), `/health` aggregate, DNS probe.

```
1. Landing page → click "Launch your cloud" → /login. If first-time-install cookie present,
   route to /onboarding instead.
2. Onboarding screen shows the welcome + a live progress board:
   - Docker services up       (polls /health — green when all healthy)
   - Database reachable       (DB-06 /status green)
   - Domain verified          (DoH probe: deploy.<domain> → SERVER_IP; wildcards A records exist)
   - SSL certificate active   (HTTPS GET /.well-known/fidscript → 200 + cert ≥ 7d)
   - Email working            (SMTP AUTH PLAIN to fidscript_stalwart:465 succeeds; magic-code send round-trips)
   Each row: idle → running (spinner) → ✓ green / ✗ red with a "Fix" link (opens the doc/command).
3. Banner "100% ready — Continue to login" when all green.
   ↳ Branch — red row: show the failing check + a one-line fix command; do NOT block login
     (advanced users may want to continue and fix later).
4. Continue → /login.
```

**Journey 1b — First login, forced change, create workspace, first deploy, API key**

```
1. /login (F02): enter printed temp email + password → POST AUTH-02.
   ↳ Must-change flag is true → AuthGuard → /force-change-password.
2. /force-change-password: enter a new password (strength meter) → POST /auth/change-password
   (new endpoint from F02 §15) → flag cleared, session rotated → /dashboard.
3. /dashboard — Projects list (empty). Click "Create project".
4. Create-project modal (F04): name "My first app", type "frontend" → POST PROJ-02.
   ↳ Success: toast "Project created", modal closes, project card animates in.
   ↳ Branch — duplicate name: inline error, slug suggestion offered.
5. Open the project → /dashboard/projects/:id → Deployments tab.
6. Click "New deployment" → paste a git URL (or choose archive) → POST DEPL-02.
7. Watch the live state machine via realtime (identity-... no, deployment.*):
   pending → blocked (if concurrent) / queued → building → deploying → success | failed.
   - Logs stream in (DEPL-04 polls + pushes), errors show inline + "View logs".
   ↳ Branch — build failed: surface the error, link to /deployments/:id/logs, suggest
     "Fix Dockerfile path" (DEPL-09/10 build-config).
   ↳ Branch — health check failed after timeout: show container logs, link to retry.
8. On success: the deployment card shows the URL https://<slug>.apps.example.com + a "Visit" button.
9. Click "Visit" → new tab, app loads (or 404 if the app has no root route — link to docs).
10. Back in the project: Settings → API Keys → "Generate key" → POST PROJ-20 → copy the fpk_…
    shown once, store hint.
11. Optional: Logs tab to see platform events; Monitoring → seed a default uptime metric.
12. Production ready.
```

**Success criteria:** health board green → login → change password → deploy reachable → API key works.
**Touches (endpoints):** AUTH-01..04,10,12, AUTH-13/14, PROJ-02/03/20, DEPL-02/03/04/09/10, MAIL-21/22 (api-keys), SVC-03/04/05 (health). Events: `identity.user.logged_in`, `identity.session.created`, `projects.project.created`, `deployments.deployment.{created,queued,building,succeeded,failed}`, `email.api_key_created`.

---

## Journey 2 — Existing team member

A teammate got invited to an existing FIDScript workspace.

**Trigger:** admin invites via PROJ-14; invitee receives an email with an invitation token URL.
**Preconditions:** invitee has an account (`/auth/register` first) OR the invitation token + email.

```
1. Open the invitation URL → /invitations/accept?token=... → POST PROJ-22.
   ↳ First-time user: redirect to /register with the email pre-filled → AUTH-01 → accept.
   ↳ Existing user: direct accept → success → /dashboard.
2. Land on /dashboard → the project the admin invited them to is selected automatically.
3. Permissions depend on the role on the invitation (admin/developer/viewer — see
   services/projects.md). Viewer = read-only; developer = read + create deployments/functions;
   admin = + members + env + settings.
```

**Success criteria:** invitee can see the project + can do exactly what their role allows, and nothing more.
**Touches:** PROJ-14, PROJ-22, AUTH-01, PROJ-10/11/12.

---

## Journey 3 — Solo developer iterating fast

The same person installed FIDScript (Journey 1) and is now in the inner loop: deploy → observe logs → tweak env → redeploy → promote to production.

```
1. /dashboard → open the side project → Deployments.
2. Click "Redeploy" on the last deployment → POST DEPL-06 → state machine replays →
   realtime updates the row in place (no full reload).
3. Logs tab: filter by `level=error`, `since=5m`, live tail (auto-scroll).
4. Env tab: edit a value → PUT PROJ-17 → confirm "restart deployments to apply" → one-click
   "Restart affected" (DEPL-06 each).
5. Promote a deployment to "production" / pin it → (deploy-config + rollback targets) → the
   previously-pinned URL stays; the new one becomes "preview."
6. Bounce to Functions: open the function → edit code in the in-browser editor → POST FN-06
   → invoke (FN-07) → see logs (FN-08).
7. Check Databases: confirm a row was written → read DB-07 connection → use in the app.
```

**Success criteria:** the inner loop (deploy → observe → tweak → redeploy) is **faster than the CLI equivalent** of the user's old setup, and never asks them to SSH.
**Touches:** DEPL-03/06, LOG-07/08, PROJ-17/18, FN-06/07/08, DB-07.

---

## Journey 4 — Enterprise admin

A platform admin at a company running FIDScript for a team. Cares about: who has access, what was changed, where things are breaking, and that the platform itself is healthy.

```
1. /dashboard — Projects overview (filterable by status, region, owner).
2. Click a project → Members (PROJ-10): assign roles (PROJ-11), revoke sessions
   (PROJ-12), send invitations (PROJ-14).
3. Audit: a per-project Activity feed (deployment.created, function.deployed,
   email.identity_created, database.credentials.rotated, …) — surfaced from realtime
   events with timestamps + actor.
4. Monitoring: default rules per project (deploy success rate, function error rate,
   queue depth, email bounce rate, domain SSL expiry in < 14d). Channels:
   email + webhook + (future) Slack/PD.
5. Health: /health aggregate + per-service status (the same data the first-run board
   used, now available anytime).
6. Marketplace: review submitted items; approve/reject (MKT-10/11); feature one (MKT-12).
```

**Success criteria:** the admin never needs to SSH the box to know "is this platform healthy?" or "who did what?" — every answer is a screen.
**Touches:** PROJ-10/11/12/14, MON-05..18, LOG-07, SVC-01/03, MKT-10/11/12. Events: a stream of `projects.*`, `auth.*`, `monitoring.*`, `marketplace.*`.

---

## Journey 5 — Backend developer (the BaaS power user)

This person uses FIDScript as their backend. They care about: data, compute, integrations.

```
1. Create a project (Journey 1b step 4) of type "backend".
2. Databases tab: POST DB-01 with `type=postgresql`, environment `production`.
   ↳ Connection strings injected into the project env automatically (DATABASE_URL, DB_*).
3. Storage tab: POST STOR-01 bucket "uploads" isPublic=false; upload via the SDK's
   signed-URL helper or the dashboard drop-zone (STOR-05).
4. Functions tab: POST FN-01 name=process-webhook, runtime=nodejs; deploy code (FN-06);
   invoke from another function or a cron job.
5. Queues tab: POST QUEUE-01 name=events, type=workqueue; subscribe a worker deployment
   or a function (target=function emits `queues.function.dispatch`).
6. Scheduler tab: POST CRON-01 cron="*/5 * * * *", endpoint=POST /api/v1/projects/<id>/functions/<fn>/invoke
   → fires every 5 min (Redis-locked, survives restart).
7. Realtime tab: POST RT-01 channel="presence" isPrivate=false; from the app, subscribe via
   the SDK; server fans out via `subscribe_project` (owner/member gated).
8. API Keys: POST PROJ-20 fpk_… for the customer's app; scoped permissions in the key.
9. Logs: a single Log Stream "app" (LOG-01) for the customer's backend; ingest via
   X-API-Key + filter.
```

**Success criteria:** a backend developer can run a **complete production backend** (DB + storage + queues + cron + realtime + functions) inside FIDScript with no SSH and no external services.
**Touches:** DB-01..11, STOR-01..08, FN-01..09, QUEUE-01..13, CRON-01..08, RT-01..08, PROJ-20, LOG-01/05/11.

---

## Journey 6 — Frontend developer (the deployment + URL consumer)

This person deploys a Next.js / Vite / static app. Cares about: the URL, the build, the env, preview vs production.

```
1. Create a project of type "frontend" (Journey 1b).
2. Deployments: paste the git URL → DEPL-02 → wait → URL https://<slug>.apps.<domain> ready.
3. Set the domain (DOM-02): point a custom domain, DNS auto-verified (DOM-04), TLS issued
   by Traefik (observed by the health checker → DOM-04 ACTIVE).
4. Env: set NEXT_PUBLIC_API_URL via the project env (PROJ-17); redeploy (DEPL-06).
5. Preview deployments: each branch/PR gets a `<branch>-<slug>.apps.<domain>` (the wildcard
   + Traefik routing). Promote one to production.
6. Realtime: subscribe the front-end to `project:<id>` events (via the SDK RealtimeModule)
   to show live build/deploy status without polling.
7. Roll back: DEPL-08 if a deploy breaks.
```

**Success criteria:** deploying a frontend is **one URL paste → a live HTTPS URL**. Custom domains work without manual DNS or cert work.
**Touches:** DEPL-02/06/08, DOM-02/03/04, PROJ-17/20, RT (subscribe).

---

## Cross-journey guarantees

- **Tenant isolation:** every per-project screen reads `projectId` from the route and is gated by
  the same role rules documented in `services/projects.md`.
- **Realtime where a live event exists:** the state machines (deployments, function deploys, queue
  publishes, cron runs, email sends) stream — see the catalog in `backend/index.md`.
- **Honest failures:** every error path in every journey has a specific message + a recovery action;
  no "something went wrong." Failed checks (build, health, verification) surface *why*, link to
  docs/logs, and offer the next step.

## What these journeys imply for the docs

- **Every screen** in every journey becomes a **screen inventory** entry (`docs/product/screens/`).
- **Every component** reusable across journeys (forms, tables, health badge, env editor) becomes a
  **component inventory** entry (`docs/product/components/`).
- **Every service** touched becomes a **service spec** (`docs/product/services/`).
- **Every navigation destination** a user reaches becomes a **navigation architecture** entry
  (`docs/product/navigation.md`).

If a journey references a screen, component, endpoint, or navigation item that doesn't yet exist in
those specs — that gap is a deliverable for the next iteration of the blueprint.