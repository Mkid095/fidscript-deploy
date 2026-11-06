# UX, ARCHITECTURE & JOURNEY AUDIT — FIDScript Deploy

> **Purpose.** The true state of the product, established by inspection and by live verification —
> not a restatement of what the documentation claims. This is the baseline every later phase is
> measured against, and the list of what must be built next, in order.
>
> **Date:** 2026-11-06 · **Audited against:** commit `54ca05e` · **Live platform:** fidscript.com
> (72.61.89.110) · **Supersedes:** `docs/FRONTEND_AUDIT.md` (the 2026-07-31 snapshot).
>
> **How to read the severity marks**
> 🔴 **Blocker** — the documented workflow cannot be completed, or the platform is unsafe to expose.
> 🟠 **High** — the workflow completes but the product lies, loses work, or leaves the user stranded.
> 🟡 **Medium** — the workflow completes but the experience is materially worse than the contract.
> ⚪ **Low** — polish, consistency, and the gaps between the blueprint and the code.
>
> **Method.** 68 dashboard routes read source-for-source; 62 API controllers read for guards and
> validation; every SDK module cross-referenced against the live API's actual response shapes; the
> six user journeys traced through the code; the live platform driven in a browser. Every claim
> marked **verified live** was reproduced against the running platform, not inferred.

---

## 1. The headline

The platform is **real and it works**. Twenty-seven containers are healthy, the API serves 418
routes, a deployment was built and served over HTTPS with a valid certificate, and the operator's
console renders real data from real endpoints. The problem is not that FIDScript is a mock — it is
that **the contract between its three layers (API → SDK → dashboard) has drifted in specific,
findable places**, and those places are exactly where a user's workflow breaks.

**Eleven findings are 🔴 blockers**, and only one of them is in the platform's *architecture*.
The rest are in the contract between its layers, in the authorization model, and in what the
product has never been made to promise.

