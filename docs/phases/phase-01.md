# Phase 01: Installer & Infrastructure Stack

> **Status:** Planned  |  **Track:** Foundation  |  **Depends on:** Phase 00

## Objective

A single `install.sh` on a fresh VPS brings up the **entire stack** — Traefik, Postgres, Redis, NATS, MinIO, Stalwart, the API, and the dashboard — with a migrated database, a seeded admin user, and a reachable `https://deploy.fidscript.com`. This is the phase that turns "a buildable codebase" into "a running platform."

## Current State

**The installer does not deploy the app, and the stack cannot run end-to-end.** See `docs/AUDIT.md` §A (blockers #6, #7, #8). Specific defects:

- `install.sh` copies only `installer/`, never builds or starts the `api`/`dashboard` containers; prints "Installation Complete" before any container starts.
- `mkdir ".../{postgres,redis,nats,minio,stalwart}"` uses unexpanded braces inside a quoted string → one literal directory is created.
- `download_files()` only works if the repo already exists on the VPS; `INSTALLER_URL` is dead → dies on a truly fresh VPS.
- Compose `api`/`dashboard` `build:` contexts point at non-existent Dockerfiles (fixed structurally in Phase 00; here we point them correctly).
- Compose uses `$(cat /run/secrets/...)` inside `environment:` — Docker Compose does not perform shell substitution there → `DATABASE_URL` is a literal broken string → the API never connects to Postgres.
- **No Prisma migrations directory** and `db:seed` points at a non-existent `prisma/seed.ts` → the database never receives a schema or an admin user.
- `setup-wizard.sh` collects `ADMIN_EMAIL`/`ADMIN_PASSWORD` but nothing consumes them (no seed).
- Traefik `dynamic.yml` uses Go-template syntax (`{{ .Domain }}`) which the **file provider does not evaluate** → routing rules never match.
- `configure-firewall.sh` does `iptables -F`/`-X` then `FORWARD DROP` → **breaks Docker networking** and can lock out non-UFW hosts.

## Dependencies

- **Phase 00** (the `apps/api` and `apps/dashboard` Dockerfiles must exist for compose to build them).

## Deliverables

- [ ] **First Prisma migration baseline.** Run `prisma migrate dev` against a real Postgres to generate `apps/api/prisma/migrations/`; commit it. Schema changes in later phases become new migrations (never `db push` in production).
- [ ] **`prisma/seed.ts`** that creates the admin user from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (bcrypt-hashed) and any baseline data. Wire `prisma db seed`.
- [ ] **Compose fixes:**
  - Point `api`/`dashboard` build contexts at `apps/api` / `apps/dashboard`.
  - Replace `$(cat /run/secrets/...)` with the **`_FILE` env convention** read in code (e.g. `DATABASE_URL_FILE`, `JWT_SECRET_FILE`), or an entrypoint that materializes secrets into the real env var before `node`.
  - Correct host env wiring: `DB_HOST=postgres`, `REDIS_URL=redis://redis:6379`, `NATS_URL=nats://nats:4222`, `MINIO_ENDPOINT=minio:9000`, etc.
- [ ] **`install.sh` actually deploys:**
  - Fix the brace-expansion bug (unquoted or array).
  - `download_files()` fetches from a release artifact (or clearly document the local-copy dev path).
  - After `setup-wizard.sh`, run `docker compose up -d --build`, then `prisma migrate deploy`, then seed — with retry-on-unhealthy and clear errors.
  - Idempotent: re-running is safe.
- [ ] **Traefik:** remove Go-template syntax from `dynamic.yml` (use real hostnames or Docker labels); fix `traefik.yml` so `email:` / `domain` resolve (env via command-line flags or a templated entrypoint, not static-file substitution). Provide a working default route for the dashboard and `/api`.
- [ ] **Firewall:** remove the dangerous `iptables -F/-X`; prefer UFW; only open 22/80/443 at this phase (mail ports come with Phase 09). Never flush rules that break Docker.
- [ ] **Health verification:** `health-check.sh` confirms every service is healthy (Postgres, Redis, NATS, MinIO, API `/api/v1/health`, dashboard HTTP 200).
- [ ] **Bootstrap ordering:** an init container/entrypoint waits for Postgres readiness, runs migrations, then seeds — before the API accepts traffic.
- [ ] **`docs/install.md`** + **`docs/requirements.md`** (VPS minimums: OS, RAM, Docker version, ports).

## Technical Design

- **Secrets:** use Docker secrets + `_FILE` env vars. The app reads `*_FILE` (path) → reads the file → sets the real value at startup, before anything else. Never inline secrets in compose `environment:`.
- **Migrate-on-start:** the API container's entrypoint runs `prisma migrate deploy` (idempotent, safe for prod) then `node dist/main.js`. A separate one-shot `bootstrap` service is also acceptable if it correctly waits for the DB.
- **Traefik routing:** dashboard on `Host(deploy.fidscript.com)`; API on `PathPrefix(`/api`)`. TLS via Traefik's ACME/Let's Encrypt resolver (real cert issuance is exercised in Phase 07; here we at least configure the resolver and a self-signed/default fallback so HTTPS responds).
- **Stalwart:** started as part of the stack but **mail functionality is Phase 09**. Phase 01 only ensures the Stalwart container starts without crashing (mount certs or disable TLS for SMTP until Phase 09 configures DKIM/DNS).

## Integration Points

- **Events:** the stack provides `NATS_URL`, which Phase 02's bus connects to.
- **Service registry:** infra services are the first entries the registry (Phase 02) will discover.
- **SDK / MCP / CLI / Dashboard:** the API and dashboard become reachable URLs here; later surface phases target `https://deploy.fidscript.com/api/v1`.

## Verification (VPS)

```bash
# On a fresh Ubuntu 22.04 VPS:
sudo bash installer/scripts/install.sh
docker compose -f installer/docker/docker-compose.yml ps        # all services: healthy
curl -fsS https://deploy.fidscript.com/api/v1/health            # 200 OK
curl -fsS https://deploy.fidscript.com/                          # dashboard HTML 200
# DB is migrated + seeded:
docker compose exec postgres psql -U fidscript -d fidscript -c '\dt'   # tables exist
docker compose exec postgres psql ... -c "select email from identity.users;"  # admin row present
```

**Exit criterion:** `install.sh` on a fresh VPS yields all containers healthy, a migrated DB, a seeded admin, a reachable dashboard, and a healthy API. (Login itself is verified in Phase 03; here we verify the admin row exists and the API responds.)

## Out of Scope / Future

- Real TLS issuance + custom-domain routing (Phase 07).
- Real mail send/receive (Phase 09).
- Real deployments (Phase 06).
- Multi-node / HA (future).

## Risks

- Secrets-handling regressions (a misconfigured `_FILE` read silently uses a default).
- Traefik ACME rate limits during repeated testing — use the staging ACME endpoint for dev.
- Stalwart crashing on missing certs can mark the stack unhealthy; gate it behind Phase 09 readiness.

## Next Phase

[Phase 02: Event Bus & Service Registry](./phase-02.md)
