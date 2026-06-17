# Database Service

> **Phase:** 08  |  **Status:** Verified  |  **Owner:** Phase 08

## Overview

Managed PostgreSQL databases provisioned on the platform's shared Postgres cluster. Each project can own multiple databases across different environments (production, staging, preview, development). The service handles provisioning, credential management, backups, and monitoring.

---

## Architecture

```
One VPS
└── PostgreSQL Cluster (shared)
    ├── db_proj_<id>_<name>   (logical DB per environment)
    └── proj_<id>_<name>       (dedicated role per DB)

One PgBouncer (transaction mode)
└── Per-database pooled connections

MinIO
└── Backup storage: backups-<dbname>/db-backups/<db>/<timestamp>.dump.gz
```

**Multi-project**: one Postgres cluster, many projects, many databases. Isolation enforced via per-database roles (`NOINHERIT NOLOGIN`), `REVOKE` on `public` schema, and per-role `CONNECTION LIMIT`.

**Multi-environment**: a project can own any number of databases across `production | staging | preview | development` environments. Same name can exist in different environments (unique per project+environment+name).

---

## Database Schema

### `databases.managed`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `project_id` | UUID FK | Project that owns this DB |
| `name` | VARCHAR(255) | e.g. `app`, `analytics`, `staging` |
| `environment` | VARCHAR(50) | `production` \| `staging` \| `preview` \| `development` |
| `type` | VARCHAR(50) | `postgresql` (MySQL/Redis deferred) |
| `version` | VARCHAR(20) | Postgres version e.g. `15` |
| `used_bytes` | BIGINT | Actual size from `pg_database_size()` |
| `max_connections` | INT | Per-role `CONNECTION LIMIT` |
| `status` | VARCHAR(50) | `provisioning` \| `ready` \| `unhealthy` |
| `host / port / username` | | Direct Postgres connection info |
| `connection_info` | TEXT | **AES-256-GCM encrypted** JSON of full credentials |
| `backup_retention_days` | INT | Days to retain backups |

**Unique constraint**: `(project_id, environment, name)` — one DB per name per environment per project.

### `databases.backups`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `database_id` | UUID FK | |
| `filename` | VARCHAR(500) | MinIO object key |
| `size` | BIGINT | Compressed size in bytes |
| `status` | VARCHAR(50) | `in_progress` \| `completed` \| `failed` |
| `description` | TEXT | User-provided note |
| `completed_at` | TIMESTAMPTZ | When backup finished |

### `infrastructure.database_metrics`

Written by the Phase 14 scheduler every ~10 minutes. Enables dashboard graphs, billing attribution, and alerting.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `database_id` | UUID FK | |
| `recorded_at` | TIMESTAMPTZ | |
| `used_bytes` | BIGINT | `pg_database_size()` at check time |
| `active_conns` | INT | `pg_stat_activity` count |
| `max_conns` | INT | Per-role `CONNECTION_LIMIT` |
| `queries_per_sec` | FLOAT | From `pg_stat_database` |
| `last_backup_at` | TIMESTAMPTZ | Most recent completed backup |
| `last_backup_size` | BIGINT | Size of that backup |
| `backup_verified` | BOOLEAN | Whether restore was tested |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/projects/:projectId/databases` | Provision a new database |
| `GET` | `/api/v1/projects/:projectId/databases` | List all databases for project |
| `GET` | `/api/v1/projects/:projectId/databases/:id` | Get one database |
| `PATCH` | `/api/v1/projects/:projectId/databases/:id` | Update settings |
| `DELETE` | `/api/v1/projects/:projectId/databases/:id` | Delete database + role |
| `GET` | `/api/v1/projects/:projectId/databases/:id/status` | Health check |
| `GET` | `/api/v1/projects/:projectId/databases/:id/connection` | Get connection info (membership-guarded, shown once) |
| `POST` | `/api/v1/projects/:projectId/databases/:id/credentials/rotate` | Rotate DB password |
| `POST` | `/api/v1/projects/:projectId/databases/:id/backups` | Trigger manual backup |
| `GET` | `/api/v1/projects/:projectId/databases/:id/backups` | List backups |
| `POST` | `/api/v1/projects/:projectId/databases/:id/backups/:backupId/restore` | Restore backup |

`POST /databases` body:
```json
{
  "name": "app",
  "environment": "production",
  "maxConnections": 20
}
```

`GET /databases/:id/connection` returns (never logged, shown once):
```json
{
  "host": "pgbouncer",
  "port": 6432,
  "database": "proj_abc12345_app",
  "connectionString": "postgresql://proj_abc12345_app:<password>@pgbouncer:6432/proj_abc12345_app?sslmode=require"
}
```

---

## Provisioning Flow

```
POST /databases
  1. Validate unique(project_id, environment, name)
  2. INSERT row with status='provisioning'
  3. CREATE DATABASE proj_<id>_<slug>
  4. CREATE ROLE proj_<id>_<slug> NOSUPERUSER NOCREATEDB NOCREATEROLE
     NOINHERIT NOLOGIN CONNECTION LIMIT <N> SET statement_timeout='60s'
  5. GRANT CONNECT ON DATABASE + ALL PRIVILEGES ON SCHEMA public
  6. ALTER DEFAULT PRIVILEGES for future objects
  7. REVOKE ALL ON SCHEMA public FROM PUBLIC
  8. pg_database_size() → used_bytes
  9. Encrypt full credentials → connection_info
  10. UPDATE row status='ready'
  11. Upsert DATABASE_URL + DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD
      into project_env_vars (deployed apps auto-inject)
  12. Emit database.provisioned event
