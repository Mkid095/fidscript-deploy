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

---

## Inputs — forms, fields, editors

| Component | Category | Screens | Spec |
|---|---|---|---|
| `TextField` | inputs | all forms | `textfield.md` ✅ |
| `Select` | inputs | New-project, New-deployment, New-function (runtime), New-database (env), etc. | `select.md` ✅ |
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
| `CodeBlock` | display | Logs, Docs | `code-block.md` ✅ |

## Containers — tables, drawers, sheets

| Component | Category | Screens | Spec |
|---|---|---|---|
| `DataTable` | containers | every list (Deployments, Functions, Databases, Queues, Messages, Cron Runs, Logs, Audit, …) | `data-table.md` ✅ |
| `Drawer` (right rail) | containers | entity detail side panels | `drawer.md` ✅ |
| `FilterBar` | containers | every list (search + status + time) | `filter-bar.md` ✅ |

## Overlays — modals, dialogs, sheets

| Component | Category | Screens | Spec |
|---|---|---|---|
| `Modal` (centered) | overlays | Create-project, New-deployment, New-function, New-database, New-bucket, New-channel, New-queue, New-cron, Add-domain, Reset-password, Force-change, etc. | `modal.md` ✅ |
| `ConfirmDialog` (destructive, **type-to-confirm**) | overlays | Delete project, Delete deployment, Rotate creds, Drop DB, Force-delete mailbox, Cancel active deploy, Danger Zone actions | `confirm-dialog.md` ✅ |
| `Sheet` (bottom mobile) | overlays | mobile tab nav | `sheet.md` ✅ |

## Navigation — header, sidebar, chrome

| Component | Category | Screens | Spec |
|---|---|---|---|
| `AppHeader` | nav | every authenticated screen | `app-header.md` ✅ |
| `ProjectSwitcher` | nav | every authenticated screen | `project-switcher.md` ✅ |
| `CommandPalette` (⌘K) | nav | global | `command-palette.md` ✅ |
| `Sidebar` | nav | every project dashboard | `sidebar.md` ✅ |
| `Breadcrumbs` | nav | every nested screen | `breadcrumbs.md` ✅ |
| `NotificationBell` | nav | every authenticated screen | `notification-bell.md` ✅ |
| `AccountMenu` | nav | every authenticated screen | `account-menu.md` ✅ |
| `MobileTabBar` | nav | mobile project dashboard | `mobile-tab-bar.md` ✅ |

## Feedback — toasts, empties, errors, skeletons

| Component | Category | Screens | Spec |
|---|---|---|---|
| `Toast` (success/error/sticky) | feedback | every mutation | `toast.md` ✅ |
| `EmptyState` | feedback | every empty list | `empty-state.md` ✅ |
| `ErrorState` | feedback | every failed load / failed action | `error-state.md` ✅ |
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
Implementation can begin; agents reading this catalog will find every component's state matrix,
props, accessibility rules, and cross-references documented.

Components are organized by category: inputs (8) · display (7) · containers (3) · overlays (3) ·
nav (8) · feedback (5) · domain (7) = 41 entries (some categories count their variants).

When a new component is needed, copy `_template.md`, follow the 10 sections, and add a row to
this index.