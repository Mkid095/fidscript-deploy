# Navigation Architecture — FIDScript

> **Purpose.** The complete information architecture: where everything lives, how you get there, and
> what you can do at each destination. Every screen in every service spec must be reachable from
> exactly one primary navigation entry below (no orphan pages, no duplicate homes).

## Global chrome (every authenticated page)

- **Top header** — logo (→ `/dashboard` workspace root), **project switcher** (current project; opens a searchable picker with all projects + role badges + "+ New project"), **global search** (⌘K → opens the command palette), **notifications** (bell, unread count, dropdown of the last 20 events for the current project), **account menu** (avatar → Profile, Sessions, API Keys, Theme, Sign out).
- **Command palette** (⌘K / Ctrl+K) — universal launcher: jump to any project/screen, run frequent actions ("Deploy this branch", "Open logs", "Rotate DB creds", "Invite a teammate"). Actions are permission-aware (greyed out if you lack the role) and parameterized (the active project is the default; you can target another).
- **Breadcrumbs** — *Project › Section › Resource*. Clickable segments; the rightmost segment is the page title (not clickable).
- **Context bar** (above the page content, when relevant) — shows the active resource with status ("prod • my-app • last deploy succeeded 2m ago") and quick actions (Restart, Open URL, Copy).

## Project dashboard sidebar

The sidebar is **per-project**. Selecting a project in the switcher changes the sidebar to that
project's sections. The sidebar collapses to icons on narrow viewports; on mobile it's a drawer.

The 14 sidebar items, in display order:

### 1. Projects (workspace root, not per-project)

