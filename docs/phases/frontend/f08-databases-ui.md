# F08 — Databases UI (full spec)

> **Status:** ⏳ Spec complete — pending approval.
> **Connects to:** backend `DB-*` inventory (`docs/phases/frontend/backend/data.md`). Cross-references
> F05 (shell), F11 Monitoring (database metrics flow into monitoring alerts). Renders the
> **`ManagedDatabase`** + **`DatabaseBackup`** + **`DatabaseMetric`** Prisma entities.

## 1. Purpose
The operator's console for managed Postgres (and MySQL, Redis — see runtime gaps). The user
provisions a database, connects to it, manages backups, rotates credentials, and monitors
health. The principle: **a database is a first-class resource, not a footnote to a deployment.**

## 2. Business Goal
Match the managed-database console of Supabase + Neon + Railway: one click to provision, the
credentials are shown **once** and then handed off to env vars, backups are automatic + manual,
and the connection string is one click away. The principle: **the user never copies a password
out of the UI twice.**

## 3. Personas
- **Solo dev** — provisions a Postgres in 5 seconds, copies the connection string, ships.
- **Backend dev** — manages a production DB: monitors size, takes manual backups before
  schema changes, rotates credentials quarterly.
- **Team lead** — checks DB health for every project; rotates the team's prod credentials
  after an off-boarding.

## 4. Complete User Journey
```
Open /dashboard/projects/:id/databases (F05) → Databases tab.
  → list of databases: name, environment pill, type pill, status badge, size, usedBytes bar,
    maxConnections, last backup age.
  → empty state: "No databases yet — provision Postgres with one click." CTA "Create database".
  → "Create database" modal: name, environment (production | staging | preview | development),
    type (pg default; mysql + redis greyed if not implemented per audit), version (15 default),
    size (small/medium/large — Advanced), maxConnections (Advanced).
    → "Create" → POST DB-01 (async) → modal closes, card appears with status "provisioning".
    → realtime `database.provisioned` updates the card to "ready" + shows a toast with the
      **one-time credentials**: host, port, username, password, connectionString.
    → "Copy all" button on the toast puts the entire connection block on the clipboard.
  → click a database card → /databases/:db (detail):
      tabs: Overview · Connection · Backups · Metrics · Settings.
      default: Overview.
Overview tab:
  → status badge (healthy / unhealthy / unknown) from DB-06
  → usedBytes bar (filled green up to 70%, yellow 70-90%, red >90%)
  → stats cards: size, usedBytes, maxConnections, activeConnections (live), last backup age
  → quick actions: "Open in SQL console" (P0 follow-up — for now: copy connectionString),
    "Take backup now", "Rotate credentials".
Connection tab:
  → two connection strings: Direct + Pooled
  → "Copy" button per string
  → **password is NEVER shown again** — the one-time password from provisioning is the only
    time the user sees it. Rotation issues a new one (also one-time).
  → "Rotate credentials" → POST DB-08 → confirmation dialog warns: "This rewrites
    DATABASE_URL/DB_* env vars. Deployments will be restarted." → confirm → new password in
    a toast.
  → SSL toggle (require SSL: true default).
Backups tab:
  → list of backups: id, description, size, createdAt, completedAt, status.
  → automatic backups (daily by default) at the top, manual below.
  → "Take backup now" → POST DB-09 with description (optional) → backup row appears with
    status "in_progress" → `database.backup_completed` event marks it complete.
  → "Restore" on any backup → POST DB-11 → confirm with type-to-confirm with the backup ID
    → "Restored" toast; current data is overwritten.
Metrics tab:
  → time-series charts: usedBytes, activeConnections, queriesPerSec, lastBackupSize.
  → time range selector: 1h / 24h / 7d / 30d.
  → drill-down: click a point → see the snapshot's metadata.
Settings tab:
  → backupRetentionDays (slider: 1-90, default 7)
  → maxConnections (Advanced)
  → settings JSON (Advanced; raw editor)
  → "Delete database" (Danger Zone, ConfirmDialog type-to-confirm with database name)
    warns: "This drops the database. All data is lost. Take a backup first if you need to
    restore later."
```

