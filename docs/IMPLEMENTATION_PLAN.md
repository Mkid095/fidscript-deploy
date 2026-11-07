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

### P5.2 One set of credentials — **PARTLY DONE**

The platform's own identity is `kennedygithinjioffice@gmail.com` with the
password `Elishiba@95`. The applications the platform runs should open with
the same.

| Application                | Where it stands                                                                                                                                                                                                                                          |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The console**            | ✅ `kennedygithinjioffice@gmail.com` / `Elishiba@95` — verified working                                                                                                                                                                                  |
| **Grafana**                | ✅ **DONE** — the admin's login and email are now the platform's, and the password is the platform's. Verified: the login returns 200                                                                                                                    |
| **Stalwart**               | ⬜ The admin is `admin` + the machine token (`secrets/stalwart_admin_token.txt`), and that same token is the platform's **SMTP submission password**. Changing it means changing both together — the API's JMAP client, the SMTP client, and the secrets |
| **InstantDB**              | ⬜ It signs in with a **magic code**, not a password. It still needs an account under the same email, so the person is not two people                                                                                                                    |
| **The console's Settings** | ⬜ **P5.4** below — the place where this is decided rather than hard-coded                                                                                                                                                                               |

### P5.3 The page bars — **DONE, not yet deployed**

Every screen had a sidebar and a body, and no bar: no place that carried the
screen's name and what could be done with it, and no way out of a screen
that stayed in the same place.

The bar is now **part of the frame**, not a thing each screen remembers:
`Page` takes `title`, `description`, `actions` and `eyebrow`, and renders the
bar itself — sticky, over the scrolling body. A screen cannot have a body
without a bar above it, and two screens cannot disagree about what a bar
looks like.

Twenty-four screens were migrated. The rest of the product follows the same
rule in the next pass.

### P5.4 The credentials section in Settings — **TO DO**

`/settings` must hold the credentials for the applications the platform
runs, so that "one email, one password" is a **decision the operator makes**
rather than a fact they discover:

- the platform's email and password, and a **toggle**: _use the same
  password for the applications_;
- per application: the account it answers with, and whether the password is
  the platform's or its own;
- InstantDB: the email it is registered under, and the magic-code note;
- what is applied, what is pending, and **the way to apply it**.

The API needs the matching surface: a platform-admin endpoint that reads
the application's own credential, one that applies the platform's, and one
that says what each application currently answers with.

### P5.5 The Databases page reaches the database — **TO DO**

The project's **Databases** page has no way to reach the database that
actually holds the project's data. It must link to:

- the project's **InstantDB** project — its data, its schema, its console;
- the **backend as a service** console for the project (the `backend` screen
  is a page of words; it needs the door);
- and each of those must carry the right **project id**, so the link lands on
  _this_ project's app and not on the platform's.

### P5.6 The project's resources are created with the project — **TO DO**

Creating a project must also create it in the systems it will use — an
InstantDB app, the project's WhatsApp identity — so the links in P5.5 land
on something that exists.

Today the project's Instant app is created by a later, separate step, and
the WhatsApp identity is created when somebody connects WhatsApp. Both
should happen when the project is made, and both should be re-tried when
they fail, without leaving the project half-made.

### P5.7 The project needs a domain it may own — **TO DO (D12)**

`app.fidscript.com` is the **console's** alias, and it stays that way. The
project "Fidscript" therefore needs another name — one of the zones in the
operator's Cloudflare account, or a subdomain of one that is not the
platform's own. The zone picker already lists the account's zones; what is
missing is a domain the project can take.

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
