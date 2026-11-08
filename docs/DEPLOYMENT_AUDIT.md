# The deployment platform — audit and architecture proposal

_Written 2026-11-08, per the universal-deployment-platform brief. **This is
Phase 1 (the audit) and Phase 2 (the architecture)**. Nothing here has been
implemented; per the brief, implementation waits for this document to be
reviewed._

---

## Part I — the audit

### How the audit was done

The deployment engine was followed end to end with a real application: a
repository pushed to a reachable git remote, deployed through the platform's
own API, watched through build and deploy, answered over HTTPS, attached to
a custom domain, and reconciled by the background workers. The Traefik
configuration, the ACME stores, the database rows, and the reconciliation
runs were inspected directly. The findings below are observations from that
walk, not code reading alone.

### 1. What works

| Area                              | What is there                                                                                                                                                                                                                                                    | Evidence                                                                                               |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Build pipeline**                | Workspace per build, git clone (depth 5), provider validation, docker build with generated Dockerfiles, image tagging, optional registry push, container run with resource limits (`--memory 512m --cpus 1`), internal-network-only, health check before success | a Node app deployed from git → healthy → answered 200 on its subdomain                                 |
| **Runtime**                       | Container per deployment, named `fidscript-{slug}-{id8}`, Traefik labels for `{slug}.apps.{domain}`, graceful teardown of the previous deployment's container and image, restart/stop/destroy, GC service                                                        | the container answered on its auto-subdomain with a valid certificate                                  |
| **Deployment history + rollback** | Every deployment is a row with its release, logs, image tag and duration; rollback redeploys a previous image; failed builds keep their log                                                                                                                      | history rows visible in the console                                                                    |
| **Build log**                     | Real-time polling viewer with follow, truncation, error marking, copy; failures land in the log                                                                                                                                                                  | verified live                                                                                          |
| **Traefik + ACME**                | Two resolvers configured and working: `letsencrypt-dns` (Cloudflare DNS-01, token wired via secret file) and `letsencrypt-http`; ACME stores actively growing                                                                                                    | `demo.fidscript.com` obtained a real certificate through DNS-01 within a minute of its route appearing |
| **Domain routing**                | Default host via container labels; custom domains via the file provider (`dynamic-deployments.yml`), written atomically, rewritten on attach/detach; per-domain resolver choice keyed on `dnsMode`                                                               | custom domain answered 200 with a valid cert                                                           |
| **Domain reconciliation**         | A queue + worker + scheduler already runs per-domain checks on a schedule: DNS fingerprint, propagation, HTTP routing, **a real HTTPS check with certificate validation**, real certificate-expiry reads, email records                                          | `[domain-recon] enqueued … reason=scheduled` in the logs                                               |
| **Detection (Node)**              | next / nuxt / astro / sveltekit / vite / node / static + monorepo enumeration + Dockerfile override                                                                                                                                                              | verified live with a monorepo                                                                          |
| **Databases**                     | Managed Postgres (provisioned per project), Instant BaaS env linked into every deployment                                                                                                                                                                        | env vars present in the build                                                                          |
| **Project/create flow**           | Shape, build config, env vars, required-env pre-flight, domain/subdomain attach at create                                                                                                                                                                        | verified                                                                                               |
| **Schema headroom**               | The `domains` table already carries `ssl_issued_at`, `ssl_expires_at`, `ssl_last_checked_at`, `ssl_last_error`, `ssl_method`, `is_primary`, `wildcard_*`, `redirect_mode` — the lifecycle the code is missing is already modelled                                | `\d projects.domains`                                                                                  |

### 2. What is broken

**B1 — the SSL state machine dead-ends, so domains never reach ACTIVE.**
This is the user-visible complaint: a domain whose DNS points at us is not
reported as secured. The mechanics:

- The one-shot verify (`POST …/verify`) requires, in order: ownership → DNS
  → HTTP routing → TLS. Run at the wrong moment — before a deployment
  exists, or before Traefik has finished issuing — it writes
  `dnsStatus: FAILED`.
