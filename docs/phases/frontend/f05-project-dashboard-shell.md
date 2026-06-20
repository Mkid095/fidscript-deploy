# F05 — Project Dashboard Shell (full spec)

> **Status:** ⏳ Spec complete — pending approval.
> **Connects to:** backend `PROJ-*` inventory (`docs/phases/frontend/backend/projects-deployments-domains.md`)
> and the realtime event catalog. Cross-references F04 (the workspace root + create flow lands the user
> inside this shell) and F06–F11 (every per-service screen renders inside this chrome). Navigation source
> of truth: `docs/product/navigation.md`.

## 1. Purpose
The per-project operator console. The consistent shell — header, sidebar, breadcrumbs, context bar,
command palette — that wraps every per-project screen (Deployments, Functions, Databases, Storage,
Realtime, Queues, Scheduler, Email, Domains, Monitoring, Logs, Settings, MCP). Without it, every
service screen would reinvent navigation; with it, the user learns the chrome once.

## 2. Business Goal
Match the operator-console feel of Vercel / Linear: open a project, every section is one click
away in a stable sidebar; global search reaches anything in two keystrokes (⌘K); the project
context (region, status, last deploy) is **always visible**, never inferred. The shell is the
single most-reused surface in the dashboard — get it right and the per-service screens inherit the
quality; get it wrong and the per-service screens fight it.

## 3. Personas
- **Solo dev** — lives inside one project for weeks; the shell is their home.
- **Enterprise admin** — switches between 12 projects per day; the **project switcher** is the
  most-used control. The shell must be a **stable anchor** across project switches — the
  sidebar doesn't re-render jarringly; the URL updates; the chrome stays.
- **Viewer / read-only teammate** — same shell, no destructive controls, no Settings/MCP keys.
- **On-call responder** — opens an alert notification; the shell drops them at `/projects/:id/health`
  with the most recent incident highlighted.

## 4. Complete User Journey
```
Click a project card on /dashboard (F04) → /dashboard/projects/:id
  → shell renders: header + sidebar (Deployments preselected) + content area
  → header: project switcher shows "<project name>"; global search ⌘K available; notifications bell
    has the unread count for this project; account menu (avatar) is in the top right.
  → sidebar: 14 items per navigation.md. The current section is highlighted. Permissions-chrome
    (Settings/MCP) is greyed for viewer/developer roles.
  → context bar: "prod • <project-name> • last deploy <X> ago • <active URL>" with quick actions
    (Restart · Open URL · Copy URL).
  → content area: the default tab is Deployments (most common first task).
Switch project via header switcher:
  → modal opens with all user's projects (search + role badges + "+ New project").
  → click another project → URL becomes /dashboard/projects/<other> → shell re-renders content
    area, sidebar stays the same shape, project switcher updates.
Navigate to a section:
  → click sidebar item → URL updates, content area re-renders, breadcrumb updates.
Search ⌘K:
  → command palette opens; type "deploy" → suggestions: "Deploy this branch", "Go to Deployments",
    "Roll back to last success". Greyed entries show "requires admin".
Logout:
  → account menu → Sign out → /login.
```

## 5. Information Architecture
- `/dashboard/projects/:id` — the project shell root. Redirects to `?section=deployments`
  (or whichever the last-visited section was, persisted in `localStorage`).
- `/dashboard/projects/:id/<section>` — one of 14 sections (`deployments | functions | databases
  | storage | realtime | queues | scheduler | email | domains | monitoring | logs | activity
  | health | settings | mcp`).
- `/dashboard/projects/:id/<section>/<resource>` — a specific resource under a section
  (e.g. `…/deployments/d-abc123`).
- The shell **always** lives at the URL prefix `/dashboard/projects/:id`; the **section** is a
  query param or path segment, not a route group.
- The shell is rendered by `app/(app)/projects/[projectId]/layout.tsx` — a single Next.js layout
  that wraps every per-project screen.

## 6. Screen Specifications
- **`/dashboard/projects/:id`** — the shell root. Renders the chrome + the default section
  (Deployments, or the persisted last section).
