# The user-flow system

> **What this platform is, what every file in it is for, how a person is
> supposed to move through it, and where the wiring is wrong.**
>
> This is the map the product was missing. The application is large — it has
> five installed applications, thirty-one API modules and eighty-four
> dashboard routes — and nobody, including the code, agreed on what the
> **levels** are or what a **project** is. This document fixes the levels,
> draws the flows, and names every file that has to change.

---

## 1. The three levels

Everything in FIDScript is at one of three levels. Most of the confusion
comes from a screen, a route or a word that does not say which.

| Level | What it is | Who it belongs to | Where it lives |
|---|---|---|---|
| **THE PLATFORM** | The operator's own account, and the platform's own surfaces — the applications installed on it, the operator's keys, the install itself | The person who installed the platform | The **top bar**, `src/navigation/platform-nav.ts` |
| **THE PROJECT** | One workspace: its deployments, its data, its domains, its mail, its functions | A project owner and the project's members | The **project sidebar**, `src/app/(app)/projects/[projectId]/nav-groups.ts` |
| **THE APPLICATION** | An external service the operator installs, which then *provides* something to projects | The operator, once | The **Applications screen**, `src/app/(app)/applications/` |

### The fourth thing, which is not a level

**The applications are not the platform's features.** InstantDB is a
separate product with its own repository, its own CLI and its own
configuration; the platform *seams* to it
(`apps/api/src/modules/instant/`). The same is true of WhatsApp, the package
manager and the observability stack. When the platform shows "Storage" in a
project's sidebar, it must be clear whether that is the platform's MinIO or
InstantDB's file store — today it is not.

---

## 2. The inventory

### 2.1 The repository

| Path | What it is |
|---|---|
| `apps/api/` | The NestJS API — 31 modules, the platform's engine. |
| `apps/dashboard/` | The Next.js dashboard — 84 routes, the operator's console. |
| `apps/cli/` | The `fidscript` command line. |
| `apps/mcp-server/` | The control plane's MCP server (tools for agents). |
| `apps/skills/`, `apps/templates/` | The skill and template libraries the marketplace serves. |
| `apps/whatsapp-api/` | The WhatsApp service, a separate application in its own right. |
| `packages/sdk/` | The typed client — every module the API has, as methods. |
| `packages/types/`, `packages/events/` | The shared shapes and the event union. |
| `packages/ui/` | The design system's components. |
| `installer/` | The install, the add-ons (the **applications**), the Docker stack. |
| `docs/` | Every document, including this one. |

### 2.2 The applications — what the operator installs

`installer/addons/` — each directory is an application, with a manifest
(`addon.yml`) the installer reads.

| Application | Directory | What it provides |
|---|---|---|
| **Instant BaaS** | `installer/addons/instant/` | The backend-as-a-service: realtime Postgres, the Instant server, the console, a Maven repository, object storage. **The data plane.** |
| **WhatsApp platform** | `installer/addons/whatsapp/` | The Evolution API and its console. |
| **Package manager** | `installer/addons/package-manager/` | The private npm registry (Verdaccio) and a Maven repository. |
| **Observability stack** | `installer/addons/observability/` | Prometheus, Grafana, Loki, cAdvisor, a Postgres exporter. |
| **App runtime** | `installer/addons/app-runtime/` | The local image registry built images are pushed to. |

Plus two that are **always there** (`apps/api/src/modules/applications/applications.catalog.ts`):

| Application | Where it runs |
|---|---|
| **Deployment engine** | The platform's own Docker + buildpack builder. |
| **Email** | Stalwart (SMTP/JMAP), `apps/api/src/modules/email/stalwart/`. |

### 2.3 The API's modules, by level

Line counts are the size of the module (all its files).

**PLATFORM — the operator's own account and the platform's surfaces**

