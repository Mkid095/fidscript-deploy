# The platform and Instant: what repeats, and what does not

FIDScript Deploy and the Instant BaaS are **deployed together on one host, under
one domain, and share no application code**. This document decides which
capabilities each one owns, so the platform is built once and correctly
instead of twice.

Everything in the "verified" columns was read out of the running code on
2026-11-05 — the Instant fork at `/home/ken/projects/core/instant` and this
repository. Nothing here is inferred from a README.

---

## 1. The fact that makes this a decision and not a formality

The Instant stack already sits behind the platform's own edge, with its own
hostnames and its own certificates (`installer/config/traefik/products.yml`):

| Hostname | Serves |
|---|---|
| `instant.fidscript.com` | the Instant console |
| `apiinstant.fidscript.com` | the Instant backend (query + realtime) |
| `realtime.fidscript.com` | the Instant realtime websocket |
| `instantmcp.fidscript.com` | the Instant MCP bridge |

And the two products do not know each other exists:

| Check | Result |
|---|---|
| `instant` in `apps/api/prisma/schema.prisma` (2,613 lines) | **0 hits** — no `instantAppId` on `Project` |
| `instant` in `apps/dashboard/src` | **0 files** — no tab, no link, no client |
| `instant` in `packages/sdk` | **0 hits** |

The only trace of Instant inside FIDScript is two comments in
`modules/databases/`: *"the Convex/InstantDB magic"* and *"exposes the
Convex/InstantDB-style `.watch()`"*. The platform copied Instant's **UX
pattern** and reimplemented it independently on Postgres `LISTEN/NOTIFY`.

So the question is not "which is better". It is: **FIDScript has a half-BaaS
bolted onto an ops platform, sitting next to a complete BaaS that is already
running, and not wired in at all.**

---

## 2. The verdict

| Capability | FIDScript | Instant | Verdict |
|---|---|---|---|
| **Database** | per-project Postgres DB + role, raw SQL | shared Postgres, triples, InstaQL | **Duplicate surface, different layers.** FIDScript = Postgres-as-a-service (no row auth). Instant = rule-aware BaaS. **Delegate app data; keep the Postgres.** |
| **Realtime — platform** | Socket.IO `/realtime`, `project:<id>` rooms | ✗ | **FIDScript-only. Keep.** |
| **Realtime — data** | `LISTEN/NOTIFY` → SSE, row patches, no row auth | logical replication → WS, query-level invalidation, CEL-aware | **Duplicate; Instant is strictly stronger. Delegate.** |
| **Storage** | buckets, RustFS/MinIO, presigned URLs | flat per-app files, CEL-gated | **Same word, different products.** Keep RustFS for platform assets; delegate app files. |
| **Users — operator** | `User`/`Session`/`ApiKey`/`Org`/`Team`, JWT | `instant_user`/`org`/PAT | **Duplicate, disjoint DBs. Keep FIDScript's** — it gates deployments. |
| **Users — app** | `AppUser`/`AppRole` (JSON perms) | `app_user` + **CEL rules** | **Duplicate; Instant is strictly stronger. Delegate.** |
| **CLI** | `fidscript` — 12 command families, ops | `instantself` — schema-as-code, InstaQL | **Complementary, ~10% overlap. Keep both; fix the names.** |
| **MCP** | 135 tools, control-plane | 93 tools, data-plane | **Complementary, ~10% overlap. Keep both; fix the names.** |
| **Queues** | NATS JetStream | ✗ | **FIDScript-only. Keep.** |
| **Scheduler** | `CronJob`/`CronJobRun` | ✗ | **FIDScript-only. Keep.** |
| **Email** | full platform — inbound, mailboxes, aliases, deliverability, suppression | outbound + senders/templates only | **FIDScript is a superset. Keep FIDScript.** |
| **Domains** | DNS, TLS, verification, repair | ✗ | **FIDScript-only. Keep.** |
| **Deployments** | Docker + buildpacks, rollback | ✗ | **FIDScript-only. Keep.** |
| **Functions** | Node + Python sandbox | ✗ | **FIDScript-only. Keep.** |
| **Monitoring** | Prometheus, alert rules, notifiers | ✗ | **FIDScript-only. Keep.** |
| **Logging** | streams, shippers, retention | ✗ | **FIDScript-only. Keep.** |
| **AI** | Gemini provider, conversations | ✗ | **FIDScript-only. Keep.** |
| **Marketplace** | catalog, reviews, submission | ✗ | **FIDScript-only. Keep.** |
| **Schema-as-code** | ✗ (raw SQL only) | ✓ `push`/`pull` + TS types | **Instant-only. Adopt.** |
| **Server webhooks** | ✗ | ✓ + event replay | **Instant-only. Adopt.** |