- **Header (`<AppHeader>`)** — fixed top, 56px tall, full-bleed `bg-ink-900`:
  - **Logo** (left) → click → `/dashboard` (the workspace root).
  - **Project switcher** — current project name + dropdown caret. Click → `<ProjectSwitcher>`
    modal: search input, list of user's projects (name, role badge, last activity), "+ New
    project" footer button.
  - **Breadcrumbs** — `Projects › <project-name> › <Section> › <Resource>`. The "Projects" crumb
    is the workspace root; project-name is the current shell; section is the sidebar item;
    resource is the specific entity (deployment id, function name, etc.).
  - **Global search** (⌘K hint visible) — click → `<CommandPalette>` opens.
  - **Notifications** — bell icon + unread count badge. Click → dropdown of the last 20 events
    for the current project. Click an event → navigate to the resource.
  - **Account menu** — avatar. Click → `<AccountMenu>` dropdown: Profile, Sessions, API Keys
    (platform-level `fsk_…`), Theme, Sign out.
- **Sidebar (`<Sidebar>`)** — fixed left, 240px (collapsible to 64px icons). Always visible on
  `lg:` viewports, drawer on `md-`:
  - **14 items**, in display order from `navigation.md`.
  - The current section is highlighted (fire-red accent + bold).
  - The "Projects" item is a special "back to workspace" link at the top (it's the only item
    that exits the shell).
  - Items greyed for the current role (Settings/MCP keys for non-admins; Deploy/Invoke/Stop for
    viewers).
  - Footer: project status indicator (green/yellow/red dot from `SVC-03` health).
- **Context bar** — sits between header and content. Shows the **active resource** when relevant
  (e.g. on `/deployments/d-abc123` shows "Deployment d-abc123 • imageTag • status • URL") with
  inline quick actions (Restart, Open URL, Copy URL, Stop). On the section list view, the context
  bar shows "Project • <name> • <status> • <region> • last deploy <X> ago".
- **Content area** — scrolls independently of the header/sidebar (the chrome is fixed).
- **Mobile**: sidebar becomes a drawer; header simplifies (no breadcrumbs, just back button +
  page title + account avatar); command palette accessible via floating action button.

## 7. Component Specifications
- `<AppHeader>` ✅ (`docs/product/components/app-header.md` — _todo) — the global header.
- `<ProjectSwitcher>` ✅ (_todo) — the project picker modal.
- `<CommandPalette>` ✅ (_todo) — the ⌘K launcher. See `navigation.md` for the action inventory.
- `<Sidebar>` ✅ (`docs/product/components/sidebar.md` — _todo) — the 14-item sidebar.
- `<Breadcrumbs>` ✅ (_todo) — `Projects › project › section › resource`.
- `<ContextBar>` ✅ (_todo) — the active resource strip with quick actions.
- `<NotificationBell>` ✅ (_todo) — the bell + dropdown of recent events.
- `<AccountMenu>` ✅ (_todo) — the avatar dropdown.
- `<HealthBadge>` ✅ (`docs/product/components/health-badge.md` — _todo) — for the sidebar footer
  status dot.
- `<RoleBadge>` ✅ (_todo) — for the project switcher role pill (owner / admin / developer / viewer).
- Reusable from the kit: `<Button>`, `<Modal>`, `<Toast>`, `<EmptyState>`, `<Skeleton>`, `<ErrorState>`,
  `<LockedPanel>`.

## 8. API Mapping
| Shell action | Endpoint | Inventory ID | Notes |
|---|---|---|---|
| Load the current project | `GET /api/v1/projects/:id` | `PROJ-03` | drives header, context bar, sidebar |
| Project switcher list | `GET /api/v1/projects` | `PROJ-01` | filtered to user's projects |
| Last 20 events for bell | `GET /api/v1/projects/:id/events?limit=20` | derived | new endpoint, or use realtime gateway + replay |
| Project health footer dot | `GET /api/v1/services` | `SVC-01` | or derive from `SVC-03` |
| Current user's role in project | `GET /api/v1/projects/:id/members/:userId` | `PROJ-10` | drives per-role chrome (Settings/MCP gate) |
| Realtime event stream | WS `/realtime?room=project:<id>` | realtime gateway | drives notifications + section live updates |

The shell is **read-heavy** — most of the data is cached after first load and revalidated on
realtime events.

