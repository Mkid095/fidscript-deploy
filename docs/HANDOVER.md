# The hand-over

_For the agent that picks this up. Read this, then read
`docs/IMPLEMENTATION_PLAN.md` §P5 and `docs/PROGRESS.md` §7._

---

## 0. What this is

The **FIDScript platform**: a Next.js console (`apps/console`) over a
NestJS API (`apps/api`), running on a live VPS at `fidscript.com`. The
repository is the platform's home — the console, the API, the packages, the
CLI, the MCP server, the installer and the applications' integrations all
live here.

The product's rules are in `docs/USER_FLOW_GUIDE.md`; the decisions are in
`docs/DECISIONS.md`; the work is in `docs/IMPLEMENTATION_PLAN.md`.

**Everything in P1–P4 is built, deployed and working. P5 is closed** — all
five items were done, deployed, and verified live in the hand-over session
(`docs/PROGRESS.md` §7). What is open now is the email capability's
configuration, and the honest list of small things found and not taken
(§7.7 there).

---

## 1. The state you are inheriting

|                   |                                                                                                                                                                                                                                                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Deployed**      | the API and the console — all of P5, plus the deployment fixes and the interface work of the second session (`docs/PROGRESS.md` §9)                                                                                                                                                                                                 |
| **Verified live** | one set of credentials (console · Grafana · Stalwart · InstantDB); project creation provisions the Instant app and the WhatsApp identity; `demo.fidscript.com` in Cloudflare; a deployment from git answering on its own subdomain and on an attached domain with a valid certificate; the build log appearing while the build runs |
| **Working tree**  | clean                                                                                                                                                                                                                                                                                                                               |

---

## 2. What the platform answers with now

One identity: `kennedygithinjioffice@gmail.com` / `Elishiba@95`.

| Application | Account                                       | Note                                                                                                                          |
| ----------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| The console | the email / the password                      | the platform's own account                                                                                                    |
| Grafana     | the email / the password                      | `GF_SECURITY_ADMIN_USER` + the secret file                                                                                    |
| Stalwart    | the email / the password                      | the **recovery administrator** (`STALWART_RECOVERY_ADMIN`); the SMTP submission credential is the same — they change together |
| InstantDB   | an account under the email, by **magic code** | the platform holds that account's personal access token (`secrets/instant_superuser_token.txt`)                               |

The decision is **D16**; the screen is **Settings → Credentials** — it reads
what each application answers with, checks a password against every one
live, and applies where an application takes its credential from the
platform.

The platform also holds its **WhatsApp key** (`secrets/evolution_api_key.txt`),
so a project's identity is made when the project is made (D17).

---

## 3. What to do next

1. **The email capability** — the one capability still unconfigured: the MX
   for `fidscript.com` points at the registrar's forwarding, Stalwart holds
   no mailboxes, and a full system-mail send has not been tested. The guide's
   Stalwart configuration checklist (§8.3) is the work.
2. **The honest lists** (`docs/PROGRESS.md` §7.7 and §9.1) — the domain
   card's "failed" that means "nothing deployed yet", the static per-record
   statuses, the WhatsApp instance scoping, the sidebar's hardcoded-off
   WhatsApp item, and the build log's remaining refinements.
3. **The remaining page-bar pass** — twenty-four screens have the bar; the
   rest of the product follows the same rule.
4. **The demo deployment** — `fidscript-6d39d5fa` carries a small test
   application deployed to prove the pipeline (it answers on the project's
   subdomain and on `demo.fidscript.com`). Remove it when it has served its
   purpose; the container, the image and the record go with it.

---

## 4. How to build, deploy and check

```bash
# the API  (built from this repository)
cd /opt/fidscript-deploy/installer/docker
sudo docker compose build api && sudo docker compose up -d api

# the console
sudo docker compose build dashboard && sudo docker compose up -d dashboard

# the checks
cd /home/ken/projects/apps/fidscript-deploy
pnpm --filter @fidscript/console test        # 36 tests
cd apps/api && npx tsc --noEmit -p tsconfig.json   # clean
npx jest                                       # 25 suites, 167 tests
cd apps/console && npx tsc --noEmit -p tsconfig.json   # clean
```

