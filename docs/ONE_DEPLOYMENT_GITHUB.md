# One deployment, and the pushes underneath it

_The enforcement of the invariant, the GitHub pipeline, what was verified on
the live platform, and the preview design. Written 2026-11-17._

---

## 1. What was asked

Two tasks, one consequence:

1. **ONE PROJECT = ONE INITIALIZED DEPLOYMENT IDENTITY.** A project's first
   deployment establishes an identity it keeps for life; every later
   version — a push, a redeploy, a rollback — belongs under it. A second,
   independent identity under the same project is impossible, enforced in
   the data, not the UI.
2. **Vercel-like Git deployment.** Connect a repository once, name the
   production branch once, and every push to it builds and deploys
   automatically — never initializing a second deployment.

## 2. The architecture that was found

The platform already had a deployment pipeline (worker → build runner →
docker image → container → Traefik routes) and a GitHub integration (PAT
stored encrypted, webhook registration, push receiver, auto-deploy switch,
a Git section on the deployments screen). What it did **not** have was the
invariant: a project could accumulate independent deployments, a push could
send production backwards, and a deletion could leave a deleted project
answering on its names.

## 3. What changed in the data

Schema (`apps/api/prisma/schema.prisma`) plus one migration:

- **`DeploymentIdentity`** — one row per project (`project_id` unique).
  Established by the first deployment's release; every `Release` links to
  its identity. The database refuses a second identity — a race between two
  first-time initializations settles on the one that committed first
  (P2002 handled, tested).
- **`WebhookDelivery`** — one row per delivery id. GitHub retries a delivery
  it did not see answered *with the same id*, so the id is the dedup key
  and the row is the record of what was done with it.
- **`Project.lastDeployedCommit`** — the commit production last ran. A push
  of that commit is a no-op; an older commit received after a newer one is
  in flight is dropped.
- **Backfill** — existing projects get one identity each (the oldest release
  is the one that established it), every release linked, the last
  successful commit recorded. Nothing deleted or merged.

## 4. What the pipeline does now

- **First push:** the gate accepts, a version is created under the
  project's identity (or the identity is established, if this is the
  project's first deployment), the build runs, and only a *successful*
  build moves the production pointer, the names, and the routes.
- **Push of the live commit:** `duplicate_commit` — recorded, not built.
- **Resent delivery:** `duplicate_delivery` — recognized by its id.
- **Older push while a newer one is in flight:** `superseded` — dropped at
  the gate; and as a second line, a success that finishes behind a newer
  success is *recorded, not promoted* (no names move, no routes re-sync,
  the container that owns the name is not torn down).
- **Rollback:** a version under the same identity; it moves the names the
  way a success does, or leaves them exactly where they are on failure.
- **Failed build:** production keeps running the last successful version.
- **Deleted project:** its containers go down at the delete, its in-flight
  builds are stopped where they stand, and its routers are rewritten out of
  the routes file — a later sync cannot put them back. At the end of the
  recovery window the whole `fidscript/<slug>/*` image line goes with the
  record.

## 5. The gate, verified on the live surface

Every case was POSTed to the running `POST /api/v1/webhooks/github` with
the project's real secret (decrypted in-container for the HMAC, never
written anywhere):

| case | outcome | result |
|---|---|---|
| resend of a processed delivery id | `duplicate_delivery` | ✓ no build |
| push of the commit production runs | `duplicate_commit` | ✓ no build |
| push to a branch that is not the deploy branch | `branch_mismatch` | ✓ recorded |
| signature from a wrong secret | `invalid_signature` | ✓ rejected |
| newer commit, auto-deploy switched off | `auto_deploy_disabled` | ✓ nothing queued |

The deployment count was identical before and after: nothing stray was
queued. `superseded` is timing-dependent (a newer build must be in flight)
and is pinned by the gate's unit spec and the runner's supersede guard,
which is where it is actually enforced.

## 6. What the live run found — and fixed

Pushing to `Mkid095/cerenity-scents` through the real pipeline exposed a
buildpack defect that had been silently killing its auto-deploys: the
detectors handed the generated Dockerfile the **raw content** of the app's
build script — `next build`, `vite build`, `turbo build`. Those binaries
live in `node_modules/.bin`, which is not on a Docker stage's PATH, so the
build exited 127 and production just kept running the older version. Four
consecutive pushes had failed exactly this way; the URL was still up, which
is the invariant working, but the next release could never land.

Fix (`2e406d4`): a script that exists runs **by name** through the package
manager — `npm run build`, `npm start` — which is what puts `.bin` on the
PATH; a missing script falls back to the framework's binary through `npx`.
The pnpm monorepo already did this correctly and is now pinned by a spec.

After the fix, the same repo: push → webhook → build → **SUCCESS** → the
name moved, the older container was torn down, the URL answered 200 on the
new version, and `lastDeployedCommit` pointed at the exact pushed commit.

## 7. The platform's own housekeeping, the same day

- The api was rebuilt from current main, so the live container now runs the
  teardown, the gate, and the buildpack fix.
- The machine was at 88% disk. Reclaimed: anonymous volumes, 12 unused
  images (each checked against every container in every state and every
  compose file first), two stale logs, an old scratch tree — 88% → 76%.
  What remains is live: the in-use images, their build-cache layers, and
  the data volumes.

## 8. Tests

204 tests across 31 suites, green at `2e406d4`: the identity invariants and
the P2002 race, the gate's four outcomes, the supersede guard, the
teardown's stop/teardown/sync, the buildpack's registry handling and the
script-by-name rule.

## 9. Previews — the design

Preview deployments stay out of the production line: they build in
isolation, answer on their own names, and never move the production
pointer.

- **The webhook grows one event.** Alongside `push`, the hook subscribes to
  `pull_request` (`opened`, `synchronize`, `reopened`, `closed`). A PR on
  the connected repository is the trigger; the head commit of the PR is
  what is built.
- **The schema grows one relation.** A `preview` table: the PR's number and
  head sha, the deployment it produced, when it last ran, and when it
  expires. Previews are deployments with a `preview` flag, not a second
  identity — they share the project's build pipeline and the identity's
  history, but they are never eligible for the production pointer.
- **The naming.** A preview answers on a name derived from the PR
  (`<pr>.preview.<project-domain>`), minted from the same domain system,
  so closing the PR releases the name. The production subdomain and custom
  domains are untouched by any preview path.
- **The lifecycle.** Opening and re-pushing to a PR build (or update, if
  one already exists for that PR) in the background, exactly like a push —
  but the success path skips the name move, the route sync, and the
  deployed-commit advance. Closing the PR tears the preview down at once;
  the retention policy (default: 7 days after last activity) sweeps what
  was closed or abandoned.
- **The gate is untouched.** The push gate, the dedup, and the supersede
  rule operate on the production line only; a preview build can never make
  production go backwards, and the production gate never sees a preview.

What it takes to build: the table and the flag (one migration, additive),
the webhook event, the branch in the success path that skips promotion for
previews, the teardown on close plus the sweep, and a list on the Git
section of the deployments screen. The isolation is the point — a preview
is a build with a name, never a second deployment of the project.

## 10. Commit hashes

| commit | what |
|---|---|
| `90ee1ee` | the invariant: identity, gate, supersede, backfill, the Git section |
| `f2f1522` | the console follows the invariant |
| `9f0474f` | the delete takes the project's surface down |
| `2e406d4` | the scripts the buildpack runs are by name, not by binary |
