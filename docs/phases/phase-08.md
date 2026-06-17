# Phase 08: Database Platform

> **Status:** Verified  |  **Track:** Data/Compute  |  **Depends on:** Phase 04, Phase 05

## Objective

Provision a **real** database per project that an app can actually connect to, with real backups, restore, and credential rotation. Today "provision" inserts a row and fabricates a connection string; nothing connects.

## Current State

**IN PROGRESS.** As of 2026-06-17:

- **Real provisioning**: `CREATE DATABASE` + `CREATE ROLE` (NOINHERIT NOLOGIN) + grants — `pg` Pool bypasses PgBouncer for admin ops
- **Connection limits**: `CONNECTION LIMIT 20` + `statement_timeout='60s'` on every role (sensible single-VPS defaults)
- **SSL enforcement**: `?sslmode=require` appended to all connection strings handed to apps
- **Encrypted credentials**: connection string stored encrypted at rest via `CryptoService` (AES-256-GCM)
- **DATABASE_URL auto-injection**: on `provision()`, `DATABASE_URL` + `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD` are upserted into `project_env_vars` so deployed apps pick it up automatically
- **PgBouncer**: `pgbouncer.ini` (transaction mode, md5 auth) + `userlist.txt`; `DATABASE_URL` → `pgbouncer:6432?pgbouncer=true`
- **`DIRECT_URL`**: separate unpooled connection for Prisma migrations (bypasses PgBouncer)
- **Database size tracking**: `used_bytes` column updated from `pg_database_size()` on provision and on health checks
- **Backup**: `pg_dump --format=custom | gzip` → MinIO bucket `backups-<dbname>` (buffered via temp file, then uploaded)
- **Restore**: MinIO → temp file → `pg_restore --clean --if-exists`
- **Credential rotation**: `ALTER ROLE ... WITH PASSWORD` + re-encrypts stored connection string
- **Isolation**: per-database roles with `NOINHERIT NOLOGIN`, `REVOKE` on `public` schema
- **Pg npm package**: `pg@^8.21` + `@types/pg@^8.20`
- **MinioProvider**: exported from `StorageModule` alongside `StorageService` for backup bucket access

## Dependencies

- **Phase 04** (Project scoping; `CryptoService` to encrypt connection strings).
- **Phase 05** (object storage for backups).
- **Phase 12** (scheduler to run recurring backups — wired when 12 lands; manual/scheduled-now until then).

## Deliverables

- [ ] **Real provisioning.** Create a real database. Single-VPS pragmatic model: a **logical database + dedicated role** inside the platform Postgres, namespaced `db_<projectId>_<slug>`, with a generated strong password. (Dedicated Postgres containers per project is a documented future option; not required to exit.) A migration sets up the role grants.
- [ ] **Real connection string.** Assembled from real host/port/db/role/password, **encrypted at rest** (Phase 04 `CryptoService`). Decrypted only when handed to the owner or injected into a deployment's runtime env.
- [ ] **Real backups.** `pg_dump` (via the platform Postgres container) → gzipped → object in Storage (05), with timestamp, size, and manifest. Manual + scheduled.
- [ ] **Real restore.** Restore a chosen backup into a new database (safe) or replace the target (destructive, with confirmation). Verified row-level.
- [ ] **Credential rotation.** Rotate the DB role password: generate new → `ALTER ROLE` → re-encrypt the stored string → revoke old. Deployments pick up the new value on next start.
- [ ] **Pooled endpoint.** A PgBouncer service exposing a pooled connection string per database (connection limit, transaction pooling) for high-concurrency apps.
- [ ] **Query console (stretch).** A guarded, read-default SQL runner against the project DB with result limits and statement safeguards — enough to inspect data from the dashboard/SDK. (Destructive statements require an explicit flag.)
- [ ] **Tenant isolation.** Each role has access only to its own database; no cross-database grants. Prove it.

## Technical Design

