# FIDScript — the implementation plan

> **The whole project, phase by phase: what is built, in what order, and how
> each phase is proved.**
>
> The vision is `docs/USER_FLOW_GUIDE.md`. The architecture is
> `docs/ARCHITECTURE.md`. This document is the work.

---

## 0. The shape of the work

The guide lists fourteen changes. They are **not** fourteen phases — they
fall into four, and only the first two touch the platform's front door.

| Phase                        | What it delivers                                                                                          | Why it is here                                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **P1 — the platform level**  | The front door, the shell, the overview, the projects list, the settings hub, and **the project's shape** | The guide's first impression. A person signs in and must understand the platform in five seconds. |
| **P2 — the project console** | The derived sidebar, the project overview, "Services" retired into "Deployments", the project settings    | The second half of the guide. A project must show what it has, not a fixed list.                  |
| **P3 — the capabilities**    | Email, Packages, WhatsApp, Monitoring and Logs — each wrapped over its application                        | The guide's §8, one capability at a time. Independent of each other.                              |
| **P4 — the API moves home**  | The API joins this repository, module by module, with the console as its test                             | Only after the console works against the running API.                                             |

**P1 and P2 are the product. P3 is breadth. P4 is housekeeping.**

---

## P1 — the platform level

### P1.1 The project's shape

The spine. Everything in the guide's menus is derived from it.

|               |                                                                                                                                                                                                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **API**       | `ProjectShape` enum (`BACKEND` · `DEPLOYMENT` · `BOTH`), `Project.shape`, `Project.deploymentOn`. A migration with a safe default (`DEPLOYMENT`, deployments on). `CreateProjectDto` and `UpdateProjectDto` take both, optionally. The project response carries both. |
| **Why first** | The API rejects unknown request fields (`forbidNonWhitelisted`), so the console cannot ask the shape question until the API accepts the answer. This lands in the running API, additively — a new column and two optional fields; nothing else moves.                 |
| **Proved by** | The API's own tests: the default, an explicit shape, `deploymentOn` derived from the shape, and the update path.                                                                                                                                                      |

### P1.2 The front door

`/` — the landing. It says what the platform **is** (a control plane that
installs applications once), names the applications and what each one is
worth, and shows the three levels.

**Proved by:** it renders; a signed-in visitor is sent to the overview; every
link resolves; it reads on a phone.

### P1.3 The shell

The top bar: **Overview · Projects · Settings**, and the account menu
carrying the applications and the keys.

**Proved by:** a route-inventory test that fails when a screen is reachable
from two places, and when a route exists but is not listed.

### P1.4 The platform overview

The operator's landing page:

- their projects, and **Create your first project** when there are none;
- the platform's health;
- **one line** listing the installed applications, with a **change** link —
  not a permanent menu item;
- the next action.

Every number is real. A number that cannot be known reads "Not available".

**Proved by:** the screen renders from the API's own response; an empty
account shows exactly one button.

### P1.5 The projects list, and the shape question

The list of the projects they can reach, a prominent **New project**, and
the create flow that asks the shape first:

> **What will this project do?**
> ◉ Backend as a service — data, users, files and realtime, powered by InstantDB
> ○ Deployments — build and run your application from git
> ○ Both

**Proved by:** creating a project of each shape; the response carries the
shape; the project list shows it.

### P1.6 The settings hub

`/settings` is the operator's hub: **Account · Applications · API keys & MCP
· Integrations · Platform email · Audit**.

Applications move here from the top bar, and `/applications` and `/mcp`
become redirects to their canonical homes.

**Proved by:** the route inventory; every section is reachable from the hub
and from nowhere else.

### P1.7 The auth screens

`/login`, `/register`, `/login/mfa`, `/forgot-password`, `/reset-password`,
`/verify-email`, `/magic-link`, `/force-change-password`,
`/invitations/accept`.

**Proved by:** the MFA path end to end (enrol, challenge, recovery code,
disable), the reset path end to end, and the enumeration tests: the same
answer for an address that has an account and one that does not.

### P1.8 The session

The tokens in **httpOnly cookies**, the proxy refreshing once on a 401, the
sign-out ending the session on the server.

**Proved by:** a signed-out request to a platform route lands on the sign-in
screen; the destination survives the round trip.

---

## P2 — the project console

### P2.1 The derived sidebar