## 5. Information Architecture
- `/dashboard/projects/:id/databases` — the list. Tabs: All (default) / by environment
  (production / staging / preview / development).
- `/dashboard/projects/:id/databases/new` — the create-database modal (overlay).
- `/dashboard/projects/:id/databases/:db` — the detail. Tabs: Overview / Connection / Backups /
  Metrics / Settings.
- Each environment gets its own filtered list view; the canonical list is **All**.

## 6. Screen Specifications
- **`/dashboard/projects/:id/databases`** — the list.
  - **Per-database card**: name (with environment pill), type pill, status badge
    (provisioning/ready/unhealthy), size, usedBytes bar (visual), maxConnections,
    "last backup Xh ago" from `DatabaseBackup.completedAt`, kebab menu.
  - **Status badge** — color-coded: provisioning yellow-spinner · ready green ·
    unhealthy red · unknown gray.
  - **Empty state**: "No databases yet — provision Postgres with one click." + CTA
    "Create database" + small hint "Tip: most apps need 1 production + 1 preview DB."
  - **Tabs**: All (default) / Production / Staging / Preview / Development.
  - **Per-environment count** in the tab labels ("Production (1)").
- **Create database modal** — focused modal. Fields:
  - **name** (required, slug-style, unique per (project, environment)).
  - **environment** (select: production (default) | staging | preview | development).
  - **type** (select). Implemented: `pg` (default, enabled). Per the audit, `mysql` and `redis`
    are listed in the spec but **not implemented** — greyed with "not yet available" + tooltip.
  - **version** (select; defaults to 15 for pg).
  - **size** (select: small | medium | large; default small). Maps to resource limits.
  - **maxConnections** (slider, Advanced; default 20).
  - **provider** (hidden, Advanced; defaults to `internal-postgres`).
  - "Create" → POST DB-01 → modal closes; the card appears with status "provisioning" and a
    subtle pulse animation.
- **`/dashboard/projects/:id/databases/:db`** — the detail.
  - **Header strip**: database name, environment pill, type pill, status badge, usedBytes bar
    inline, "last backup Xh ago."
  - **Tabs** (top-aligned): Overview / Connection / Backups / Metrics / Settings.
  - **Overview tab**:
    - **Status card**: status badge, `DB-06` polled every 30s; response time, last check.
    - **Usage card**: usedBytes / maxBytes progress bar; activeConnections / maxConnections
      progress bar; queriesPerSec sparkline (from `DatabaseMetric`).
    - **Last backup card**: age, size, status; "Take backup now" button.
    - **Quick actions row**: "Rotate credentials" (DB-08), "Open in SQL console" (P0 follow-up,
      greyed with "coming soon"), "View logs" (links to Logs tab filtered to this database).
  - **Connection tab**:
    - **Direct connection** (host, port, database, username; **no password**; "Copy
      connection string" button with the full URL — password is the **env var** name
      `DATABASE_URL`, expanded by the runtime).
    - **Pooled connection** (same shape, different port).
    - **SSL** toggle: "Require SSL" (default on).
    - **Rotate credentials** button → POST DB-08 → confirm dialog "This rewrites
      DATABASE_URL/DB_* env vars. Deployments will be restarted to pick up the new values."
      → confirm → new password in a one-time toast.
  - **Backups tab**:
    - **List** of backups (from `DB-10`): id, description, size, createdAt, completedAt,
      status (in_progress / completed / failed). Sort: most recent first.
    - **Filter**: by type (automatic / manual).
    - **"Take backup now"** button → POST DB-09 with optional description → row appears
      with status `in_progress`; `database.backup_completed` marks it complete.
    - **"Restore"** button on any completed backup → POST DB-11 → confirm dialog with
      type-to-confirm of the backup ID.
  - **Metrics tab**:
    - **Time-series charts**: usedBytes (area), activeConnections (line), queriesPerSec
      (line), lastBackupSize (bar). One chart per metric.
    - **Time range**: 1h / 24h / 7d / 30d. Default 24h.
    - **Drill-down**: click a point on the chart → see the snapshot's metadata
      (recordedAt, usedBytes, activeConns, queriesPerSec, lastBackupAt, lastBackupSize,
      backupVerified).
  - **Settings tab**:
    - **General**: backupRetentionDays (slider), maxConnections (slider).
    - **Advanced**: settings JSON (raw editor), provider (read-only display).
    - **Danger Zone**: "Delete database" (ConfirmDialog type-to-confirm with database name)
      warns: "This drops the database. All data is lost. Take a backup first if you need to
      restore later." + optional "Take a final backup before delete" toggle.