| # | Finding | Severity | Verified |
|---|---|---|---|
| 0 | **A project API key (`fpk_`) is not bound to its project** — a key minted for project A reads, **renames** and lists project B's resources. Tenant isolation does not hold for API keys | 🔴 | **live** |
| 1 | The SDK's `listDomains` / `listMailboxes` / `listAliases` unwrap an envelope the API never sends — **the whole email console is empty everywhere** | 🔴 | **live** |
| 2 | Adding an email domain **crashes the page** (the API's response envelope is pushed into a list of domain rows) | 🔴 | **live** |
| 3 | **The installation endpoints are unauthenticated** — a caller can configure the platform, become its admin, and rewrite its routing and DNS credentials | 🔴 | source |
| 4 | **Mail webhooks accept an unsigned request** — the signature check is skipped when the header is absent, and the HMAC is computed over a re-serialized body | 🔴 | source |
| 5 | **A project `viewer` can mint an admin invitation and a write-scoped API key** — membership is enforced everywhere, the project *role* almost nowhere | 🔴 | **live** |
| 6 | **21 API routes are unreachable** (a doubled `api/v1` prefix) and **25 SDK paths the dashboard calls do not exist** | 🔴 | source |
| 7 | **No organization or team UI exists at all**, though the API, the SDK and the CLI expose 18 endpoints for it | 🔴 | source + live |
| 8 | **The functions runtime's P0 sandbox finding is stale** — the runtime *is* isolated; three narrower gaps remain | 🔴 | source |
| 9 | **MCP scope validation always returns "allowed"**, and `GET /metrics` is public | 🔴 | source |
| 10 | **There is no automated test suite**; every guarantee in this document rests on manual verification | 🔴 | source |

The rest of the audit is structural: **22 orphaned routes**, four screens rendered at two URLs, a
component catalog that documents 30 components of which **14 do not exist**, a project console
whose sections the sidebar cannot reach, 15 browser `confirm()`/`alert()` dialogs beside a proper
`ConfirmProvider` that exists, and no platform home at all.

---

## 2. The baseline, measured

### 2.1 What is running

| Layer | Fact |
|---|---|
| Edge | Traefik v3.3 — one edge on 80/443, Docker + file providers, DNS-01 ACME |
| Core | api · dashboard · postgres 16 (16 schemas, 102 models, 22 migrations) · pgbouncer · redis · nats 2.10 · rustfs · stalwart 0.16.10 · registry |
| Observability | prometheus · grafana · loki · promtail · cadvisor · postgres-exporter — published by hostname |
| Products on the same box | Instant server + console + rustfs + postgres + Maven repo · WhatsApp console + Evolution API + its own postgres/redis · verdaccio |
| Hostnames | 18 live, each with a real certificate (the full list in §7) |
| Health | `database 36ms · redis 99ms · nats 103ms · storage 90ms` |
| Disk / RAM | 33 GB free of 96 GB · 3.7 GB RAM available |

### 2.2 What the code is

| | |
|---|---|
| API | 30 modules · 62 controllers · 265 services · **418 mapped routes** · 253 event types |
| Dashboard | **68 routes** · 203 components · 35,448 lines |
| SDK | 40+ modules · 4,526 lines · published to npm as `@fidscript-deploy/sdk@1.0.2` |
| CLI | 19 command groups · published as `@fidscript-deploy/cli@1.1.2` |
| MCP | **67 tools** · published as `@fidscript-deploy/mcp-server@1.0.6` |
| Installer | `install.sh` + a 7-step wizard + 5 add-ons + a firewall script |
| Docs | 199 files · 38 ADRs · 286 changelog entries |
| Line-limit | **94 workspace files over 150 lines** (the API's `domains/` and `databases/` services lead) |

### 2.3 What the data says

```
users 3 · organizations 2 · projects 10 (8 soft-deleted test projects) · deployments 5
releases 5 · project env vars 48 · buckets 15 · sessions 95
email domains 0 · aliases 0 · instant apps 0 · functions 0 · queues 0 · cron jobs 0 · api keys 0
```

**Every service is exercised; almost nothing has been created through one.** The platform's
machinery works, and its *content* is empty — which is why a whole class of bugs (the ones only
reachable by making a domain, a mailbox, an alias, a queue) was still hiding.

---

## 3. 🔴 Blockers

### B1 — A project API key is not bound to its project

**The tenant boundary does not hold for `fpk_` keys.** Three places each assume the check happens
elsewhere, and each short-circuits:

```ts
// apps/api/src/modules/auth/guards/api-key-or-jwt.guard.ts:62-76
const result = await projectApiKeyService.validateProjectApiKey(apiKey);
(request as any).user = { userId: 'api-key', projectId: result.projectId, isApiKey: true, ... };
//                          ^ the key's project is ATTACHED — never COMPARED with the URL's

// apps/api/src/modules/auth/guards/project-member.guard.ts:40-44
// "API-key callers were already scoped to the URL :projectId by ApiKeyOrJwtGuard — trust that"
if (user.isApiKey) { return true; }

// apps/api/src/modules/projects/services/project-access.service.ts:13,44
if (userId === 'api-key') return { id: projectId } as any;   // findProjectWithAccess
if (userId === 'api-key') return;                            // checkPermission
```

The guard's comment describes a check that **does not exist**. The key's project id is carried on
the request and then never compared with `:projectId`.

**Verified live.** A key minted on project **A** was used against project **B**:

| Request with A's key against B | Result |
|---|---|
| `GET /projects/B` | ✅ **200** — B's full record |
| `PATCH /projects/B` `{"name":"RENAMED-BY-A-KEY"}` | ✅ **200** — B was renamed |
| `GET /projects/B/databases` | ✅ **200** |

The same early return opens the databases module, which serves the **connection string with the
password** (`databases.controller.ts:89` → `db-credentials.service.ts:49-55`), and the projects
module's suspend / archive / restore. The email, storage and database-**data** controllers are the
exception — they filter by `projectId` explicitly, and `database-data.controller.ts:78-92`
compares `user.projectId === db.projectId` correctly. They are the model the rest of the platform
should follow.

**Compounding:** `fpk_` key `permissions` are **stored but never loaded**
(`project-api-key.service.ts:45` writes them; `:104` selects only `id, projectId, name, keyHash`),
and `ScopeGuard` skips any caller without a `keyPermissions` array — which every `fpk_` caller is.
So `@RequireScope` is a **no-op for project keys**, and `ProjectApiKeyMintGuard` permits an empty
`permissions` array. An `fsk_` key holding only `projects:read` can mint an unrestricted `fpk_`.

**Fix:** in `ProjectMemberGuard`, compare `user.projectId` with `request.params.projectId` instead
of returning true; load `permissions` in `validateProjectApiKey` and enforce them; and make
`ProjectAccessService` throw rather than return a pseudo-project for `userId === 'api-key'`.

### B2 — The installation endpoints are unauthenticated

`apps/api/src/modules/installation/installation.controller.ts` has **no guard, no role, no scope** on
any of its six routes. `InstallationGuard` exists — it blocks the *login and register* routes until
the platform is configured — but it never protects the installation routes themselves.

| Route | What an unauthenticated caller can do |
|---|---|
| `POST /installation/configure` | **Configure the entire platform**: write the Cloudflare API token to disk, create DNS records, **rewrite the Traefik routing file**, trigger ACME issuance, set the platform domain — and **create an ADMIN user with a password the caller chooses** (`installation.service.ts:354-381`, `bcrypt.hashSync(dto.adminPassword, 12)`), plus set the company password that gates registration (`:230-232`) |
| `PATCH /installation/cloudflare-oauth` | **Overwrite the platform's Cloudflare OAuth client** with attacker-supplied values — a durable MITM of the DNS provider |
| `GET /installation/discover` | Leaks the server IP, the admin's email, the user and project counts, the lifecycle state, whether a DNS credential is configured |
| `GET /installation/status` | Leaks the platform domain and the auth method |
| `GET /installation/validate` | Probes Cloudflare and Traefik writability — an unauthenticated oracle |
| `GET /installation/operations/:id/stream` | Streams the configuration operation's progress |

The Redis lock makes `configure` single-flight, not access-controlled, and the "admin with this
email already exists" check is bypassed by supplying any other email. **On a fresh platform —
exactly when the endpoint is reachable with no account existing — the first caller becomes the
platform administrator.** On a configured platform it is still a way to rewrite the routing and
the DNS credentials.

**Fix:** guard the whole controller with an admin guard, and bind `configure` to a **one-time
setup token** issued at install time (the installer already writes secrets to `/run/secrets`).

### B3 — Mail webhooks accept an unsigned request

```ts
// apps/api/src/modules/email/controllers/email-inbound.controller.ts:31-34
if (signature && !this.verifySignature(...)) { throw ... }
```

The check runs **only if the header is present** — omitting it skips verification entirely. And
the HMAC is computed over `JSON.stringify(payload)`, a **re-serialization** of the body, not the
raw bytes Stalwart signed, so even a present signature would not match a differently-spaced body.

`POST /email/inbound/webhook` injects inbound mail into any mailbox;
`POST /email/events/bounce` and `/complaint` forge delivery failures (and therefore suppressions).
All three are unauthenticated. `crypto.timingSafeEqual` also throws (500) on a length mismatch
rather than returning 401 — a bogus signature is a server error.

**Fix:** require the header unconditionally, capture the raw body (a raw-body middleware), and
compare in constant time over those bytes.

### B4 — The email console is empty everywhere (SDK ↔ API envelope drift)

**The API returns a bare JSON array. The SDK unwraps an object.** Three methods, three empty lists:

| SDK method | SDK expects | API actually returns | Result |
|---|---|---|---|
| `email.listDomains(projectId)` | `{ domains: EmailDomain[] }` | `EmailDomain[]` | `res.domains` → `undefined` → `[]` |
| `email.listMailboxes(projectId)` | `{ mailboxes: Mailbox[] }` | `Mailbox[]` | `res.mailboxes` → `undefined` |
| `email.listAliases(projectId)` | `{ aliases: EmailAlias[] }` | `EmailAlias[]` | `res.aliases` → `undefined` |

`packages/sdk/src/modules/email-mailboxes.ts:74,85,111` against
`apps/api/src/modules/email/services/domain.service.ts:177` and `mailbox-crud.service.ts:138`.

**Verified live.** A test project with two email domains renders *"0 domains · No email domains
yet"* on `/projects/:id/email`, and the same on the flat `/email`. The API's own list endpoint,
called directly with the same token, returns both domains.

This is why the email journey has never worked for anyone: the API was right, the SDK's unwrap was
wrong, and **every caller inherits the emptiness**. The other 15 list endpoints I checked
(deployments, functions, databases, buckets, domains, cron, env-vars, projects, applications, and
email's identities/api-keys/messages/suppressions/templates) all return the envelope the SDK
expects — the drift is confined to these three.

> The three email tabs that *do* work (Identities, API Keys, Messages, Templates, Webhooks,
> Suppressions) are the ones that bypass the SDK and use raw `fetch` with the correct envelope.
> Two ways of calling the same API, one of them wrong — that is the root cause.

**Fix (one file, three lines):** unwrap `Array.isArray(res) ? res : res.domains ?? []` — or change
the API to send the envelope. The API's bare-array shape is the one every other SDK module and
every CLI command already assumes, so **fix the SDK**.

### B5 — Adding an email domain crashes the page

`POST /projects/:id/email/domains` returns `{ domain: <row>, ownershipToken, steps }`. The dashboard
does:

```ts
// apps/dashboard/src/app/(app)/email/create-domain-modal.tsx:26-27
const created = await getSdk().email.createDomain(projectId, domain.trim());
onCreated(created as EmailDomain);        // ← the envelope, cast to a row
```

The list then holds `{domain: {...}, ownershipToken, steps}` where an `EmailDomain` is expected, and
`domain-card.tsx:25` calls `domain.id.slice(0, 12)` on `undefined`.

**Verified live:** *"Application error: a client-side exception has occurred while loading
fidscript.com"* — `TypeError: Cannot read properties of undefined (reading 'slice')`. The whole
`/email` route dies and the user loses the page.

The same cast appears in the project-scoped email tabs. Note that the SDK types
`createDomain` as `Promise<unknown>`, so the mismatch is invisible to the compiler — the `as`
cast is what silences it.

**Also lost in this crash:** the API's `steps` array — the exact DNS records the operator must add
(TXT ownership, MX, then verify) — is discarded. The API went to the trouble of writing the
beginner's instructions and the UI threw them away. That is precisely the gap the directive names:
*"Make it easy for beginners to understand exactly which DNS records they need to configure."*

### B6 — A project `viewer` can mint an admin invitation and a write-scoped API key

**Membership is enforced everywhere; the project role is enforced almost nowhere.**

- **26** project-scoped controllers apply `ProjectMemberGuard` — which checks that the caller owns
  the project or is a member of it (`apps/api/src/modules/auth/guards/project-member.guard.ts`).
- **0** of them check the member's **role**. `ScopeGuard` enforces scopes **only for API-key
  callers**; for a JWT it passes straight through (`apps/api/src/modules/auth/guards/scope-guard.ts:19`).
- The role check exists in exactly one place — the deployments service's
  `checkAccessOrThrow(userId, projectId, ['admin','owner'])`.

The project member's role is a **free-text string** (`role String @db.VarChar(100)` in the
`ProjectMember` model), and the invitation endpoint accepts any string (the PREREQ-PROJ-5 gap).

**Verified live.** A user invited to a project with the role `viewer` was able to:

| Action | Blueprint's rule | Result |
|---|---|---|
| Create a mail domain | write | ✅ **201** |
| Change the project's build config | admin/owner | ✅ **200** |
| **Create an invitation with `role: "admin"`** | owner | ✅ **201** — privilege escalation |
| **Create a project API key with `permissions: ["deployments:write"]`** | admin/owner | ✅ **200** |
| Delete a mail domain | admin/owner | ✅ **200** |
| Delete the project | owner | ❌ 403 "Only owner can delete project" |

The last row is why this was missed: the one destructive action anyone would notice *is* gated.
The escalation paths are the quiet ones — an invitation and an API key are both one click from
"read" to "write", and neither leaves a visible trace in the project.

**This also corrects the debt register.** `TD-SEC-1` says the domains endpoints *"skip
project-access checks"* — they do not; membership is checked on every one of them. The real gap is
**role** enforcement, and it applies to all 26 project-scoped controllers, not just the two named
in the debt file. `TD-SEC-2` (email), `TD-SEC-3` (storage) and `TD-SEC-4` (webhooks) need the
same re-reading: the first two are membership-checked, and the fourth is a separate question (the
webhook secret).

**Fix:** a `ProjectRoleGuard` (owner / admin / developer / viewer) applied alongside
`ProjectMemberGuard`, with the role vocabulary constrained to an enum at the invitation and
membership endpoints. The dashboard already greys role-restricted actions — the UI is honest, the
API is not, and the API is the one that has to be.

### B7 — No organization or team interface exists

The API exposes a complete organization surface — `apps/api/src/modules/auth/controllers/organization.controller.ts`:
create/list/get/patch/delete an organization, roles, members, invitations, teams, team members
(18 endpoints). The SDK wraps them (`auth-orgs.ts`, `auth-teams.ts`). The MCP server exposes
`auth_create_organization`, `auth_create_team`, `auth_list_org_members`, `auth_list_org_teams`,
`auth_invite_user` (5 tools).

**The dashboard has none of it.** A grep for `organization` across `apps/dashboard/src/**/*.tsx`
returns **zero files**. The platform creates an organization for each new account (2 exist), and
the operator can never see it, list its members, invite a teammate, or make a team. The only
reference anywhere in the UI is the workspace picker in the deployment wizard.

Journey 6 (manage an organization) is **0% implemented**, against a backend that is 100% built.

### B8 — The functions sandbox finding is stale; three narrower gaps remain

`docs/technical-debt.md` records TD-SEC-5 as a P0: *"Functions runtime has **no sandboxing** —
`child_process.exec`, Docker socket mounted, `/tmp` storage. A function can read `/etc/shadow` / the
host."*

The current code does the opposite. `apps/api/src/modules/functions/services/sandboxed-runner.service.ts:42-52`:

```
docker run --rm -i
  --security-opt no-new-privileges      --cap-drop ALL
  --read-only                           --tmpfs /tmp:rw,noexec,nosuid,size=64m
  --memory <mb>  --memory-swap <mb>      --cpus 1  --pids-limit 64
  --network none
```

The function's code is piped in over **stdin** (never bind-mounted), the container gets **no
network**, a read-only root filesystem, every capability dropped, and memory/CPU/pid limits. The
Docker socket is mounted into the *API* container (it needs it for builds) but is **not** passed to
the function container. The only `new Function(code)` in the module is a **syntax check**, not
execution.

**Residual exposure** (real, and much smaller than recorded): the API process itself holds the
Docker socket, so a compromise of the API is a compromise of the host; and the runtime images are
pulled at invocation time. That is a hardening note, not an isolation failure.

**The debt entry must be corrected**, and the functions architecture re-stated honestly — a P0
"blocker" that does not exist will otherwise consume the next phase.

### B9 — 21 API routes are unreachable, 25 SDK paths do not exist, and MCP scope checking is a stub

**Three related contract breaks, all in the same family: the paths do not agree.**

**(a) A doubled `api/v1` prefix.** `app.setGlobalPrefix('api/v1')` is concatenated onto controller
paths that already contain `api/v1`:

| Controller | Path |
|---|---|
| `domains/controllers/domain-templates.controller.ts:17` | `@Controller('api/v1/domain-templates')` |
| `mcp/mcp.controller.ts:34` | `@Controller('api/v1/mcp')` |
| `email/controllers/email-status.controller.ts:19` | `@Controller('api/v1/projects/:projectId/email')` |
| `domains/controllers/cloudflare-oauth.controller.ts:25,40,71,84,96` | per-method `api/v1/…` |
| `domains/controllers/notifications.controller.ts:38,66,82,97,116,133,149` | per-method `api/v1/…` |

The result is `/api/v1/api/v1/…` — **21 routes unreachable at their intended URLs**, including the
**entire MCP module (5 routes)** and the domain activity feeds.

**(b) 25 SDK path shapes the dashboard calls that do not exist.** The SDK and the API disagree on
the URL for: notifications (5), domain templates (2), Cloudflare OAuth (4), installation (2), MCP
(5), `DELETE /databases/{id}` (1 — a live dashboard button), database backups (6), `GET
/domains/{id}` (1 — a live dashboard call), and `POST /projects/invitations/accept` (the SDK says
`/projects/invitations/accept`, the API serves `/invitations/accept` — **the invite-accept flow
404s**). Each is a silent 404 in the UI.

**(c) MCP scope validation is a stub that always allows.**

```ts
// apps/mcp-server/src/index.ts:105-121
const result = await fetch(`${apiUrl}/api/v1/mcp/tools`);
if (!result.ok) { return { allowed: true }; }   // 404 → allowed
return { allowed: true };                        // 200 → also allowed
```

The API's `McpPermissionService` exists but is wired only into key management, never into tool
invocation.

**(d) `GET /metrics` is public** and enumerates every project's slug and metric names.

**Fix:** strip the literal `api/v1/` from the five controller paths (one change, 21 routes, 9 of the
25 phantom paths); reconcile the SDK's paths with the API; implement `validateScope` against
`McpPermissionService`; and put `/metrics` behind the platform admin.

### B10 — There is no automated test suite

`find apps packages -name "*.spec.ts" -o -name "*.test.ts"` → **0 files**. `apps/api`'s test script
is `jest --passWithNoTests`, which passes with an empty suite. The dashboard has no test runner
configured. There is no e2e configuration in the repo (the `playwright-cli` skill is a browser
driver, not a test suite).

Every guarantee in this document — and every one in the changelog — rests on manual verification
against the live platform. That is why six deployment bugs survived to the point where a
"deployment" never built at all, and why three email bugs are still live. **This is the single
highest-leverage gap in the project**, and the roadmap puts a first suite in Phase 1 rather than
Phase 11.

---

## 4. 🟠 High-severity findings

### H0 — 84% of the product's "it worked" messages never render

`ToastProvider` is mounted in **5 of 68 pages**. `createContext` at
`apps/dashboard/src/components/toast-provider.tsx:19` defaults `showToast` to a **silent no-op**,
so every page that calls `showToast` without a provider above it shows **nothing** — the operator
clicks a button, the request succeeds, and the screen does not move.

- **51 of 61** toast invocations (84%) render nothing.
- **57 mutating actions give no feedback at all** — and ~20 of them have the toast *mechanism*
  but a dead one.
- All 45 form submits are guarded against double submission (`packages/ui/src/components/Button.tsx:54`),
  so the risk is in the non-form row and menu actions, plus two flows
  (`(auth)/setup/steps/domain-step.tsx:157`, `register/register-form.tsx:73-82`).

**The highest-leverage single-line fix in the entire frontend:** mount `<ToastProvider>` in
`apps/dashboard/src/app/providers.tsx:7-9`.

### H0b — The `ErrorState` component was specified and never built

`docs/product/components/error-state.md` specifies it and
`docs/product/components/index.md:79` catalogues it as ✅ — **it does not exist**. That single
omission is the root cause of **113 swallowed-error sites** and **~110 places where a raw error
string is rendered in place of a designed state**. The two other catalogue entries that are
specified but absent — `DataTable` and `FilterBar` — are why every list in the product hand-rolls
its own table and toolbar.

### H1 — 22 orphaned routes (built, reachable by typing a URL, linked from nowhere)

`/applications/email` · `/databases` · `/databases/[id]` · `/email/analytics` · `/email/suppressions`
· `/email/templates` · `/email/webhooks` · `/functions` · `/functions/[id]` · `/logs` · `/mcp` ·
`/monitoring` · `/monitoring/[id]` · `/scheduler` · `/scheduler/[id]` · `/platform/email` ·
`/platform/email/settings` · `/platform/integrations/settings` ·
`/projects/:id/deployments/build-config` · `/projects/:id/databases/:id/realtime` ·
`/forgot-password` · `/onboarding` · `/home`.

Two of these are **entire product surfaces with no entry point**: `/platform/email` (the admin mail
console: mailboxes, compose, folders, delete) and `/platform/integrations/settings` (the Cloudflare
OAuth connection). The Mail application page I built this week points at `/email` for "manage mail"
— a *project-scoped* console — because the platform-level one is invisible.

### H2 — Four screens rendered at two URLs, and the flat tree is a parallel implementation

Literal re-exports of the same React component:

```
projects/[projectId]/functions/page.tsx    → export { default } from '@/app/(app)/functions/page'
projects/[projectId]/logs/page.tsx        → export { default } from '@/app/(app)/logs/page'
projects/[projectId]/monitoring/page.tsx  → export { default } from '@/app/(app)/monitoring/page'
projects/[projectId]/scheduler/page.tsx   → export { default } from '@/app/(app)/scheduler/page'
```

Plus near-duplicates that are **separate implementations**: `/monitoring/[id]` vs
`/projects/:id/monitoring/[id]` (same four imports, different `projectId` source);
`/databases` (flat) vs `/projects/:id/databases`; `/mcp` (flat, account keys) vs
`/projects/:id/mcp` (project hub); and **three** mail consoles (`/email`, `/projects/:id/email`,
`/platform/email`).

The flat routes carry their own local components (`app/(app)/email/log-list.tsx`,
`app/(app)/databases/database-list-header.tsx`, …) — the flat tree imports **0–2** shared
components per route while the project console imports 25. Two codebases for one product.

### H3 — No platform home: the questions an operator actually has are unanswerable

There is no `/dashboard`, no `/overview`, no `/home`. `/` is the **public marketing landing page** —
which an authenticated operator also sees — and `/applications` is a catalogue of seven products.

Nothing anywhere answers: *is my platform healthy? what deployments are running? what failed? what
needs my attention? which services have I not configured? what should I do next?* The projects
list shows projects; the applications screen shows what can be installed. Neither is an overview.
This is the single biggest navigation gap, and it is why "Applications vs Projects" feels
unresolved: both are top-level destinations, neither is home.

### H4 — The account menu advertises settings the operator cannot change

The new account menu shows **"Two-factor — Not enabled"** — and the platform has MFA setup,
verify and challenge endpoints (`AUTH-07/08/09`) with **no UI anywhere**. The same page lists
"Member since" and "Signs in with" correctly, but the two-factor row is a dead end: it states a
fact and offers no action.

The account menu also has no **Sessions** (the API has list/revoke/revoke-all) and no **password
change** (the API has `AUTH-18`).

### H5 — Every destructive action in the product uses a browser dialog

**13 `confirm()` calls and 2 `alert()` calls** across the dashboard — deleting a domain, a bucket,
an alias, a mailbox, a cron job, a deployment, an API key, an invitation, a member, a message, a
Cloudflare credential. Meanwhile a proper `ConfirmProvider` exists and is used in **8** places.

The browser dialog cannot be styled, cannot carry context, blocks the event loop, and (on some
browsers) shows no product identity. The directive forbids it explicitly, and the project's own
design system already has the answer.

### H6 — Errors are swallowed in 113 places

`catch { /* ignore */ }` — the failure is invisible and the user sees an empty page that looks
like "no data":

- **The six domain-detail tab hooks** (health, ssl, dns-records, email, wizard, repairs) — every
  tab silently renders empty when its API fails.
- **The five database context hooks** (status, migrations, realtime, columns, backup).
- `email/webhooks` — **four** swallows and **no error state variable at all**.
- `email/analytics` — swallows, then `if (!overview) return null` → **a blank white page**.
- `email/suppressions` — swallows, no error state.
- `platform/email` — **five** empty `catch {}`.
- The database **delete** action — a failed destructive operation gives no feedback.
- `projects/:id/page.tsx:42` — the project header vanishes on a failed fetch.

And two handlers have `try { } finally { }` with **no `catch`** (`scheduler/page.tsx:57,77`) — a
rejected promise escapes as an unhandled rejection and the user sees nothing.


### H7 — The API's DTO validation is silently inert on 43 bodies

The global `ValidationPipe` (`main.ts:59-65`, `whitelist` + `forbidNonWhitelisted`) does nothing
for a body typed as `any`, an inline object type, or a bare string — there is no metatype to
validate against. **43 `@Body()` parameters** are typed that way, including:

- **raw SQL** — `POST /databases/:id/query` and `POST /databases/:id/migrations/apply`
  (`database-data.controller.ts:250,308`),
- **webhook URLs** — an SSRF sink once the platform fetches them
  (`domains-zone.controller.ts:340`, `email-webhook-subscription.controller.ts:26`),
- **API-key creation** — `POST /projects/:id/api-keys` is typed `any`
  (`projects-members.controller.ts:100`),
- **role assignment** — `PATCH /projects/:id/members/:userId` accepts a free-text role (`:46`).

### H8 — `GET /projects/raw-headers` reflects the Authorization header, unauthenticated

`projects-crud.controller.ts:36-44` — "No auth — returns raw headers for debugging". It echoes
`authorization` and `x-api-key` back to any caller. A debugging endpoint that reflects
credentials is a credential-disclosure endpoint.

### H9 — Two domain-activity routes have no membership check at all

`domains/controllers/notifications.controller.ts:133,149` — the guard is absent and the service
filters by `projectId` alone (`domain-activity.service.ts:81-101,127-149`). Any authenticated user
can read another project's domain activity.

### H10 — The functions sandbox has three narrower gaps (not the one recorded)

The isolation is real (B8), but three gaps remain in
`apps/api/src/modules/functions/services/sandboxed-runner.service.ts`:

1. **No `--userns=remap` and no `--user`.** The container runs as **root in the host's user
   namespace**, and the API container holds the Docker socket **read-write**. A container escape is
   therefore host root.
2. **`execFileSync` blocks the Node event loop** for the whole container run, and
   `timeoutSeconds` has **no upper bound** (`functions/dto/index.ts:60-68`) — one project member
   can freeze the entire API for as long as they ask.
3. **Secrets are passed on the `docker` argv** (`-e KEY=VALUE`, `:49-51`), so every function
   variable and the event payload are visible in `/proc/<pid>/cmdline` to any local user.
   `--env-file` avoids it.

A fourth: `--network none` makes the project's Instant data plane **unreachable** from a function
(`functions-runtime.service.ts:71-76` injects the variables; the container has no network), so the
platform's own data plane is not usable from the edge runtime.

### H12 — The deployment's action buttons contradict the API, and two states are dead ends

| Button | The UI offers it when | The API allows it when | Result |
|---|---|---|---|
| **Stop** | `PENDING, QUEUED, BUILDING, DEPLOYING` (`action-buttons.tsx:37-42`) | `SUCCESS, DEPLOYING` (`deployment-lifecycle.service.ts:24-26`) | Stop on a build **errors**; stopping a **live** deployment is impossible from the UI |
| **Restart** | `STOPPED` **or** `FAILED` (`:43-48`) | `STOPPED` only (`deployment-lifecycle.service.ts:40`) | Restart on a failed deployment **always errors** |
| **Rollback** | `SUCCESS` only (`:40`) | — | a `ROLLED_BACK` deployment has **no** action |
| **Delete** | `SUCCESS, STOPPED, FAILED` (`:41`) | — | a **`BLOCKED`** deployment has **no** action at all |

`BLOCKED` is exactly the state the API enters when a second deployment is started while one is
running (`deployment-state.service.ts:107-110`), and the event carries `blockedBy` — which the
dashboard never reads. The operator sees the word "Blocked" and a dead end.

### H13 — The email-verification gate is inert

`EmailVerifiedGuard` is the only global `APP_GUARD` (`app.module.ts:77`). It returns `true` when
`request.user` is unset (`email-verified.guard.ts:53-55`) — and NestJS runs **global guards before
controller guards**, while authentication happens in the per-controller `JwtAuthGuard`. So
`request.user` is *always* undefined when it runs, and it always short-circuits open.

Corroboration: the installer-created admin has **no** `emailVerifiedAt`
(`installation.service.ts:355-380`) — if the guard were live, the platform administrator would be
locked out of every endpoint. And `sendVerification` is never called after registration, and
there is no `/verify-email` page. **The verification requirement exists on paper only.**

### H14 — The organization invitation flow cannot work

Two independent defects:

1. **The invite email is a dead link.** It points at `/auth/invitation/accept`
   (`organization.service.ts:324`); the dashboard only has `/invitations/accept`, which is
   *project*-scoped.
2. **You cannot invite anyone to a fresh organization.** Only the `OWNER` role row is ever created
   (`organization.service.ts:37-42`, `auth-onboarding.service.ts:79-81`). `DEFAULT_ROLE_PERMISSIONS`
   *defines* ADMIN/DEVELOPER/BILLING/VIEWER but never creates them — so `inviteMember` throws
   `Role 'ADMIN' not found in this organization` (`organization.service.ts:288-291`).

Also: **teams grant no access at all.** `Team` and `TeamMember` are consulted by no authorization
path — access resolves through `OrganizationMember` + `Project.organizationId`. Teams are a
labelling layer today.

### H15 — A failed deployment does not say why

The `Deployment` model has **no** error column (`schema.prisma:681-701`). `markFailed` sets the
status and emits an event; the message — *"Missing required environment variable: DATABASE_URL"* —
reaches only the log. `MetadataPanel` has no error field. **The operator must read the build log
to learn why their deployment failed**, which is the one thing a failure screen exists to avoid.

### H16 — The in-product documentation is materially stale

`apps/dashboard/src/content/docs-hooks.ts` — 16 pages. The "Deploy an Application" page says:

| The doc says | The code says |
|---|---|
| *"FIDScript builds any repository that has a `Dockerfile` in its root"* | Framework auto-detection exists and is the default path |
| Deployment states: pending, building, deploying, success, failed, stopped — **6** | **9** (adds QUEUED, BLOCKED, ROLLED_BACK) |
| *"Open your project page → click New Deployment → enter your Git repository URL"* | Two wizards, 3–4 steps each, with a repo picker |
| `FIDScript deploy --health-check-path /health` | **No `deploy` command exists** — the CLI has `fidscript deployments {list,get,logs}` |
| *"Settings → Environment Variables"* | The tab is labelled **Environment** |
| `https://<slug>.apps.<your-domain>` | The wizard builds it from the platform domain |

None of the 16 pages documents the **Applications screen** or any of the five add-ons, and **no
in-app screen links to `/docs`** — the docs are a destination, not contextual help.

### H17 — The CI's "test" job is a guaranteed-green no-op, and `pnpm lint` rewrites source

`.github/workflows/ci.yml:50-62` runs `pnpm test` → turbo → `jest --passWithNoTests`, which
**prints "No tests found" and exits 0**. There is no `jest.config.*` anywhere in the repo, so jest
cannot even parse TypeScript (no `ts-jest` preset, no `moduleNameMapper` for the `@/` alias, no
`reflect-metadata` setup) — **a single test file could not run if it existed**.

Worse: `apps/api`'s lint script is `eslint --fix` and its rule set disables `no-unused-vars` and
`no-def` (`apps/api/eslint.config.mjs:9`), so a lint failure in CI is a **silent rewrite**, not a
report. And there is no `.husky/`, no `lint-staged` and no `commitlint` — `CONTRIBUTING.md:55-59`
promises "all changes must include tests" and nothing enforces it.

### H18 — The published SDK on npm contains the broken email methods

npm has `@fidscript-deploy/sdk@1.0.2`; the local source has today's fixes but has not been
published. Anyone installing the SDK from npm today gets the `/api/v1`-less admin mail paths and
the empty email lists.

---

## 5. 🟡 Medium findings

### M0 — The sidebar's active state breaks when a project is opened by its slug

The sidebar builds every href from the project's **UUID**
(`sidebar-expanded-nav.tsx:22`, `sidebar-collapsed-nav.tsx:21`, `mobile-tab-bar.tsx:43`), but the
projects list navigates by **slug** (`project-card.tsx:27`, `projects-list-body.tsx:131`). The
active check is `pathname === href || pathname.startsWith(href + '/')` — so after opening a project
from the list, **no sidebar item and no mobile tab is highlighted**, and the same project has two
canonical URLs (the switcher produces id URLs, the list produces slug URLs). The API accepts
either, so the page works — only the chrome is wrong, which is exactly the kind of defect that
makes a product feel unfinished.

### M0b — The flat route tree is not a redundancy; it is an unreachable parallel implementation

Of the nine flat platform routes, **exactly one (`/settings`) is reachable from any navigation
surface**. `/scheduler`, `/monitoring`, `/logs` and `/mcp` have **zero inbound links**;
`/databases` is reachable only from its own child; `/functions` only from its own child's error
page; `/email` only in-page from `/applications/email`. Four of them (functions, scheduler,
monitoring, logs) are already collapsed stubs that re-export the flat page.

That strengthens the consolidation case: they are **dead weight**, not two interfaces for one
operation. `/email` itself must survive — the mail application page links to it.

### M0c — The role difference the UI claims to show does not exist

Three `href="#"` + `e.preventDefault()` placeholders in the collapsed sidebar, the mobile tab bar
and its sheet are **unreachable**: the items are already filtered by role upstream. So a `viewer`
and an `owner` get **byte-identical navigation** — and the items that *look* locked are not locked,
they are simply absent.

### M0d — The notification bell was specified, never built, and left dead code behind

`docs/product/navigation.md` requires a bell with an unread count and a dropdown of the last 20
events. There is none. `components/layout/README.md:28-32` still documents four files that do not
exist (`notification-bell.tsx`, `notification-bell-hooks.ts`, `notification-dropdown.tsx`,
`notification-item.tsx`); only `notification-types.ts` survives, **imported by nothing**.

### M1 — The theme control is three buttons, defaults to dark, and "System" does not persist

The directive asks for one visible control, System as the default. Today: three buttons (sun /
moon / monitor) in the top bar; the default is `dark`; and choosing **System removes the
localStorage key**, so the next reload falls back to `dark` — the system preference is silently
discarded (`components/theme/theme-toggle.tsx`).

### M2 — The login flow reloads the whole application

`contexts/auth-methods.ts:18,92,105` uses `window.location.href = getNextRoute()` after login,
magic-code verification and password change — a **full page reload** instead of a client-side
navigation, discarding the bundle cache and the scroll position. The `?next=` parameter is
honoured correctly, which is good.

### M3 — There is no command palette, notification centre, global search or header project switcher

The blueprint's `docs/product/navigation.md` specifies all four in the header, and
`docs/product/components/index.md` lists all four with **✅ specs**. **None exists.** The only
trace is a "Notifications" mention in `components/layout/README.md`.

### M4 — The component catalog documents a design system that does not exist

`docs/product/components/index.md` lists ~30 components with per-component specs. **Fourteen do not
exist anywhere in the codebase**:

`DataTable` · `EntityCard` · `FilterBar` · `Breadcrumbs` · `NotificationBell` · `AccountMenu` ·
`ProjectSwitcher` · `CommandPalette` · `AppHeader` · `KeyValueTable` · `EnvKeyValueEditor` ·
`StateMachineTimeline` · `EventRow` · `Drawer`

`packages/ui` ships **12** components (Button, Input, Card, Badge, Modal, RightPanel, Toast,
Spinner, EmptyState, Stepper, Dropzone, Tabs). The screens that need a table, a filter bar or a
breadcrumb hand-roll the markup — which is exactly why the dashboard looks inconsistent between
sections, and why 94 files exceed the line limit.

### M5 — Placeholder content presented as product

`"GitHub is wired. More coming soon."` (integrations settings) · `"Amazon S3 — not yet available"`
+ a "Coming soon" badge (storage settings) · `MySQL (not yet available)` in the database form ·
`(coming soon)` suffixes on the function runtimes. The greying is honest; the copy is not
actionable — a beginner is told something is unavailable but not what to do instead.

### M6 — The project console's own sections are unreachable from its sidebar

`app/(app)/projects/[projectId]/page.tsx:14-20` defines a `SECTIONS` map including `deployments`,
`members` and `activity` — **none of which appear in `nav-groups.ts`**. They are reachable only by
hand-editing `?section=`. The page also falls back to *"Select a section from the sidebar"* for
any unknown section.

### M7 — The email domain flow has no auto-integration and no guidance

The **project** domain form offers a `manual` / `cloudflare_auto` radio pair (the auto-integration
choice the directive describes). The **email** domain modal asks for a name and nothing else: no
auto-integration, no MX/SPF/DKIM guidance, no connection check — even though the API returns the
three DNS steps and can create the records itself when Cloudflare is connected.

### M8 — The published CLI is not installed on the platform itself

`fidscript` is not on this box's PATH. The dashboard's developer-tools page tells the operator to
`npm install -g @fidscript-deploy/cli`, but the platform's own host — the one place an operator
with root would reach for it — does not have it.

---

## 6. ⚪ Low / consistency findings

- **94 files over the 150-line limit** in the workspace (the API's `domains/` and `databases/`
  services lead). The dashboard is largely compliant; the API is not.
- **15 browser dialogs** (H5) and **11 violet/purple Tailwind utilities** in a product whose own
  rules forbid violet as an AI-visual-vocabulary colour — the realtime page uses a violet icon
  tile while every other section uses `--accent`.
- `AuthGuard` (components/auth-guard.tsx) renders its spinner with **inline styles** while the
  whole product uses Tailwind.
- `email/templates/page.tsx:34` — `useState<any>` for `previewData`, against the project's
  "no `any`" rule.
- The blueprint's route shape (`/dashboard/projects/<id>/…`) never shipped; the implementation uses
  `/projects/<id>/…`. The blueprint is the contract, so either the contract or the code must move —
  at present the code is right and the blueprint is stale.
- **17 committed Playwright snapshot artefacts** sit in `.playwright-cli/` at the repo root, tracked
  in git and not ignored — debugging litter from manual sessions.
- `apps/whatsapp-api/package.json` declares a test script pointing at a `test/` directory that
  does not exist (that package is outside the workspace, so nothing notices).
- The MCP hub advertises **~100 tool names**; the MCP server registers **75** — 25 advertised tools
  do not exist, and 7 real tools are never listed.
- The NATS JetStream "durable transport" consumes every event, parses it, and **acks it without
  doing anything** (`event-nats-consumer.service.ts:34-45`) — the stream grows without bound.

---

## 7. Hostname map (verified live)

```
fidscript.com          200   app.fidscript.com          200   api.fidscript.com       404*
jmap.fidscript.com     302   stalwart-admin.fidscript.com 302  storage.fidscript.com   403*
instant.fidscript.com  307   apiinstant.fidscript.com    200   cliinstant.fidscript.com 200
realtime.fidscript.com 200   instantmcp.fidscript.com    405*  registry.fidscript.com  200
grafana.fidscript.com  302   prometheus.fidscript.com    302   loki.fidscript.com      404*
whatsapp.fidscript.com 200   mail/imap.fidscript.com     — (SMTP/IMAP, not HTTP)
```
`*` the expected answer: no route at the root, the API lives under `/api/v1`, storage is a
signed-URL service, the MCP bridge is POST-only, Loki has no root UI.

**58 DNS records** in the zone, including a **dead set from the original `deploy.fidscript.com`
install** (`*.deploy.fidscript.com`, `api.deploy…`, `imap.deploy…`, the old MX/SPF/DKIM) that
points at the same IP and can be deleted.

---

## 8. The journeys

Traced through the code, not read from the blueprint.

| # | Journey | State | What is actually there, and what is not |
|---|---|---|---|
| 1 | **First-time registration** | 🟡 **65%** | The landing page, the register form, the company password (server-checked), auto-creation of an **organization** *and* a **first project**, and the login all work — **verified live**. **Missing:** the landing page has **no Register link** (only the login page has one); no verification email is ever sent and no verification page exists (H13); the register response carries `onboarding: {organizationId, projectId}` and the dashboard **throws it away**; `/onboarding` is the *install* wizard, not user onboarding; and a new user lands on `/applications` with no orientation and no next step. |
| 2 | **Create a project** | 🟡 **60%** | The list, the empty state, create/edit/delete/restore/purge work. But "create a project" is a **two-field form** — the type is hardcoded `frontend` on create — and everything the journey describes after "details" (import, GitHub, environment variables, optional services) lives inside the *deployment* wizard instead. The operator cannot create an empty project and configure it later without deploying something. And the best guidance in the product — a four-step "what to do next" card — **never renders**, because a project is auto-created. |
| 3 | **Deploy an application** | 🟢 **80%** | Two wizards exist (a 3-step platform-level one and a 4-step project-level one) and they are **not equivalent**: the platform one cannot set a subdomain, a Dockerfile path or credentials; the project one cannot mark required variables. The journey is otherwise complete — import, repo, branch, detection, build settings, variables, review, start, live logs, live URL — and **verified end to end**. **The gaps are the failure path:** the Stop and Restart buttons contradict the API (H12), `BLOCKED` and `ROLLED_BACK` are dead ends, a failure does not say why (H15), and there is no per-deployment environment editing or redeploy after the fact. |
| 4 | **Manage a deployed project** | 🟡 **80%** | All twelve console sections exist with real data — none is a placeholder. **But** three of the project's own sections (deployments, members, activity) are **not in the sidebar** and are reachable only by editing `?section=`; four sections are the same component as a flat route; and the mobile timeline renders no current step for every terminal state (`stepIndex` returns −1). |
| 5 | **Configure an infrastructure service** | 🔴 **30%** | Discover and install work (the install runs the installer's own command, in the background, with a live log). **Everything between "discover" and "use" is missing for six of the seven applications:** no requirements, no "is it configured", no instructions, no credential collection, no validation, no troubleshooting. The one well-built instance of this journey is the Cloudflare OAuth form — and it is not one of the seven. Secrets the installer generates (the Grafana password, the registry password, the Instant token) **never reach the operator**. And the email service's configuration path is the two blockers (B4, B5). |
| 6 | **Manage an organization** | 🔴 **5%** | The API is ~80% built (23 endpoints), the SDK wraps most of it, the MCP server exposes five tools, the platform **auto-creates an organization** for every new account — and the dashboard shows **none** of it. No members, no teams, no roles, no permissions, no ownership transfer, no org-scoped API keys. Even the parts that exist cannot be used: the invite email is a dead link and inviting anyone throws (H14). |

---

## 9. The roadmap

Reordered against the findings. **Security and correctness first** — the directive is explicit that
no sequence may trade them away — and **the first test suite lands in Phase 1**, not Phase 11.

### Phase 1 — Close the isolation and authorization gaps (nothing else first)
> The directive says no sequence may trade security or correctness away. Three findings make the
> platform unsafe to expose to a second tenant today, and all three are small, surgical fixes.

1. **Bind project API keys to their project** (B1) — compare `user.projectId` with
   `request.params.projectId` in `ProjectMemberGuard`; load and enforce `permissions` for `fpk_`
   keys; make `ProjectAccessService` throw instead of returning a pseudo-project for API keys.
2. **Guard the installation routes** (B2) — an admin guard plus a one-time setup token bound to
   the install.
3. **Require the webhook signature** (B3) — unconditionally, over the raw body.
4. **Enforce the project role** (B6) — a `ProjectRoleGuard` on the 26 project-scoped controllers;
   constrain the invitation and membership roles to an enum.
5. **Close the credential-reflecting and unguarded routes** (H8, H9) — `/projects/raw-headers` and
   the two domain-activity routes.
6. **Fix the path drift** (B9) — strip the doubled `api/v1` (one change, 21 routes), reconcile the
   25 SDK paths, implement MCP scope checking, put `/metrics` behind the admin.

**Verified by:** the same live probes that found them — an `fpk_` key from project A must fail
against project B; an unauthenticated `POST /installation/configure` must be refused; a viewer
must be refused an admin invitation and a write-scoped key.

### Phase 2 — Make the platform true (the contract between the layers)
7. Fix the three SDK email unwraps (B4) — one file, three lines.
8. Fix the email-domain creation envelope and surface the DNS steps the API already returns (B5).
9. Correct the TD-SEC-5 entry and re-state the functions isolation honestly (B8), including the
   three narrower gaps (H10): `--userns=remap`, an upper bound on `timeoutSeconds`, and
   `--env-file` instead of secrets on the argv.
10. **Write the first test suite** — and make it *runnable* first: `apps/api` has **no
    `jest.config.*`**, so jest cannot parse TypeScript or resolve the `@/` alias. Add the config
    (ts-jest preset, `reflect-metadata`, the alias mapper), change the test script from
    `jest --passWithNoTests` to `jest`, then write:
    - a **contract test** that asserts every SDK path resolves to a real API route and every list
      endpoint's shape matches what the SDK unwraps — that single test would have caught B4, B5
      and B9 automatically;
    - a **per-controller authorization test** (the matrix in this document is the test's data);
    - unit tests for `project-access.service.ts` (the highest-density logic in the repo, one
      mockable dependency), `common/secrets.ts` and the bounce-rule matcher (both pure);
    - and a **guard test** that the email-verification gate actually gates (H13).
    Add a `.husky/pre-commit` so the gap cannot reopen (H17).
11. Publish the SDK (H18).
12. Mount `ToastProvider` once, globally (H0) — one line, 51 dead toasts alive.

### Phase 3 — Navigation and information architecture
13. Decide the platform home (H3): an **Overview** that answers the six questions — health,
    projects, deployments, failures, resources, what to do next.
14. Resolve Applications vs Projects explicitly in the nav: **Platform** (infrastructure) vs
    **Projects** (the operator's work), with the mail application page under Platform.
15. Consolidate the flat tree (H2, M0b) into the project console, with **redirects** for every old
    URL, keeping the CLI, the MCP server and the docs working. `/email` survives; the four
    unreachable stubs do not.
16. Link or retire the 22 orphans (H1); give `/platform/email` and `/platform/integrations/settings`
    real entry points.
17. Fix the sidebar's slug/id split so the active state works (M0), and make the role difference
    real in the navigation (M0c).
18. Replace the three theme buttons with one control, default System, and persist it (M1).

### Phase 4 — The design system, for real
19. Build the components the catalogue already promises but that do not exist (M4, H0b):
    **`ErrorState`** first (it is the root of 113 swallowed errors), then `DataTable`, `FilterBar`,
    `Breadcrumbs`, `EntityCard`, `KeyValueTable`.
20. Replace the 15 browser dialogs with the `ConfirmProvider` (H5).
21. One error-state pattern and one empty-state pattern across every page (H6).

### Phase 5 — The organization and account surfaces
22. Build the organization surface the API already has (B7): members, teams, roles, invitations —
    and make the workspace picker in the deployment wizard meaningful.
23. Account menu: sessions, password change, and **make two-factor settable** (H4).

### Phase 6 — The deployment experience, deepened
24. Per-deployment environment editing after creation; preview deployments; a build worker that
    survives an API restart.
25. **Fix the deployment action buttons against the API** (H12) and **persist the failure reason**
    on the deployment (H15) — a failure that cannot be understood from the screen is a failure the
    operator has to guess at.
26. The email journey end to end, once B4/B5 are fixed: domain → records → verify → mailbox →
    alias → deliverability.
27. Bring the in-product documentation back in line with the code (H16), and give the six services
    that have no configuration flow a real one (journey 5).

### Phase 7 — Developer tools and operations
28. The MCP hub and CLI as first-class surfaces; install the CLI on the platform host (M8).
29. Monitoring and logs with real consumption and alerting; the notification centre the
    documentation already promises (M0d).

### Phase 8 — Quality and verification
30. Playwright journeys for the six flows; accessibility pass; responsive pass; a regression suite
    that runs on every commit — and a CI job that fails when there are none.

---

## 10. What I did not do in this phase

No code was changed. The audit was performed by reading the code, querying the live API, and
driving the live platform in a browser. Two isolated test resources were created and deleted
(a project named `audit-probe` and two `*.example.com` mail domains) to reproduce B1 and B2
honestly; the production data, the other products on this host, and the deployed services were not
touched.

---

## 11. Open questions for the operator

1. **Should the flat platform routes survive at all?** The project console can hold every one of
   them. If yes, they need a coherent "platform scope" story (all projects? a chosen one?); if no,
   they become redirects.
2. **Should a project belong to a team?** The API now supports `organizationId` on a project and
   the wizard offers a workspace picker — but with no organization UI, the picker always shows one
   option.
3. **Is `/` the right home for an authenticated operator**, or should the platform open on an
   Overview and keep the landing page for signed-out visitors only?
4. **Should the mail console live at the platform level or per project?** The records are
   per-project, but the mail *server* is one per platform.