One function, four inputs (`docs/ARCHITECTURE.md` §2), and the sidebar is
its output. The `localStorage` mode toggle goes.

**Proved by:** a test per shape, per capability, per resource state, and per
role.

### P2.2 The project overview

**What this project is · what it has · what to do next.** The screen the
project opens on.

**Proved by:** it renders for each shape, with and without resources.

### P2.3 "Services" retires into "Deployments"

One word for one thing. `/services` becomes a redirect; the deployed
applications are listed once.

### P2.4 The project settings

**What this project is**: the shape, the deployment switch, the capabilities,
the backend's status. Every toggle is a **real gate** — the server refuses
what the switch forbids — and every change lands in the activity feed.

---

## P3 — the capabilities

Each one is independent, and each follows the same shape: a wrapped UI over
its application, with truthful readiness.

| Capability                | The application           | What is built                                                                                                                                               |
| ------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Email**                 | Stalwart                  | Domains with the DNS records and their live status, mailboxes, aliases, sending, deliverability, inbound routes, the message log. Stalwart stays invisible. |
| **Packages**              | Verdaccio + Maven         | The registry address, scoped tokens, the published packages, and copy-paste `.npmrc` / `settings.xml`.                                                      |
| **WhatsApp**              | Viventure / Evolution     | Instances with their pairing QR, tokens, webhooks, and the console behind an **Advanced** link.                                                             |
| **Monitoring and Logs**   | Prometheus, Loki, Grafana | Per-project metrics and logs, with **Open in Grafana** for the power users.                                                                                 |
| **Deployments, polished** | The platform's own        | The Vercel-grade flow: source → detect → configure → deploy → live, with the build log streaming in the page and a one-click redeploy.                      |

### The readiness rule

An application is **available · installed · healthy · configured · connected ·
ready** — and the screen says which one it is. A capability whose
application is down says so, and links to where it is fixed.

---

### Where P3 stands

| Capability                | What is built                                                                                                                                                 | What is left                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Email**                 | The domains with their records and their live status, the mailboxes, the aliases, the keys, the sending, the deliverability counts and the message log.       | The inbound routes and the webhook subscriptions — **done**; the screen is the console's own mail, not Stalwart's admin. |
| **Packages**              | The registry address, whether it answers, the connect snippets, the published packages, and each package's versions, tags and README.                         | Maven **is** served by this deployment (`maven.fidscript.com` carries the Instant SDKs) — the screen now says so.        |
| **WhatsApp**              | The project's key, its instances, and the console behind an **Advanced** link.                                                                                | The pairing QR and the tokens, and the per-project instances (P5.6).                                                     |
| **Monitoring and Logs**   | The metrics, the alerts, the rules, the channels, the streams and the entries, per project, with **Open in Grafana**.                                         | The Grafana credential is the platform's own (P5.2) and the link has to carry it.                                        |
| **Deployments, polished** | Source → detect → configure → deploy → live, with the build log read while it runs, the live tail, the redeploy, and the stop, restart, roll back and remove. | Nothing structural — the polish is in the streaming of the build log.                                                    |

---

## P4 — the API moves home

The API joins this repository, one module at a time, with the console as its
test. Each module moves with its schema, its migrations and its tests.

---

## P5 — the platform becomes usable

P1–P4 built the product. **P5 is the part where a person can actually do
their work with it** — and it is the part that is still open. Every item
below was found by a person using the live platform, not by reading the
code.

The order is the order of a person's day: the domain answers, the account
opens, the credentials are one set, the databases are reachable, and the
project's resources exist.

### P5.1 The domain answers — **DONE, to be verified by hand**

The domain screen could not write a single record. Four faults, all in the
API, all found the same way:

| Fault                                                 | What it did                                                                                                                                          | The fix                                                                                                                                                                     |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The auto-configure's callbacks were stubs             | `async () => ''` and `async () => ({})` — they found no zone and wrote nothing, and the screen said "No Cloudflare connection found for this domain" | The project's **own** Cloudflare account is used: `DomainDnsService.getProjectProvider(projectId)` decrypts the connection's token and builds a `ProjectCloudflareProvider` |
| The zone lookup asked for the exact name              | `app.fidscript.com` is not a zone; `fidscript.com` is                                                                                                | `resolveZoneId` walks the labels up until one of them is a zone the account holds                                                                                           |
| The CNAME target was made of the domain's first label | `app.fidscript.com` → `app.apps.fidscript.com`, which is nobody's host                                                                               | The target is the **project's** host — `{project.slug}.apps.{platformDomain}`                                                                                               |
| The record was created, never updated                 | Cloudflare refuses a record that already exists ("an identical record already exists") and refuses a CNAME where an A record stands                  | `DomainDnsService.writeRecord` looks the record up first and writes only the difference: `created` · `updated` · `unchanged`                                                |

