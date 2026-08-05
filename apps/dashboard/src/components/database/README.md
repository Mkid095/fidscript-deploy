# Database Components

UI for the per-database operator console: connection, backups (history + schedule), schema explorer, SQL editor, migrations, and a generic data grid. Every screen renders the **real** Prisma `Database` entity plus its children; every action calls a real inventory endpoint (no mocks).

## Sub-areas

### Backups
| File | Purpose |
|------|---------|
| `backups-panel.tsx` | Container — lists backups, manual create, restore. Uses `useBackups`. |
| `backups-hooks.ts` | `useBackups()` — fetches via `sdk.databases.listBackups`, `backup`, `restore`; copies URLs. |
| `backups-table.tsx` | Table of `BackupRecord[]` with status pills + actions. |
| `backup-actions.tsx` | Row-level copy-URL + restore buttons. |
| `backup-settings-panel.tsx` | Container for the auto-backup schedule form. |
| `backup-settings-hooks.ts` | `useBackupSettings()` — reads/writes the schedule via `useDatabase().updateBackupSchedule`. |
| `backup-schedule-config.tsx` | Frequency + time + day-of-week/month controls. |
| `backup-retention-config.tsx` | Retention count + storage bucket picker. |

### Connection
| File | Purpose |
|------|---------|
| `connection-panel.tsx` | Container: status + connection string + password rotation. |
| `connection-panel-hooks.ts` | `useConnectionPanel(dbId)` — calls `sdk.database(id).connection()` and `rotatePassword()`. |
| `connection-panel-types.ts` | `DbConnectionInfo` type (no password returned; one-time only via rotate). |
| `connection-status.tsx` | Health / version / uptime / connections / size grid. |
| `connection-string.tsx` | Host, port, db, user, SSL, pool, full connection-string. |

### Schema Explorer
| File | Purpose |
|------|---------|
| `schema-explorer.tsx` | Container; renders `schema-tree` + `schema-detail`. |
| `schema-explorer-hooks.ts` | Loads tables/columns via SDK. |
| `schema-tree.tsx` | Tree of schemas → tables → columns. |
| `schema-detail.tsx` | Column detail panel. |

### SQL Editor
| File | Purpose |
|------|---------|
| `sql-editor-v2.tsx` | Full editor (tabs + sidebar + editor + results). |
| `sql-editor.use.ts` | Top-level hook — open/save/run queries. |
| `sql-editor.types.ts` | Editor types. |
| `sql-editor.utils.ts` | Helpers (extract queries, format). |
| `sql-editor-tabs.use.ts` | Tab open/close/rename logic. |
| `sql-editor-sidebar.use.ts` | Sidebar history + saved-queries state. |
| `SqlEditorSidebar.tsx` | Sidebar shell. |
| `SqlEditorTabBar.tsx` | Tab strip. |
| `SqlEditorMonaco.tsx` | Monaco wrapper. |
| `SqlEditorResultsPane.tsx` | Results table + messages tab. |
| `SqlEditorMessagesTab.tsx` | Notices/warnings tab. |
| `SqlEditorTable.tsx` | Generic result-table renderer. |
| `SqlEditorSchemaTree.tsx` | Schema tree inside the editor. |
| `SqlEditorHistory.tsx` | Recent queries list. |
| `SqlEditorSavedQueries.tsx` | Saved queries list. |

### Migrations
| File | Purpose |
|------|---------|
| `migrations-panel.tsx` | Container — applies + lists migrations. |
| `migrations-table.tsx` | Table of migrations. |
| `migrations-hooks.ts` | Loads + applies via SDK. |

### Realtime Monitor
| File | Purpose |
|------|---------|
| `realtime-monitor.tsx` | Live connection / query stream. |

### Data Grid (generic table editor)
| File | Purpose |
|------|---------|
| `data-grid.tsx` | Composite grid (header + body + pagination + toolbar). |
| `data-grid-header.tsx` | Sortable column headers. |
| `data-grid-body.tsx` | Row renderer. |
| `data-grid-pagination.tsx` | Page controls. |
| `data-grid-toolbar.tsx` | Search + insert + refresh. |
| `data-grid-edit-modal.tsx` | Edit row modal. |
| `data-grid-insert-modal.tsx` | Insert row modal. |
| `data-grid-use-mutation.ts` | `useDataGridMutation` — save row, validate. |
| `data-grid-utils.ts` | Cell type → input mapping. |

## Conventions

- Business logic lives in `*-hooks.ts` (and the matching `-use.ts` files in this dir). Components never call SDK directly.
- Types are co-located: hook returns and prop types live alongside the hook or in `*-types.ts`.
- Modals expose `onClose`/`onCancel` so the parent controls visibility.

## Files
- 38 files (all under `src/components/database/`)