- **Isolation boundary:** logical-database-per-project now (one Postgres cluster, many DBs + roles). This is cheap and sufficient on one VPS. The role is `NOINHERIT`, granted only `CONNECT` on its DB and full privileges *within* it; `REVOKE` on `public`; no superuser.
- **Backups:** `docker compose exec postgres pg_dump ...` piped to `gzip` streamed to the MinIO client into a per-project backup bucket; a `backups` table records metadata. `pg_restore`/`psql` for restore.
- **Connection string secrecy:** never returned in list views; fetched only via a dedicated endpoint (membership-guarded) and shown once, like an API key. Stored encrypted.
- **Pooling:** one PgBouncer container with per-DB config generated from the catalog; Traefik-internal only (not exposed publicly).

## Integration Points

- **Events emitted:** `databases.database.provisioned/updated/rotated`, `databases.backup.started/completed/failed`, `databases.restored`, `databases.deleted`. Consumed by audit (02).
- **Service registry:** registers `databases`.
- **SDK (16):** `databases.provision/list/getConnectionString/backup/restore/rotate`.
- **CLI (18):** `fidscript db create/backup/restore/conn`.
- **Dashboard (19):** databases screen, connection-string reveal, backups list, restore.

## Verification (VPS)

```bash
# Provision a real DB:
DBID=$(curl -fsS -X POST .../api/v1/projects/$PID/databases -d '{"name":"appdb"}' | jq -r .id)
CONN=$(curl -fsS .../databases/$DBID/connection-string -H "Authorization: Bearer $TOKEN")

# It really connects + is isolated:
psql "$CONN" -c 'create table t(x int); insert into t values (1); select * from t;'   # works
# connection string is encrypted at rest — DB row holds ciphertext, not the password

# Backup → tamper → restore → data back:
curl -fsS -X POST .../databases/$DBID/backups
psql "$CONN" -c 'drop table t;'
curl -fsS -X POST .../databases/$DBID/restore -d '{"backupId":"<id>"}'
psql "$CONN" -c 'select * from t;'   # row is back

# Rotation changes the password; old string stops working, new one works
```

**Exit criterion:** a provisioned DB accepts a real external connection, stores its password encrypted, can be backed up and restored with data integrity, rotated, and is isolated from other projects' DBs. No fabricated strings, no `size:0` stubs.

## Out of Scope / Future

- Dedicated Postgres container per project / HA / read replicas (future ADR).
- PITR / WAL archiving (future).
- Other engines (MySQL, Redis-as-a-service) via the same interface (future).

## Risks

- Logical-DB model has noisy-neighbor risk if one app saturates the shared cluster — set per-role `statement_timeout`/connection limits; document the upgrade path to dedicated containers.
- Restore-into-same is destructive — require explicit `confirm` and a recent-backup precheck.

## Files you'll touch (precision map)

- `apps/api/src/modules/databases/providers/internal-pg.provider.ts` — real provision/delete/backup/restore/rotate/getSize via `pg` Pool; CONNECTION LIMIT + statement_timeout; sslmode=require in conn strings
- `apps/api/src/modules/databases/databases.service.ts` — encrypts/decrypts connectionInfo, strips from list/get, injects DATABASE_URL into project env vars, tracks usedBytes
- `apps/api/src/modules/databases/databases.module.ts` — imports StorageModule, wires MinioProvider
- `apps/api/src/modules/databases/providers/database-provider.interface.ts` — added `getSize()` method
- `apps/api/src/modules/storage/storage.module.ts` — exports MinioProvider
- `apps/api/prisma/schema.prisma` — added `usedBytes` to ManagedDatabase
- `apps/api/prisma/migrations/20260617000000_phase08_used_bytes/` — adds used_bytes column
- `apps/api/package.json` — `pg@^8.21` + `@types/pg@^8.20`
- `installer/docker/docker-compose.yml` — PgBouncer service, DATABASE_URL→pgbouncer:6432?pgbouncer=true, DIRECT_URL, DB_ADMIN_*, PGBOUNCER_HOST/PORT
- `installer/docker/pgbouncer.ini` — transaction mode, md5 auth
- `installer/docker/userlist.txt` — updated at setup time

## Next Phase

[Phase 09: Email Platform (Stalwart)](./phase-09.md)