**Still to do by hand:** add a domain the project can own (see D12), press
**Write the records**, and see the record appear in Cloudflare.

### P5.2 One set of credentials — **DONE, verified live**

The platform's own identity is `kennedygithinjioffice@gmail.com` with the
password `Elishiba@95`. Every application answers to it now.

| Application     | Where it stands                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The console** | ✅ verified working                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Grafana**     | ✅ the admin's login and email are the platform's, and the password is the platform's. Verified: the login returns 200                                                                                                                                                                                                                                                                                                                                                                                   |
| **Stalwart**    | ✅ **DONE** — the recovery administrator is now `kennedygithinjioffice@gmail.com` / the platform password (`STALWART_RECOVERY_ADMIN`), and the SMTP submission credential changed with it. Verified: JMAP Basic auth as the email, `transporter.verify()` on 465, the old token refused with 401. The `admin:<sha256>` reading of the recovery pair was wrong — the secret after the colon is the password itself; `parseJmapCredential` only split it because the old token happened to be 64 hex chars |
| **InstantDB**   | ✅ the account exists under the platform email (it has since September), and the platform now holds that account's **personal access token** as `secrets/instant_superuser_token.txt` — the install step that was never finished. `GET /projects/:id/instant` says `available: true`                                                                                                                                                                                                                     |

The decisions are written down as **D16**.

### P5.3 The page bars — **DONE, deployed, and looked at**

Every screen had a sidebar and a body, and no bar. The bar is **part of the
frame** (D15), and it is now deployed and **looked at** — desktop and phone —
and the look caught what the build could not:

- the shell's sidebar is `w-64` and would not move: on a phone it took the
  screen's width and the work got what was left — badges sat on top of row
  titles and names truncated to nothing. The sidebar is now the frame's own
  `ResponsiveSidebar` (a drawer below `lg`, opened by a button the bar makes
  room for, closed by a choice, the overlay, or Escape), and the look was
  repeated: the same screens at 390px read clean.
- Twenty-four screens were migrated; the rest of the product follows the same
  rule in the next pass.

### P5.4 The credentials section in Settings — **DONE, deployed**

`/settings/credentials` — the place where "one email, one password" is
**decided**:

- the platform's email, and the **toggle**: _use the same password for the
  applications_;
- per application: the account it answers with, and how it signs in
  (password or magic code);
- **Check every application** — asks each one live whether the platform's
  password opens it (the console by bcrypt, Grafana and Stalwart over their
  own front doors; a 401 reads as "refuses", not as "could not check");
- **Apply the platform's identity** — Grafana is applied over its own admin
  API; Stalwart's answer says where it changes instead of pretending (it is
  the recovery administrator, defined by the installer); InstantDB's says the
  magic-code note.

The API surface: `GET/POST /admin/platform-credentials{,/verify,/apply}`
(platform admins only), following the shape of
`admin/platform-mail/console`.

### P5.5 The Databases page reaches the database — **DONE, deployed**

The project's **Databases** page links to:

- the project's **InstantDB app** — deep-linked into Instant's own console
  with the app id in it (`{dash}/dash?app={appId}`, the shape Instant's own
  source uses), so it opens on _this_ project's app;
- the **backend-as-a-service console** — named in the page beside it.

The Backend screen's door and the project overview's console link carry the
app id too.

### P5.6 The project's resources are created with the project — **DONE, verified live**

Creating a project provisions it in the systems it will use:

- an **InstantDB app**, when the shape has a backend (`BACKEND`/`BOTH`) — an
  app that is already there counts as the last attempt's success;
- the project's **WhatsApp identity** — its own instance on the WhatsApp
  platform, named after the project, held by the **platform's own key**
  (`secrets/evolution_api_key.txt`); no key is pasted, pairing happens from
  the project's screen.