- **Purpose:** the workspace home — list + create projects, recent activity.
- **Entry:** click the logo (or hit ⌘K → "Go to Projects").
- **Children:** none — it's the workspace root.
- **Permissions:** viewable by any authenticated user (sees only projects they're a member of); create
  needs platform auth (not per-project role).
- **Empty state:** "No projects yet — create your first project" with a primary CTA.
- **Touches:** `PROJ-01` (list), `PROJ-02` (create modal).

### 2. Deployments

- **Purpose:** the deployment lifecycle for this project — list, create, watch, rollback.
- **Entry:** sidebar → Deployments (default tab inside an opened project).
- **Children:** tabs *Active / All / Logs / Build Config*. Logs is a sub-route
  (`/dashboard/projects/:id/deployments/:id/logs`); Build Config is a sub-route (`/build-config`).
- **Permissions:** any member can list/view/create; stop/restart/rollback = any member (deployments
  ignore role — document the rationale).
- **Empty state:** "No deployments yet — paste a git URL to deploy." Inline paste box (the only
  empty state that *does* the action without a modal).
- **Touches:** `DEPL-01..10`.

### 3. Functions

- **Purpose:** edge functions — create, deploy code, invoke, view logs.
- **Entry:** sidebar → Functions.
- **Children:** tabs *Functions / Versions*; clicking a function → detail (tabs *Code / Deploy /
  Invoke / Logs*).
- **Permissions:** any member.
- **Empty state:** "No functions yet — your code runs in a sandboxed, no-network container."
  CTA "Create function".
- **Touches:** `FN-01..09`.

### 4. Databases

- **Purpose:** managed Postgres — provision, connect, backup, restore, rotate.
- **Entry:** sidebar → Databases.
- **Children:** list of databases; click → detail (tabs *Overview / Connection / Backups / Settings*).
- **Permissions:** any member (list/connect); rotate credentials / restore / delete — any member
  (currently no role gate; document the gap).
- **Empty state:** "No databases yet — provision Postgres with one click." CTA "Create database"
  opens the modal with environment preset (`production | staging | preview | development`).
- **Touches:** `DB-01..11`.

### 5. Storage

- **Purpose:** S3-compatible object storage — buckets, files, presigned URLs.
- **Entry:** sidebar → Storage.
- **Children:** list of buckets; click → file browser (grid + list, drag-and-drop upload,
  presign).
- **Permissions:** any member.
- **Empty state:** "No buckets yet — create one to store files." CTA "Create bucket".
- **Touches:** `STOR-01..08`.

### 6. Realtime

- **Purpose:** channels — broadcast events to connected clients (BaaS pattern: socket.io rooms).
- **Entry:** sidebar → Realtime.
- **Children:** list of channels; click → channel detail (members, presence, recent messages,
  test publish).
- **Permissions:** any member.
- **Empty state:** "No channels yet — create one to broadcast events to connected clients."
- **Touches:** `RT-01..08`.

### 7. Queues

- **Purpose:** durable queues — create, publish, consume, DLQ, stats.
- **Entry:** sidebar → Queues.
- **Children:** list of queues; click → queue detail (tabs *Messages / Stats / Config*); the
  messages tab is the live tail (server-side autonomous worker runs in the background).
- **Permissions:** any member.
- **Empty state:** "No queues yet — durable background work, with retries and DLQ."
- **Touches:** `QUEUE-01..13`.

### 8. Scheduler

- **Purpose:** cron jobs — time-triggered, function/HTTP targets, Redis-locked.
- **Entry:** sidebar → Scheduler.
- **Children:** list of jobs; click → job detail (tabs *Config / Runs / Next run*).
- **Permissions:** any member.
- **Empty state:** "No cron jobs yet — schedule anything that runs on a timer."
- **Touches:** `CRON-01..08`.

### 9. Email

- **Purpose:** mail — domains, mailboxes, aliases, sender identities, API keys, messages.
- **Entry:** sidebar → Email.
- **Children:** tabs *Domains / Mailboxes / Aliases / Identities / API Keys / Messages*.
- **Permissions:** any member.
- **Empty state:** "No email domain yet — add one to send and receive mail." The CTA opens the
  add-domain wizard with the **automatic DKIM/SPF/DMARC setup** surfaced up-front (Principle 1).
- **Touches:** `MAIL-01..34`.

### 10. Domains

- **Purpose:** custom domains + TLS for deployments and platform subdomains.
- **Entry:** sidebar → Domains.
- **Children:** list of domains; click → domain detail (tabs *Overview / DNS / TLS / Email / Health*).
- **Permissions:** any member (read); verify/connect-cloudflare — currently any member (gap: should
  be admin; document).
- **Empty state:** "No custom domains — your deployments already get a free
  `<slug>.apps.<platform-domain>`. Add a custom domain for a clean URL."
- **Touches:** `DOM-01..06`.

### 11. Monitoring

- **Purpose:** metrics, alert rules, alert lifecycle, notification channels.
- **Entry:** sidebar → Monitoring.
- **Children:** tabs *Metrics / Alerts / Channels*.
- **Permissions:** any member (read); create rules / test channels — any member (currently; document
  the gap toward admin-gating).
- **Empty state:** "No metrics yet — record one manually or wire an alert." CTA "Record metric".
- **Touches:** `MON-01..20`.

### 12. Logs

- **Purpose:** unified log streams + a viewer (filter, timeline, search).
- **Entry:** sidebar → Logs.
- **Children:** streams list; click → stream viewer (timeline + filter + search + live tail).
- **Permissions:** any member (read); create streams — any member.
- **Empty state:** "No log streams yet — create one to collect structured logs." Hint: application,
  function, deployment, email, system, audit.
- **Touches:** `LOG-01..11`.

### 13. Settings

- **Purpose:** project-level configuration — env vars, API keys, members, invitations, build config,
  danger zone (suspend / archive / delete).
- **Entry:** sidebar → Settings.
- **Children:** tabs *General / Env / API Keys / Members / Invitations / Build Config / Danger Zone*.
- **Permissions:** General/Env/Build Config — admin/owner; Members/Invitations — owner; API Keys —
  admin/owner; Danger Zone — owner only.
- **Empty state:** rarely empty (project always exists); the inner tabs empty-state per their purpose.
- **Touches:** `PROJ-04/05/06/07/08/11/12/13/14/15/16/17/18/19/20/21`, `DEPL-09/10`.

### 14. MCP

- **Purpose:** expose the platform as MCP tools for LLMs, and surface the per-user API key + tool list.
- **Entry:** sidebar → MCP.
- **Children:** tabs *Tools / API Key / Connect*; *Connect* shows a copy-pasteable snippet for
  Claude/Cursor.
- **Permissions:** any member can read the tool list + copy the snippet; the API key (project-scoped)
  is admin/owner.
- **Empty state:** "MCP server exposes 108 tools across this project." CTA "Generate API key".
- **Touches:** `PROJ-19/20` (API keys), MCP server tool list (see `backend/surfaces.md`).

## Account-level navigation (outside any project)

Reached from the header account menu (not a sidebar item):

- **Profile** — name, avatar (`AUTH-11`).
- **Sessions** — list, revoke single/all (`AUTH-12/13/14`). MFA setup (`AUTH-07/08`) for platform auth.
- **API Keys** (platform-level `fsk_…`) — `AUTH-15/16/17`.
- **Theme** — light/dark/system.
- **Sign out** — `AUTH-04`.

## Public site navigation (unauthenticated)

- `/` (landing) → hero → "Read the docs" (`/docs`) → install command → social proof.
- `/docs/*` — sidebar of doc categories, copy-this-page button, search (later).
- **No links from public site to `/login`** (deliberate, per F01): login is a separate URL concern
  reached only by someone who already has a workspace.

## Command palette (⌘K) — action inventory

The palette groups results by intent:

- **Navigate**: any project, any screen (`/dashboard/projects/<id>/functions/<fn>` etc.).
- **Create**: project, deployment, function, database, storage bucket, queue, cron job, email domain,
  mailbox, alias, alert rule, channel, API key.
- **Run**: redeploy, rollback, invoke function, rotate DB creds, test channel, force-refresh health.
- **Invite**: by email (with role picker inline).
- **Settings jump**: env editor, build config, danger zone (with confirm).

Each entry is permission-gated; greyed-out entries show the reason ("requires admin").

## Breadcrumbs (canonical form)

```
Dashboard › Projects › <project-name> › <Section> › <Resource>
         (when in a project)            (resource name or "<id>")
```

Clicking a crumb navigates without reloading. The last segment is the page title.

## Navigation IA rules

- **Every page has exactly one sidebar entry** (or is a sub-route of one). Orphan pages are a bug.
- **Cross-cutting features** (search, notifications, help) live in the **header**, never the sidebar.
- **Dangerous actions** live in *Settings → Danger Zone*, never in the main flow.
- **Per-project sections never leak across projects** — the sidebar is re-keyed by `projectId`.
- **Mobile:** the sidebar becomes a drawer (same items); the header simplifies; the command palette
  remains available via a floating action button.