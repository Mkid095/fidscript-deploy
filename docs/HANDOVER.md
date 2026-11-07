# The hand-over

_For the agent that picks this up. Read this, then read
`docs/IMPLEMENTATION_PLAN.md` §P5 and `docs/PROGRESS.md` §6._

---

## 0. What this is

The **FIDScript platform**: a Next.js console (`apps/console`) over a
NestJS API (`apps/api`), running on a live VPS at `fidscript.com`. The
repository is the platform's home — the console, the API, the packages, the
CLI, the MCP server, the installer and the applications' integrations all
live here.

The product's rules are in `docs/USER_FLOW_GUIDE.md`; the decisions are in
`docs/DECISIONS.md`; the work is in `docs/IMPLEMENTATION_PLAN.md`.

**Everything in P1–P4 is built, deployed and working.** P5 is the work
that is open, and it was found by a person _using_ the platform, not by
reading the plan.

---

## 1. The state you are inheriting

|                   |                                                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Last commit**   | `bff6dad fix(domains): the records can be written, and the platform keeps its names`                                                      |
| **Deployed**      | the API — rebuilt from this repository and restarted with the DNS fixes and the reserved-host rule                                        |
| **Not deployed**  | the console's **page bars** (built, type-checked, 36 tests passing) — the image `fidscript-console:latest` is still the previous one      |
| **Verified live** | Grafana answers to the platform's credentials; the API's health is 200; the console serves 200 on `fidscript.com` and `app.fidscript.com` |
| **Working tree**  | clean                                                                                                                                     |

---

## 2. The five things to do, in this order

### 2.1 Deploy the console — the page bars (P5.3)

The bar is now part of the frame: `Page` takes `title`, `description`,
`actions` and `eyebrow` and renders the sticky bar itself. Twenty-four
screens were migrated. **Nobody has seen it yet.**

```bash
cd /opt/fidscript-deploy/installer/docker
sudo docker compose build dashboard && sudo docker compose up -d dashboard
```

Then **look at it** — `https://fidscript.com/overview`, `/projects`, a
project's screens — at a desktop size and at a phone size. A bar that
overlaps, or a title that truncates to nothing, is the thing to catch.

> The console's build is the memory-hungry step. The machine has ~1.8 GB
> free; the Dockerfile caps the heap at 2 GB for that reason. Do not run
> the build and anything else heavy at the same time.

### 2.2 One set of credentials (P5.2, P5.4)

The platform's identity is `kennedygithinjioffice@gmail.com` /
`Elishiba@95`.

| Application   | State                                       | What is left                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The console   | ✅                                          | —                                                                                                                                                                                                                                                                                                                                                                                                      |
| Grafana       | ✅ renamed to the email, password verified  | —                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Stalwart**  | ⬜ the admin is `admin` + the machine token | The admin's **name** should be the email and its **password** the platform's. The same token is the platform's **SMTP submission password** (`secrets/stalwart_admin_token.txt` and `secrets/smtp_submission_pass.txt`), so **both secrets and the API's JMAP/SMTP clients change together** — the API's `STALWART_JMAP_USER`, `STALWART_ADMIN_TOKEN_FILE` and the compose's `STALWART_RECOVERY_ADMIN` |
| **InstantDB** | ⬜                                          | It signs in with a **magic code**, not a password — but it still needs an **account under the same email**                                                                                                                                                                                                                                                                                             |

Then the **Settings screen** (P5.4) — the place where this is _decided_
rather than discovered: the platform's email and password, a toggle for
"the same password everywhere", per-application account and password, and
what is applied versus pending. It needs an API surface: platform-admin
endpoints that read each application's own credential, apply the
platform's, and say what each answers with.

> The mail server's admin credential is served today by
> `apps/api/src/modules/email/services/mail-console.service.ts`
> (`GET /admin/platform-mail/console`) — that is the shape to follow.

### 2.3 The Databases page reaches the database (P5.5)

The project's Databases page must link to the project's **InstantDB app**
(data, schema, console) and to the **backend-as-a-service** console, each
carrying the right project id so the link lands on _this_ project's app.

Files: `apps/console/src/app/(project)/projects/[projectId]/databases/page.tsx`,
`apps/console/src/lib/api/project.ts` (the InstantDB client).

### 2.4 The project's resources are created with the project (P5.6)

Creating a project must also create it in the systems it will use — an
**InstantDB app**, the project's **WhatsApp identity** — so the links in
2.3 land on something that exists. Today the Instant app is created by a
later, separate step and the WhatsApp identity when somebody connects
WhatsApp. Both should happen when the project is made, and be re-tried
when they fail, without leaving the project half-made.

File: `apps/api/src/modules/projects/services/project-create.service.ts`.

### 2.5 The project needs a domain it may own (P5.7)

