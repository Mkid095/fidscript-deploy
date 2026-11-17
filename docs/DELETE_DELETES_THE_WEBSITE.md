# Deleting a project deletes its website

_The root cause, the fix, and the verification. Written 2026-11-17._

The reported bug: delete a project and its deployed website keeps running.
A deleted project should be a project with no website — the container, the
routes, the DNS, the webhook, the artifacts. What followed is the audit,
the architecture, and the proof that it now holds.

## 1. Root cause of the deletion bug

Deleting a project was a **database-only soft delete**: it set
`deletedAt` and emitted an event. Until this work, that event had **no
infrastructure listener**. Nothing stopped the container, nothing rewrote
the Traefik routes, nothing restored the customer's DNS. The website
outlived its project, on purpose or by accident.

Two concrete orphans were found on the live machine:

- **`soostori-4c4d7cf4`** — soft-deleted 2026-11-16, but its container was
  still `Up 30h` and its subdomain still answered **200**. This is the bug,
  captured.
- The general class: any project deleted before a teardown existed.

## 2. Root cause of the duplicate entry points

The "New deployment" buttons were all project-scoped links to
`/deployments/new` — the correct destination — but the **label** said "New
deployment", which reads as "create another deployment". Under the
one-identity model the button must say what it does: a project that is
initialized offers a **new version**; a project that is not offers the
**initialization**. The fix was labels and copy, not routing.

## 3. What was built

**The deletion task** — a state machine in the database
(`projects.project_deletion_tasks`): `REQUESTED → IN_PROGRESS → CLEANED`,
or `CLEANUP_FAILED` (with the step named) that the sweep retries, ending in
`PURGED` when the record itself goes. Each step is recorded in a
`resources` JSON field, so a retry resumes where it stopped instead of
redoing finished work — and can never recreate the website, only finish
taking it down.

**The teardown** (`DeploymentTeardownService`): on `projects.project.deleted`
it stops in-flight builds, tears down every deployment container, and
rewrites the routes without the project. On `projects.project.purged` it
removes the image line and marks the task `PURGED`.

**The sweep** — the second line. At boot and hourly it asks the database
which deleted projects still lack a `CLEANED` task and takes their surface
down. This is what repairs the deletions that predate the teardown, or that
landed while the api was down.

**The purge path** releases what the project owns in the outside world,
while the rows still exist (before the hard delete that cascades them away):
custom domains are released — the customer's captured DNS records are put
back, the mailboxes stand down — and the GitHub webhook is unregistered.
Both are best-effort: a failure leaves a dangling registration, never a
blocked delete.

**Admin visibility** — the system screen lists the cleanups that have not
finished (failed, or still running past their stall window) with what
failed, and a retry that resumes the work. `GET /system/deletion-tasks`,
`POST /system/deletion-tasks/:id/retry`.

**The entry points** — the top bar, sidebar, and history buttons say "Deploy
new version" where a version goes and "Initialize deployment" where the
first one is still to come; the delete confirmation says what happens to
the live site and the 30-day window.

## 4. Database migrations

- `20261117000000_project_deletion_tasks` — the new table, plus a backfill
  that gives every already-deleted project one `REQUESTED` task so the
  sweep has work to do.
- The migration hit a real fault on first apply (the backfill omitted
  `updated_at`, which has no default and is kept client-side), leaving the
  api in a boot loop. It was corrected (`899ba2b`) and the entrypoint's
  failed-migration resolver was taught Prisma 5's backtick-quoted names,
  so a future failure recovers instead of looping.

## 5. API changes

- `DELETE /projects/:id` now opens the deletion task as `REQUESTED`.
- `purge` releases domains + webhook before the hard delete.
- New: `GET /system/deletion-tasks`, `POST /system/deletion-tasks/:id/retry`.
- `GithubWebhookService.unregisterWebhook` — deletes the GitHub hook with
  the owner's token; leaves it inert (not a pipeline) when it can't.
- `DomainCleanupService.releaseForProject` — releases a project's domains
  without the per-user authorization, for the purge path.

## 6. Frontend files changed

`project-topbar.tsx`, `project-sidebar.tsx` (label by initialized state),
`deployment-history.tsx` (two buttons), `deployments/new/page.tsx`
(metadata), `project-danger-zone.tsx` (delete copy), and the system screen
(`page.tsx`, `actions.ts`, `deletion-tasks-card.tsx`) for the cleanup list
+ retry.

## 7. A second fault, found under the first

Wiring the purge path made `ProjectsModule` import `DeploymentsModule`,
which closed a three-module circle
(`Projects → Deployments → AppAuth → Projects`) on hard imports. Nest could
not create `AppAuthModule` (an import read `undefined` mid-cycle) and the
api boot-looped. Every edge of the circle is now `forwardRef`
(`05c64e0`, `2799e1f`); the module graph resolves.

## 8. Tests

214 api tests across 33 suites, green: the teardown's resume / failed /
sweep / purge paths, the webhook unregister outcomes, and the domain
release with and without a connection. Typecheck clean on api and console.

## 9. Live verification

- **The orphan repaired itself**: after the api came up, the boot sweep
  tore down soostori's 7 containers, re-synced the routes, and marked its
  task `CLEANED`. Its subdomain went from **200 to 404**.
- **A controlled cycle, on real infrastructure**: a fresh project was
  created through the API, a static site deployed to it (container up,
  release `SUCCESS`), then the project deleted through the API. The
  teardown took the container down and re-synced the routes on the same
  pass; the task reached `CLEANED` on attempt 1. The site no longer
  resolves; the deletion task list is empty again.
- **Unrelated projects were never touched**: through the whole sequence the
  running deployment of the live project kept serving **200**.

One honest note: the fresh subdomain's edge certificate/DNS had not fully
settled within the polling window, so the test site's own URL was
unreachable from this host at check time. The container lifecycle — up on
deploy, down on delete, routes rewritten — is what the test exercises, and
it held.

## 10. Commit hashes

| commit | what |
|---|---|
| `fc4293a` | the deletion lifecycle: task, teardown v2, sweep, purge release |
| `e0ddecd` | the entry-point labels and the system-screen cleanup list |
| `899ba2b` | the migration backfill fix |
| `05c64e0` | the module circle, closed with forwardRef |
| `2799e1f` | the last two edges of the circle |

The rule now holds end to end: **a project owns its deployment identity,
its production website, and its hosting resources — and its lifecycle
governs theirs.** Delete the project and the website comes down with it;
purge it and the customer's DNS goes back the way it was.