**Seven of the capabilities the platform would otherwise have had to invent —
queues, scheduler, email, domains, deployments, functions, monitoring — do not
exist in Instant in any form.** The control plane is not duplicated; it is the
product.

---

## 3. The decision

> **FIDScript is the control plane. Instant is the data plane.**
> The platform owns *where an app runs and who operates it*. Instant owns
> *what the app stores and who may see it*.

### Keep — the platform's product, unmatched by Instant

Deployments · Functions · Queues · Scheduler · Email · Domains · Monitoring ·
Logging · AI · Marketplace · platform realtime (Socket.IO) · secrets & env ·
project management · the **operator** half of auth (`User`, `ApiKey`,
`Organization`, `Team`).

### Delegate — stop building, wire to Instant

| # | Capability | What Instant does that FIDScript cannot |
|---|---|---|
| 1 | **App data, query, realtime** | CEL permission rules evaluated per entity per action against live data; query-level realtime with server-side merge and ordering, presence, ephemeral rooms |
| 2 | **App users and permissions** | CEL rules, magic-code auth, OAuth clients, refresh tokens — against the same rule engine |
| 3 | **App files** | per-app file namespace governed by the *same* CEL rules as the app's records |

### Retire from the platform (the real duplication)

1. **The live-query stack** — `LiveQueryManager`, `live-query.controller.ts`,
   and the SDK's `watch()`.
   *Cost today:* a second realtime protocol to maintain alongside the
   platform's own; a client-side array-splice patch model with no conflict
   handling, where the server sends raw row patches and the client
   reassembles them; and **no row-level authorization** — any holder of the
   project API key read every row of every table.
   **Retired 2026-11-05.** `POST /databases/:id/live-query`,
   `GET /databases/:id/live-query/:table` and the SDK's `watch()` are gone.
   Nothing called `watch()`: no dashboard screen, no MCP tool, no CLI
   command, and the endpoints were never in the endpoint inventory.

   **What stays, and why.** `notify-realtime.provider.ts` is NOT part of the
   duplication. It captures row changes in the **managed Postgres** and
   publishes them as `database.row.changed` on the platform's own event bus
   — that is what the dashboard's live feed and the SDK's `subscribe()` read.
   Instant's realtime is a different thing: query-scoped, permission-aware,
   and over Instant's own store. (An earlier draft of this document claimed
   the provider opened one Postgres client per provisioned database, which
   would have scaled with the customer count. Reading the code, the client is
   reference-counted and closed when the last subscriber leaves, so it scales
   with *concurrent subscribers*.)
2. **`modules/app-auth/`** — a second, weaker user system (register, login,
   password, magic code, magic link, OAuth × 3, roles, sessions).
   *Cost today:* two user tables, two JWT issuers, two magic-code flows, for
   every app developer.
   **Retired 2026-11-05**, in part. The app-facing surface is gone:
   `POST /projects/:id/auth` and the whole `APPAUTH-01..19` cluster, the
   per-project OAuth provider configuration, and the role management —
   along with the `app_roles`, `app_user_roles`, `app_oauth_accounts` and
   `auth_providers` tables, which nothing used afterwards.
   **What stayed, and why.** The module was never only an app-facing
   surface: the **WhatsApp console signs in with it** (magic code), and the
   **deployment pipeline reads the operator's GitHub credentials through
   it** when it clones a private repository. Removing the module wholesale
   would have broken both. So the *app developer's* auth went, and the two
   platform products' auth stayed. The `app_users` and `app_sessions` tables
   remain for the same reason.