## 7. Component Specifications
- `<DataTable>` ✅ — backups list.
- `<EntityCard>` ✅ — database list card.
- `<HealthBadge>` ✅ — database status badge.
- `<Button>`, `<Modal>`, `<ConfirmDialog>`, `<Toast>`, `<EmptyState>`, `<Skeleton>`, `<ErrorState>`,
  `<LockedPanel>`, `<Slider>`, `<Select>`, `<Toggle>`, `<KeyValueTable>`, `<CodeBlock>`.
- `<ProgressBar>` ✅ (_todo) — usedBytes bar, maxConnections bar.
- `<Sparkline>` ✅ (_todo) — tiny inline chart; reusable in cards.
- `<TimeSeriesChart>` ✅ (_todo) — full chart with time range; shared with F11 Monitoring.
- `<NewDatabaseModal>` — spec'd here.
- `<ConnectionStringCard>` — spec'd here; the "no password, just copy" connection block.
- `<BackupRow>` — spec'd here.
- `<MetricChart>` — reuses `<TimeSeriesChart>`.

## 8. API Mapping
| Screen/Action | Endpoint | Inventory ID | Notes |
|---|---|---|---|
| List databases | `GET /api/v1/projects/:id/databases` | `DB-02` | first paint |
| Get database | `GET /api/v1/databases/:databaseId` | `DB-03` | detail page |
| Create database | `POST /api/v1/projects/:id/databases` | `DB-01` | async |
| Update settings | `PATCH /api/v1/databases/:databaseId` | `DB-04` | Settings tab |
| Delete database | `DELETE /api/v1/databases/:databaseId` | `DB-05` | Danger Zone |
| Health status | `GET /api/v1/databases/:databaseId/status` | `DB-06` | Overview tab polling |
| Connection strings | `GET /api/v1/databases/:databaseId/connection` | `DB-07` | Connection tab; **password never returned** |
| Rotate credentials | `POST /api/v1/databases/:databaseId/credentials/rotate` | `DB-08` | Connection tab |
| Take backup | `POST /api/v1/databases/:databaseId/backups` | `DB-09` | Backups tab |
| List backups | `GET /api/v1/databases/:databaseId/backups` | `DB-10` | Backups tab |
| Restore from backup | `POST /api/v1/databases/:databaseId/backups/:backupId/restore` | `DB-11` | Backups tab |

## 9. Backend Integration Map
```
Databases list → sdk.databases.list(projectId)
  → realtime subscribe to project:<id> events
    → database.provisioned → card status → ready, one-time credentials toast
    → database.updated → settings/retention changes propagate
    → database.deleted → card removes
    → database.backup_started → new row in Backups tab
    → database.backup_completed → row status → completed
    → database.restored → toast
Database detail (Overview) → sdk.databases.get(id) + DB-06 polling (30s)
Connection → sdk.databases.connection(id) (no password)
  → rotate → DB-08 → optimistic "rotated" badge → new password in toast
Backups → sdk.databases.backups.list(id)
  → take → DB-09 → optimistic row → DB-10 reconciliation
  → restore → DB-11 → confirm + progress
Metrics → sdk.databases.metrics(id, {since, until})
  → renders <TimeSeriesChart> with the data
```

