# Local Developer Guide — Connecting to fidscript-deploy

This guide is for engineers working on fidscript-deploy or any application deployed through it. It assumes you are **NOT** on the VPS host (72.61.89.110) and need to connect to the running stack from your laptop.

---

## Quick Reference

| Service | URL / Endpoint | Auth |
|---|---|---|
| **Dashboard UI** | https://deploy.fidscript.com | email + password or magic code |
| **Public API** | https://deploy.fidscript.com/api/v1 | Bearer token (JWT) |
| **Health check** | https://deploy.fidscript.com/api/v1/health | none |
| **Storage (MinIO)** | https://storage.deploy.fidscript.com | access key + secret key |
| **JMAP (email)** | https://jmap.deploy.fidscript.com | API token (issued by Stalwart) |
| **Evolution API (WhatsApp)** | http://72.61.89.110:8080 | `apikey: fidscript_evolution_key` |
| **Postgres (direct)** | `72.61.89.110:5432` | `fidscript / fidscriptpgpass2024` |
| **Redis (direct)** | `72.61.89.110:6379` | password: `fidscriptredispass2024` |
| **NATS (direct)** | `72.61.89.110:4222` | none |
| **MinIO S3 endpoint** | `72.61.89.110:9000` | `fidscriptminio` / `fidscriptminiosecretkey2024` |