| Module | Lines | What it is |
|---|---:|---|
| `auth` | 6296 | The operator's account: register, sign in, sessions, MFA, API keys, organizations, teams, invitations. |
| `applications` | 1090 | The catalogue of applications and the background install. |
| `installation` | 1471 | The one-time guided install of the platform. |
| `overview` | 242 | The signed-in landing page's rollup — over **the caller's own projects**. |
| `audit` | 253 | The platform's audit trail. |
| `registry` | 92 | The in-memory catalogue of the platform's own services. |
| `mcp` | 469 | The control plane's MCP surface and its per-key scopes. |
| `events`, `redis`, `crypto` | 487 | The event bus, the shared cache, the encryption at rest. |
| `health`, `verification` | 221 | Probes, and the domain-verification file. |
| `app-auth` | 1545 | The operator's **GitHub** connection (the deployment pipeline clones with it) and the half-retired app-user tables. |

**PROJECT — a project's own resources**

| Module | Lines | What it is |
|---|---:|---|
| `domains` | 8500 | DNS, TLS, health, repair, and the Cloudflare connection. |
| `deployments` | 4381 | Build and run: Docker, buildpacks, releases, rollback, the GitHub webhook. |
| `databases` | 3160 | Managed Postgres: provisioning, pooling, migrations, backups. |
| `projects` | 1967 | The project itself: membership, invitations, keys, environment. |
| `infrastructure` | 1593 | The project's secrets and credentials — the one table that holds platform and project secrets together. |
| `scheduler` | 1497 | Cron jobs. |
| `queues` | 1269 | Queues on NATS JetStream. |
| `functions` | 1256 | Sandboxed serverless functions. |
| `storage` | 1344 | Buckets and files on MinIO (and Cloudinary/Telegram). |
| `logging` | 1139 | Log streams, ingestion, queries, shippers. |
| `monitoring` | 1156 | Metrics, alert rules, notification channels, the Prometheus export. |
| `realtime` | 1211 | Channels, presence, and the platform's Socket.IO gateway. |
| `templates` | 337 | Scaffold templates. |
| `ai` | 699 | The AI layer. |
| `instant` | 574 | **The seam to InstantDB** — provisioning an app, holding its admin token, handing an app its config. |

**MIXED — a module that carries routes at more than one level**

| Module | Lines | The platform part | The project part |
|---|---:|---|---|
| `email` | 10089 | `admin/platform-mail/*`, `admin/mailboxes/*`, `admin/attachment-config/*` | `projects/:id/email/**` (13 controllers), plus the public Stalwart webhooks |
| `whatsapp-auth` | 140 | the WhatsApp console's `/api/auth/*` shim | — |

**The modules that blur the two levels, ranked** — these are the ones that
make a reader lose the thread:

1. `email` — three levels in one module: project mail, the operator's own
   mailbox, and unauthenticated webhooks called *by Stalwart*.
2. `domains` — the project CRUD, the platform's Cloudflare OAuth, the
   domain templates, and the notification feed.
3. `databases` — `databases/:databaseId/**` is deliberately **not**
   project-scoped.
4. `deployments` — `POST deployments/detect` exists *before* a project does.
5. `monitoring` — `GET /metrics` sits outside the `api/v1` prefix.
6. `logging` — `POST logs/ingest` is a public, platform-wide write.
7. `projects` — the collection is operator-level, the items are
   project-level, on the same controller.
8. `infrastructure` — `Secret.projectId` is nullable: one table, two levels.

### 2.4 The dashboard's routes

**84 route files.** Grouped:

