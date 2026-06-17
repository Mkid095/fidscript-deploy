# Phase 01: Installer & Infrastructure Stack

> **Status:** Planned  |  **Track:** Foundation  |  **Depends on:** Phase 00

## Objective

A single `install.sh` on a fresh VPS brings up the **entire stack** — Traefik, Postgres, Redis, NATS, MinIO, Stalwart, the API, and the dashboard — with a migrated database, a seeded admin user, and a reachable `https://deploy.fidscript.com`. This is the phase that turns "a buildable codebase" into "a running platform."

## Current State

**FIXED (2026-06-17) — all defects resolved.** The stack now type-checks, builds, and containerizes. Remaining: VPS prove-it (run `install.sh` on a fresh VPS and verify all containers healthy, DB migrated + seeded, API and dashboard reachable).

Previously broken — all fixed:
- `install.sh` now runs `docker compose up -d --build`, waits for healthy services, runs `prisma migrate deploy` + `pnpm db:seed`, and reloads Traefik.
- `mkdir ".../{postgres,redis}..."` brace expansion bug fixed (separate mkdir args).
- `download_files()` falls back to `/opt/fidscript-deploy` or `/root/fidscript-deploy` — clearly documented dev/prod paths.
- Compose `api`/`dashboard` `build:` contexts now point at `../..` (monorepo root) with the correct Dockerfiles.
- `$(cat /run/secrets/...)` replaced with `env_file: ./secrets/api.env` + `${VAR}` substitution; `api-entrypoint.sh` reads `*_FILE` vars and materializes them before `node`.
- **Prisma migrations created** (`20260617015709_init`); `prisma/seed.ts` creates admin user from `ADMIN_EMAIL`/`ADMIN_PASSWORD`; `prisma.seed` wired in `package.json`.
- `setup-wizard.sh` now generates `secrets/api.env`, `traefik/traefik.yml`, and `traefik/dynamic.yml` with the user's real domain.
- Go-template `{{ .Domain }}` removed from `dynamic.yml` — generated with real domain at setup time.
- `configure-firewall.sh` no longer flushes iptables chains (`-F`/`-X` removed); uses UFW or safe iptables fallback.

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

## Files you'll touch (precision map)

- `installer/scripts/install.sh` — today copies `installer/` only and prints "complete" without building/starting app containers; `mkdir ".../{postgres,redis}"` brace bug.
- `installer/docker/docker-compose.yml` — `$(cat /run/secrets/...)` inside `environment:` isn't substituted; `api`/`dashboard` `build:` must point at `apps/api` / `apps/dashboard`; fix host env wiring (`DB_HOST=postgres`, `NATS_URL=...`, `MINIO_ENDPOINT=...`).
- `installer/traefik/traefik.yml` + `installer/docker/dynamic.yml` — Go-template `{{ .Domain }}` the file provider ignores.
- `installer/scripts/configure-firewall.sh` — `iptables -F/-X` + `FORWARD DROP` breaks Docker networking.
- `installer/scripts/setup-wizard.sh`, `installer/scripts/health-check.sh` — collect ADMIN creds; health verification.
- Create: `apps/api/prisma/migrations/` (first baseline), `apps/api/prisma/seed.ts` (admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD`).
- Reference: compose builds/runs the `fidscript-api` + `fidscript-dashboard` images produced in Phase 00.

## Next Phase

[Phase 02: Event Bus & Service Registry](./phase-02.md)
