# Screen Spec — `CreateProjectModal`

> Modal overlay on `/dashboard` (F04). Triggered by the "Create project" CTA on the workspace root.

## 1. Purpose
The user creates a new project — the tenant boundary for Deployments, Functions, Databases,
Storage, and every other service. One modal, one form, one button. The principle: **a project
is one form; everything else is set up after.**

## 2. Route + access
- **Route:** overlay on `/dashboard`. No dedicated URL; closes on submit or Esc.
- **Sidebar/header:** no sidebar item; the workspace root's empty state CTA.
- **Permission:** platform auth (`P`). Any signed-in user can create a project.
- **Project scope:** creates a new `Project` row owned by the current user.

## 3. Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Create project                                          [X] │
├─────────────────────────────────────────────────────────────┤
│ Name *                                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ my-app                                                  │ │
│ └─────────────────────────────────────────────────────────┘ │
│ Slug: my-app  (auto-generated, editable inline)             │
│                                                             │
│ Type *                                                      │
│ ┌──────────────────────────┐  ┌──────────────────────────┐  │
│ │ ● Frontend (default)     │  │ ○ Backend                │  │
│ │   A deployed web app     │  │   API + DB               │  │
│ └──────────────────────────┘  └──────────────────────────┘  │
│ ┌──────────────────────────┐  ┌──────────────────────────┐  │
│ │ ○ Worker                 │  │ ○ Cron                   │  │
│ │   Long-running, no route │  │   Scheduled              │  │
│ └──────────────────────────┘  └──────────────────────────┘  │
│ ┌──────────────────────────┐  ┌──────────────────────────┐  │
│ │ ○ Docker                 │  │ ○ Static                 │  │
│ │   Arbitrary container    │  │   File server            │  │
│ └──────────────────────────┘  └──────────────────────────┘  │
│                                                             │
│ Description (optional)                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ The customer-facing dashboard for Acme.                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                          [Cancel]  [ Create project ]       │
└─────────────────────────────────────────────────────────────┘
```

## 4. Sections + states
- **Name**:
  - *Idle*: empty input; the slug preview is empty.
  - *Typing*: slug preview updates live (lowercase, replace non-alphanumeric with `-`).
  - *Async duplicate check*: after typing stops for 300ms, the UI verifies uniqueness. The
    canonical path is a dedicated slug-availability check (`docs/backend-prerequisites.md`
    → `PROJ-NEW-1`); until it lands, the UI derives the check from `PROJ-01` with a
    `?slug=…` filter. Inline ✓ / ✗ indicator.
  - *Error*: "Already exists — try `<slug>-2`" (the suggested next slug is computed client-side).
- **Type**:
  - *Idle*: 6 radio cards in a 2-column grid. Each card has the type name + a one-line
    description. Default: Frontend (the most common case).
  - *Hover*: card border highlights.
  - *Selected*: card has a fire-red accent.
  - *Greying*: per the audit, all 6 types are implemented; no greying today.
- **Description**: textarea, optional, 500-char max (soft limit).
- **Submit button**:
  - *Disabled*: name is empty OR slug is taken.
  - *Loading*: spinner; "Creating…".
  - *Error*: modal stays open with an inline error message at the top.
- **Optimistic close**: on submit, the modal closes immediately; the new card animates in
  with a brief skeleton → real-data fade. On failure, the modal re-opens.

## 5. Primary + secondary actions
- **Primary** (top-right, footer): "Create project" — POST PROJ-02.
- **Secondary** (footer left): "Cancel" — closes the modal.
- **Close** (top-right): `[X]` — same as Cancel.

## 6. API mapping
- **Create** — `POST /api/v1/projects` (`PROJ-02`). Payload: `{name, slug, type, description?}`.
  Returns the full `Project` row (status: `CREATING` initially, transitions to `ACTIVE` via
  `projects.project.created` event).
- **Slug uniqueness** — the dedicated availability check does not exist yet
  (`docs/backend-prerequisites.md` → `PROJ-NEW-1`); the UI derives it from `PROJ-01` with
  `?slug=…` until that lands. UI validates locally first; the server is the source of truth.
- **Realtime** — `projects.project.created` event confirms the optimistic insert. The card
  status transitions to `ACTIVE` via `projects.project.updated`.

## 7. Forms + validation
- **Name**: required, 1-100 chars. Trimmed.
- **Slug**: auto-generated from name; editable. Must match `^[a-z0-9-]+$`, 1-100 chars,
  unique per platform.
- **Type**: required, enum `frontend|backend|worker|cron|docker|static` (DB enum:
  `FRONTEND|BACKEND|WORKER|CRON|DOCKER|STATIC`).
- **Description**: optional, ≤500 chars.
- **Server error mapping**:
  - `409 Conflict` on slug → "Already exists — try `<slug>-2`."
  - `400 Bad Request` on invalid name → "Name is required." (per field).
  - `401 Unauthorized` → "Session expired — please sign in again." → re-auth.

## 8. Accessibility
- **Focus order**: name → type (radiogroup) → description → cancel → create.
- **Modal trap**: focus is trapped inside the modal; Esc closes (with confirm if dirty).
- **ARIA**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the title,
  `aria-describedby` pointing to the helper copy.
- **Slug preview**: `aria-live="polite"` announces the slug as the user types.
- **Type radio group**: `role="radiogroup"` with `aria-labelledby`; each card is a `role="radio"`
  with `aria-checked`.
- **Submit button**: `aria-disabled` when invalid; `aria-busy` when loading.

## 9. Cross-references
- **Phase**: F04 Projects (§6 modal spec).
- **Service spec**: `docs/product/services/projects.md`.
- **Journey**: user-journeys.md — Persona 1 (fresh VPS) and Persona 2 (team member) hit this screen.
- **Navigation**: workspace root's empty state CTA (`/dashboard`).
- **Related screens**: `/dashboard` (the parent).

## 10. Acceptance criteria
1. The modal opens from the workspace root's "Create your first project" or "New project" CTA.
2. Typing in Name updates the Slug preview live; the suggested slug is `lowercase(name)` with
   non-alphanumeric replaced by `-`.
3. After typing stops for 300ms, an async slug-uniqueness check runs; ✓ or ✗ appears inline.
4. Type is a 6-card radio group with descriptions; default is Frontend.
5. Submit is disabled when name is empty or slug is taken.
6. On submit, the modal closes optimistically; the new card animates in with a skeleton
   that fades to real data.
7. On 409, the modal re-opens with the inline error and the suggested next slug.
8. Esc / Cancel / [X] all close the modal (no confirm if not dirty; confirm if dirty).
9. Focus is trapped; the first focusable element is the Name input.
10. The screen is keyboard-navigable end-to-end (Tab / Shift+Tab / arrow keys / Enter).
