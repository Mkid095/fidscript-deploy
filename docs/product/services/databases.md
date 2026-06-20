# Service: Databases (managed Postgres)

Provisioned Postgres per project, with PgBouncer pooling, encrypted credentials, env injection,
backups, and on-demand restore.

## 1. Purpose
One-click managed Postgres with the credentials, pooling, and backups that real apps need — and
zero config to make it work with the project's deployments/functions (env is injected automatically).

## 2. Screens
- **Databases** (sidebar §4): list of databases.
- **Database detail**: tabs *Overview / Connection / Backups / Settings*.

## 3. Data model
- `Database` — id, projectId, name, environment (`production|staging|preview|development`), type
  (Postgres/MySQL/Redis in DTO; **only Postgres is implemented**), version, status, size, usedBytes,
  maxConnections, provider (only `internal` exists).
- `Database.connectionInfo` — encrypted JSON: `{host, port, database, username, password,
  connectionString, pgbouncerHost, pgbouncerPort, pgbouncerConnectionString}`. **Never returned**
  in list/get; the DB-07 endpoint returns only the public pieces (host/port/db/user/connString,
  never password).
- `BackupInfo` — id, databaseId, status (`in_progress|completed|failed`), filename, size,
  description, createdAt, completedAt.

## 4. API mapping
- CRUD: `DB-01..05`. Status (used for the health dot): `DB-06`. Connection (no password):
  `DB-07`. Rotate credentials: `DB-08`. Backups (create/list/restore): `DB-09..11`.

## 5. Realtime events
`database.{provisioned,updated,deleted,backup_started,backup_completed,restored}`. The detail
screen's Backups tab subscribes to stream live backup/restore progress (audit notes backup is async).

## 6. Settings
- **Provision:** name, environment (preset selector), size + maxConnections (under "Advanced"),
  provider (`internal`).
- **Connection (returned):** direct vs pool-only (`?poolOnly=true`). Password is **never**
  returned by any endpoint — the UI must make this explicit to users.
- **Backups:** `backupRetentionDays` (default 7).

## 7. Automation
- **Auto-inject** `DATABASE_URL`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` into
  the project's env (PROJ-17) on provision and on rotate — `DATABASE_URL` prefers the PgBouncer
  string (`?sslmode=require`). Per Principle 1: one create → usable everywhere.
- **Auto-backup** on a schedule (provider-managed; the UI exposes manual trigger + retention).
- **Auto-health** via `SELECT 1` against the admin pool (the audit confirms this is light and
  doesn't use per-db creds).
- **Rotate credentials** invalidates the old `DATABASE_URL` + DB_* and writes new ones; the UI
  warns "deployments will need to be restarted."

## 8. Dependencies
- **Hard:** admin Postgres pool (`DB_ADMIN_*`), PgBouncer (`PGBOUNCER_HOST/PORT`), the F07
  compose-mount + socket access.
- **Hard:** MinIO for backup storage (the bucket `backups-<slice>` is created on first backup).
- **Backend gaps** (from the audit):
  - The `:backupId` path param in `DB-11` is not wired; the handler reads `backupId` from the
    body. UI should not use the URL — use the body's `backupId`.
  - Rotate does not currently notify deployments (the UI's "restart deployments" prompt covers it).
  - MySQL/Redis are in the DTO but unimplemented.

## 9. Phase
**F08 (Databases UI)** — pending spec.
