# Global UX Specification

> **Operational complement** to `platform-philosophy.md`. Where the philosophy states *what* we believe,
> this document defines *how* every screen must behave to honor those beliefs. Every screen spec
> (F00–F11) and every service spec (`docs/product/services/`) must be consistent with these rules.

## 1. Product philosophy (applied to the screen)
- **The screen is the platform.** No "for advanced options, see the docs" walls between the user and
  what they need; the 5 most common things are one click away, the rest are nested behind a
  disclosure.
- **Show the result, then the controls.** Each entity (deployment, function, db, …) renders its
  current state + the last 1–2 events *before* its edit forms.
- **One screen = one job.** If a page does more than one thing (list + create + detail), split it.

## 2. Beginner-first
- **Defaults everywhere.** Form fields ship with sensible defaults; the user changes only what they
  need to change (e.g. Database creation defaults to Postgres, `production` env, the platform's
  recommended size + max connections).
- **Progressive disclosure.** "Advanced" / "Show all" toggles, not walls. Hide the rare 20% until
  asked. Never *remove* the option — just hide.
- **Inline explanations, not modals.** A `?` icon next to a non-obvious field shows a one-paragraph
  tooltip with a link to the doc.
- **No raw JSON in the happy path.** Show parsed fields; offer "View raw" only as a toggle.

## 3. Configuration philosophy (UX-level)
- **If two settings are linked, show one.** A deployment's `branch` lives in build-config, not a
  separate field. A function's `runtime` chooses the right `entryPoint` default.
- **Hide defaults that are auto-managed.** Don't show the user the `docker` network, the Traefik
  labels, or the JWT secret. If they need them, they're under "Advanced → Show internals."
