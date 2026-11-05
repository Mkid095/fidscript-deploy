# The platform flow — what is connected, and where it is not

A map of the system as it stands, so the work can be done step by step and
each step can be checked against something real.

Everything marked **verified** was run end to end on a clean install (fresh
clone → wizard → both images built from source → `compose up` → checks). The
seams at the bottom are the places where the flow is defined but not
finished.

---

## 1. The install flow — an operator with a fresh VPS

```
curl -sSL https://deploy.fidscript.com/install.sh | sudo bash
```

| # | Step | Where |
|---|------|-------|
| 1 | Detect the OS and the public IP | `install.sh` → `step_1_env` |
| 2 | Install Docker + Compose if missing | `step_2_prereqs` |
| 3 | Clone the repo to `/opt/fidscript-deploy` | `step_3_clone` |
| 4 | **Run the setup wizard** | `step_4_wizard` → `installer/scripts/setup-wizard.sh` |
| 5 | Build the images and `compose up -d` | `step_5_deploy` |
| 6 | Apply migrations, seed the admin, verify | `step_6_verify` |

### The wizard (step 4) — seven steps

1. **Platform domain** — one domain everything is published on.
2. **Administrator account** — email + password (≥ 12 chars).
3. **Admin password** — confirmed.
4. **Cloudflare account** — prints a link to Cloudflare's token page with
   the permissions spelled out, takes the token, verifies it, lists the
   zones it can see, resolves the zone covering the domain (walking the
   labels), and shows the nameservers Cloudflare assigned.
5. **Optional components** — observability, Instant, WhatsApp, package
   manager, app runtime.
6. **Review.**
7. **Done** — creates the DNS record for every service and prints the links.

It also writes, under `installer/docker/`:

| Path | What |
|------|------|
| `.env` | domain, IPs, credentials, `FIDScript_ADDONS` |
| `secrets/*.txt` | every generated secret, mode 600 |
| `secrets/api.env` | the API's environment |
| `traefik/dynamic/platform.yml` | the platform's routing |
| `config/stalwart/config.toml` | the mail server's configuration |

**The hostnames live in one place** — `installer/config/services.tsv` —
so the DNS records, the routing and the summary all come from the same list.

> **The guard.** If a platform volume already exists but the credentials do
> not, the wizard stops and says so, rather than generating a new password
> that locks the platform out of its own database. It names the volume and
> the exact command to remove it.

---

## 2. The runtime topology — 11 core services, 4 networks

```
                      ┌──────────── traefik ────────────┐   80, 443
        dashboard ───▶│  file provider (./traefik/dynamic) │◀── api (3001)
                      │  docker provider (labels)         │
                      └───┬──────────┬──────────┬─────────┘
                          │          │          │
                     postgres   redis       nats
                          │          │          │
                    pgbouncer ────┘     (JetStream events + queues)
                          │
   api ──▶ minio (RustFS)   stalwart (mail)   docker-proxy ──▶ host docker socket
```

| Service | Image | Networks | Role |
|---------|-------|----------|------|
| `traefik` | traefik:v3.3 | deployment, whatsapp, app, mail | the only public entry point |
| `api` | built from `apps/api/Dockerfile` | deployment, whatsapp, app, instant | the whole platform API |
| `dashboard` | built from `apps/dashboard/Dockerfile` | deployment | the Next.js console |
| `postgres` | postgres:16-alpine | deployment | the platform database |
| `pgbouncer` | pgbouncer:1.15.0 | deployment | connection pooling |
| `redis` | redis:7-alpine | deployment | cache, locks, session state |
| `nats` | nats:2.10-alpine | deployment | JetStream — events and queues |
| `minio` | rustfs/rustfs:1.0.4 | deployment | S3-compatible object storage |
| `stalwart` | stalwartlabs/stalwart:v0.16.10 | deployment, mail | SMTP, IMAP, JMAP |
| `docker-proxy` | node:20-alpine | deployment | lets Traefik reach the Docker API |

### How the API reaches each of them