## 9. Backend Integration Map
```
AppHeader:
  → GET PROJ-03 (project name, status, region, lastDeployAt)
  → WS subscribe to project:<id> events → NotificationBell updates
Sidebar:
  → GET SVC-01 / SVC-03 (footer health dot)
  → GET PROJ-10 (current user's role → greys Settings/MCP keys for non-admin)
CommandPalette:
  → GET PROJ-01 (project list for "Go to project")
  → GET PROJ-03 (current project for context)
  → every inventory endpoint a user might run → permission-gated render
ContextBar:
  → GET PROJ-03 (status badge)
  → DEPL-04 (last deploy / last activity timestamp)
NotificationBell:
  → WS subscribe to project:<id> events → render last 20
  → on click → navigate to the resource URL
```

The shell **subscribes to the project room exactly once** on mount; child screens subscribe to
narrower rooms (`deployment:<id>`, `function:<id>`, etc.) without re-subscribing to the parent.

## 10. User Experience Specification
- **The chrome is invisible when it works.** Users don't think about the header, sidebar, or
  breadcrumbs — they think about deployments, functions, and databases. The chrome is a stable
  anchor; the content area is where the eye goes.
- **Switching projects is fast** — `<ProjectSwitcher>` opens in <100ms; navigating to a
  different project is a full client-side transition (Next.js `router.push`), no full reload.
- **The current section is always obvious** — fire-red highlight in the sidebar; breadcrumb
  echoes the section; the URL carries it. A user who lands on a deep link immediately knows
  where they are.
- **Role is reflected in the chrome** — Settings/MCP items are greyed (not hidden) for
  developer/viewer; greyed items have a tooltip explaining "requires admin." The role
  pill in the project switcher shows the user's role in the current project.
- **Last section is remembered** — when a user returns to `/dashboard/projects/:id`, the
  shell opens the last section they visited (localStorage key
  `fidscript.lastSection.<projectId>`), not always Deployments.
- **Realtime updates are ambient** — the notification bell badge increments on relevant events;
  the section content (deployments, functions) updates in place without a page reload.
- **Keyboard-first** — ⌘K opens search; ⇧⌘K opens notifications; Esc closes any open modal;
  `g d` / `g f` / `g b` jump to Deployments/Functions/Databases (Vim-style mnemonic, optional).
- **Focus order** is logical: skip-to-content link is the first focusable element; the rest
  follows DOM order. Modals trap focus.
- **Reduced-motion honored** — no slide-in animations on the sidebar; no pulse on the health
  dot. Layout still updates.
- **A11y**: every interactive element has a visible focus ring; nav landmarks
  (`<nav>`, `<main>`, `<aside>`, `<header>`) wrap their content; the sidebar is keyboard-navigable.

## 11. Design Philosophy
- **Configure once.** The user doesn't customize the chrome. Tokens are locked; the layout is
  the layout. Per-project theming is a future premium feature — not in F05.
- **Beginner first.** The 14 sidebar items are all labeled in plain language. Deployments,
  Functions, Databases, Storage — not "CaaS", "FaaS", "DBaaS". Tooltips on hover provide the
  one-line "what is this" copy.
- **Production-ready by default.** Dark theme, focus ring, reduced-motion, a11y — all on by
  default. The chrome renders identically for every user.
- **Everything observable.** The notification bell + footer health dot + context-bar last-deploy
  timestamp give the user a glance-able read on the project's health. If something is wrong, the
  shell **shows it** without asking.
- **One dashboard.** The chrome is the same in every project; switching projects is a context
  change, not a layout change. The user re-learns nothing.

## 12. Configuration Philosophy
- **Zero user-tunable chrome.** The header, sidebar, context bar are the platform's contract
  with the user; they're not configurable.
- **The only per-user state** the shell stores:
  - `localStorage` `fidscript.theme` — light/dark/system (from F00).
  - `localStorage` `fidscript.lastSection.<projectId>` — last visited section.
  - `localStorage` `fidscript.sidebarCollapsed` — sidebar collapsed/expanded.
- The shell is **stateless across reloads** beyond these three keys. A user who clears localStorage
  sees the platform default (Deployments preselected, sidebar expanded).

## 13. Automation Rules
- **Project switcher recent projects** — last 5 projects visited (from `localStorage` `fidscript.recentProjects`),
  shown at the top of the modal.
- **Notification badge** auto-clears when the user opens the bell dropdown.
- **Footer health dot** polls `SVC-03` every 30s (debounced); turns red if the project's primary
  deployment is not healthy.