3. **The `fidscript-mcp` binary collision** — `@fidscript-deploy/mcp-server`
   and `@fidscript/instant-mcp` both install `fidscript-mcp`.
4. **The `fidscript-cli` alias collision** — the Instant fork's own
   `client/lib/sdk-versions.ts` laments it: *"the package also ships
   `fidscript-cli` as a legacy alias, and `npx @fidscript/instant-cli` can't
   disambiguate between the two."*

### Do NOT delete `modules/databases/`

The platform's managed Postgres is **not** duplicated: Instant's triples store
is not a Postgres an application can `psql` into. Split the module:

- **Keep** — provisioning, roles, PgBouncer pooling, `pg_dump` backups,
  schema introspection, raw-SQL migrations. This is ops-platform
  infrastructure.
- **Delegate** — the live-query/watch half, to Instant.

**The honest gap:** a project that needs row-level authorization *today* cannot
get it from the managed Postgres, because it has none. That gap is the argument
for the delegation — not a reason to keep a weaker imitation of it.

---

## 4. The glue — four pieces, none of which exist yet

### 4.1 A Project ↔ App mapping *(the gate — nothing else can happen first)*

`Project.instantAppId` plus a row per project holding the app's **admin
token**, encrypted with the platform's existing `CryptoService`
(AES-256-GCM, `base64(iv):base64(authTag):base64(ct)`).

The Instant API makes this unusually clean — verified in
`server/src/instant/dash/routes.clj:617` (`apps-post`):

```clojure
(let [user (req->auth-user-accepting-superadmin-token! :apps/write req)
      _ (when-not (flags/dash-app-creation-allowed? (:email user))
          (ex/throw-app-creation-disabled!))
      title (ex/get-param! req [:body :title] ...)
      id (ex/get-param! req [:body :id] uuid-util/coerce)          ;; client-supplied
      token (ex/get-param! req [:body :admin_token] uuid-util/coerce) ;; client-supplied
      ...
      app (app-model/create! (merge {:id id :title title :admin-token token} owner-fields))]
  (response/ok {:app app}))
```

**The app id and the admin token are both supplied by the caller.** So the
platform generates both UUIDs and ends up owning a full-privilege credential
for the app it just created — no second round trip, no secret handoff.

`POST {INSTANT_API_HOST}/dash/apps`
· `Authorization: Bearer per_…` (a personal access token)
· body `{ title, id, admin_token }`

The admin token then authenticates the app's own routes
(`req->app-accepting-superadmin-or-ref-token!` falls through to
`app-for-admin-token!` when the bearer is not a PAT).

**Verified against the running Instant server** — an app was created, read
back and deleted, and the live app count was back to where it started
afterwards:

| Route | Credential it accepts |
|---|---|
| `POST /dash/apps` | the superuser's personal access token |
| `GET /dash/apps/:id` | the app's admin token **or** the superuser's |
| `DELETE /dash/apps/:id` | the superuser's personal access token — the app's admin token is refused with 401 |

Two details the running server settled, and that the code depends on: a
missing app comes back as **400 with `record-not-found`**, not a 404; and the
delete is a **soft delete**.

### 4.2 The credential path

`POST /dash/apps` authenticates with a **personal access token** — a
`per_`-prefixed token belonging to an Instant *user*
(`server/src/instant/util/token.clj:8`). In a self-hosted deployment that user
is the superuser (`INSTANT_SUPERUSER_EMAIL`).

