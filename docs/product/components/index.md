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
| `TextField` | inputs | all forms | `textfield.md` _todo_ |
| `Select` | inputs | New-project, New-deployment, New-function (runtime), New-database (env), etc. | _todo_ |
| `Toggle` | inputs | Settings, Monitor channels | _todo_ |
| `Slider` | inputs | Cost calculator (removed; not used in ops) | — |
| `EnvKeyValueEditor` | inputs | Settings → Env | `env-editor.md` _todo_ |
| `PasswordStrength` | inputs | Register, Force-change, New-mailbox | `password-strength.md` _todo_ |
| `MagicCodeInput` | inputs | Login (magic tab), MFA challenge | `magic-code-input.md` _todo_ |
| `FunctionCodeEditor` | inputs | Function detail → Code | `code-editor.md` _todo_ |

## Display — cards, rows, badges, timelines

| Component | Category | Screens | Spec |
|---|---|---|---|
| `StatusBadge` | display | every entity list (Deployment/Function/Database/Queue/Cron/Email/Monitoring) | `status-badge.md` ✅ |
| `HealthBadge` | display | Onboarding, Project Health, Service probes | `health-badge.md` ✅ |
| `StateMachineTimeline` | display | Deployment detail, Function deploy, Database provisioning | `state-machine-timeline.md` ✅ |
| `EntityCard` (parameterized) | display | Project, Deployment, Function, Database, Bucket, Queue, CronJob, EmailDomain, Mailbox, Alert, Channel, Stream, etc. | `entity-card.md` ✅ |
| `EventRow` (Activity feed) | display | Project Activity, Account Notifications | `event-row.md` _todo_ |
| `KeyValueTable` | display | Connection info (Database), Deployment metadata, Function config | _todo_ |
| `CodeBlock` | display | Logs, Docs | _todo_ |

## Containers — tables, drawers, sheets

| Component | Category | Screens | Spec |
|---|---|---|---|
| `DataTable` | containers | every list (Deployments, Functions, Databases, Queues, Messages, Cron Runs, Logs, Audit, …) | `data-table.md` ✅ |
| `Drawer` (right rail) | containers | entity detail side panels | _todo_ |
| `FilterBar` | containers | every list (search + status + time) | _todo_ |

## Overlays — modals, dialogs, sheets

| Component | Category | Screens | Spec |
|---|---|---|---|
| `Modal` (centered) | overlays | Create-project, New-deployment, New-function, New-database, New-bucket, New-channel, New-queue, New-cron, Add-domain, Reset-password, Force-change, etc. | _todo_ |
| `ConfirmDialog` (destructive, **type-to-confirm**) | overlays | Delete project, Delete deployment, Rotate creds, Drop DB, Force-delete mailbox, Cancel active deploy, Danger Zone actions | `confirm-dialog.md` ✅ |
| `Sheet` (bottom mobile) | overlays | mobile tab nav | _todo_ |

## Navigation — header, sidebar, chrome

| Component | Category | Screens | Spec |
|---|---|---|---|
| `AppHeader` | nav | every authenticated screen | `app-header.md` ✅ |
| `ProjectSwitcher` | nav | every authenticated screen | `project-switcher.md` ✅ |
| `CommandPalette` (⌘K) | nav | global | `command-palette.md` ✅ |
| `Sidebar` | nav | every project dashboard | `sidebar.md` ✅ |
| `Breadcrumbs` | nav | every nested screen | _todo_ |
| `NotificationBell` | nav | every authenticated screen | _todo_ |
| `AccountMenu` | nav | every authenticated screen | _todo_ |
| `MobileTabBar` | nav | mobile project dashboard | _todo_ |

## Feedback — toasts, empties, errors, skeletons

| Component | Category | Screens | Spec |
|---|---|---|---|
| `Toast` (success/error/sticky) | feedback | every mutation | `toast.md` ✅ |
| `EmptyState` | feedback | every empty list | `empty-state.md` ✅ |
| `ErrorState` | feedback | every failed load / failed action | _todo_ |
| `Skeleton` (load placeholder) | feedback | every list/card during initial load | _todo_ |
| `LockedPanel` (insufficient role) | feedback | screens where the current role can't act | _todo_ |

## Domain-specific components

| Component | Category | Screens | Spec |
|---|---|---|---|
| `LogStreamViewer` (timeline + filter + live tail) | domain | Logs viewer | `log-stream-viewer.md` ✅ |
| `DomainHealthCheckPanel` (DNS / HTTP / SSL rows) | domain | Domain detail → Health, Onboarding | _todo_ |
| `RealtimePresenceList` (avatar + status) | domain | Realtime channel detail → Presence | _todo_ |
| `QueueMessageActions` (ack / retry / DLQ inline) | domain | Queues detail → Messages | _todo_ |
| `CronJobRunTimeline` | domain | Scheduler job detail → Runs | _todo_ |
| `MailboxStatusPill` (audit-honest about Stalwart limitation) | domain | Mailbox detail | _todo_ |
| `MFASetupPanel` (QR + secret) | domain | Account → MFA | _todo_ |

## What comes next

Per-component specs are written **in implementation order** (F00 → F11) so a component spec exists
before its first use. The first batch (with the first screens) covers: Button + Modal + Toast + EmptyState
+ DataTable + Sidebar + StatusBadge + ConfirmDialog. They are specced next, in parallel with the F00
phase spec.