The console is served at `https://fidscript.com` (and `app.fidscript.com`).
The API at `https://api.fidscript.com/api/v1`.

---

## 5. The traps

- **The API's admin is `kennedygithinjioffice@gmail.com` / `Elishiba@95`.**
  The `ADMIN_EMAIL`/`ADMIN_PASSWORD` in
  `/opt/fidscript-deploy/installer/docker/.env` (`admin@fidscript.com`) is
  the **seed's** value and **does not log in** — the seed skips when the
  account exists. Do not waste a turn on it.
- **The mail administrator is the recovery administrator.** It is defined by
  `STALWART_RECOVERY_ADMIN` — `name:password`, **not** `name:sha256` (the old
  reading only worked because the token was 64 hex chars). Changing it means
  changing the secrets files and the SMTP submission credential with it, then
  restarting Stalwart **and** the api. There are no directory accounts in
  this Stalwart yet.
- **The Instant BaaS is the self-hosting stack.** The server answers as
  `http://server:8888` on the `self-hosting` network (external in the
  compose) — `fidscript_instant_server` does not exist here. Its
  superuser token is a **file** read lazily per call; a file that is not
  there yet is not "no token".
- **The console's build is webpack**, not turbopack (`next build`, no
  `--turbopack`): turbopack takes the workspace root as its project root and
  fails.
- **`.npmrc` has `child-concurrency=1`** on purpose: esbuild's install
  script finds the wrong binary with two versions in the workspace and the
  build fails with "Expected 0.21.5 but got 0.24.2".
- **The formatter is prettier with single quotes** (`.prettierrc`); run
  `npx prettier --write` on what you touch. Do not run it over the whole
  repository — it will churn files you did not mean to change. (The three
  domain services were churned once, in `3a5cf97`, because they had drifted.)
- **Memory is tight** (~600 MB free of 8 GB, swap full). One heavy build at
  a time; the console's Dockerfile caps the heap at 2 GB for that reason.
- **The API's image is built from this repository**, not from
  `/opt/fidscript-deploy/apps/` — that copy is stale. Edit here.
- **Traefik's metrics** are served on the entrypoint named `traefik` with
  `--metrics.prometheus=true --entrypoints.traefik.observability.metrics=true`.
  The YAML form (`observability: { metrics: ... }`) is **invalid** and takes
  the whole edge down.
- **The observability routers need `priority: 100`** or the file provider's
  `HostRegexp` wildcard swallows them and Prometheus and Grafana become
  unreachable.
- **The compose's secrets are a bind mount with symlinks**: a new secret
  needs BOTH `secrets/<name>.txt` AND the `secrets/<name>` symlink — the env
  vars point at the one without the suffix. A file added after the container
  started can show in `ls` but fail to open until the container is
  recreated.
- **The Instant dashboard's deep link is `/dash?app=<appId>`** — confirmed
  from Instant's own source (`server/src/instant/config.clj`), not guessed.

---

## 6. The standing rules

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

## 7. The documentation to keep

|                               |                                                           |
| ----------------------------- | --------------------------------------------------------- |
| `docs/USER_FLOW_GUIDE.md`     | what the product **is**                                   |
| `docs/ARCHITECTURE.md`        | how it is put together                                    |
| `docs/IMPLEMENTATION_PLAN.md` | the work — **P5 is closed; the email capability is next** |
| `docs/DECISIONS.md`           | the decisions taken (D1–D17) and the ones owed            |
| `docs/PROGRESS.md`            | where we are — **§7 is the newest**                       |
| `docs/HANDOVER.md`            | this file                                                 |

Write the record as you go: a decision that is not written down is a
decision somebody will make again, differently.

---

_Written 2026-11-07; updated the same day by the hand-over session._
