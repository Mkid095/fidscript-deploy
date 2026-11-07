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

| Phase | What it delivers | Why it is here |
|---|---|---|
| **P1 — the platform level** | The front door, the shell, the overview, the projects list, the settings hub, and **the project's shape** | The guide's first impression. A person signs in and must understand the platform in five seconds. |
| **P2 — the project console** | The derived sidebar, the project overview, "Services" retired into "Deployments", the project settings | The second half of the guide. A project must show what it has, not a fixed list. |
| **P3 — the capabilities** | Email, Packages, WhatsApp, Monitoring and Logs — each wrapped over its application | The guide's §8, one capability at a time. Independent of each other. |
| **P4 — the API moves home** | The API joins this repository, module by module, with the console as its test | Only after the console works against the running API. |

**P1 and P2 are the product. P3 is breadth. P4 is housekeeping.**

---

## P1 — the platform level

### P1.1 The project's shape

The spine. Everything in the guide's menus is derived from it.

| | |
|---|---|
| **API** | `ProjectShape` enum (`BACKEND` · `DEPLOYMENT` · `BOTH`), `Project.shape`, `Project.deploymentOn`. A migration with a safe default (`DEPLOYMENT`, deployments on). `CreateProjectDto` and `UpdateProjectDto` take both, optionally. The project response carries both. |
| **Why first** | The API rejects unknown request fields (`forbidNonWhitelisted`), so the console cannot ask the shape question until the API accepts the answer. This lands in the running API, additively — a new column and two optional fields; nothing else moves. |
| **Proved by** | The API's own tests: the default, an explicit shape, `deploymentOn` derived from the shape, and the update path. |

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

| Capability | The application | What is built |
|---|---|---|
| **Email** | Stalwart | Domains with the DNS records and their live status, mailboxes, aliases, sending, deliverability, inbound routes, the message log. Stalwart stays invisible. |
| **Packages** | Verdaccio + Maven | The registry address, scoped tokens, the published packages, and copy-paste `.npmrc` / `settings.xml`. |
| **WhatsApp** | Viventure / Evolution | Instances with their pairing QR, tokens, webhooks, and the console behind an **Advanced** link. |
| **Monitoring and Logs** | Prometheus, Loki, Grafana | Per-project metrics and logs, with **Open in Grafana** for the power users. |
| **Deployments, polished** | The platform's own | The Vercel-grade flow: source → detect → configure → deploy → live, with the build log streaming in the page and a one-click redeploy. |

### The readiness rule

An application is **available · installed · healthy · configured · connected ·
ready** — and the screen says which one it is. A capability whose
application is down says so, and links to where it is fixed.

---

### Where P3 stands

| Capability | What is built | What is left |
|---|---|---|
| **Email** | The domains with their records and their live status, the mailboxes, the aliases, the keys, the sending, the deliverability counts and the message log. | The inbound routes and the webhook subscriptions — the API has them; the screen does not yet. |
| **Packages** | The registry address, whether it answers, the connect snippets, the published packages, and each package's versions, tags and README. | Maven is not served by this deployment, and the screen says so. |
| **WhatsApp** | The honest gap, and the console that does it today behind an **Advanced** link. | The instances, the pairing QR and the tokens — the platform keeps no project-scoped instances yet. |
| **Monitoring and Logs** | The metrics, the alerts, the streams and the entries, per project, with **Open in Grafana**. | The alert rules and the notification channels — the API has them; the screen does not yet. |
| **Deployments, polished** | Source → detect → configure → deploy → live, with the build log read while it runs, and the stop, restart, roll back and remove. | The redeploy, and the live tail of the log. |

---

## P4 — the API moves home

The API joins this repository, one module at a time, with the console as its
test. Each module moves with its schema, its migrations and its tests.

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
```

P1.1, P1.7 and P1.8 first: the shape, the screens that already work, and the
session. Everything after that is visible.

---

## What is deliberately not in this plan

| | Why |
|---|---|
| **The organization model** | It is a product decision, not a build. The decisions it needs are listed in `docs/DECISIONS.md`. |
| **A CLI, an MCP server, a package registry client** | They are surfaces over the API. The console is the product the guide is about. |
| **Rewriting the API** | It works, it is deployed, and it is hardened. It moves here in P4, on its own terms. |
| **Porting the old screens** | They were built for a shape the guide retired. The decisions are ported; the code is not. |

---

*Written 2026-11-07.*