Both run in the fire-and-forget provisioning the create path already had,
both are recorded in the provisioning event, and both can be **re-tried**:
the backend from the settings and the next step (the path that already
existed), the instance from a button on the WhatsApp screen
(`POST /projects/:id/whatsapp/identity`, idempotent about an instance that
is already there).

Verified by creating a project of shape `BOTH`: its Instant app came up
ACTIVE and its WhatsApp instance was created and reachable — and the proof
project was then removed completely (Evolution instance deleted, Instant app
unlinked, project hard-deleted).

Also fixed on the way: the platform could not reach Instant at all —
`INSTANT_API_HOST` pointed at an add-on container that is not how the
Instant BaaS is deployed here; the api now joins the self-hosting stack's
own network and reaches the server as `http://server:8888`.

### P5.7 The project needs a domain it may own — **DONE, the record is in Cloudflare**

`app.fidscript.com` stays the console's (D12). What was done by hand:

1. the **stale domain row** (`app.fidscript.com` on the project) was removed
   through the API;
2. **`demo.fidscript.com`** was added through the console (zone
   `fidscript.com`, "a subdomain of it") and **Write the records** pressed —
   the proof:

   - `dig TXT _fidscript-verification.demo.fidscript.com` answers with the
     platform's verification string,
   - `dig CNAME demo.fidscript.com` answers
     `fidscript-6d39d5fa.apps.fidscript.com` — **the project's host** (D14) —
   - and it resolves to the server.

   The domain does not answer HTTP yet, and the platform says so truthfully:
   nothing is deployed on it. The check's "failed" badge for "nothing is
   deployed on it yet" is a refinement listed below.

Also fixed while proving it: three places still built the CNAME target from
the **domain's first label** on the READ path — the records the screen asks
for, the repair executor and the wizard. The write was right; the screen was
wrong. All three take the project's slug now.

---

## The definition of done, for every phase

1. The screens of the phase work against the running API.
2. The tests of the phase pass, and the previous phases' tests still pass.
3. The route inventory matches the route tree, and the test proves it.
4. `tsc --noEmit` is clean; the build is clean.
5. The phase is deployed and **looked at** — at a desktop size and at a
   phone size.
6. The docs say what changed: the guide's acceptance criteria for the phase
   are met, and the record is written.

---

## The order, and why

```
P1.1  the shape (API, additive)      ← everything else is derived from it
P1.7  the auth screens                ← they exist and work today
P1.8  the session (httpOnly cookies)  ← the app is safer than the old one
P1.2  the front door                  ← the first impression
P1.3  the shell (three items)         ← the navigation the guide rules
P1.4  the platform overview           ← what a person sees first
P1.5  the projects list + the shape   ← the guide's journey B and F4
P1.6  the settings hub                ← where the one-time things live
P2.1  the derived sidebar             ← the guide's rule 2
P2.2  the project overview            ← the guide's F5
P2.3  Services → Deployments          ← the guide's vocabulary
P2.4  the project settings            ← the switches
P3.*  the capabilities                ← independent, parallelisable
P4.*  the API comes home              ← last
P5.1  the domain answers              ← a person can point an app at a name
P5.3  the page bars                   ← every screen says what it is
P5.2  one set of credentials          ← the console, Grafana, Stalwart, Instant
P5.4  the credentials in Settings     ← so it is a decision, not a fact
P5.6  the project's resources         ← created with the project
P5.5  the Databases page reaches out  ← the doors to those resources
P5.7  a domain the project may own    ← app.fidscript.com is the console's
```

P1.1, P1.7 and P1.8 first: the shape, the screens that already work, and the
session. Everything after that is visible.

P5 is the order of a person's **day**: the domain answers, the screen says
what it is, the account opens with one password, the resources exist, and
the doors to them are on the page that claims they are.

---

## What is deliberately not in this plan

|                                                     | Why                                                                                              |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **The organization model**                          | It is a product decision, not a build. The decisions it needs are listed in `docs/DECISIONS.md`. |
| **A CLI, an MCP server, a package registry client** | They are surfaces over the API. The console is the product the guide is about.                   |
| **Rewriting the API**                               | It works, it is deployed, and it is hardened. It moves here in P4, on its own terms.             |
| **Porting the old screens**                         | They were built for a shape the guide retired. The decisions are ported; the code is not.        |

---

_Written 2026-11-07._
