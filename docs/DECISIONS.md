# FIDScript — decisions

> **The decisions taken, and the ones still owed.**
>
> A decision that is not written down is a decision somebody will make
> again, differently.

---

## 1. Taken

### D1 — The console is rebuilt; the API is not

**What:** the front end is written from scratch against the guide. The API
stays where it is, running, and is extended additively where the guide needs
it.

**Why:** the guide is entirely about the front end's shape — the levels, the
vocabulary, the menus, the journeys. The API is 31 modules of hardened,
deployed, tested code. Rewriting it would destroy working security work for
no product gain, and the console can be built against a running API today.

**Consequence:** the old dashboard's code is not ported. Its *decisions* are
(D2–D8); its screens are not.

### D2 — One Next.js app; not a monorepo

**What:** this repository is one Next.js application. The design system's
primitives live in `src/components/ui/`.

**Why:** the console needs one thing from the platform — the API — and a set
of primitives. A workspace package boundary between them is a package to
version, for one consumer.

**Consequence:** no `packages/sdk`, no `packages/events`, no CLI, no MCP
server here yet. The API client is written for the screens this app has.

### D3 — The tokens live in httpOnly cookies

**What:** the access and refresh tokens are set as httpOnly, SameSite=Lax
cookies by the proxy route. The browser's JavaScript never reads them.

**Why:** the old dashboard kept the access token in `localStorage`, and
duplicated it under two keys — so any script on the origin could read it.
That is the shape of the bug the guide's own rules are trying to kill.

**Consequence:** the app has one auth mechanism. Server components read the
session by calling the API through the proxy with the incoming cookie, so
the server and the browser use the same path.

### D4 — The session is refreshed by the proxy

**What:** on a 401 the proxy refreshes once and retries the request.

**Why:** the refresh token lives in a cookie the page cannot see, so the
page cannot do it.

**Consequence:** no refresh logic in the components, and no "your session
expired" flash when it happens.

### D5 — The shape is the project's, and it is the first thing asked

**What:** a project has a `shape` — `BACKEND`, `DEPLOYMENT` or `BOTH` — and
a `deploymentOn` switch. The shape is asked when the project is created and
is changed in the project's settings.

**Why:** the guide's rule 2 — *a menu is derived from what the thing
really has* — needs something to derive it from that is not a browser
toggle. The old `localStorage` mode was per-browser, invisible to the API,
and lost on another device.

**Consequence:** the API changes first (a new column, two optional fields),
because it rejects unknown request fields. The console cannot ask the
question until the API accepts the answer.

### D6 — "Services" is retired

**What:** the deployed applications in a project are **deployments**. The
`/services` route becomes a redirect.

**Why:** the guide's vocabulary. "Services" and "Deployments" sat next to
each other in the same sidebar, listing the same objects under two names.

### D7 — The applications are settings, not a destination

**What:** the applications live in `Settings → Applications`, and the
platform's overview carries one line about them. They are not in the top
bar.

**Why:** the guide's rule 3 — *a one-time thing never sits in a permanent
menu*. The applications are chosen once, at the install.

### D8 — The route inventory is a test

**What:** every route is listed in one file with its level, its owner and
whether it is canonical, and a test walks the route tree and fails when the
two disagree.

**Why:** it is what stops the next twenty-two orphans. The old repository
had this test, and it caught every orphan it was pointed at.

### D9 — The console's proxy has a path of its own

**What:** the browser's calls go to `/console/api/v1/*`, not `/api/v1/*`.

**Why:** the platform's API answers on `/api/*` at the root domain too —
that is where the old dashboard reached it from — and the console's proxy
was being mistaken for it. The sign-in answered, the tokens never became
cookies, and the browser was sent back to the sign-in. The API's public
surface is exactly what it was; only the console's own path moved.

### D10 — The console is built as an image; the API's answer grows one field

**What:** the console is an image that carries only the standalone output,
and `NEXT_PUBLIC_API_URL` is baked into it at build time.

**Why:** the machine that runs the console needs neither the source nor the
build tools. The one field the API grew is `autoDeploy` — the console shows
"deploy on every push" as a switch, and a switch needs a real state to
show.

---

### D11 — The organisation model, answered