## 10. User Experience Specification
- **Provisioning is async but feels fast.** The card appears immediately with
  "provisioning" + a spinner. The toast with credentials arrives 5-30s later via
  `database.provisioned`. The user doesn't wait on the modal.
- **The one-time password toast is sacred.** The user sees the password exactly once. After
  dismissal, the password is in `DATABASE_URL` env var (or DB_HOST/DB_PORT/etc.); the UI
  never re-displays it. Rotating issues a new one (also one-time).
- **The connection tab is the operator's first stop.** "Copy connection string" is one click;
  the URL is complete (with placeholders for the password, replaced by the env var at runtime).
- **Backups are automatic + on-demand.** The user doesn't have to think about backups until
  they need to. "Take backup now" is one click + optional description.
- **Restore is dangerous and slow.** Type-to-confirm with the backup ID; explicit warning
  about overwriting current data; the operation is async, the user gets a toast.
- **Metrics charts are glance-able, not analyst-grade.** Default 24h window, 4 metrics
  visible; drill-down for detail. (For analyst-grade, the user exports to a monitoring
  tool; F11 is the bridge.)
- **Delete is the loudest action in the app.** Type-to-confirm; warning about data loss;
  optional "take a final backup first" pre-flight. The user must consciously destroy data.

## 11. Design Philosophy
- **Configure once.** The user does not configure the database engine; the platform defaults to
  Postgres 15. The user can pick size + maxConnections if they need to, but the common case
  is "one click, ready in 30s."
- **Beginner first.** The empty state is the create button. The connection tab is the
  next-stop. The "Copy connection string" is the moment of truth — one click, paste into the
  app, ship.
- **Production-ready by default.** Encryption at rest, automatic daily backups (7-day
  retention default), SSL required, credentials rotated via env-var rewrite. The user gets
  production-grade without thinking.
- **Everything observable.** The status badge + the usedBytes bar + the last-backup age +
  the metrics charts = the user can always answer "is the DB healthy?".
- **One dashboard.** Provision, connect, back up, restore, monitor — all in one section. The
  user doesn't leave to manage the database.

## 12. Configuration Philosophy
- **User-tunable at create**: name, environment, type (pg only — mysql/redis greyed), version,
  size, maxConnections, backupRetentionDays (post-create).
- **User-tunable after create**: backupRetentionDays, maxConnections, settings JSON.
- **User does not touch**: database engine internals, host/port (system-assigned), the
  password (one-time only), the connection pool internals, the WAL settings.
- **Greying is honest** — `mysql` and `redis` are shown in the type picker with "not yet
  available" + tooltip. They are **not** hidden.

## 13. Automation Rules
- **One-time password toast** — the toast has a "Copy all" button; after 60s or on close,
  the password is gone (re-rendering the toast requires re-provisioning or rotating).
- **Connection string placeholders** — the connection string template includes `<password>`
  as a placeholder; the env var name `DATABASE_URL` is the canonical reference; the runtime
  expands it.
- **UsedBytes color thresholds** — green up to 70%, yellow 70-90%, red >90% (visual only;
  not an alert — alerts live in F11).
- **Backup auto-schedule** — daily automatic, retention 7 days (default). User can change
  retention in Settings.
- **Rotate credentials warning** — the confirm dialog is the only place the user sees the
  "deployments will be restarted" warning. After confirm, the new password is in the toast.
- **Metrics polling** — Overview tab polls `DB-06` every 30s; Metrics tab fetches the time
  range on mount + on time-range change.
- **Greying rule** — type options loaded from a single constant (`SUPPORTED_DB_TYPES`); the
  picker greys anything not in that list.

## 14. Endpoint Documentation
Full `DB-*` inventory in `docs/phases/frontend/backend/data.md`. Notable specifics for F08:

- **`DB-01` is async** — returns `{id, projectId, name, status: 'provisioning'}` immediately;
  the actual provisioning happens in a background worker; `database.provisioned` event
  signals completion with the one-time credentials in the event metadata.
