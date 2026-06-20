# Component: DataTable

The list primitive — every list of entities (Deployments, Functions, Databases, Queues, Messages,
Cron Runs, Logs, Members, Sessions, …) renders through this. Sortable, filterable, paginated,
actionable rows.

## 1. Purpose
Render a list of backend entities with real Prisma fields, real operations, real auth gating. The
operator's view of the data; never a viz chart for its own sake.

## 2. Props
| Prop | Type | Default | Notes |
|---|---|---|---|
| `columns` | `Column[]` | — | `{ id, header, cell:(row)=>JSX, sortable?, width?, align? }` |
| `rows` | `T[]` | — | raw entities (typed) |
| `getRowId` | `(row:T) => string` | — | stable id; powers selection + realtime updates |
| `rowHref` | `(row:T) => string` | — | if set, rows are clickable (Cmd-click opens in new tab) |
| `sort` | `{ id, dir }` | first sortable column, asc | controlled; URL-encoded (UX §4) |
| `onSortChange` | `(s) => void` | — | — |
| `filter` | `Filter[]` | — | the `FilterBar` reads/writes these |
| `pagination` | `{ page, limit, total }` | — | controlled; `limit` 25/50/100 |
| `onPageChange` | — | — | — |
| `rowActions` | `(row:T) => Action[]` | — | per-row kebab menu (gated by role) |
| `selection` | `string[]` | — | optional multi-select |
| `realtime` | `string` | — | event family to subscribe (e.g. `deployments.deployment.`) — updates rows in place |
| `isLoading` | `boolean` | `false` | shows skeleton rows |
| `emptyState` | `EmptyStateProps` | — | shown when `rows.length === 0 && !isLoading` |
| `density` | `'compact' \| 'comfortable'` | `'comfortable'` | — |

## 3. Visual anatomy
```
[Filter bar]                                  [refresh · columns · density]
┌──────────────────────────────────────────────────────────────┐
│ ☐  Name ▲   Status       Region   Created   Updated   ⋯  │  ← header (sortable)
├──────────────────────────────────────────────────────────────┤
│ ☐  my-app   ● active     eu-west  2d ago    1h ago    ⋯  │  ← row
│ ☐  api      ● building   eu-west  3d ago    1d ago    ⋯  │
│ ☐  docs     ◐ archived   us-east  5d ago    1d ago    ⋯  │
│                                              1–25 of 73  │  ← pagination
└──────────────────────────────────────────────────────────────┘
```

## 4. States (full matrix)
| State | Visual | Behavior |
|---|---|---|
| Idle | rows render with real data | sortable/filterable/clickable |
| Loading (first) | 8 skeleton rows (`animate-pulse`) | nothing clickable; no spinner |
| Loading (refresh) | current rows + faint top-progress bar | sortable/clickable |
| Empty (zero) | `EmptyState` with CTA | no pagination chrome |
| Empty (filtered) | `EmptyState` "No matches for <filter> — clear filters" | button to reset |
| Error (initial) | inline error card + retry | retry hits `onPageChange(1)` |
| Selection (active) | checkbox column, count chip in footer, bulk-action menu | "Deploy selected" / "Delete selected (N)" |
| Realtime (update) | row patches in place; reorder with subtle transition; **no full re-fetch** | toast if the row left the current page |
| Row disabled (e.g. archived) | row greyed; kebab shows "Reactivate" | — |
| Destructive row-action | opens `ConfirmDialog` (type-to-confirm) | — |
| Overflow (long identifiers) | truncate middle (`my…app-2`); hover → tooltip with full value + copy | — |

## 5. Variants
- **compact** — 32 px row, no description, used for logs/messages.
- **comfortable** — 56 px row, supports description cell, used for entities.

## 6. Interactions
Click row → `rowHref(row)`; click cell button → no row nav. Header click → sort (3-state: asc →
desc → none). Column resize via drag. Selection: ⌘/Shift-click for range. ⌘R = refresh. `/` =
focus filter (UX §12).

## 7. Accessibility
`<table role="grid">` with `aria-sort` on each column header. Cells use `aria-rowindex`/`aria-colindex`
on the row pattern. Selection announced via `aria-live="polite"`. Sort changes announce "sorted by
{name}, {direction}." Reduced-motion disables the reorder transition.

## 8. Telemetry
Sort/filter/page changes emit `*.list.changed` (for the analytics pipeline); row actions emit the
respective `*.action` event.

## 9. Cross-references
Used in: every list in the screen inventory (Deployments, Functions, Databases, Queues, Messages,
Cron Runs, Logs, Members, Invitations, API Keys, Sessions, Logs Stream, Alerts, Backups, etc.).
Always realtime-subscribed when an event family exists.

## 10. Acceptance
Initial load = skeleton, never a full-page spinner. Realtime = row patch, not re-fetch. Selection
count and bulk-action menu always accurate. Filter bar reflects URL state and survives reload
(UX §4). Empty state is the same `EmptyState` everywhere (consistency). Reduced-motion = no animation.
