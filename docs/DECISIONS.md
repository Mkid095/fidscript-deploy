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

**Consequence:** the old dashboard's code is not ported. Its _decisions_ are
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

**Why:** the guide's rule 2 — _a menu is derived from what the thing
really has_ — needs something to derive it from that is not a browser
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

**Why:** the guide's rule 3 — _a one-time thing never sits in a permanent
menu_. The applications are chosen once, at the install.

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

| The question                                             | The answer                                                                                                                                                                                                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Does a person have a personal workspace?                 | **Yes.** Every account has one, and it holds the projects it owns. It is what makes "my projects" and "our projects" the same thing when a team grows.                                                                                           |
| What is a workspace for?                                 | **Sharing.** It owns projects, the people who may work on them, and their roles. It is not a billing entity and it is not a folder.                                                                                                              |
| Who owns a project that belongs to a workspace?          | **Both, and they are different.** The project keeps its maker (`ownerId` — a person); the workspace says who it belongs to (`organizationId`). Access is the union: the owner always has it, the workspace's members have it through their role. |
| What happens to the auto-provisioned personal workspace? | **It stays, and it stops being named after the email.** It is called _Personal_, it can be renamed, and renaming it changes nothing else — which is why the migration is safe.                                                                   |
| Is there a billing or plan relationship?                 | **No, not here.** The plan column stays for a hosted variant; nothing on this platform reads it, and nothing should.                                                                                                                             |
| What does "invite somebody to my platform" mean?         | **Nothing — the platform is not a thing you are invited to.** An invitation says _come and work on this project_ or _come and work in this workspace_.                                                                                           |

**Why it is safe now:** the console's menus are derived from the project's
shape and what it has — never from who owns it. The project's settings show
the workspace it belongs to, and nothing else changes.

**What is still owed:** the _hosted_ variant's billing, and whether a
workspace may be nested. Neither is read by this platform.

### D12 — The console answers on one name, the apex; `app.` stays reserved

**What:** the console answers on a single name — the platform's own domain
(`fidscript.com`). The `app.fidscript.com` alias that once routed to the
same service is removed from the routing: one name for the console, the
apex. The name stays **not available** to a project; a project's domain
must be a name the platform neither answers on nor answered on.

**Why:** the alias was a second door to the same console, and the apex is
the platform's real address. While it answered it had to be reserved —
a project that took it would have two routers for one host, and the
customer's application would answer on the same address as the console.
Removing the route does not free the name: it is now an edge 404, and a
name the platform used is still a name the platform keeps.

**How it is enforced:** two parts. `reservedHostReason()` in
`apps/api/src/modules/domains/services/reserved-hosts.ts` — the platform's
root domain, and the subdomains the platform's own services use (`app`,
`api`, `grafana`, `prometheus`, `loki`, `maven`, `registry`, `files`,
`storage`, `whatsapp`, `instant`, …) — refuses a domain at the moment it is
added, **and** at the moment its records would be written, so a domain added
before this rule cannot take a platform name either. The refusal says what
the name is and what to do instead. And in the routing itself
(`installer/docker/traefik/dynamic/platform.yml`): only `dashboard-root`
points at the console service — the `dashboard-app` router is gone.

**What the project uses instead:** a zone from the operator's own Cloudflare
account, or a subdomain of one that is not the platform's.

### D13 — A DNS record is written, not created

**What:** the platform's auto-DNS **upserts**. It looks the record up first
and writes only the difference, and it says which happened: `created`,
`updated`, or `unchanged`.