- **`DB-07 Connection` never returns the password** — only `host`, `port`, `database`,
  `username`, `connectionString` (with `<password>` placeholder). The audit confirms this is
  the contract.
- **`DB-08 Rotate` rewrites env vars** — the backend updates `ProjectEnv` rows for
  `DATABASE_URL` / `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` /
  `DATABASE_DIRECT_URL` (whatever is in use). The new password is returned in the response
  (one-time) AND emitted in the `database.credentials_rotated` event metadata.
- **`DB-11 Restore`** — `{ backupId, targetDatabaseId? }`. If `targetDatabaseId` is omitted,
  the restore is in-place. If provided, a new database is created from the backup.

Backend gaps the UI must work around:
- `mysql` and `redis` are listed in the spec but not implemented (audit note). The UI greys
  them with "not yet available" + tooltip.
- **`DB-01` DTO** is loose (no enum constraint on `type`); the UI validates locally.
- The "SQL console" is a P0 follow-up — the UI shows a greyed button "Open in SQL console"
  with a "coming soon" tooltip.

## 15. Feature Dependency Graph
- **Hard**: F00, F02, F05.
- **Hard backend**: `DB-01..11`, the `database.*` event family, the runtime's DATABASE_URL
  expansion.
- **Gated by F08**: nothing.
- **Backend gaps that affect this screen**:
  - `mysql` / `redis` types are not implemented (UI greys them).
  - `DB-01` DTO is loose; UI validates locally.
  - The SQL console is not yet built; the UI shows a "coming soon" stub.

## 16. Acceptance Criteria
1. `/dashboard/projects/:id/databases` opens with the **All** tab preselected.
2. The empty state is "No databases yet — provision Postgres with one click." + CTA
   "Create database."
3. The create-database modal validates locally: `mysql` and `redis` are greyed with
   "not yet available"; submitting POSTs `DB-01`; the card appears with "provisioning" status.
4. The card transitions from "provisioning" to "ready" when `database.provisioned` arrives;
   a toast shows the one-time credentials with a "Copy all" button.
5. Clicking a card opens the detail with the **Overview** tab preselected.
6. The Overview tab shows status (DB-06 polled every 30s), usedBytes bar (color thresholds),
   stats cards, and quick actions (Rotate / Take backup / View logs).
7. The Connection tab shows the direct + pooled connection strings (no password), SSL toggle,
   and "Rotate credentials" button. The rotate confirm dialog warns about env-var rewrite +
   deployment restart.
8. The Backups tab lists automatic + manual backups; "Take backup now" POSTs `DB-09`; the
   row appears with `in_progress` and transitions to `completed` via `database.backup_completed`.
9. "Restore" on any completed backup POSTs `DB-11` with type-to-confirm of the backup ID;
   a "Restored" toast confirms.
10. The Metrics tab renders 4 time-series charts (usedBytes, activeConnections, queriesPerSec,
    lastBackupSize) with a 1h/24h/7d/30d range selector.
11. The Settings tab lets the user change backupRetentionDays, maxConnections, settings JSON;
    "Delete database" is in the Danger Zone with type-to-confirm + optional "take a final
    backup first" pre-flight.
12. The one-time password toast is dismissed on close; the password is not re-displayed.
    Rotation issues a new password (also one-time).
13. The usedBytes bar uses the documented color thresholds (green/yellow/red); the bar is a
    visual indicator, not an alert (alerts live in F11).
14. `mysql` and `redis` are greyed in the type picker with "not yet available" + tooltip;
    the "Open in SQL console" button is greyed with "coming soon."
15. `pnpm --filter @fidscript/dashboard build` clean; this spec updated to match shipped
    behavior.

## Change log
- 2026-06-20 — Initial full 16-section spec. Documents 3 backend gaps: (1) `mysql` / `redis`
  types are not implemented (UI greys them); (2) `DB-01` DTO is loose (UI validates locally);
  (3) SQL console is a P0 follow-up (UI shows "coming soon" stub).
