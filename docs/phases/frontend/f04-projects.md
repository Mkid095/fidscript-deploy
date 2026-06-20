# F04 — Projects (full spec)

> **Status:** ⏳ Spec complete — pending approval.
> **Connects to:** backend Phase 04 (PROJ-* inventory: `docs/phases/frontend/backend/projects-deployments-domains.md`).
> Cross-references F03 (onboarding → login → projects), F05 (project dashboard shell — the sidebar
> lives inside the project), and the service specs in `docs/product/services/`.

## 1. Purpose
The Projects workspace: the tenant boundary, the list, the create flow. Every per-service
screen (deployments, functions, databases, …) lives **inside** a project. Without F04 there is
nothing to scope Deployments/Functions/Databases/… against.

## 2. Business Goal
Match Supabase / Convex / Firebase project organization: one workspace, many projects, each
isolated, each with its own services. Beat them on simplicity: **one form** (name + type) creates
a project; everything else (env, keys, members, build config, services) is set up afterwards or
auto-managed.

## 3. Personas
- **Installer / solo dev** — creates the first project after first login.
- **Team member (invited)** — arrives via `PROJ-22` accept, lands on the invited project.
- **Enterprise admin** — manages many projects, switches between them frequently.

## 4. Complete User Journey
```
After F02 login (or invitation accept):
  → /dashboard (the workspace root)
    Empty state: "No projects yet — create your first project" + primary CTA.
    Non-empty: grid/list of project cards (DataTable or EntityCard grid).
  → click "Create project" → modal opens
    → name (live slug preview: "my-app" → slug `my-app`)
    → type preset (frontend | backend | worker | cron | docker | static) — choose; UI explains
    → description (optional)
    → "Create" → optimistic close + POST PROJ-02
      → success → toast "Project created" → card animates in → focus moves to the card
      → failure → modal stays open with inline error (duplicate name → "Already exists — try
        <slug>-2")
  → click the new card → /dashboard/projects/:id (F05 — project dashboard shell)
Alternate / error paths:
  → invitation link → /invitations/accept?token → POST PROJ-22 → if first-time: /register with
    email pre-filled → AUTH-01 → accept → land on the invited project.
  → archived/suspended project card → "Reactivate" action (PROJ-08/06) → toast → card moves.
  → delete project (Danger Zone, PROJ-05) → ConfirmDialog (type-to-confirm) → toast.
```

## 5. Information Architecture
- `/dashboard` — the workspace root. **No sidebar.** Top header only.
- `/dashboard/projects/:id` — the project shell (F05). Sidebar appears here.
- `/invitations/accept` — a standalone route (public; gated by token).
- `/dashboard/projects/:id/activity` — the activity feed (cross-cutting). Renders inside the
  project shell.

## 6. Screen Specifications
- **`/dashboard`** — workspace home. Empty state + grid. Header: logo + project switcher (none
  selected until a project is opened; for now shows "No project selected") + global search +
  account menu.
- **`Create project modal`** — focused modal. Fields: name (text), type (select preset), description
  (textarea, optional). Live: slug preview, duplicate-name check (async after typing stops).
  Primary CTA "Create". On submit: optimistic close + POST.
- **`/invitations/accept`** — token from URL → accept or register+accept. Minimal layout.
- **`Project card`** (in the grid): name, type pill, status badge, "Last deploy X ago" (from
  `projects.project.updated` / `deployments.deployment.created` events), member avatars (top N),
  kebab menu (archive / delete).
- **Per-role rendering**: viewer sees cards (no create button); developer sees create; admin/owner
  sees the kebab (delete requires owner).

## 7. Component Specifications
- `<DataTable>` ✅ — the projects list (compact grid or table view; toggle).
- `<EntityCard>` ✅ — the project card.
- `<Button>`, `<Modal>`, `<ConfirmDialog>`, `<Toast>`, `<EmptyState>`, `<Skeleton>`, `<ErrorState>`,
  `<LockedPanel>`, `<HealthBadge>`, `<StateMachineTimeline>`.
