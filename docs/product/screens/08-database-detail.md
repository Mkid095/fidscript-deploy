# Screen Spec — `DatabaseDetail`

> Per-database detail at `/dashboard/projects/:id/databases/:db` (F08). The operator's
> console for one managed Postgres: overview, connection, backups, metrics, settings.

## 1. Purpose
The user monitors a single database — checks its health, manages backups, rotates creds,
watches the metrics, and (rarely) deletes it. The principle: **a database is a long-lived
resource; the UI surfaces its state without making the user hunt.**

## 2. Route + access
- **Route:** `/dashboard/projects/:id/databases/:db`.
- **Permission:** any member (`O/A/D/V`); viewer sees no action buttons; rotate/delete
  are admin/owner only per the audit gap.
- **Project scope:** the database belongs to the current project.

## 3. Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│ Project › my-app › Databases › primary                               │
├──────────────────────────────────────────────────────────────────────┤
│ primary  [Production] [Postgres 15]  [●] HEALTHY  [Rotate] [kebab]   │
│ 7.3 GB / 20 GB used · 8 / 20 connections · last backup 2h ago         │
├──────────────────────────────────────────────────────────────────────┤
│ [Overview] [Connection] [Backups] [Metrics] [Settings]                │
├──────────────────────────────────────────────────────────────────────┤
│  Status                  Usage                  Connections            │
│  ┌──────────────┐        ┌──────────────┐       ┌──────────────┐     │
│  │ ● Healthy    │        │ ████░░░░ 36%  │       │ ██░░░░ 40%   │     │
│  │ Response 12ms│        │ 7.3 / 20 GB  │       │ 8 / 20       │     │
│  │ Last: 30s ago│        │              │       │              │     │
│  └──────────────┘        └──────────────┘       └──────────────┘     │
│                                                                      │
│  Last backup                       Quick actions                     │
│  ┌──────────────┐                  ┌──────────────────────────────┐  │
│  │ 2h ago · 6.2GB│                  │ Take backup now              │  │
│  │ ● completed  │                  │ Rotate credentials            │  │
│  │ View all →   │                  │ View logs                     │  │
│  └──────────────┘                  └──────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

## 4. Sections + states
- **Header strip**: name, environment pill, type pill, status badge, usedBytes bar
  inline, "last backup Xh ago."
- **Tabs**:
  - **Overview** (default): status card, usage card, connections card, last backup card,
    quick actions.
  - **Connection**: direct + pooled connection strings (no password), SSL toggle, Rotate.
  - **Backups**: list + Take backup now + Restore.
  - **Metrics**: 4 time-series charts (usedBytes, activeConnections, queriesPerSec,
    lastBackupSize).
  - **Settings**: backupRetentionDays, maxConnections, settings JSON, Danger Zone.
- **Per-tab states**:
  - **Overview**:
    - *Healthy*: status badge green; usage bar with normal color.
    - *Unhealthy*: badge red; the row shows the error reason.
    - *Provisioning*: spinner; the quick actions are greys.
  - **Connection**:
    - *Idle*: two connection cards (Direct + Pooled) with "Copy" buttons.
    - *Rotating*: spinner; "Rotating…" badge.
    - *Rotated*: new password in a one-time toast.
  - **Backups**:
    - *Empty*: "No backups yet — automatic daily backups will start tonight."
    - *In progress*: a row with `in_progress` status + progress.
    - *Completed*: row with size + completedAt; "Restore" action.
  - **Metrics**:
    - *Loading*: skeleton chart.
    - *No data*: "No metrics recorded yet — checks run every 5 minutes."
  - **Settings**:
    - *Idle*: editable form; "Save" greys until dirty.
    - *Deleting*: type-to-confirm dialog.

## 5. Primary + secondary actions
- **Primary (per tab)**:
  - *Overview*: "Take backup now" or "Rotate credentials" (contextual).
  - *Connection*: "Rotate credentials" (with confirm).
  - *Backups*: "Take backup now" + per-row "Restore".
  - *Settings*: "Save" (optimistic).
- **Secondary**: "Copy" (connection strings), "Open in SQL console" (P0 follow-up, greys).

## 6. API mapping
- **Get database** — `GET /api/v1/databases/:databaseId` (`DB-03`).
- **Status** — `GET /api/v1/databases/:databaseId/status` (`DB-06`); polled every 30s.
- **Connection** — `GET /api/v1/databases/:databaseId/connection` (`DB-07`); **password
  never returned**.
- **Rotate** — `POST /api/v1/databases/:databaseId/credentials/rotate` (`DB-08`).
- **Update** — `PATCH /api/v1/databases/:databaseId` (`DB-04`).
- **Delete** — `DELETE /api/v1/databases/:databaseId` (`DB-05`).
- **Backups list** — `GET /api/v1/databases/:databaseId/backups` (`DB-10`).
- **Take backup** — `POST /api/v1/databases/:databaseId/backups` (`DB-09`).
- **Restore** — `POST /api/v1/databases/:databaseId/backups/:backupId/restore` (`DB-11`).
- **Realtime** — `database.provisioned`, `database.updated`, `database.deleted`,
  `database.backup_started`, `database.backup_completed`, `database.restored`.

## 7. Forms + validation
- **Settings**: backupRetentionDays (1–90, slider), maxConnections (5–100, slider),
  settings JSON (raw, optional).
- **Delete**: type-to-confirm with the database name.
- **Restore**: type-to-confirm with the backup ID.

## 8. Accessibility
- **Focus order**: header → tabs → tab content → actions.
- **Status badge**: `role="status"` with `aria-label` describing the status.
- **Usage bars**: `role="progressbar"` with `aria-valuenow/min/max` and `aria-label`.
- **Live region**: `aria-live="polite"` on the status card; "Database unhealthy" is
  announced.
- **Rotate confirm dialog**: `role="alertdialog"` with the env-var rewrite warning in
  the description.

## 9. Cross-references
- **Phase**: F08 Databases UI §6.
- **Service spec**: `docs/product/services/databases.md`.
- **Journey**: backend dev's DB maintenance.
- **Navigation**: Databases list → click a card.
- **Related screens**: New database modal (sibling), Settings → Env (where DATABASE_URL
  lives).

## 10. Acceptance criteria
1. The detail page opens at `/dashboard/projects/:id/databases/:db`; the **Overview** tab
   is preselected.
2. The status card shows `DB-06` polled every 30s.
3. The usage card shows the usedBytes bar (color thresholds: green ≤70%, yellow 70-90%,
   red >90%).
4. The Connection tab shows direct + pooled strings (no password), SSL toggle, Rotate
   button.
5. Rotate opens a confirm dialog that warns about env-var rewrite + deployment restart;
   confirming POSTs `DB-08`; the new password is in a one-time toast.
6. The Backups tab lists automatic + manual backups; "Take backup now" POSTs `DB-09`;
   "Restore" POSTs `DB-11` with type-to-confirm.
7. The Metrics tab renders 4 time-series charts with 1h/24h/7d/30d range.
8. The Settings tab is editable; "Delete database" in Danger Zone has type-to-confirm.
9. The "Open in SQL console" button is greys with "coming soon" (P0 follow-up).
10. One-time passwords are not re-displayed; rotation is the only way to get a new one.