All public URLs go through **Traefik** (HTTPS, Let's Encrypt DNS-01 via Cloudflare).

---

## 1. Stack Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          fidscript-deploy stack                          │
│                          running on 72.61.89.110                         │
└──────────────────────────────────────────────────────────────────────────┘

   ┌──────────────┐         ┌──────────────────┐
   │  Traefik v3  │◄────────┤  *.fidscript.com │
   │   (public)   │         │   DNS via CF     │
   └──────┬───────┘         └──────────────────┘
          │ routes
          ├─────► fidscript_dashboard   :3001  (Next.js standalone)
          ├─────► fidscript_api         :3001  (NestJS)
          ├─────► fidscript_minio       :9000  (S3-compatible storage)
          └─────► fidscript_stalwart    :8080  (email JMAP/SMTP)

   ┌────────────────────┐  (internal, accessible via 72.61.89.110)
   │  fidscript_postgres :5432  (multi-tenant, 16 schemas)
   │  fidscript_redis    :6379  (cache, BullMQ)
   │  fidscript_nats     :4222  (event bus, JetStream)
   │  fidscript_pgbouncer:6432  (pg pool, in front of postgres)
   └────────────────────┘

   ┌─────────────────────────────────────┐
   │  fidscript_whatsapp_api (Evolution) :8080  ← kept outside fidscript-deploy
   └─────────────────────────────────────┘
```

---

## 2. First-Time Setup (Dashboard Account)

The deploy system requires a user account before you can do anything. The seeded admin user is:

- **Email:** `admin@deploy.fidscript.com`
- **Initial password:** `admin123` *(you will be forced to change this on first login)*

Open https://deploy.fidscript.com and:

1. Click **Sign in**
2. Enter the credentials above
3. The system redirects you to `/force-change-password` — pick a new password (12+ chars, upper, lower, number)
4. You land on `/projects` — empty until you create a project

If you want to register a new account (not the admin):

1. Click **Create account** on the sign-in page
2. Choose **Password** or **Magic code**
3. Password flow: name + email + password (12+ chars)
4. Magic code flow: enter name + email, a 6-digit code is emailed to you (Stalwart SMTP)

---

## 3. Working on fidscript-deploy (the platform itself)

The platform code lives at `https://github.com/Mkid095/fidscript-deploy`. Clone it locally:

```bash
git clone https://github.com/Mkid095/fidscript-deploy.git
cd fidscript-deploy
pnpm install --frozen-lockfile
```

### Workflow

```
1. Pull latest    →  git pull origin main
2. Make changes   →  edit code in apps/api, apps/dashboard, packages/*
3. Build locally  →  pnpm build
4. Commit + push  →  git commit -am "..." && git push origin main
5. Deploy         →  the lead (Claude on the VPS) pulls, rebuilds images, restarts containers
```

### Build commands

```bash
# Full monorepo build (this is what happens in CI)
pnpm build

# API only — must build before `docker compose build api`
pnpm --filter @fidscript/api build

# Dashboard only — needs 4GB heap to avoid OOM during Next.js webpack compile
cd apps/dashboard && NODE_OPTIONS='--max-old-space-size=4096' npx next build
```

**Important:** the API Dockerfile and dashboard Dockerfile **COPY** the pre-built `dist/` and `.next/` from the monorepo root — they do NOT rebuild inside Docker. So:

```bash
# Always build locally first, THEN docker compose build
pnpm --filter @fidscript/api build
cd apps/dashboard && NODE_OPTIONS='--max-old-space-size=4096' npx next build && cd ../..
sudo docker compose build --no-cache api dashboard
sudo docker compose up -d api dashboard
```

The actual deploy commands on the VPS are at `/opt/fidscript/docker/`:

```bash
cd /opt/fidscript/docker
sudo docker compose build --no-cache api dashboard
sudo docker compose up -d api dashboard
```

### Where to find things

| What | Path |
|---|---|
| API code | `apps/api/src/` |
| Dashboard code | `apps/dashboard/src/app/` |
| Prisma schema | `apps/api/prisma/schema.prisma` |
| Migrations | `apps/api/prisma/migrations/` |
| API Dockerfile | `apps/api/Dockerfile` |
| Dashboard Dockerfile | `apps/dashboard/Dockerfile` |
| Docker compose | `installer/docker/docker-compose.yml` |
| Traefik routing | `installer/docker/traefik/dynamic.yml` |
| Entrypoint script | `installer/docker/api-entrypoint.sh` |
| Secrets (NOT in git) | `installer/docker/secrets/` |

---

## 4. Connecting to the API from outside the VPS

All HTTPS endpoints require a JWT obtained by logging in.

### Option A — from a browser

Open https://deploy.fidscript.com → sign in → DevTools → Application → Cookies → copy `auth-token`.

### Option B — from a script

```bash
# Get JWT
JWT=$(curl -s -X POST https://deploy.fidscript.com/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@deploy.fidscript.com","password":"YOUR_PASSWORD"}' \
  | jq -r .data.token)

# Use JWT
curl -s https://deploy.fidscript.com/api/v1/projects \
  -H "Authorization: Bearer $JWT" | jq .
```

### List of useful API endpoints

```
GET  /api/v1/health                  — service health (no auth)
POST /api/v1/auth/login              — email/password login
POST /api/v1/auth/magic-code         — request a magic code
POST /api/v1/auth/verify-magic-code  — exchange magic code for JWT
POST /api/v1/auth/register           — create account
GET  /api/v1/auth/me                 — current user
GET  /api/v1/projects                — list projects
POST /api/v1/projects                — create project
GET  /api/v1/tenants/me/onboarding   — onboarding state
PUT  /api/v1/tenants/me/onboarding   — update onboarding
GET  /api/v1/dashboard/system        — NOC system health
GET  /api/v1/dashboard/workers       — worker stats
GET  /api/v1/dashboard/scheduler/jobs — scheduler job list
GET  /api/v1/dashboard/llm           — LLM usage metrics
```

Full list: see `apps/api/src/api/routes/` or `https://deploy.fidscript.com/api/v1/health` (lists a few).

---

## 5. Database Access

The Postgres host is exposed on `72.61.89.110:5432` with **trust auth** (intentional, dev only).

```bash
# psql
PGPASSWORD=fidscriptpgpass2024 psql -h 72.61.89.110 -U fidscript -d fidscript

# Table listing
PGPASSWORD=fidscriptpgpass2024 psql -h 72.61.89.110 -U fidscript -d fidscript \
  -c "SELECT schemaname, COUNT(*) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') GROUP BY schemaname;"
```

### Schemas (multi-tenant)

```
ai          databases    email        functions    identity
infrastructure logging     marketplace  monitoring   platform
projects     public       queues       realtime     scheduler
storage      templates
```

When writing queries, **always qualify the schema**: `SELECT * FROM projects.projects` not `SELECT * FROM projects` (otherwise you'll get the wrong table or none).

### Prisma tips

```bash
# Regenerate client (after pulling changes to schema.prisma)
cd apps/api
npx prisma generate

# View current schema vs database
npx prisma migrate status

# Apply pending migrations (do NOT use against prod — talk to the lead first)
npx prisma migrate deploy
```

---

## 6. Redis Access

```bash
redis-cli -h 72.61.89.110 -a 'fidscriptredispass2024' --no-auth-warning
```

Used for: BullMQ job queues, socket.io adapter, cache, rate limiting.

---

## 7. NATS Access

```bash
# CLI (install: https://docs.nats.io/running-a-nats-service/introduction/installation)
nats sub -s nats://72.61.89.110:4222 '>'

# List streams
nats stream ls -s nats://72.61.89.110:4222
```

Streams: `EVENTS`, `AUDIT`, `EMAIL_SEND`, `DOMAIN_RECON`, `QUEUES`.

---

## 8. MinIO / Object Storage

S3-compatible. Two interfaces:

- **Public UI:** https://storage.deploy.fidscript.com (admin console)
- **API endpoint:** `http://72.61.89.110:9000`

```bash
# aws-cli config (use these exact creds for dev)
export AWS_ACCESS_KEY_ID=fidscriptminio
export AWS_SECRET_ACCESS_KEY=fidscriptminiosecretkey2024

# List buckets
aws --endpoint-url http://72.61.89.110:9000 s3 ls
```

Console login: same access key + secret key.

---

## 9. Evolution API (WhatsApp) — kept outside fidscript-deploy

The Evolution API is intentionally NOT migrated into fidscript-deploy yet. It runs as a standalone container (`fidscript_whatsapp_api`) on port 8080.

```bash
# Health check
curl -s http://72.61.89.110:8080 \
  -H 'apikey: fidscript_evolution_key' | jq .

# List WhatsApp instances
curl -s http://72.61.89.110:8080/instance/fetchInstances \
  -H 'apikey: fidscript_evolution_key' | jq .
```

API key: `fidscript_evolution_key`

Documentation: see `installer/docker/whatsapp-api.env.example` (no secrets) or Evolution API docs at https://doc.evolution-api.com/.

---

## 10. Common Tasks

### Tail logs from the VPS

```bash
# All services
sudo docker compose -f /opt/fidscript/docker/docker-compose.yml logs -f --tail=200

# Just the API
sudo docker logs -f fidscript_api | grep -v "RetentionPolicyService\|Queue worker"

# Just postgres
sudo docker logs -f fidscript_postgres | tail -50
```

### Restart a single service

```bash
cd /opt/fidscript/docker
sudo docker compose restart api       # or: dashboard, traefik, postgres, etc.
```

### Force rebuild after schema/migration changes

```bash
# On the VPS:
cd /opt/fidscript/docker

# Apply migration SQL manually (see "Wipe DB path" in LOCAL_DEPLOY_RUNBOOK.md)
PGPASSWORD=fidscriptpgpass2024 psql -h localhost -U fidscript -d fidscript \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Run each migration in order
for m in /home/ken/fidscript-deploy/apps/api/prisma/migrations/*/migration.sql; do
  PGPASSWORD=fidscriptpgpass2024 psql -h localhost -U fidscript -d fidscript -f "$m"
done

# Mark all migrations applied
PGPASSWORD=fidscriptpgpass2024 psql -h localhost -U fidscript -d fidscript <<EOF
CREATE TABLE IF NOT EXISTS _prisma_migrations (
  id VARCHAR(36) PRIMARY KEY, checksum VARCHAR(64) NOT NULL,
  finished_at TIMESTAMPTZ, migration_name VARCHAR(255) NOT NULL,
  logs TEXT, rolled_back_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_steps_count INTEGER NOT NULL DEFAULT 0
);
INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count) VALUES
  ('m1','a',now(),'20260618000000_init',1),
  ('m2','b',now(),'20260619000002_phase14_monitoring',1),
  ('m3','c',now(),'20260620070341_inc5_baas_oauth',1),
  ('m4','d',now(),'20260620120000_auth_must_change_password',1),
  ('m5','e',now(),'20260620130000_auth_magic_code',1),
  ('m6','f',now(),'20260620150000_installation_and_credentials',1),
  ('m7','g',now(),'20260621000000_auth_preferred_method',1),
  ('m8','h',now(),'20260622000000_installation_lifecycle_failed',1),
  ('m9','i',now(),'20260623184629_add_email_attachment_config',1),
  ('m10','j',now(),'20260625000001_add_github_connection',1),
  ('m11','k',now(),'20260625120000_add_project_webhook_fields',1),
  ('m12','l',now(),'20260628100000_add_storage_config',1);
EOF

# Restart API
sudo docker compose up -d --force-recreate api
```

### Watch API startup

```bash
sudo docker logs -f fidscript_api | grep -E "listen|threw|ERROR|Listening"
```

You should see:
```
[bootstrap] listen() returned - FIDScript API running on port 3001
```

If you see `listen() threw` instead, the API cannot reach the database. Most common cause: pgbouncer cached a stale postgres IP. Fix:

```bash
sudo docker compose restart pgbouncer
```

### Check health

```bash
curl -sk https://deploy.fidscript.com/api/v1/health | jq .
```

Healthy response:
```json
{
  "status": "healthy",
  "services": {
    "database": {"status": "up", "latencyMs": 9},
    "redis": {"status": "up", "latencyMs": 10},
    "nats": {"status": "up", "latencyMs": 10},
    "storage": {"status": "up", "latencyMs": 8}
  }
}
```

---

## 11. Deploying Apps via fidscript-deploy

Once logged in:

1. **Create a project** — `/projects/new` — pick a name and slug
2. **Provision infrastructure** — `Functions`, `Databases`, `Storage`, `Email`, `Realtime` are all per-project (each gets its own bucket, mailbox, NATS stream)
3. **Connect GitHub** — `/projects/[id]/settings` → GitHub Connection → OAuth flow
4. **Deploy** — push to GitHub, fidscript-deploy detects the push, builds the Docker image in a worker, and runs it on the host
5. **Assign a domain** — `/projects/[id]/domains` — Cloudflare DNS integration auto-points records

The deployment worker runs `docker build` / `docker run` against the host daemon (mounted socket).

---

## 12. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| API keeps restarting | Migration not applied / checksum mismatch | `DROP SCHEMA public CASCADE;` then re-apply migrations + insert `_prisma_migrations` rows |
| API "relation messages already exists" | 4 models (Email/Realtime/Queue/AI) all map to `messages` table — need different schemas | Init migration must be regenerated with `prisma migrate diff --from-empty` |
| API "pgbouncer cannot connect to server" | pgbouncer cached stale postgres IP | `sudo docker compose restart pgbouncer` |
| Dashboard loads but data missing | API unhealthy | Check `curl https://deploy.fidscript.com/api/v1/health` |
| 502 Bad Gateway on /api | Traefik can't reach api | `sudo docker exec fidscript_traefik wget -qO- http://fidscript_api:3001/api/v1/health` |
| API "ENCRYPTION_KEY must be 32 bytes" | Secret file has wrong value | Write 32 random bytes → base64 → `installer/docker/secrets/encryption_key` |
| Traefik "Unable to obtain ACME certificate" | Cloudflare token invalid | `installer/docker/secrets/cf_api_token` — needs `Zone:DNS:Edit` permission |
| Build OOMs (SIGKILL) | Next.js needs 4GB heap | Build with `NODE_OPTIONS='--max-old-space-size=4096'` |

---

## 13. Credentials Cheat Sheet (DEV ONLY — replace before any real release)

```
DASHBOARD ADMIN
  email:    admin@deploy.fidscript.com
  password: admin123 (forced change on first login)

POSTGRES (fidscript DB)
  host:     72.61.89.110:5432 (or localhost:5432 from VPS)
  user:     fidscript
  password: fidscriptpgpass2024
  database: fidscript

REDIS
  host:     72.61.89.110:6379
  password: fidscriptredispass2024

NATS
  host:     72.61.89.110:4222 (no auth)

MINIO / S3
  endpoint: http://72.61.89.110:9000 (or https://storage.deploy.fidscript.com)
  access:   fidscriptminio
  secret:   fidscriptminiosecretkey2024

EVOLUTION API (WhatsApp)
  url:   http://72.61.89.110:8080
  apikey: fidscript_evolution_key

STALWART (email)
  admin: admin / fidscriptstalwart2024
  SMTP host: mail.deploy.fidscript.com (port 587, STARTTLS)
  SMTP user: submission@deploy.fidscript.com
  SMTP pass: fidscriptsendpass2024

ENCRYPTION KEY (32 bytes, base64)
  2CNBgGzqWIfOV6f1QOcJ7QLTBJSc4DCCSN9DF0Uktlo=
```

> ⚠️ These credentials are for the **development** instance. Rotate all secrets before any production launch.

---

## 14. Who to contact

- **VPS / docker / secrets / TLS** — `@Kid095` on the VPS (the Claude session running here)
- **Code reviews / architecture** — open a PR on https://github.com/Mkid095/fidscript-deploy
- **WhatsApp / Evolution** — same; Evolution lives outside fidscript-deploy for now