- A new `<CreateProjectModal>` (or generic `<CreateModal>` parameterized by form fields).
- A new `<ActivityFeed>` (cross-cutting — used here first, then reused in the project shell).

## 8. API Mapping
| Screen/Action | Endpoint | Inventory ID | Notes |
|---|---|---|---|
| List projects | `GET /api/v1/projects` | `PROJ-01` | filtered to user's projects |
| Create project | `POST /api/v1/projects` | `PROJ-02` | optimistic |
| Get project | `GET /api/v1/projects/:id` | `PROJ-03` | for card details + presence |
| Lifecycle | `POST /…/suspend \| archive \| restore \| delete` | `PROJ-05/06/07/08` | Danger Zone |
| Clone | `POST /…/clone` | `PROJ-09` | copies env (encrypted) |
| Members (list/add/remove) | `GET/POST/DELETE …/members` | `PROJ-10/11/12` | owner-only for add/remove |
| Invitations | `GET/POST/DELETE …/invitations`, `/invitations/accept` | `PROJ-13/14/15/22` | public accept |
| Env (encrypted) | `GET/PUT/DELETE …/env-vars` | `PROJ-16/17/18` | admin for write |
| API keys (`fpk_`) | `GET/POST/DELETE …/api-keys` | `PROJ-19/20/21` | admin for create; raw key shown once |

All mutations are optimistic; reconciliation rolls back on failure with a toast.

## 9. Backend Integration Map
```
CreateProjectModal → sdk.projects.create → POST PROJ-02
  → ProjectsService.create (slug auto-gen, env[] initialized, default BuildConfig via DEPL-09)
  → emits projects.project.created
ActivityFeed → subscribe to project:<id> room + every projects.* event for the workspace
  → realtime streams into the feed (no polling)
Realtime event families (per backend/inventory): projects.project.{created,updated,deleted,
suspended,archived,restored,cloned}, projects.member.{added,removed},
projects.invitation.{created,accepted,revoked}, projects.env_var.{updated,deleted},
projects.api_key.{created,revoked}
```

## 10. User Experience Specification
- **Create flow is one modal, one button.** No multi-step wizard. Name → type → create.
- **Slug is auto-generated** from the name (live preview: "my app" → `my-app`). The user can
  override if they want; UI shows the slug below the name field.
- **Type preset** explains the choice: "frontend" (the most common — a deployed web app),
  "backend" (API + DB), "worker" (long-running, no route), "cron" (scheduled), "docker"
  (arbitrary container), "static" (file server). The default is "frontend".
- **Optimistic create**: the modal closes immediately; the card appears with a brief skeleton
  → real-data fade. On failure, the modal re-opens with the inline error.
- **Activity feed** at `/dashboard/projects/:id/activity` is a reverse-chronological stream of
  every event for the project, realtime-subscribed. Each row: timestamp, actor, event type
  (e.g. `deployments.deployment.succeeded`), link to the resource.
- **Per-role rendering** (per UX spec §8): developer sees "Create" + cards; viewer sees
  cards read-only; admin/owner sees Danger Zone.

## 11. Design Philosophy
- **Configure once.** One form creates a project. Default type is `frontend` (the common case).
- **Beginner first.** Slug is auto-generated. Encryption keys are auto-generated. Default
  BuildConfig is auto-created. The user touches what they need.
- **Production-ready by default.** Env vars are AES-256-GCM at rest. API keys are
  bcrypt-hashed (raw shown once). Members + invitations are token-hashed (7d expiry).
- **Observable.** Activity feed streams every event. Status badges show lifecycle.
- **One dashboard.** Projects live in the workspace root; the project shell (F05) is the
  consistent per-project chrome.

## 12. Configuration Philosophy
- **Per-project settings** (auto-managed by default): name, slug, owner, status, env[], API keys[],
  members[], invitations[].