| Group | Count | Where |
|---|---:|---|
| Public and auth | 16 | `/`, `/login`, `/login/mfa`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/magic-link`, `/force-change-password`, `/invitations/accept`, `/setup`, `/onboarding`, `/welcome`, `/docs`, `/docs/[slug]`, `/home` |
| The platform shell | 11 | `/overview`, `/projects`, `/applications`, `/applications/email`, `/applications/package-manager`, `/mcp`, `/settings`, `/deployments/new`, `/platform/email`, `/platform/email/settings`, `/platform/integrations/settings` |
| The project console | 41 | everything under `/projects/[projectId]/` |
| The flat duplicates that redirect | 16 | `/functions`, `/databases`, `/logs`, `/monitoring`, `/scheduler`, `/email` and their children |

The inventory is the **source of truth**:
`apps/dashboard/src/navigation/route-inventory.ts` lists every route with its
owner, where it is reachable from, and whether it is canonical — and
`route-inventory.test.ts` walks the route tree on disk and fails when the two
disagree. That test is what stops the next twenty-two orphans.

---

## 3. The flows, as they are today

### F1 — The install (once, by the operator)

```
/setup  or  /onboarding
  → GET  /api/v1/installation/discover      (the host, Docker, Cloudflare, Traefik, SSL)
  → GET  /api/v1/installation/validate      (the domain)
  → POST /api/v1/installation/configure      (with the setup token)
  → GET  /api/v1/installation/operations/:id/stream   (SSE: DNS, Proxy, Certificate, Email, Health)
  → done