| Env | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql://fidscript:…@postgres:5432/fidscript` |
| `PGBOUNCER_HOST` | `pgbouncer` |
| `REDIS_URL` | `redis://:…@redis:6379` |
| `NATS_URL` | `nats://nats:4222` |
| `MINIO_ENDPOINT` | `minio:9000` |
| `STALWART_JMAP_URL` | `http://fidscript_stalwart:8080/` |
| `STALWART_SMTP_HOST` | `fidscript_stalwart` |
| `TRAEFIK_DYNAMIC_DIR` | `/etc/traefik/dynamic` |
| `EVOLUTION_API_URL` | `http://fidscript_whatsapp_api:3099` |

### The request paths

| From | To | How |
|------|----|-----|
| browser | dashboard | Traefik → `fidscript_dashboard:3001` |
| browser | api | Traefik `PathPrefix(/api)` → `fidscript_api:3001` |
| browser | realtime | Traefik → the api's Socket.IO gateway, namespace `/realtime` |
| api | postgres | `DATABASE_URL` (direct) and `pgbouncer` (pooled) |
| api | redis | `REDIS_URL` |
| api | nats | `NATS_URL` — JetStream events and queues |
| api | object storage | `MINIO_ENDPOINT` |
| api | mail | `STALWART_JMAP_URL` (JMAP) and `STALWART_SMTP_HOST` (submission) |
| api | host Docker | the socket at `/var/run/docker.sock` — builds and runs deployments |
| api | Traefik | writes `./traefik/dynamic/*.yml`, which Traefik watches |

---

## 3. The deploy flow — a customer's application

```
   git push ──▶ GitHub webhook ──▶ api ──▶ clone ──▶ docker build
                                                       │
                    ┌──────────────────────────────────┘
                    ▼
              container + Traefik labels ──▶ https://<slug>.apps.<domain>
```

| # | Step | Where |
|---|------|-------|
| 1 | GitHub sends a push webhook (HMAC-verified) | `controllers/github-webhook.controller.ts` |
| 2 | The api creates a Release + a Deployment, and emits `deployments.deployment.created` | `services/deployment-crud.service.ts` |
| 3 | The worker picks it up | `runner/deployment-state.service.ts` (an EventEmitter2 listener) |
| 4 | Clone the source into a workspace | `providers/docker-build-workspace.service.ts` |
| 5 | Detect the framework, generate a Dockerfile, `docker build` | `providers/node-buildpack.provider.ts` |
| 6 | `docker run` with the Traefik labels | `runner/docker-run.service.ts` + `runner/docker-build-args.service.ts` |
| 7 | Probe the health endpoint | `runner/docker-command.service.ts` |
| 8 | Publish the custom domains' routes | `services/deployment-routes.service.ts` |

**No CI is involved.** The platform clones and builds the commit itself on
the VPS, so deploying an app costs no GitHub Actions minutes on any plan.

**The two hostname mechanisms.** The default `{slug}.apps.{domain}` is
published by Traefik's **docker provider**, from labels on the container.
A **custom domain** cannot be — a label cannot be added to a container that
is already running — so those routes are written to Traefik's **file
provider**, in `dynamic-deployments.yml`, alongside the platform's own
`platform.yml`. Two files, one directory; neither overwrites the other.


---

## 4. The data-plane flow — an application's data

An application's tables, users, permissions and files live in **Instant**, not
in the platform. The platform owns where the app runs; Instant owns what it
stores and who may see it. The split is decided in
`docs/CAPABILITY_OVERLAP.md`.

```
   POST /projects/:id/instant
          │
          ▼
   the api ──▶ Instant  POST /dash/apps
          │              { id, admin_token }  ← both generated by the platform
          │
          ├──▶ ProjectInstantApp row (admin token encrypted)
          └──▶ instant.app.provisioned event
```

| # | Step | Where |
|---|------|-------|
| 1 | The operator provisions an app for a project | `POST /api/v1/projects/:id/instant` |
| 2 | The platform generates the app id and the admin token | `instant-provisioning.service.ts` |
| 3 | It calls Instant's dash API with the superuser's personal access token | `instant-client.service.ts` |
| 4 | Instant creates the app; the platform keeps the admin token, encrypted | `ProjectInstantApp` row |
| 5 | A deployed application asks for its configuration — host and app id, never the admin token | `GET /projects/:id/instant/config` |