- **Reveal consequences.** Toggling a setting shows a one-line preview of what changes ("3 deployments
  will be restarted"). Never apply a consequential change without explicit confirm.
- **Destructive confirmations** always type the resource name to enable the button ("Delete
  `my-app`" + a "type the project name" field for anything irreversible).

## 4. Navigation philosophy
- **One primary action per screen**, top-right (e.g. "Create project", "New deployment", "Deploy").
- **Secondary actions** in a row above the list, not buried in a menu — but with clear hierarchy.
- **State in the URL.** Selected project, tab, filter, and pagination all live in the URL so a
  shareable link reproduces the view.
- **Back is predictable.** The header has no "Back" button; the breadcrumb's parent is back.

## 5. Automation philosophy
- **Automations are visible, not magic.** A successful automation shows the *result* prominently
  ("Provisioned Postgres in 4.2s") and the *trigger* in a quieter line ("because you created a
  database of type `postgresql`").
- **Re-runnable manually.** Every "automatic" action has a "Run now" / "Re-check" button.
- **Logged + audit.** Every automation writes a typed event (see the catalog in
  `backend/index.md`) and the event is shown in the Activity feed.
- **Failures do not disappear.** A failed automation surfaces *why* (e.g. "Cloudflare token rejected:
  missing `Zone:DNS:Edit` scope") and a single-click retry.

## 6. Error handling philosophy
- **Every error has a message that tells the user what happened and what to do next.** No "Something
  went wrong." No `undefined`.
- **Errors are placed at the action that caused them**, not at the top of the page. A failed form
  field shows the error under that field.
- **Recoverable errors are inline, not modal.** A 401 redirects to login with the intended URL
  preserved; a 403 shows an inline "You don't have permission — ask your admin" with a copy-email
  action; a 404 shows "This resource was deleted" + a link back.
- **Irrecoverable errors are honest.** If the backend is down: a full-screen "Service unavailable —
  retrying every 5s" with a status page link. Never a silent spinner that never resolves.
- **Backend-stated errors are honored.** When the API returns a 4xx with a message, the UI shows
  *that* message (translated if needed) — don't paraphrase to something generic.

### 6.1 Standard HTTP error UX
| Status | UX |
|---|---|
| 400 | Inline field error (with the server's message if provided) |
| 401 | Silent token refresh → if still 401 → redirect to `/login?next=…` (preserve intended URL) |
| 403 | Inline "You don't have permission. Ask a project admin to grant `<role>`." with a "Copy request link" button |
| 404 | "This resource was deleted or moved." Link back to its parent list |
| 409 | Inline "Already exists" with a "Use existing" shortcut (e.g. duplicate project name → suggest slug) |
| 429 | Lock the form; show countdown from `Retry-After`; one "Retry now" attempt allowed early |
| 5xx | Form-scoped error ("Save failed — retry") + a "Copy error ID" so the admin can report it |
| Network | "No connection. We'll save your changes when you're back." (queue locally where possible) |

## 7. Empty state philosophy
- **Every empty state is a CTA.** "No functions yet — create your first function" + button.
- **Empty states explain why this is the empty state** ("You haven't deployed anything yet — once
  you push a Dockerfile repo, your deployments appear here."), not just "No items."
- **Empty states never show fake data, never a Lottie of a sad ghost.** Tone: inviting, not empty.
- **Honest empty states** when a feature is genuinely unavailable: "Skills — not yet available"
  (per the audit's stub list). Never a fake screen.

## 8. Permission philosophy
- **Roles are the contract, not the screen.** The screen shows what the current user *can* do; what
  they can't is greyed out with a one-line reason ("admin only"). Never hide a control you want
  them to know exists.
- **Three roles:** `owner` (full control incl. delete), `admin` (everything except delete +
  members), `developer` (create + edit, no settings), `viewer` (read-only). Documented per-service in
  `docs/product/services/`.
- **Server is the source of truth.** UI gating is a *hint*, not a *guarantee*. Every mutating call
  must be re-validated server-side; a stale UI is not a security boundary.

## 9. Multi-project philosophy
- **The active project is always visible** (header project switcher). All screen state assumes it.
- **Switching projects resets the sidebar** (and any in-progress form warns before discarding).
- **No "global" screens inside a project** that span projects. Cross-project screens (e.g. the
  marketplace) live outside the project shell.
- **Deep links work from any project.** A URL like `/dashboard/projects/<id>/functions/<fn>` is
  valid even if the user just landed on a different project — the UI swaps to the right project
  with a small "Switched to `<name>`" toast.

## 10. Loading + performance
- **Optimistic first, then reconcile.** Most mutations paint the result immediately and reconcile
  on the server response. A rollback toast appears only on failure.
- **Skeletons over spinners for content.** Spinners are reserved for *blocking* actions
  (create-deployment, sign-in, payment-like flows). Lists, cards, and forms use skeletons
  (`animate-pulse` rounded blocks the size of the expected content).
- **Stale-while-revalidate.** Lists are cached for 5s; a stale indicator ("Updating…") appears
  during the background refresh.
- **Heavy work streams.** Deploy build logs, function logs, queue tail, log tail — *stream* via
  the realtime socket, don't poll.

## 11. Accessibility
- **WCAG 2.2 AA** is the floor. Color is never the sole carrier of meaning (icons + text accompany
  color); contrast ratios meet AA on both light and dark themes; focus rings are always visible
  (keyboard nav, not just click).
- **Keyboard-first.** Every action is reachable via Tab/Enter/Esc. The command palette is
  ⌘K / Ctrl+K. Destructive actions require a confirm step (Enter alone does not delete).
- **Aria-live for async errors.** A failed mutation announces the error via `aria-live="polite"` so
  screen-reader users don't miss it.
- **Reduced motion.** Honor `prefers-reduced-motion`: disable auto-scroll in live tails and pulse
  animations.
- **Forms label every input**; required fields say so, not just with a red `*`.

## 12. Keyboard shortcuts
- `⌘K` / `Ctrl+K` — open the command palette.
- `g` then `p` / `d` / `f` / `b` / `s` / `r` — go to Projects / Deployments / Functions / Databases / Storage / Realtime (within the active project).
- `c` — primary create action on the current page (contextual: "Create project" on /dashboard, "Create function" inside a project).
- `Shift+R` — restart the focused deployment/function.
- `Shift+D` — danger zone (Settings) on the focused entity.
- `/` — focus search/filter on the current list.
- `Esc` — close any open dialog / drawer / palette.
- `?` — open the keyboard-shortcut cheat sheet.

## 13. Realtime + optimistic UI
- **Subscribe by default** on any list or detail that has a known event type (see
  `backend/index.md` → Realtime event catalog). The UI updates in place; no manual refresh.
- **Optimistic for:** create, update, delete on items the user owns; **reconcile** on the server
  response; **toast with an undo** for delete.
- **Reconcile, not redraw:** the list re-orders / patches the row in place. A full re-fetch is only
  used after create/delete when the ordering genuinely changed.
- **Realtime events a user can't act on** (e.g. someone else's deploy) are surfaced in the Activity
  feed + a subtle toast, not the table — to avoid stealing focus.

## 14. Toasts, notifications, activity
- **Toasts** for transient confirmation/error of a single action. Auto-dismiss after 4s for success;
  sticky for errors with a "Copy details" action.
- **Notification bell** (header) — unread count, last 20 events for the active project, with
  "Mark all read" and "See all activity" → Activity feed.
- **Activity feed** — chronological stream of all platform events scoped to the current project
  (or workspace), filterable by event family (`deployments.*`, `function.*`, …), actor, and
  date. Each row links to the resource.

## 15. Density + responsiveness
- **Breakpoints:** sm 640 (mobile, drawer), md 768 (tablet, collapsed sidebar), lg 1024 (full
  sidebar), xl 1280 (max content width 1200).
- **Mobile posture:** the project dashboard collapses to a tab-bar at the bottom (Projects /
  Deployments / Settings / More). Per-resource screens stack vertically.
- **No horizontal scroll** on any viewport ≥ 320px. Long identifiers truncate with a hover-copy.

## 16. The single-screen test
For every screen spec, a reviewer should be able to answer:
1. What is the **one primary action** on this screen, and is it visible without scrolling?
2. What does this screen look like **empty**?
3. What does this screen look like **loading** (skeleton, not spinner)?
4. What does this screen look like **with a real row**?
5. What does this screen look like **on error** (a 4xx + a 5xx)?
6. Can the user complete the action in **3 clicks or fewer**?
7. **Is the keyboard a first-class citizen** here? (Try it without the mouse.)
8. Does the screen **explain why** something is or isn't possible? (Not just disable buttons.)

If any answer is "no," the screen spec is incomplete. Fix it before implementation.