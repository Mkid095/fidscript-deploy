# Migration Strategy: FIDScript Deploy vs. Existing Applications

> **Status:** Policy  |  **Created:** 2026-06-17

---

## Guiding Principle

FIDScript Deploy is under active development. Existing production-ish applications on the VPS (Soostori Stack) must remain untouched until FIDScript Deploy reaches sufficient stability (Phase 15+) and a formal migration process is executed.

**The two stacks coexist. They do not interfere.**

---

## Existing Application Stack (Soostori)

These containers are **active systems with data** — not test infrastructure:

```
soostori-api
soostori-postgres
soostori-redis
soostori-realtime
soostori-workers
soostori-web
```

### Forbidden Actions Against Soostori Stack

- ❌ Stop existing containers
- ❌ Migrate databases
- ❌ Replace existing Redis
- ❌ Move email services
- ❌ Run destructive migrations against their databases
- ❌ Apply FIDScript migrations to Soostori databases

---

## FIDScript Deploy Stack (New Platform)

Built **beside** Soostori, not replacing it. Separate network, volumes, and databases.

```
FIDScript Core Stack
├── fidscript-traefik     (ports 80/443, dedicated fidscript network)
├── fidscript-postgres    (dedicated volume: fidscript_postgres)
├── fidscript-redis       (dedicated volume: fidscript_redis)
├── fidscript-nats        (JetStream event bus)
├── fidscript-minio       (S3-compatible object storage)
├── fidscript-stalwart    (email server)
├── fidscript-api         (port 3001)
├── fidscript-dashboard   (port 3000)
└── fidscript-bootstrap   (one-shot init job)
```

Network: `fidscript` (172.20.0.0/16) — isolated from Soostori's network.
Volumes: `fidscript_*` prefixed — no collision with Soostori volumes.

### Development vs. Production

- **Development** (local / dev VPS): `docker compose -f installer/docker/docker-compose.yml -p fidscript up -d`
- **Production** (VPS): Same compose file, secrets populated via `_FILE` env vars

---

## Migration Sequence (When to Move Applications)

FIDScript Deploy is ready to host existing applications when:

1. Phase 15+ (Logging + Monitoring platforms complete)
2. The FIDScript stack has been stable on the VPS for ≥1 week
3. A database backup has been taken of the application being migrated

### Per-Application Migration Steps

#### Step 1 — Backup

```bash
# Database
pg_dump -U soostori soostori > soostori_backup_$(date +%Y%m%d).sql

# File storage (uploads, assets)
tar -czf soostori_storage_backup_$(date +%Y%m%d).tar.gz /path/to/uploads/

# Environment variables
printenv | grep -E "^(DATABASE_URL|REDIS_URL|SMTP_)" > soostori_env_backup_$(date +%Y%m%d).sh
```

#### Step 2 — Create Project Inside FIDScript

```bash
# Register/login
TOKEN=$(curl -s -X POST https://deploy.fidscript.com/api/v1/auth/login \
  -d '{"email":"admin@soostori.com","password":"..."}' | jq -r .accessToken)

# Create project
curl -X POST https://deploy.fidscript.com/api/v1/projects \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"soostori","type":"backend"}'
```

#### Step 3 — Provision FIDScript Services

Provision within the new project:
- Database (Phase 08)
- Storage (Phase 05)
- Email (Phase 09)
- Realtime (Phase 13)
- Queues (Phase 11)

#### Step 4 — Restore Data

```bash
# Restore database
psql $FIDSCRIPT_DB_URL < soostori_backup_YYYYMMDD.sql

# Restore storage
tar -xzf soostori_storage_backup_YEARMMDD.tar.gz -C $FIDSCRIPT_STORAGE_PATH/
```

#### Step 5 — Update Application Configuration

Replace Soostori's environment references:

```env
# Before (Soostori native)
DATABASE_URL=postgresql://soostori:password@soostori-postgres:5432/soostori
REDIS_URL=redis://:password@soostori-redis:6379
SMTP_HOST=soostori-smtp

# After (FIDScript managed)
FIDSCRIPT_DB_URL=postgresql://fidscript:password@fidscript-postgres:5432/fidscript
FIDSCRIPT_STORAGE_URL=https://fidscript-minio:9000
FIDSCRIPT_EMAIL_URL=fidscript-stalwart:587
```

#### Step 6 — Deploy Through FIDScript

```bash
# Point the application at FIDScript Deploy
fidscript deploy --project soostori --api-url https://deploy.fidscript.com
```

#### Step 7 — Retire Old Containers

Only after the application is fully running on FIDScript and serving traffic:

```bash
docker stop soostori-api soostori-postgres soostori-redis soostori-workers soostori-web
docker volume rm soostori_pgdata soostori_redisdata  # (if volumes confirmed empty)
```

---

## Current Prisma Migration Policy

For FIDScript development:

- ✅ **Generate** migration files (`prisma migrate dev --create-only`)
- ✅ **Commit** migration SQL files to the repo
- ✅ **Apply** migrations via `install.sh` when FIDScript stack is first deployed
- ❌ **Never apply** FIDScript migrations to existing Soostori databases
- ❌ **Never run** `prisma migrate deploy` against Soostori's Postgres

The `install.sh` script for FIDScript must run against the **FIDScript-owned** Postgres only.

---

## Why This Matters

- The Soostori Postgres uses role `soostori` — FIDScript uses `fidscript`
- Soostori's DB is named `soostori` — FIDScript's is `fidscript`
- Confusing them would corrupt or destroy live data
- The safest approach: **they are completely separate deployments**

---

*Last updated: 2026-06-17*