**Two credentials, not interchangeable.** The *personal access token*
(`per_…`) belongs to an Instant user; the *admin token* belongs to an app.
Which one each route accepts was **verified against the running Instant
server** — an app was created, read back and deleted, and the live app count
was back to where it started afterwards:

| Route | Credential it accepts | The other one |
|---|---|---|
| `POST /dash/apps` | the superuser's personal access token | — |
| `GET /dash/apps/:id` | the app's admin token **or** the superuser's | — |
| `DELETE /dash/apps/:id` | the superuser's personal access token | the app's admin token → **401** |

The delete is the trap. `DELETE /dash/apps/:id` resolves a *user* from the
bearer, and the app's admin token is not a user — so it has to be the
superuser's token, which is also the app's creator and so is allowed to
delete it.

Two more things the running server settled: a missing app comes back as
**400 with `record-not-found`**, not a 404 (so a status check alone cannot
tell "it is gone" from "you sent something malformed"); and the delete is a
**soft delete** — Instant marks the app for deletion rather than removing the
row.

A deployed application authenticates with its own user token, and Instant
evaluates its permission rules.

**Reactive data lives in Instant.** The platform's SSE live-query is gone —
`POST /databases/:id/live-query`, `GET /databases/:id/live-query/:table` and
the SDK's `watch()`. An application that wants reactive data subscribes to
**its Instant app**, using the app id from
`GET /projects/:id/instant/config`, and Instant evaluates the permission
rules before it sends anything. What remains on the managed Postgres is the
platform's own row-change event (`database.row.changed`), which the
dashboard's live feed and the SDK's `subscribe()` read.

**The credential is optional.** Without it the api reports Instant as
unavailable rather than failing to start, so a platform-only install is
unaffected.

---

## 5. The applications screen — what the operator installs

Not everything is installed up front. The platform is set up, and the
operator chooses what goes on top of it.

```
   the operator logs in
          │
          ▼
   /applications ──▶ GET /api/v1/applications
          │              the catalogue: what this platform can do, and
          │              which of it is installed
          │
          └──▶ POST /api/v1/applications/:id/install
                     │
                     ▼
              fidscript-addons enable <id> --no-recreate
                     │
                     ├──▶ records the selection, generates the secrets
                     └──▶ docker compose up -d --no-recreate
```

| # | Step | Where |
|---|------|-------|
| 1 | The operator signs in and lands on the Applications screen | `/applications` |
| 2 | The screen asks the API what is installed | `GET /api/v1/applications` |
| 3 | They press **Install** on an application that is not there | `POST /api/v1/applications/:id/install` |
| 4 | The API runs the installer's own command | `application-install.service.ts` |
| 5 | The screen watches the installer's output while it works | `GET /api/v1/applications/installs` |
| 6 | The application's DNS records are published, so its console resolves | `application-dns.service.ts` |
| 7 | When it is done, the application opens on its own subdomain | the catalogue's `url` |

**"Installed" is the installer's own record** — the add-on is listed in
`installer/docker/.env`'s `FIDScript_ADDONS`. It is the same record
`fidscript-addons` reads and writes, so the screen and the installer cannot
disagree about what is installed.

**The DNS records are published after the containers come up**, from the
installer's own `services.tsv`. The wizard creates them for the add-ons it
installs; one installed later needs them too, or its console is a hostname
that does not resolve.

**The install is the installer's command**, not a reimplementation of it, and
it runs with `--no-recreate`: the platform's api is one of the running
containers, and it is the process asking for the install. Recreating it would
kill the request in flight.

**The core is always there.** The deployment engine and the mail server are
part of the platform; the screen lists them with their consoles, so the
catalogue answers "what can this platform do for me" in one place.

---

## 6. The add-ons

All five merge cleanly with the core into one Compose project (verified with
`docker compose config`).