- The background reconciliation **does** re-check everything, including a
  real HTTPS request with certificate validation, and **does** know how to
  promote a domain to `ACTIVE` — but only from `sslStatus === 'TLS_PENDING'`
  (`domain-reconciliation.service.ts`, `updateDomainState`).
- A domain sitting at `FAILED` / `ISSUING` — which is what the one-shot
  verify left behind — is never promoted, no matter how long HTTPS works.
  Verified live: `demo.fidscript.com` serves a valid certificate and the
  database still says `dnsStatus FAILED, sslStatus ISSUING, health_status
PENDING` after a day of scheduled reconciliations.
- Nobody pre-warms the certificate: between the route existing and the
  first human HTTPS request, Traefik does not even start the ACME dance.
  The platform could make that request itself and cut minutes to seconds.

**B2 — the SSL service is a stub that lies.**
`domain-ssl.service.ts` (`renewSsl`, `reissueSsl`) sets `sslStatus:
'ACTIVE'` with a **fabricated 90-day expiry** without contacting any ACME
server or reading Traefik's store. Two console-visible endpoints report
success that was never verified — the exact thing the brief forbids. The
renewal monitoring (expiry watch, renewal-failure detection) does not exist;
certificate expiry is only _read_ by the reconciliation worker and used in
health scoring.

**B3 — the one-shot verify's HTTP-routing step is misleading.** It fails a
domain because _nothing is deployed yet_ — a true fact with the wrong
meaning. The card then reads "failed" for "the records are right; nothing
answers yet". The state machine conflates "DNS verified, awaiting first
deploy" with "broken".

### 3. What is partially implemented

**P1 — universal application support is Node-only.**
`NodeBuildpackProvider` covers the Node ecosystem (next, nuxt, astro,
sveltekit, vite, node, static) plus an explicit-Dockerfile path. Detection
of Python (requirements.txt / pyproject.toml), PHP (composer.json), Ruby
(Gemfile), Go (go.mod), Java (pom.xml / build.gradle), .NET (\*.csproj), Rust
(Cargo.toml) does not exist; a Django repository fails detection with
"Could not detect a supported framework". The Dockerfile provider works and
is the escape hatch, but the brief's universal ask needs native buildpacks.

**P2 — Docker Compose / multi-container.** Nothing. One container per
deployment; `compose.yaml` is not detected, parsed, or run.

**P3 — domain attach UX.** The create-deployment API accepts `subdomain`
and `domainId`, and a domain can be attached after the fact, but the
**wizard offers only a free-text subdomain** — the project's existing
domains (already added, records already written) are not offered in the
deployment form. The user's ask: the domains that exist should be one pick
away.

**P4 — static assets for Python-style apps.** The Node buildpack handles
`next build` output and static dirs; there is no shared "publish this
directory" service beyond the static Dockerfile.

**P5 — environment variables.** Project env vars exist (encrypted,
required-vars pre-flight, deploy-time override). There are no environments
(dev/staging/production), no per-environment values, no rotation workflow,
and updating a variable does not trigger a redeploy.

**P6 — preview/staging.** Not present. The shape (project → many
deployments, one live) supports it; nothing names it.

### 4. What is missing entirely

- **Certificate lifecycle management**: expiry watch, renewal-failure
  alerts, re-issuance on failure, the ssl_last_checked heartbeat written
  from real checks (columns exist, never written on a schedule).
- **Cloudflare proxy (orange-cloud) support**: proxied domains break
  HTTP-01 (Cloudflare intercepts); the platform should detect proxying
  (CNAME to `*.cloudflare.com` / CF headers), prefer DNS-01 for them, and
  document Full (strict) with our origin cert. DNS-01 already works via the
  project's own Cloudflare token — the pieces exist, the guidance does not.
- **Wildcard certificates** for `{slug}.apps.{domain}` (today each
  subdomain gets an individual cert through the label route's resolver —
  workable, but one wildcard would remove per-subdomain issuance entirely).
- **Database provisioning beyond Postgres** (Redis, MySQL, MongoDB) and
  attach-to-deployment flows (`DATABASE_URL` injection exists for Postgres
  via the managed database service; the rest do not exist).
