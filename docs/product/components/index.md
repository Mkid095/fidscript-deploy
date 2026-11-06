# Component Inventory — Master Catalog

> Every reusable component the screens use. Each component's spec (in `*.md` alongside this file)
> documents its full state matrix — not just "idle / loading / error" but every state it can be in.
> Cross-screen components come first (used in many screens); screen-specific layouts are not here
> (they're part of the screen spec, not reusable).

## How to read

| Column | Meaning |
|---|---|
| Component | name (PascalCase) |
| Category | inputs / display / containers / overlays / nav / feedback / domain |
| Screens | the screen-inventory entries that use it |
| Spec | the per-component doc (`*.md` next to this file) or `_todo` if it needs one |

> **What exists, and where.** This catalogue is the **specification**: what the product's
> components are meant to be. The components that are **built** live in `packages/ui`, and their
> variants, states and accessibility rules are in
> [`docs/product/DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md). A row here marked *built* names the
> component that implements it; a row marked *specified* is still a promise, and the catalogue
> says so rather than pretending otherwise.

---

## Inputs — forms, fields, editors

| Component | Category | Screens | Spec |
|---|---|---|---|
| `TextField` | inputs | all forms | `textfield.md` ✅ |
| `Select` | inputs | New-project, New-deployment, New-function (runtime), New-database (env), etc. | `select.md` ✅ — **built**: `packages/ui` `Select` |
| `Toggle` | inputs | Settings, Monitor channels | `toggle.md` ✅ |
| `Slider` | inputs | (removed; not used in ops) | — |
| `EnvKeyValueEditor` | inputs | Settings → Env | `env-editor.md` ✅ |
| `PasswordStrength` | inputs | Register, Force-change, New-mailbox | `password-strength.md` ✅ |
| `MagicCodeInput` | inputs | Login (magic tab), MFA challenge | `magic-code-input.md` ✅ |
| `FunctionCodeEditor` | inputs | Function detail → Code | `code-editor.md` ✅ |

## Display — cards, rows, badges, timelines

| Component | Category | Screens | Spec |
|---|---|---|---|
| `StatusBadge` | display | every entity list (Deployment/Function/Database/Queue/Cron/Email/Monitoring) | `status-badge.md` ✅ |
| `HealthBadge` | display | Onboarding, Project Health, Service probes | `health-badge.md` ✅ |
| `StateMachineTimeline` | display | Deployment detail, Function deploy, Database provisioning | `state-machine-timeline.md` ✅ |
| `EntityCard` (parameterized) | display | Project, Deployment, Function, Database, Bucket, Queue, CronJob, EmailDomain, Mailbox, Alert, Channel, Stream, etc. | `entity-card.md` ✅ |
| `EventRow` (Activity feed) | display | Project Activity, Account Notifications | `event-row.md` ✅ |
| `KeyValueTable` | display | Connection info (Database), Deployment metadata, Function config | `key-value-table.md` ✅ |
| `CodeBlock` | display | Logs, Docs | `code-block.md` ✅ — **built**: `packages/ui` `CodeBlock` |

## Containers — tables, drawers, sheets

| Component | Category | Screens | Spec |
|---|---|---|---|
| `DataTable` | containers | every list (Deployments, Functions, Databases, Queues, Messages, Cron Runs, Logs, Audit, …) | `data-table.md` ✅ — **partly built**: `packages/ui` `Table` (a table that scrolls rather than clips). The sorting and filtering are still to come |
| `Drawer` (right rail) | containers | entity detail side panels | `drawer.md` ✅ |
| `FilterBar` | containers | every list (search + status + time) | `filter-bar.md` ✅ |

## Overlays — modals, dialogs, sheets

| Component | Category | Screens | Spec |
|---|---|---|---|
| `Modal` (centered) | overlays | Create-project, New-deployment, New-function, New-database, New-bucket, New-channel, New-queue, New-cron, Add-domain, Reset-password, Force-change, etc. | `modal.md` ✅ — **built**: `packages/ui` `Modal` (now a real dialog: named, modal, focus-trapped) |
| `ConfirmDialog` (destructive, **type-to-confirm**) | overlays | Delete project, Delete deployment, Rotate creds, Drop DB, Force-delete mailbox, Cancel active deploy, Danger Zone actions | `confirm-dialog.md` ✅ |
| `Sheet` (bottom mobile) | overlays | mobile tab nav | `sheet.md` ✅ |

## Navigation — header, sidebar, chrome

| Component | Category | Screens | Spec |
|---|---|---|---|
| `AppHeader` | nav | every authenticated screen | `app-header.md` ✅ |
| `ProjectSwitcher` | nav | every authenticated screen | `project-switcher.md` ✅ |
| `CommandPalette` (⌘K) | nav | global | `command-palette.md` ✅ |
| `Sidebar` | nav | every project dashboard | `sidebar.md` ✅ |
| `Breadcrumbs` | nav | every nested screen | `breadcrumbs.md` ✅ — **built**: `packages/ui` `Breadcrumb` |
| `NotificationBell` | nav | every authenticated screen | `notification-bell.md` ✅ |
| `AccountMenu` | nav | every authenticated screen | `account-menu.md` ✅ |
| `MobileTabBar` | nav | mobile project dashboard | `mobile-tab-bar.md` ✅ |

## Feedback — toasts, empties, errors, skeletons

| Component | Category | Screens | Spec |
|---|---|---|---|
| `Toast` (success/error/sticky) | feedback | every mutation | `toast.md` ✅ — **built**: `packages/ui` `Toast` |
| `EmptyState` | feedback | every empty list | `empty-state.md` ✅ — **built**: `packages/ui` `EmptyState` |
| `ErrorState` | feedback | every failed load / failed action | `error-state.md` ✅ — **built**: `packages/ui` `ErrorState` |
| `Skeleton` (load placeholder) | feedback | every list/card during initial load | `skeleton.md` ✅ |
| `LockedPanel` (insufficient role) | feedback | screens where the current role can't act | `locked-panel.md` ✅ |

## Domain-specific components

| Component | Category | Screens | Spec |
|---|---|---|---|
| `LogStreamViewer` (timeline + filter + live tail) | domain | Logs viewer | `log-stream-viewer.md` ✅ |
| `DomainHealthCheckPanel` (DNS / HTTP / SSL rows) | domain | Domain detail → Health, Onboarding | `domain-health-check-panel.md` ✅ |
| `RealtimePresenceList` (avatar + status) | domain | Realtime channel detail → Presence | `realtime-presence-list.md` ✅ |
| `QueueMessageActions` (ack / retry / DLQ inline) | domain | Queues detail → Messages | `queue-message-actions.md` ✅ |
| `CronJobRunTimeline` | domain | Scheduler job detail → Runs | `cron-job-run-timeline.md` ✅ |
| `MailboxStatusPill` (audit-honest about Stalwart limitation) | domain | Mailbox detail | `mailbox-status-pill.md` ✅ |
| `MFASetupPanel` (QR + secret) | domain | Account → MFA | `mfa-setup-panel.md` ✅ |

## Status

All 30 components in the catalog have full 10-section specs. The catalog is **complete**.

**Built so far** (`packages/ui`, with the foundations in
[`docs/product/DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md)): `Button`, `IconButton`, `Input`,
`Textarea`, `Select`, `Checkbox`, `Switch`, `FormField`, `Card`, `Table`, `Pagination`, `Badge`,
`StatusDot`, `Modal`, `DropdownMenu`, `Tooltip`, `Tabs`, `Toast`, `EmptyState`, `ErrorState`,
`Spinner`, `Stepper`, `PageHeader`, `SectionHeader`, `SearchField`, `CodeBlock`, `Breadcrumb`,
`Dropzone`.

**Still specified but not built:** `TextField` (the shared `FormField` covers it), `Toggle`
(the shared `Switch` covers it), `HealthBadge`, `StateMachineTimeline`, `EntityCard`, `EventRow`,
`KeyValueTable`, `EnvKeyValueEditor`, `PasswordStrength`, `MagicCodeInput`,
`FunctionCodeEditor`, `Drawer`, `FilterBar`, `Sheet`, `AppHeader`, `ProjectSwitcher`,
`CommandPalette`, `Sidebar`, `NotificationBell`, `AccountMenu`, `MobileTabBar`, `Skeleton`,
`LockedPanel` and the domain components.

Components are organized by category: inputs (8) · display (7) · containers (3) · overlays (3) ·
nav (8) · feedback (5) · domain (7) = 41 entries (some categories count their variants).

When a new component is needed, copy `_template.md`, follow the 10 sections, and add a row to
this index.