**What:** a workspace is a **tenancy boundary** — the thing that owns
projects, members and roles. A person has a personal workspace by default;
a team shares one.

| The question | The answer |
|---|---|
| Does a person have a personal workspace? | **Yes.** Every account has one, and it holds the projects it owns. It is what makes "my projects" and "our projects" the same thing when a team grows. |
| What is a workspace for? | **Sharing.** It owns projects, the people who may work on them, and their roles. It is not a billing entity and it is not a folder. |
| Who owns a project that belongs to a workspace? | **Both, and they are different.** The project keeps its maker (`ownerId` — a person); the workspace says who it belongs to (`organizationId`). Access is the union: the owner always has it, the workspace's members have it through their role. |
| What happens to the auto-provisioned personal workspace? | **It stays, and it stops being named after the email.** It is called *Personal*, it can be renamed, and renaming it changes nothing else — which is why the migration is safe. |
| Is there a billing or plan relationship? | **No, not here.** The plan column stays for a hosted variant; nothing on this platform reads it, and nothing should. |
| What does "invite somebody to my platform" mean? | **Nothing — the platform is not a thing you are invited to.** An invitation says *come and work on this project* or *come and work in this workspace*. |

**Why it is safe now:** the console's menus are derived from the project's
shape and what it has — never from who owns it. The project's settings show
the workspace it belongs to, and nothing else changes.

**What is still owed:** the *hosted* variant's billing, and whether a
workspace may be nested. Neither is read by this platform.

---

## 2. Still owed — the organization model

*This is now answered — see D11 above. What follows is the record of the
questions as they were, and of what the schema does today.*

**The decisions are made — see D11 above.** What follows is the record of
the questions as they were, and of what the schema does today, so the
reasoning is not lost.

### What exists today

| Thing | Where | What it means |
|---|---|---|
| `Organization` + `OrganizationMember` + `OrgRole` | `identity` schema | A **workspace**: a project can belong to one, or to its owner's own workspace when the column is null. |
| `Team` + `TeamMember` | `identity` schema | A group inside a workspace. |
| `Invitation` | `identity` schema | An invitation to a workspace, accepted by token. |
| **Auto-provisioning** | the register path | Every new account gets a personal workspace ("\<email\>'s Organization", role OWNER) and a first project ("My First Project"). |
| `Project.ownerId` | `projects` schema | A project has an owner — a person. `Project.organizationId` says which workspace holds it. |

### The questions

1. **Does a person have a personal workspace at all?** Today every account
   gets one, automatically, and it is named after the email. A workspace with
   one member and one project may be more ceremony than the product wants —
   or it may be exactly the tenancy boundary a team deployment needs.
2. **What is a workspace for?** Today it holds projects, roles, teams and
   invitations. If it is only a grouping, the roles and the teams may be
   more than a single-operator platform needs.
3. **Who owns a project that belongs to a workspace?** `ownerId` is a
   person; `organizationId` is the tenant. They can disagree. The rule that
   decides which one grants access is not written down anywhere.
4. **What happens to the auto-provisioned personal workspace if the answer
   to (1) is "no"?** Every account on every install has one. Changing that
   is a migration, not a code change.
5. **Is there a billing or plan relationship?** `Organization.plan` exists
   as a column. Nothing reads it. Whether a workspace is a billable entity
   changes what an organization *is*.
6. **What does "invite somebody to my platform" mean** — to a workspace, to
   a project, or to the platform? The invitation model today is
   workspace-scoped; the deployment wizard's invitation flow is
   project-scoped. Both exist.

### What the console assumes in the meantime

- A project has an owner and, optionally, a workspace.
- The signed-in person's own workspace is where their personal projects live.
- **Nothing in the console's menus depends on the answer** — the project
  level is derived from the project's shape and resources, not from who owns
  the workspace.

---

## 3. Still owed — everything else

| The question | Where it will be decided |
|---|---|
| Whether the API's key validation stays O(n) bcrypt per request | P4, with the API's move home |
| Whether the verification and reset tokens get hashed | P4 |
| Whether the email-verification gate is switched on | With the organization model — it needs a column that says "this account must verify" |
| Whether Instant's provisioning failure is retried in the background | P3, with the capabilities |

---

*Written 2026-11-07.*