- **Build cancellation** (a QUEUED/BUILDING deployment cannot be cancelled,
  only a running container stopped).
- **Resource configuration per deployment** (512m/1cpu is hardcoded in
  `docker-build-args.service.ts`).
- **Deploy-from-upload** (archive source exists in the code path; no console
  surface).
- **Documentation** for any of it.

### 5. Architectural limitations

- **One container per deployment** — by design and correct for the brief's
  "one production target per project". Multi-service/multi-container needs a
  compose-shaped provider, which does not exist.
- **The build runs inside the API container** as root, with the Docker
  socket mounted. It works on this single-tenant box; it is the platform's
  biggest security debt (the brief's §14). A build-worker separation is the
  fix and is noted in the plan.
- **The deployment engine writes Traefik's file config from the API
  container** (mounted directory) — sound for one node; the multi-node
  future wants an orchestration layer, noted as out of scope for now.
- **No build caching** — every build reinstalls dependencies. On this box
  (2 cores, tight memory) builds are short but this is the first
  performance lever.

### 6. Security weaknesses (honest list)

1. Builds run as root inside the API container, which holds the Docker
   socket (root-equivalent on the host). Acceptable single-tenant; the
   multi-tenant answer is an isolated build worker.
2. Deployed containers are isolated (internal network, no published ports,
   resource caps) but share one Docker network — any deployed app can reach
   every other deployed app and the platform's internal services by name.
3. The JWT blocklist, webhook signature checks and domain-ownership checks
   exist; audit logs exist. Rate limiting exists at the edge for the API
   but not per-deployment ingress.
4. Secrets are encrypted at rest; build logs are scrubbed (recent work);
   env vars are masked in the console.

### 7. Required database changes

**None blocking Phase 3/4.** The schema already models the SSL lifecycle
(`ssl_issued_at`, `ssl_expires_at`, `ssl_last_checked_at`, `ssl_last_error`),
primary domains, wildcards and redirect modes. Phase 5 (databases/services)
would add a `deployment_services` join table (provisioned Redis/MySQL per
deployment) — designed, not yet needed.

### 8. Required UI work

- Domain cards must render the truthful state machine
  (§ Part III, D1): awaiting DNS → DNS verified → SSL provisioning → SSL
  active (with real expiry) → active — with "nothing deployed yet" distinct
  from "failed".
- The deployment wizard needs the project's existing domains as a picker
  (P3) alongside the free-text subdomain.
- The deployment configuration page needs progressive disclosure: the
  simple path (source → detect → deploy) above an "Advanced" drawer
  (build/start commands, Dockerfile path, port, resources, build target).
- The SSL renewal/reissue endpoints must either become real or be removed
  until they are (B2).

---

## Part II — the architecture proposal

### A1. The domain/SSL lifecycle (Phase 4 — the first implementation)

**Principle: Traefik owns issuance; the platform owns truth.**

1. **Trigger.** When a domain's route exists (attach, or deploy success) and
   its DNS resolves to the platform, the reconciliation enqueues it
   immediately (no waiting for the schedule).
2. **Pre-warm.** Before checking, the platform makes one HTTPS request to
   the domain itself (`https://{domain}/` with a short timeout,
   self-signed-tolerant), which starts Traefik's ACME dance the moment the
   route is live. This turns "minutes until a human visits" into seconds.
3. **Verify.** The existing real checks run: DNS → HTTPS (cert-validated)
   → expiry read from the peer certificate.
4. **Promote from any state.** `updateDomainState` promotes to
   `dnsStatus ACTIVE, sslStatus ACTIVE` when the HTTPS check passes — from
   `TLS_PENDING`, `ISSUING`, **and `FAILED`**. The honest checks decide; the
   prior label is history, not a gate.
5. **Record truth.** `sslIssuedAt = now`, `sslExpiresAt =` the peer
   certificate's `valid_to`, `sslLastCheckedAt = now` on every run,
   `sslLastError` on failure.
6. **Renewal watch.** The scheduled reconciliation already reads expiry
   days; it gains: `sslExpiresAt < 30 days` → log + event (Traefik renews
   at 30 days itself; the platform's job is to notice when it did not);
   `sslExpiresAt < 7 days` or an expired-but-should-be-valid cert →
   incident + console alert.
7. **The stub endpoints** (`renewSsl`/`reissueSsl`) are rewritten to do
   exactly what the reconciliation does (pre-warm + verify + record) or are
   removed. No fabricated statuses anywhere.
8. **Cloudflare proxy support.** The reconciliation detects proxying (DNS
   answer containing Cloudflare IPs, or a `cf-ray` response header) and
   stores it on the domain (`dns_mode` already distinguishes
   `cloudflare_auto`). For proxied domains: DNS-01 (already the chosen
   resolver for `cloudflare_auto`), origin cert still issued, the console
   documents Full (strict). For DNS-only: either resolver works; the
   instructions on the domain card say which mode the record is in and what
   to pick.

**What this does not change**: Traefik stays the only ACME client. The
platform never requests certificates itself.

### A2. One production deployment per project (Phase 3, with the engine)

The existing semantics are already close: a new deployment is `BLOCKED`
while another builds, and on success the previous container is stopped and
removed. The changes are about **truth and clarity**, not machinery:

- The project's **live deployment** is explicit: `projectSettings.
activeDeploymentId` (exists) becomes the console's source of truth — the
  deployments list marks it "live"; everything else is history.
- Creating a deployment while one is live is **encouraged, not blocked**:
  the new build runs, and the switchover happens at the health-check gate —
  the old container stops only after the new one is healthy. (Today this is
  exactly what happens; the console says "BLOCKED" for queued builds,
  which reads like an error — renamed to "queued behind the live build".)
- Deleting a live deployment detaches its domains and leaves the project
  deployable; the wizard says "this replaces the live deployment when it
  succeeds" before the button.

### A3. Universal buildpacks (Phase 3)

**Principle: one provider interface, many builders.**

The existing `BuildProvider` interface (validate / build with an onLog
stream) is the right seam. The work is new builders, not a new engine:

| Builder                                 | Detects                                                                            | Builds                                               | Runs                                                          |
| --------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| **NodeBuildpack** (exists)              | package.json + frameworks                                                          | install + build (workspaces aware)                   | node in a generated Dockerfile                                |
| **PythonBuildpack**                     | requirements.txt, pyproject.toml, manage.py (Django), app.py/Flask/FastAPI markers | pip install (-r / project), collectstatic for Django | gunicorn/uvicorn in a generated Dockerfile (python:3.12-slim) |
| **StaticBuildpack** (exists, split out) | index.html / dist / build dirs                                                     | none                                                 | nginx serving the directory                                   |
| **DockerfileBuildpack** (exists)        | Dockerfile                                                                         | docker build                                         | as written                                                    |
| **ComposeBuildpack** (later phase)      | compose.yaml                                                                       | docker compose up                                    | services from the file                                        |

Each generated Dockerfile is inspectable in the wizard ("this is what we
will build"). PHP/Go/Ruby/Java follow the same pattern later; the
Dockerfile path covers them today, and detection says so honestly ("no
buildpack for Go yet — bring a Dockerfile and it runs").

### A4. Databases and services (Phase 5 — designed, deferred)

A `deployment_services` table (project, kind: postgres|redis|mysql, credentials
encrypted, internal hostname) + provisioning via the existing Docker
tooling, internal-network-only, `DATABASE_URL`-style injection at deploy
time. Designed now; built after the engine and SSL phases.

### A5. Security (continuous, with Phase 3)

The near-term, proportionate steps: builds move out of the API container
into a dedicated build container (same images, no Docker socket, dockered
via the API's privileged worker only); per-deployment Docker networks (one
network per project, Traefik attached to all) so deployed apps cannot see
each other; resource limits become per-deployment settings.

### A6. What is deliberately out of scope for now

Multi-node orchestration, artifact registries beyond the optional local
registry, preview environments, and PHP/Go/Ruby/Java buildpacks (Dockerfile
covers them; detection says so). Each is named so it is a decision, not an
omission.

---

## Part III — the implementation order, on review

| Phase                         | Deliverable                                                                                                                                               | The acceptance test                                                                                                                                                               |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **4 first (the user's pain)** | SSL lifecycle: pre-warm, promote-from-any-state, real expiry recorded, renewal watch, stub endpoints made real or removed, proxy detection + guidance     | `demo.fidscript.com` reaches `dnsStatus ACTIVE, sslStatus ACTIVE` with a real expiry without a human pressing anything; a fresh domain reaches ACTIVE in under a minute of attach |
| **3 (the engine)**            | Deployment truth (live marking, replacement language, queued-behind naming), Python + static builders split out, build cancellation, per-deploy resources | a Django repo deploys and serves; a second deployment replaces the live one with zero downtime                                                                                    |
| **6 (the console)**           | Domain cards with the full state machine; the wizard's domain picker; advanced-drawer on the deploy form                                                  | every state in §11 of the brief is visible somewhere in the console, truthfully                                                                                                   |
| **5 (services)**              | `deployment_services` + Redis/MySQL provisioning, `DATABASE_URL` injection                                                                                | an app with a Redis dependency connects over the internal network                                                                                                                 |
| **7 (docs)**                  | Framework guides + the domain/SSL page, matching what is built                                                                                            | every documented flow is the flow that exists                                                                                                                                     |

---

---

## Part IV — implementation status

**Phase 4 (the domain/SSL lifecycle) — IMPLEMENTED and verified live** on
the operator's go-ahead. What landed:

- **Promote from any state**: the reconciler's `updateDomainState` promotes
  a domain to `ACTIVE`/`ACTIVE` from `TLS_PENDING`, `ISSUING`, `FAILED` —
  and from `ACTIVE` with a stale certificate status — whenever the real
  HTTPS check (certificate-validated) passes. `demo.fidscript.com`, stuck
  at `FAILED`/`ISSUING` for a day, reached `ACTIVE`/`ACTIVE` with the
  certificate's true expiry the first run after the fix.
- **Pre-warm**: a domain pointed at a healthy deployment gets one
  self-signed-tolerant request at the start of each reconciliation — the
  ACME dance starts the moment the route exists.
- **Real expiry recorded**: the peer certificate's `valid_to` is read
  (from the TLS socket, where it actually lives) and written to
  `sslExpiresAt` — `demo.fidscript.com` reads 2027-02-06, the truth.
- **Renewal watch**: a certificate crossing 30 days emits
  `domains.ssl_renewal_due` once — on the crossing, not every run.
- **Proxy detection**: the reconciliation detects Cloudflare proxying
  (`cf-ray` / `server` headers) and persists it in the domain's
  capabilities; the card shows "Cloudflare proxied" or "DNS only".
- **Deploy success → verification**: a successful deployment enqueues its
  attached domains for immediate verification (no schedule wait), and the
  project's domain attachments **follow the live deployment** — a replaced
  deployment takes its names with the new container.
- **The verify is honest**: a routing failure with nothing deployed is
  "waiting for a deployment" (`VALIDATING`), not "failed"; the console card
  says which.
- **The stub endpoints are gone**: `renewSsl`/`reissueSsl` now pre-warm and
  enqueue the real verification; no fabricated `ACTIVE` anywhere.
- **The reconciliation worker actually worked now for the first time**: its
  JetStream consumer filtered on the bare subject while jobs publish to
  `subject.<id>` — it had never processed a job. The consumer self-heals
  (missing → created) and a wrong filter is replaced on boot.

**Phase 3 partials landed with it**: the wizard offers the project's
existing domains when deploying (`domainId`); the deployments list marks
the **live** deployment and reads `BLOCKED` as "queued behind the live
build"; the container health gate accepts the root path as a fallback (most
applications have never heard of `/health`); and the **Python builder**
detects Django/Flask/FastAPI/plain-Python repositories (requirements.txt,
pyproject.toml, Pipfile) and builds them on `python:3.12-slim` with
gunicorn/uvicorn bound to the platform's port — verified live with a
FastAPI application deployed from git, healthy, and answering on the
project's subdomain, replacing the previous deployment as the one live
target.

_Still open from the plan: compose/multi-container, the database services
phase, staging/preview, build-worker isolation, and the docs phase._