A PAT cannot be minted headlessly: `POST /dash/personal_access_tokens`
requires a signed-in user's refresh token. So the operator creates it once in
the Instant console and pastes it into the wizard — **the same shape as the
Cloudflare token step that is already there.** The wizard verifies it by
calling `GET /dash/personal_access_tokens` with it.

### 4.3 SDK delegation

`packages/sdk/src/modules/instant.ts` — binds to the project's Instant app
(API host, app id) and exposes the client config a deployed app needs. The
existing `databases` and `realtime` SDK modules **stay**, for the operator
surface (raw SQL, platform events); they are a different audience, not a
duplicate.

### 4.4 MCP and CLI naming

| Package | Bin(s) before | Bin now | Action |
|---|---|---|---|
| `@fidscript-deploy/mcp-server` | `fidscript-mcp` | `fidscript-mcp` | keep — the platform's own name |
| `@fidscript/instant-mcp` | `fidscript-mcp` + `instant-mcp` | `instant-mcp` | **drop `fidscript-mcp`** — it collided with the platform's own |
| `@fidscript-deploy/cli` | `fidscript` | `fidscript` | keep |
| `@fidscript/instant-cli` | `instantself` + `fidscript-cli` | `instantself` | **drop the legacy `fidscript-cli` alias** — confusable with `fidscript` |

Only the MCP pair was a true **binary collision**: both packages installed
`fidscript-mcp`, so an agent with both configured could not tell them apart.
The CLI pair never collided (`fidscript` vs `fidscript-cli`) — it was a
*discoverability* problem, which the Instant fork's own `sdk-versions.ts`
complained about: *"the package also ships `fidscript-cli` as a legacy alias,
and `npx @fidscript/instant-cli` can't disambiguate between the two."*

**State:** the two `package.json` edits and the stale comment are **applied in
the Instant fork's working tree** (`client/packages/fidscript-mcp/package.json`,
`client/packages/fidscript-cli/package.json`, and `sdk-versions.ts` in both
`client/lib` and `client/www/lib`). They are **not committed**: that fork has
~9,700 lines of uncommitted work in flight, including the version bumps and
the registry configuration for the next publish, and committing a partial
snapshot of it would break the release. It belongs with the rest of that work.

If the two MCP servers are ever merged into one, the Instant tools take an
`instant_` prefix so an agent can tell `email_send` (platform) from
`instant_email_send` (app-scoped).

---

## 5. The order

The cheapest high-value move is §4.1 + §4.2 plus retiring the live-query
stack. It removes the two most expensive duplications without touching anything
Instant does not already do better.

| # | Step | Risk | State |
|---|---|---|---|
| 1 | `ProjectInstantApp` + the Instant client + provisioning endpoint | none — additive | **done** |
| 2 | The wizard asks for the Instant PAT when the Instant add-on is on | none — additive | **done** |
| 3 | The SDK's `instant` module | none — additive | **done** |
| 4 | Retire the live-query half of `modules/databases/` | **medium** — the API surface disappears | **done** |
| 5 | Retire `modules/app-auth/` as the app-facing auth | **high** — the second JWT issuer goes | **done** (the app-facing half; the WhatsApp login and the GitHub credentials stayed) |
| 6 | Drop the duplicate CLI/MCP bin names | low — the Instant fork is a separate repo | **done** — applied in the fork's working tree, not committed (see §4.4) |
| 7 | The dashboard's data screens point at the Instant console | none | to do |

Steps 4 and 5 remove a public API surface. They are separate changes, each
with its own decision, and neither is implied by this document alone.

---

## 6. What this does not change

- **One host, one domain, one edge.** The consolidation in
  `docs/CONSOLIDATION.md` is unaffected — the Instant stack keeps its own
  hostnames and its own console; only *who owns which capability* moves.
- **The platform's realtime is still realtime.** The Socket.IO event bus for
  deployments, functions, queues, cron, email and domains has no Instant
  analogue and stays exactly as it is.
- **The managed Postgres stays.** It is what deployed applications connect to.