**Why:** Cloudflare refuses a record that already exists ("an identical
record already exists"), and refuses a CNAME where an A record stands ("an
A, AAAA, or CNAME record with that host already exists"). Both are the
ordinary state of a domain somebody has already pointed at the platform — so
the old behaviour was a 500 on the common case, not on the rare one. A
record that already points at the platform (an A to the server's address, or
a CNAME to the project's own host) counts as **right** and is left alone.

### D14 — The CNAME points at the project's host, not at the domain's first label

**What:** a project's domain is pointed at `{project.slug}.apps.{platformDomain}`
— the host Traefik publishes the project on. It is never guessed from the
domain's name.

**Why:** `app.example.com` says nothing about a project called `fidscript`.
The old rule produced `app.apps.fidscript.com`, which is nobody's host, and
the domain could never answer.

### D15 — The page bar is part of the frame

**What:** `Page` carries the bar. A screen passes its `title`, `description`,
`actions` and `eyebrow` to the frame; the frame renders the sticky bar above
the scrolling body.

**Why:** the bar was the one thing every screen had in common and none of
them had. When it is a thing each screen remembers to add, some screens
forget; when it is the frame's own doing, a screen cannot have a body
without a bar, and two screens cannot disagree about what a bar looks like.

### D16 — The platform's applications answer to one identity

**What:** the console, Grafana, the mail server (Stalwart) and InstantDB all
answer to the platform's own identity —
`kennedygithinjioffice@gmail.com` / the platform's password — and the
decision lives in **Settings → Credentials**, not in a secrets file
somebody finds.

| Application | What it answers with                                                                                                                                     | How it changes                                                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| The console | the platform account                                                                                                                                     | Settings → Account                                                                                                                     |
| Grafana     | the platform email + password (env `GF_SECURITY_ADMIN_USER` + the secret file)                                                                           | **applied by the platform** over Grafana's own admin API, from Settings → Credentials                                                  |
| Stalwart    | the platform email + password as the **recovery administrator** (`STALWART_RECOVERY_ADMIN`)                                                              | **with the installer and a restart** — it is env-defined, and the SMTP submission credential changes with it (both are one credential) |
| InstantDB   | an account under the platform email, signed in by **magic code**; the platform holds that account's personal access token as its provisioning credential | the token lives in `secrets/instant_superuser_token.txt`                                                                               |

**Why:** "one email, one password" was a fact to discover — the mail
administrator answered to `admin` and a machine token, the Instant token did
not exist at all (the platform said "no Instant credential"), and nobody
could say what each application answered with without trying. Now the
Settings screen reads each application's account, checks a candidate
password against every one live, and applies where an application takes its
credential from the platform.

**What the work taught (the traps inside the decision):**

- `STALWART_RECOVERY_ADMIN` is `name:password`, **not** `name:sha256` — the
  old reading only worked because the token happened to be 64 hex chars, and
  `parseJmapCredential` splits on exactly that shape. A non-hex password
  needs its own `STALWART_JMAP_USER`/`STALWART_JMAP_PASSWORD` pair, which is
  what the compose now sets.
- The mail administrator is the **recovery administrator** — there are no
  directory accounts in this Stalwart yet (the email capability is still
  unconfigured: `fidscript.com`'s MX points at the registrar's forwarding).
- Instant's superuser token is a **personal access token of the platform's
  account**; the account existed since September — only the token was never
  written where the platform reads it.

### D17 — A project's resources are made when the project is made

**What:** creating a project provisions its Instant app (when the shape has
a backend) and its WhatsApp identity — an instance on the WhatsApp platform
named after the project — in the same fire-and-forget pass as the database,
the bucket, the channel and the API key. Both are re-tried from the screens
when they fail, and neither failure leaves the project half-made: the
project still becomes active, with the reason recorded.

**Why:** the links on the Databases page landed on nothing — the Instant app
was a later, separate step a person had to find, and the WhatsApp identity
came only when somebody pasted a key. A project that says it has a backend
must have one.

**What holds it up:**

- the **platform's own keys** — the Instant superuser token and the WhatsApp
  platform's key — live in the secrets dir and are read from files, like
  every other credential; without them the provisioning records the reason
  and the screen offers the retry.
- the **Instant BaaS is reached where it actually is**: the self-hosting
  stack's own network (`http://server:8888`), not the add-on container name
  the installer assumes. The compose joins that network as external.
- the WhatsApp instance is created on the **shared** Evolution API with the
  platform's key; instances are named by the project's slug, so they are
  identifiable, and deleting a project's instance is a separate, deliberate
  act.

---

## 2. Still owed — the organization model

_This is now answered — see D11 above. What follows is the record of the
questions as they were, and of what the schema does today._

**The decisions are made — see D11 above.** What follows is the record of
the questions as they were, and of what the schema does today, so the
reasoning is not lost.

### What exists today

| Thing                                             | Where             | What it means                                                                                                                  |
| ------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `Organization` + `OrganizationMember` + `OrgRole` | `identity` schema | A **workspace**: a project can belong to one, or to its owner's own workspace when the column is null.                         |
| `Team` + `TeamMember`                             | `identity` schema | A group inside a workspace.                                                                                                    |
| `Invitation`                                      | `identity` schema | An invitation to a workspace, accepted by token.                                                                               |
| **Auto-provisioning**                             | the register path | Every new account gets a personal workspace ("\<email\>'s Organization", role OWNER) and a first project ("My First Project"). |
| `Project.ownerId`                                 | `projects` schema | A project has an owner — a person. `Project.organizationId` says which workspace holds it.                                     |

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
   changes what an organization _is_.
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

| The question                                                        | Where it will be decided                                                             |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Whether the API's key validation stays O(n) bcrypt per request      | P4, with the API's move home                                                         |
| Whether the verification and reset tokens get hashed                | P4                                                                                   |
| Whether the email-verification gate is switched on                  | With the organization model — it needs a column that says "this account must verify" |
| Whether Instant's provisioning failure is retried in the background | P3, with the capabilities                                                            |

---

_Written 2026-11-07._