- **User-tunable at create:** name (required), type (preset, required), description (optional).
- **User-tunable after create:** everything in Settings (F05 navigation) — General / Env / API Keys
  / Members / Invitations / Build Config / Danger Zone.
- **No user touches** encryption keys, internal IDs, the audit log.

## 13. Automation Rules
- **Slug auto-generation** from name (lowercase, replace non-alphanumeric with `-`, trim).
- **Default BuildConfig** auto-created on create (`DEPL-09`).
- **Encryption keys** for env + API keys generated on demand (CryptoService, AES-256-GCM).
- **Invite token** hashed + 7-day expiry.
- **API key** raw value shown once; bcrypt-12 hash stored (PROJ-20; the audit notes `dto:any` —
  the UI validates locally; backend hardening is a separate follow-up).
- **Audit log** for every mutation.

## 14. Endpoint Documentation
Full PROJ-* inventory in `docs/phases/frontend/backend/projects-deployments-domains.md`. Notable
backend gaps (per the audit) that affect this screen:
- **PROJ-20** (`POST …/api-keys`) has no DTO (`@Body() dto: any`). The UI must validate locally.
- **PROJ-14** `role` is `@IsString` (free text), not an enum. The UI must constrain to the
  `admin | developer | viewer` select.
- **DOM-05 / DOM-06** skip project-access checks (any member can connect/delete a domain).
  Unrelated to F04 directly but referenced in F11.

## 15. Feature Dependency Graph
- **Hard:** F00 (design system), F02 (auth — needs the session), F03 (onboarding — first-run
  gate).
- **Hard backend:** the PROJ-* routes (verified working in Phase 04, audited in this session).
- **Gated by F04:** F05 (project dashboard shell), F06–F11 (every per-service screen).
- **Backend gaps** that affect this screen:
  - PROJ-20 API-key DTO; PROJ-14 role enum (both UI-validated locally).
  - The audit also notes `developer`/`viewer` permissions are aspirational — UI greys admin-only
    actions, but several backend routes ignore the role. Document the gap; harden later.

## 16. Acceptance Criteria
1. After first login, `/dashboard` shows the empty state with a "Create your first project" CTA.
2. Clicking Create opens a modal with name (text), type (preset), description (optional). Slug
   preview updates live.
3. Submitting closes the modal optimistically + POSTs `PROJ-02`. Success: toast + card animates
   in. Failure (e.g. duplicate name): modal re-opens with an inline error.
4. The new card renders name, type pill, status badge, "Last activity" (from realtime), and a
   kebab menu (admin/owner only).
5. Clicking the card navigates to `/dashboard/projects/:id` (F05).
6. Invitation link → `/invitations/accept?token=…` → if first-time, redirects to `/register` with
   email pre-filled; if existing, accepts and lands on the project.
7. Activity feed at `/dashboard/projects/:id/activity` shows a live stream of project events
   (`projects.*`, `deployments.*`, `function.*`, …). Created via realtime subscription.
8. Viewer cannot create projects (no "Create" button); developer + admin can.
9. Only owner sees "Delete project" in Danger Zone; admin sees suspend/archive; developer
   sees nothing in Danger Zone.
10. Env vars and API keys are AES-256-GCM at rest (verified via `GET …/env-vars` returning the
    decrypted values, but the wire representation is encrypted).
11. The audit-honest gaps (PROJ-20 DTO, PROJ-14 role free-text) are not surfaced to the user;
    the UI validates locally.
12. `pnpm --filter @fidscript/dashboard build` clean; this spec updated to match shipped
    behavior.

## Change log
- 2026-06-20 — Initial full 16-section spec. Identified the two backend gaps surfaced by the
  audit (`PROJ-20` `dto:any`, `PROJ-14` role free-text) and notes that `developer`/`viewer`
  permissions are aspirational on several routes. Implementation must UI-validate locally
  until those are hardened.