- **Breadcrumb auto-generation** — derived from the URL, never stored.
- **Sidebar collapse** persisted in `localStorage`; default is expanded.
- **Role re-fetch** on focus (when the user returns to the tab) — ensures stale role doesn't
  persist after a project-member change elsewhere.

## 14. Endpoint Documentation
- `GET /api/v1/projects/:id` (`PROJ-03`) — drives header + context bar. Returns the full project
  (name, slug, type, status, region, lastDeployAt, customDomains, …). The shell uses only the
  header fields; child sections request their own scoped data.
- `GET /api/v1/projects` (`PROJ-01`) — the project switcher list, filtered to user's projects.
  Returns `{ id, name, slug, role, lastActivityAt }` per row (a **lightweight** projection —
  the switcher must not fetch every project's full record).
- `GET /api/v1/projects/:id/members` (`PROJ-10`) — current user's role. The shell greys
  Settings/MCP keys for non-admin.
- `GET /api/v1/services` (`SVC-01`) / `GET /api/v1/health` (`SVC-03`) — for the footer health dot.
- WS `/realtime?room=project:<id>` — the shell subscribes once; events for the project arrive
  in real time. The shell routes events to the NotificationBell; child screens subscribe to
  narrower rooms as needed.

## 15. Feature Dependency Graph
- **Hard**: F00 (design system), F02 (auth — needs the session), F04 (the workspace root
  navigates into this shell).
- **Hard backend**: `PROJ-01/03/10`, `SVC-01/03`, the realtime gateway, the events table.
- **Gated by F05**: F06, F07, F08, F09, F10, F11 (every per-service screen renders inside
  this shell). The shell must exist before any of them.
- **Backend gaps that affect this screen**:
  - `PROJ-01` does not return a per-row `role` or `lastActivityAt` — the spec asks for it. The
    shell cannot render the project switcher role pill or the per-project "last activity"
    timestamp until the endpoint is extended. This is a **backend prereq for F05**.
  - The "last 20 events for the bell" endpoint does not exist as a single HTTP call today.
    The shell will use the realtime gateway's replay buffer (or a new endpoint) — pending
    verification in the F05 implementation PR.

## 16. Acceptance Criteria
1. Clicking a project card on `/dashboard` navigates to `/dashboard/projects/:id`; the shell
   renders with header, sidebar, and the default section (Deployments or the persisted last
   section).
2. The header shows the project name in the project switcher; clicking it opens the modal
   with all user's projects, search, role badges, and a "+ New project" footer.
3. The sidebar shows the 14 items in the documented order; the current section is highlighted;
   the "Projects" item at the top navigates back to the workspace root.
4. Selecting a different project via the project switcher navigates client-side to the new
   project shell; the chrome (header, sidebar shape, context bar) re-renders without a
   full page reload.
5. The notification bell shows the unread count for the current project; clicking it opens
   a dropdown of the last 20 events; clicking an event navigates to the resource.
6. The footer health dot reflects `SVC-03`; turns red when the project is unhealthy.
7. ⌘K opens the command palette; the action inventory matches `navigation.md`; permission-gated
   entries are greyed with a tooltip explaining why.
8. The breadcrumb follows the canonical form (`Projects › <name> › <Section> › <Resource>`);
   clicking a crumb navigates; the rightmost is the page title.
9. The shell renders the role correctly: Settings + MCP keys are greyed for developer/viewer
   with a tooltip "requires admin/owner."
10. The shell is responsive: on `lg:` the sidebar is visible; on `md-` the sidebar is a drawer;
    the header simplifies (no breadcrumbs on mobile, just back + title + avatar).
11. Reduced-motion preference is respected (no slide animations, no pulse on the health dot).
12. Skip-to-content link is the first focusable element; nav landmarks wrap the chrome.
13. A11y: every interactive element has a visible focus ring; modals trap focus.
14. The last visited section is persisted per project; on return, the shell opens that section.
15. The shell does not duplicate data fetches across sections; child sections re-use the
    `Project` record from the shell's context.
16. `pnpm --filter @fidscript/dashboard build` clean; this spec updated to match shipped behavior.

## Change log
- 2026-06-20 — Initial full 16-section spec. Identifies 2 backend prereqs: `PROJ-01` must return
  per-row `role` + `lastActivityAt`; a "last 20 events" endpoint (or realtime-gateway replay
  buffer) must exist for the notification bell.