```

---

## Credential Rotation Flow

```
POST /databases/:id/credentials/rotate
  1. Decrypt current connection_info
  2. ALTER ROLE ... WITH PASSWORD '<new>'
  3. Re-encrypt new credentials → connection_info
  4. Re-inject DATABASE_URL env var into project_env_vars
     (deployed apps pick up on next start)
  5. Emit database.credentials_rotated event
```

---

## Backup / Restore

**Backup** (`pg_dump --format=custom | gzip` → MinIO):
- Streamed to temp file → compressed → uploaded to `backups-<dbname>/db-backups/<db>/<ts>.dump.gz`
- No temp file in MinIO; backup stored with timestamp + UUID

**Restore** (MinIO → `pg_restore --clean --if-exists`):
- Downloads from MinIO to temp file
- `pg_restore` runs with `--clean --if-exists` against the target DB
- **Note**: restore-as-clone (new DB from backup) is a future enhancement

**Verification** (future, Phase 14+):
- After backup: restore to temp DB, run validation query, destroy temp DB
- Set `backup_verified=true` on the `DatabaseMetric` row

---

## Connection Strings

All connection strings handed to deployed apps include `?sslmode=require`.

| Env var | Value |
|---------|-------|
| `DATABASE_URL` | Pooled (PgBouncer) connection string |
| `DB_HOST` | `pgbouncer` |
| `DB_PORT` | `6432` |
| `DB_NAME` | Logical DB name |
| `DB_USER` | Per-database role |
| `DB_PASSWORD` | Generated strong password |

Internal operations (`pg_dump`, `pg_restore`, `CREATE DATABASE`) use direct Postgres connections with `PG*` env vars — no `sslmode` needed (intra-cluster communication).

---

## Isolation Model

| Mechanism | Purpose |
|-----------|---------|
| Logical database per `project + environment + name` | Data isolation |
| Dedicated role per DB, `NOINHERIT NOLOGIN` | Credential isolation |
| `CONNECTION LIMIT 20` default | No single DB saturates cluster |
| `statement_timeout='60s'` | No single query blocks cluster |
| `REVOKE ALL ON SCHEMA public FROM PUBLIC` | Prevent cross-DB object access |
| `GRANT` only `CONNECT` + schema rights | Least privilege per role |

---

## Files

| File | Role |
|------|------|
| `apps/api/src/modules/databases/databases.service.ts` | Provision, backup, restore, rotate, env injection |
| `apps/api/src/modules/databases/providers/internal-pg.provider.ts` | Real SQL via `pg` Pool |
| `apps/api/src/modules/databases/providers/database-provider.interface.ts` | Provider interface |
| `apps/api/src/modules/databases/databases.controller.ts` | REST endpoints |
| `apps/api/src/modules/databases/databases.module.ts` | DI module |
| `apps/api/prisma/schema.prisma` | `ManagedDatabase`, `DatabaseBackup`, `DatabaseMetric` |
| `installer/docker/docker-compose.yml` | PgBouncer service, env vars |
| `installer/docker/pgbouncer.ini` | Transaction mode, connection pool config |