```

Files: `apps/dashboard/src/app/(auth)/setup/**`,
`apps/dashboard/src/app/onboarding/**`,
`apps/api/src/modules/installation/**`,
`installer/docker/docker-compose.yml`.

**Two wizards, one endpoint.** `/setup` (setup token + Cloudflare + admin
credentials) and `/onboarding` (discovery + configure) both post to
`POST /api/v1/installation/configure`. `/onboarding` sends **no setup token**
and asks for an **8-character** admin password where `/setup` asks for 12.
`/setup`'s "done" step is unreachable — nothing ever sets it.

### F2 — The first sign-in

```
/login  →  POST /api/v1/auth/login
           → tokens, or {mfaRequired, mfaToken} → /login/mfa → POST /api/v1/auth/mfa/challenge
         →  GET  /api/v1/auth/me
         →  /welcome   (the first-time journey, offered once)
```

Files: `apps/dashboard/src/app/login/**`,
`apps/dashboard/src/contexts/auth-*.ts`,
`apps/api/src/modules/auth/**`.

### F3 — Choosing the applications (once, by the operator)

```
/applications  →  GET  /api/v1/applications
                 POST /api/v1/applications/:id/install   (the installer runs in the background)
                 GET  /api/v1/applications/installs
```

Files: `apps/dashboard/src/components/applications/**`,
`apps/dashboard/src/app/(app)/applications/**`,
`apps/api/src/modules/applications/**`,
`installer/addons/*/addon.yml`,
`installer/scripts/addons.sh`.

### F4 — Creating a project

```
/projects  →  POST /api/v1/projects
```

Files: `apps/dashboard/src/app/(app)/projects/**`,
`apps/api/src/modules/projects/**`.

**The API answers with more than a project.** `AuthOnboardingService`
(`apps/api/src/modules/auth/services/auth-onboarding.service.ts`) creates a
**personal workspace** (an `Organization` named "\<email\>'s Organization")
and a first project ("My First Project") for every new account.

### F5 — Opening a project

```
/projects/[id]  →  router.replace('/projects/[id]/services')      ← the redirect
/projects/[id]/overview   →  "At a glance": env vars, members, last deploy, created
```

Files: `apps/dashboard/src/app/(app)/projects/[projectId]/page.tsx`,
`.../sections/overview.tsx`.

### F6 — Deploying

```
/projects/[id]/services/new  (4 steps)  →  POST /api/v1/projects/:id/deployments
```

Files: `apps/dashboard/src/app/(app)/projects/[projectId]/services/new/**`,
`apps/api/src/modules/deployments/**`.

### F7 — The project's services

The sidebar offers fourteen destinations, and the mode decides which set:

| Group | Deploy mode | BaaS mode |
|---|---|---|
| Project | Overview, Members, Activity | Overview, Members, Activity |
| — | **Services**, Functions, Deployments | API & MCP, Deployments, Databases, Storage, Queues, Realtime, Instant |
| Data | Databases, Storage, Instant | — |
| Automation | Domains, Email, Scheduler | Scheduler, Email, Domains |
| Observe | Monitoring, Logs | Monitoring, Logs |
| Settings | Settings (owner/admin) | Settings (owner/admin) |

Files: `apps/dashboard/src/app/(app)/projects/[projectId]/nav-groups.ts`,
`apps/dashboard/src/components/layout/sidebar-*.tsx`,
`apps/dashboard/src/app/(app)/projects/[projectId]/use-project-mode.ts`.

---

## 4. Where the wiring is wrong

### C1 — "Projects", "deployments" and "services" are three names and the operator has to guess which

| The word | What it means | Where it is used |
|---|---|---|
| **Project** | The container: the owner, the members, the settings | The top bar, `/projects`, the URL |
| **Services** | The project's **deployed applications**, grouped by repository | The project's sidebar, the project's first screen, the deployment wizard's title |
| **Deployments** | **The same deployed applications**, listed again | The project's sidebar, next to "Services" |

`/projects/[id]/services` and `/projects/[id]/deployments` render the same
objects — one grouped by repository, one as a list with an Active/All tab.
A person who has just created a project is sent to "Services", and sees
"Deployments" two items below it.

**The fix:** one word. The project's deployed applications are
**deployments**, and they live in one screen. "Services" disappears.

### C2 — The top bar answers a question nobody asked

`Overview · Projects · Applications · API & MCP · Settings`.

For somebody who has just signed in for the first time, none of these says
what to do. "Applications" in particular is a **one-time** thing (F3) that
then sits in the top bar for ever, next to "Projects" which is the thing
they will actually use.

**The fix:** the top bar is **the operator's work** — Overview, Projects,
Settings — and the one-time setup lives where it belongs: behind the
**first-time journey**, and afterwards on the Overview as a single line
("the platform has these applications — change them").

### C3 — The project console opens on the wrong screen

`/projects/[id]` hard-codes a redirect to `/services`
(`apps/dashboard/src/app/(app)/projects/[projectId]/page.tsx:24`) — and it
ignores the mode, so a BaaS project still lands on the Deploy-mode screen.
`/overview` is the first item of the sidebar's Project group and a canonical
route in the inventory, but the bare project URL does not reach it.

**The fix:** the project opens on its **overview** — which is also the screen
that has to answer "what is this project and what do I do in it".

### C4 — The sidebar shows fourteen things, none of which the project has

Every project gets the same fourteen items. A project with one deployment and
no database is offered Databases, Queues, Realtime, Storage, Email,
Scheduler, Monitoring and Logs.

And the **mode is a `localStorage` toggle**
(`use-project-mode.ts:7-21`), not a property of the project: it is per
browser, it is invisible to the API, it is lost on another device, and two
people looking at the same project can see different menus.

**The fix:** the menu is **derived from the project** — its shape and what it
actually has — and the shape lives in the database.

### C5 — The platform re-implements what InstantDB already provides

`docs/CAPABILITY_OVERLAP.md` is the repository's own verdict. Of the
duplications, two have already been retired (the live-query/watch stack and
the app-developer auth). What remains:

| Capability | The platform's version | InstantDB's | The verdict in the repo's own audit |
|---|---|---|---|
| **App data** | `modules/databases/` — managed Postgres, pooling, migrations, backups | realtime Postgres, triples, InstaQL | *"Duplicate surface, different layers. Delegate app data; keep the Postgres."* |
| **App files** | `modules/storage/` — MinIO buckets, presigned URLs | flat per-app files, CEL-gated | *"Keep RustFS for platform assets; delegate app files."* |
| **App realtime** | `modules/databases/` `LISTEN/NOTIFY` → SSE, no row auth | logical replication → WS, query-level invalidation, CEL-aware | *"Duplicate; Instant is strictly stronger. Delegate."* |
| **App users** | `modules/app-auth/` `AppUser`/`AppSession` | CEL permission rules | *"Duplicate; Instant is strictly stronger. Delegate."* (already retired) |

**The platform's `databases`, `storage` and `realtime` modules are not
"features the platform offers" — they are the platform's own storage for
its own assets, and a second, weaker copy of what InstantDB does for an
application.** Today a project's sidebar shows both, with no way to tell
which is which.

**The fix:** a project that is a **backend-as-a-service** project points at
InstantDB for its app data, files, users and realtime — and its sidebar
**links to the Instant console and to the Instant API**, not to a second set
of platform screens. The platform's own `databases`/`storage` remain for
what the platform itself needs.

### C6 — Two installation wizards, one of them weaker

`/setup` and `/onboarding` both exist, both post to the same endpoint, and
they disagree about the setup token and the password length. `/setup`'s
completion screen is unreachable.

**The fix:** one wizard. The installer's own output (`/setup`) is the
authoritative one — it has the setup token, the Cloudflare credentials and
the 12-character rule.

### C7 — Dead ends and dead code on the way through

| What | Where |
|---|---|
| The "Back to projects" breadcrumb never renders — it is inside the branch that excludes project routes | `apps/dashboard/src/app/(app)/layout.tsx:67-75` |
| `/setup`'s "done" step is unreachable — nothing sets it | `apps/dashboard/src/app/(auth)/setup/page.tsx` |
| `/databases/[id]` is a **full standalone screen**, but the route inventory records it as a redirect | `apps/dashboard/src/app/(app)/databases/[id]/page.tsx` vs `route-inventory.ts:122` |
| The install wizard's `fidscript_onboarded` cookie is written and never read | `apps/dashboard/src/app/onboarding/page.tsx:49` |
| `clearError()` is on the auth context and nothing calls it | `apps/dashboard/src/contexts/auth-provider.tsx` |

---

## 5. The target wiring

### 5.1 The one rule

> **A screen belongs to one level. A menu is derived from what the thing
> really has. A one-time thing does not sit in a permanent menu.**

Everything below follows from that rule.

### 5.2 The project's shape

A project gets a **shape**, stored on the project:

| Shape | What the project is | What it uses |
|---|---|---|
| `BACKEND` | A **backend as a service** — the application's data, users and files | **InstantDB.** The project gets an Instant app when it is created. The sidebar points at the Instant console and the project's app config. |
| `DEPLOYMENT` | Something the platform **builds and runs** | The deployment engine, and the platform's own storage and databases where the application needs them. |
| `BOTH` | Both | Both menus, each labelled. |

The shape replaces the `localStorage` mode toggle, and it is **changeable in
the project's settings** — which is what the person asked for: *"in the
settings they can be able to decide to deploy the application and the
application should be able to be set up at the same time."*

**The schema:**

```prisma
model Project {
  // … existing columns
  /// The project's shape: BACKEND (InstantDB), DEPLOYMENT, or BOTH.
  shape        ProjectShape @default(DEPLOYMENT)
  /// Whether the deployment service is on for this project.
  deploymentOn Boolean     @default(true)
}
```

`ProjectShape` is an enum in the `public` schema, next to `ProjectType`.

**The settings screen** gets a **"What this project is"** section:

```
Shape          [ Backend as a service ] [ Deployment ] [ Both ]
Deployment     [ on ]  — turn the deployment service off for this project
Data plane     Instant app: fidscript-abc123   (provisioned · open the console)
```

Turning the deployment service off **hides the deployment items from the
sidebar** and stops the deployment wizard — the setting is the gate, not
just a label.

### 5.3 The menu, derived

| Project shape | The sidebar |
|---|---|
| `BACKEND` | **Project**: Overview, Members, Activity · **Data plane**: Instant (the console), API & MCP · **Platform**: Deployments *(only if `deploymentOn`)*, Storage, Domains · **Observe**: Monitoring, Logs · **Settings** |
| `DEPLOYMENT` | **Project**: Overview, Members, Activity · **Deploy**: Deployments, Functions · **Data**: Databases, Storage · **Automate**: Domains, Email, Scheduler · **Observe**: Monitoring, Logs · **Settings** |
| `BOTH` | The union, with **Data plane** and **Deploy** as separate groups so it is never ambiguous which is which |

And within each group, an item appears only when the project **has** that
thing — a project with no database has no "Databases" item, and the Overview
offers to create one.

**The rule for a service item:** the menu shows what the project *has*; the
Overview shows what it *could have*.

### 5.4 The flows, redrawn

```
F1  THE INSTALL            once, by the operator
      /setup  →  discover → validate → configure (setup token) → SSE → done
      ONE wizard. The setup token, the Cloudflare credentials, the 12-character
      rule, and a reachable completion screen.

F2  THE APPLICATIONS       once, by the operator
      /setup  →  "choose what this platform has" (the add-on list, ticked)
                →  they are installed as part of the configure step, or from
                   /applications afterwards
      NOT a top-bar item afterwards. The Overview carries one line:
        "This platform has: Instant · WhatsApp · Package manager   [change]"

F3  THE FIRST SIGN-IN      once, per person
      /login  →  /welcome  →  what this is → your name → your first project
                             (its shape is chosen here) → three things to do
                             → the project console

F4  THE PROJECT CONSOLE    every time
      /projects/[id]  →  THE OVERVIEW
        ├ the project's shape, and what that means
        ├ what it has (services, deployments, the data plane)
        └ the next action, if there is one

F5  A SERVICE
      the sidebar item → the screen for that service
      a BaaS project's data → the Instant console, not a second database console
```

### 5.5 The project's overview, redrawn

The overview is the screen the project opens on, so it has to answer three
questions: **what is this**, **what does it have**, **what do I do next**.

```
Fidscript  ·  Backend as a service  ·  Active

  The data plane        Instant app · 3 tables · open the console
  What it has           1 deployment · 2 databases · 4 members
  Next                  Deploy your application          [deploy]
                        or  Connect your domain           [connect]
```

Each line is a **real** number from the API — the same discipline the
platform overview already follows (`apps/api/src/modules/overview/`).

### 5.6 The top bar, redrawn

```
Overview    Projects    Settings                 (+ the account menu)
```

**Applications** moves out of the top bar. It is reachable from the
Overview's "This platform has…" line and from the account menu. It is a
**setting of the platform**, not a destination a person returns to.

---

## 6. What changes, file by file

### 6.1 The API

| File | The change |
|---|---|
| `apps/api/prisma/schema.prisma` | `Project.shape` + `Project.deploymentOn`, and the `ProjectShape` enum. |
| `apps/api/prisma/migrations/<date>_project_shape/` | The migration. |
| `apps/api/src/modules/projects/**` | The shape goes into the project's create and update; `GET /projects/:id` returns it. |
| `apps/api/src/modules/overview/**` | The platform overview gains the "this platform has these applications" line, and the project's own counts. |
| `apps/api/src/modules/instant/**` | Provisioning an Instant app becomes **automatic** for a `BACKEND` project, and is offered by the project overview for a `DEPLOYMENT` one. |
| `apps/api/src/modules/applications/**` | The catalogue answers "which are installed" already; the endpoint the overview needs is the same one. |

### 6.2 The SDK

| File | The change |
|---|---|
| `packages/sdk/src/modules/projects.ts` | `shape` and `deploymentOn` on the project type, on create and update. |
| `packages/sdk/src/modules/overview.ts` | The platform overview's new line. |

### 6.3 The dashboard

| File | The change |
|---|---|
| `apps/dashboard/src/navigation/platform-nav.ts` | **Three items**, not five: Overview, Projects, Settings. |
| `apps/dashboard/src/components/navigation/platform-nav.tsx` | Renders them. |
| `apps/dashboard/src/app/(app)/projects/[projectId]/nav-groups.ts` | **Three sets of groups**, by shape, and each item filtered by what the project has. |
| `apps/dashboard/src/app/(app)/projects/[projectId]/use-project-mode.ts` | **Deleted.** The mode came from `localStorage`; the shape comes from the project. |
| `apps/dashboard/src/app/(app)/projects/[projectId]/project-header.tsx` | The "Deploy / Backend" toggle becomes the shape, and it moves to the settings (or becomes a read-only label there). |
| `apps/dashboard/src/app/(app)/projects/[projectId]/page.tsx` | Redirects to **`/overview`**, not `/services`. |
| `apps/dashboard/src/app/(app)/projects/[projectId]/overview/**` | The redrawn overview. |
| `apps/dashboard/src/app/(app)/projects/[projectId]/services/**` | **Merged into `/deployments`** — one word for one thing. |
| `apps/dashboard/src/app/(app)/projects/[projectId]/settings/**` | The **"What this project is"** section: the shape, the deployment switch, the Instant app. |
| `apps/dashboard/src/app/(app)/applications/**` | Still exists; no longer in the top bar. |
| `apps/dashboard/src/app/(app)/setup/**`, `src/app/onboarding/**` | **One wizard.** The other's steps go. |
| `apps/dashboard/src/navigation/route-inventory.ts` | Updated with the new routes and the merged ones. |

### 6.4 The dead code to remove

| What | Where |
|---|---|
| The mode toggle | `apps/dashboard/src/app/(app)/projects/[projectId]/use-project-mode.ts` |
| The unreachable breadcrumb | `apps/dashboard/src/app/(app)/layout.tsx:67-75` |
| The unreachable completion step | `apps/dashboard/src/app/(auth)/setup/steps/done-step.tsx` + its step |
| The weaker second wizard | `apps/dashboard/src/app/onboarding/**` (the `/setup` path survives) |
| The duplicate database screen | `apps/dashboard/src/app/(app)/databases/[id]/` (the project-scoped one survives) |
| The cookie nobody reads | `apps/dashboard/src/app/onboarding/page.tsx:49` |
| `clearError()` | `apps/dashboard/src/contexts/auth-provider.tsx` — or wire it |

---

## 7. What is **not** changing

The boundary is worth writing down, because the platform's own audit already
drew it (`docs/CAPABILITY_OVERLAP.md`):

| Kept | Why |
|---|---|
| The platform's **operator accounts** | The platform's users gate its deployments. Instant's users belong to an *application*, not to the platform. |
| **Managed Postgres** (provisioning, roles, PgBouncer, `pg_dump` backups, migrations) | Instant's triples store is not a Postgres an application can connect to. |
| **Deployments** | Instant does not build and run a Docker image. |
| **Domains, DNS, TLS** | Instant has no DNS. |
| **Email** | The platform's mail is a superset of Instant's. |
| **Queues, scheduler, logging, monitoring** | Instant has no equivalents in this fork. |
| **The platform's own storage** | RustFS/MinIO holds the platform's assets; Instant holds the application's files. |

And the delegation, in one line:

> **Instant owns the application's tables, users, permissions and files. The
> platform owns where the application runs.**

That line is already in the code
(`apps/api/src/modules/instant/instant.module.ts:6-9`). It is not yet in the
**menu**, and that is the whole of C5.

---

## 8. The order to do it in

| # | The change | Why it is here |
|---|---|---|
| 1 | `Project.shape` + `Project.deploymentOn`, the migration, the API and the SDK. | The data has to exist before a menu can be derived from it. |
| 2 | The **project overview** redrawn; the project opens on it. | C3 and the shape's first visible effect. |
| 3 | The **sidebar** derived from the shape and from what the project has. | C4 and C5. |
| 4 | **"Services" merged into "Deployments"**, and the redirects updated. | C1 — the word that causes the confusion. |
| 5 | The **top bar** to three items; Applications moved to the Overview's line. | C2. |
| 6 | The project's **settings**: the shape and the deployment switch. | The switch the person asked for. |
| 7 | The **Instant app** provisioned automatically for a `BACKEND` project. | C5's other half. |
| 8 | **One install wizard**, and the dead code gone. | C6 and C7. |

Steps 1–3 are one change. Steps 4–5 are one change. Nothing in 6–8
depends on anything else, and each can be verified on its own.

---

*Written 2026-11-07, from the API's 31 modules and the dashboard's 84
routes, read against the code rather than the plan.*