`app.fidscript.com` is the **console's alias** and stays that way (D12 —
the operator decided). The project "Fidscript" therefore needs another
name: one of the zones in the operator's Cloudflare account, or a
subdomain of one that is not the platform's own.

Two things are still to be done by hand:

1. the **stale domain row** (`app.fidscript.com`, project
   `cc42b53b-c6d0-40ad-849f-1e982a6d10e2`) should be removed from the
   project — it points at the console, and the platform will now refuse to
   write records for it;
2. a new domain should be added through the console and **Write the
   records** pressed once — to see a record appear in Cloudflare. That is
   the proof that the domain flow is fixed.

The operator's Cloudflare zones (from their connected account):
`allrounderservice-omar.de`, `cerenityscents.com`, `euroduka.com`,
`exgermanyventures.com`, **`fidscript.com`**, `gbsgroup.co.ke`,
`nearskool.com`, `nextmavens.cloud`, `nextmavens.com`, `soostori.co.ke`,
`swaysuite.com`, `trustmedsupplies.co.ke`.

---

## 3. How to build, deploy and check

```bash
# the API  (built from this repository)
cd /opt/fidscript-deploy/installer/docker
sudo docker compose build api && sudo docker compose up -d api

# the console
sudo docker compose build dashboard && sudo docker compose up -d dashboard

# the checks
cd /home/ken/projects/apps/fidscript-deploy
pnpm --filter @fidscript/console test        # 36 tests
cd apps/api && npx tsc --noEmit -p tsconfig.json
cd apps/console && npx tsc --noEmit -p tsconfig.json
```

The console is served at `https://fidscript.com` (and `app.fidscript.com`).
The API at `https://api.fidscript.com/api/v1`.

---

## 4. The traps

- **The API's admin is `kennedygithinjioffice@gmail.com` / `Elishiba@95`.
  ** The `ADMIN_EMAIL`/`ADMIN_PASSWORD` in `/opt/fidscript-deploy/installer/docker/.env`
  (`admin@fidscript.com`) is the **seed's** value and **does not log in** —
  the seed skips when the account exists. Do not waste a turn on it.
- **Do not restart unrelated services.** The platform is live; the Instant
  stack, WhatsApp and the mail on the other host serve real clients.
- **Memory is tight** (~1.8 GB free of 8 GB). One heavy build at a time.
- **The API's image is built from this repository**, not from
  `/opt/fidscript-deploy/apps/` — that copy is stale. Edit here.
- **The console's build is webpack**, not turbopack (`next build`, no
  `--turbopack`): turbopack takes the workspace root as its project root
  and fails.
- **`.npmrc` has `child-concurrency=1`** on purpose: esbuild's install
  script finds the wrong binary with two versions in the workspace and the
  build fails with "Expected 0.21.5 but got 0.24.2".
- **The formatter is prettier with single quotes** (`.prettierrc`); run
  `npx prettier --write` on what you touch. Do not run it over the whole
  repository — it will churn files you did not mean to change.
- **Traefik's metrics** are served on the entrypoint named `traefik` with
  `--metrics.prometheus=true --entrypoints.traefik.observability.metrics=true`.
  The YAML form (`observability: { metrics: ... }`) is **invalid** and takes
  the whole edge down.
- **The observability routers need `priority: 100`** or the file
  provider's `HostRegexp` wildcard swallows them and Prometheus and Grafana
  become unreachable.

---

## 5. The standing rules

1. **The platform is live.** Do not restart unrelated services, prune
   infrastructure, change DNS, or alter the other hosted products.
2. **Do not deploy unverified authentication changes.** Verify every
   authentication flow safely, and leave no test accounts, sessions or
   verification data behind.
3. **A screen belongs to exactly one level** — platform, project or
   application.
4. **A menu is derived from what the thing really has** — never a fixed list.
5. **A one-time thing never sits in a permanent menu** — the applications
   and the keys are settings, not destinations.
6. **A project is a directory for one application** — not many.
7. **Say what is true.** A number that cannot be known reads "Not
   available"; a capability whose application is down says so and links to
   where it is fixed.

---

## 6. The documentation to keep

|                               |                                                |
| ----------------------------- | ---------------------------------------------- |
| `docs/USER_FLOW_GUIDE.md`     | what the product **is**                        |
| `docs/ARCHITECTURE.md`        | how it is put together                         |
| `docs/IMPLEMENTATION_PLAN.md` | the work — **P5 is what is open**              |
| `docs/DECISIONS.md`           | the decisions taken (D1–D15) and the ones owed |
| `docs/PROGRESS.md`            | where we are — **§6 is the newest**            |
| `docs/HANDOVER.md`            | this file                                      |

Write the record as you go: a decision that is not written down is a
decision somebody will make again, differently.

---

_Written 2026-11-07._