| id | What it adds | How it connects |
|----|--------------|-----------------|
| `observability` | Prometheus, Grafana, Loki, Promtail, cAdvisor, a Postgres exporter | joins `fidscript-deployment`; scrapes the api's `/metrics` |
| `instant` | The Instant BaaS — realtime Postgres, the Instant server, the web console, a Maven repository for the Kotlin SDK, object storage | its own `fidscript-instant` network, which the **api also joins** — it is what provisions an Instant app for a project |
| `whatsapp` | The WhatsApp Business platform — the Evolution API for channels, its own database and cache, object storage, the web console | joins `fidscript-whatsapp` (which traefik and the api are already on) |
| `package-manager` | A private npm registry (Verdaccio) and a Maven repository | joins `fidscript-deployment` |
| `app-runtime` | A local image registry for built application images | joins `fidscript-deployment` |

Manage them with `fidscript-addons list | enable | disable | status`.

---

## 7. The seams — defined but not finished

These are the places to work next. Each names the file to change.

| # | Seam | Where |
|---|------|-------|
| 1 | **The build no longer blocks the api, but there is still no concurrency cap.** `docker build` was `execSync`; it now runs asynchronously and streams its output, so the api stays responsive and the operator watches the build live. What is still missing is a cap on how many builds run at once — the queue is the next step, and the registry is what it is for. | `runner/shell-runner.service.ts`, `runner/build-runner.service.ts` |
| 2 | **The registry stores the image, but the deployment still runs the local one.** A built image is pushed to the registry after every build, so it survives a pruned Docker daemon and can be pulled by another node. Running the deployment FROM the registry is the next step — it needs the registry to be reachable and authenticated at deploy time, which is a new way for a deploy to fail on a single node. | `runner/image-registry.service.ts` |
| 3 | **No preview deployments.** Every deployment replaces the previous one at the same URL. The routing mechanism to support them now exists. | `runner/deployment-state.service.ts`, `schema.prisma` |
| 4 | **The WhatsApp management layer needs an image the operator supplies.** The repository's copy of that app is missing files, so it cannot be built here; it sits behind a `management` compose profile. | `installer/addons/whatsapp/` |
| 5 | **Instant's web console has no published image.** It is behind a `dashboard` compose profile for the same reason. | `installer/addons/instant/` |
| 6 | **The api has no metric producers.** Prometheus scrapes the api's `/metrics`, but nothing writes to the metric table — that is the observability engine's work, not the installer's. | `modules/monitoring/` |
| 7 | **The orphaned flat route trees.** `/email/*` (with templates, suppressions, webhooks, analytics) and `/platform/*` (a whole admin mail console) render correctly but no button leads to them — and they hold capabilities the project-scoped screens do not have. They need a product decision before they can be deleted. | `apps/dashboard/src/app/(app)/` |
| 8 | **The `?section=` system** — only Settings is reachable, and the URL degrades from `/projects/X/settings` to `/projects/X?section=settings`. | `apps/dashboard/src/app/(app)/projects/[projectId]/` |
| 9 | **No tests.** The suite is green because it is empty. | `apps/api`, `apps/dashboard` |
| 10 | **The applications screen installs, but it cannot uninstall.** An application is installed by the operator; there is no way to remove one from the screen, so an application that was installed by mistake stays until somebody runs `fidscript-addons disable` on the host. | `modules/applications/` |
| 11 | **The Instant app's console link is not per-app.** The catalogue links to the Instant console for the platform; Instant's console lists the apps, but the link does not deep-link to the one project. | `modules/applications/applications.catalog.ts` |

---

## 8. How to check a change

```bash
# the installer, from a clean copy
sudo bash installer/scripts/setup-wizard.sh          # the wizard
cd installer/docker && sudo docker compose up -d --build
docker compose ps                                   # every service healthy
curl -fsS https://<domain>/api/v1/health

# the whole merge, core + every add-on
cd installer/docker
docker compose -f docker-compose.yml \
  -f ../addons/observability/docker-compose.addon.yml \
  -f ../addons/instant/docker-compose.addon.yml \
  -f ../addons/whatsapp/docker-compose.addon.yml \
  -f ../addons/package-manager/docker-compose.addon.yml \
  -f ../addons/app-runtime/docker-compose.addon.yml config --quiet

# the platform's own checks
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```
