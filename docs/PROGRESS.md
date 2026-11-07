# Where we are

*The console, rebuilt from the user-flow guide, and the platform behind it.*

Written 2026-11-07. This is the whole of it: what was asked, what was
built, what is live, and what is still open.

---

## 1. What was asked

The platform was to be rebuilt from `docs/USER_FLOW_GUIDE.md` — the guide
that says what the product *is* rather than what it happens to have. Three
rules hold it together:

1. **A screen belongs to exactly one level** — platform, project, or
   application.
2. **A menu is derived from what the thing really has** — never a fixed
   list.
3. **A one-time thing never sits in a permanent menu** — the applications
   and the keys are settings, not destinations.

And then the later instructions, which this document also answers to:

- the interface has to look professional — spacing, alignment, scroll
  areas, loading states, and a working sign-in screen;
- the links have to work;
- the applications the platform installs need their own front ends, the way
  the mail and the registry already do;
- the Cloudflare and GitHub accounts are connected once and reused;
- the installation is one command and a few steps, with the domain
  connected for you;
- the machine has to be watchable — CPU, memory, storage, bandwidth, the
  requests each site carried;
- the applications' source belongs in one hub.

---

## 2. What was built

### 2.1 The console — a new Next.js application

A new repository, a new application, no code carried over from the old
dashboard. It was written against the guide and against the running API.

| | |
|---|---|
| The front door | what the platform is, and the way in |
| The platform level | a sidebar — Overview · Projects · Settings · System |
| The project console | a derived menu, and an overview that says what the project has and what to do next |
| The capabilities | Email, Packages, WhatsApp — each wrapped, each truthful |
| The deployment flow | source → detect → configure → deploy → live |
| The first-time journey | what the platform is, your name, your first project, what to do next |
| The setup wizard | the domain, the administrator, the applications |
| The guide | thirteen pages, written down, with a test that keeps them |

### 2.2 The interface

- **One frame.** Every screen sits in the same width, the same padding and
  the same rhythm; the platform level uses two columns so the work has the
  context beside it.
- **Two columns that each scroll.** The sidebar is a column of its own —
  the head pinned, the menu scrolling inside it, the foot pinned — and the
  work scrolls beside it.
- **Loading states** in the shape of the page that is coming, and a 404 and
  an error screen that offer the way out.
- **The sign-in screen**: the logo, a Show button on every password field,
  placeholders, and a card that says what the platform is.
- **Forms that follow the server** — a field the browser restored cannot
  change what is saved.

### 2.3 The capabilities

| Capability | What it does now |
|---|---|
| **Email** | domains with the records they need and each record's live status, mailboxes, aliases, keys, sending, the deliverability counts, the message log |
| **Packages** | the registry's address, whether it answers, the published packages, and each package's versions, tags and README |
| **WhatsApp** | the project's door to the messaging platform: the key it holds (encrypted), the instances it owns, and the console behind an Advanced link |

### 2.4 The integrations

- **GitHub** — connected once with a token, kept encrypted by the platform,
  never shown again, and used by every deployment after that.
- **Cloudflare** — the account that holds the domains. With it connected,
  the platform scans the zones, the person picks one, chooses whether the
  application answers on the domain itself or a subdomain of it, and the
  records are written and checked.

### 2.5 The machine, watched

The **System** screen: the CPU as a line over the last hour, the memory,
the disk and the network as meters, every container with what it is
holding, the traffic each of the platform's own sites carried, and the
logs. The overview carries the same summary beside the projects.

The numbers come from the Docker daemon and from the platform's own
collector — not from a collector's opinion of them.

### 2.6 The installation

One command, then the wizard: **the domain, the administrator, the
applications**. With a Cloudflare token, the platform writes the domain's
records itself, so the dashboard answers on the domain without anybody
touching a registrar.

The installer's scripts and the applications' add-ons are **in this
repository now**, and the installer finds them where they live.

### 2.7 The hub

`applications/` holds every application the platform can have, with the
platform's own integration for it — the image it runs, the configuration it
is given, the secrets it needs, the console's screen that wraps it — and
where its own source lives.

An application's own code is not copied in: each is its own project with
its own history, and copying 2.7 GB of Instant would be duplication, not
a hub.

---

## 3. The platform behind it

The API is **not** in this repository yet — it runs, it is deployed, and
the console is built against it. It moves here in the last phase.

Ten changes to it this week, each one fixing something that was quietly
wrong:

| | |
|---|---|
| The project's **shape** | `ProjectShape` and `deploymentOn` — what the console's menu is derived from |
| The project's **state** | it followed its provisioning; before that it stayed "creating" for ever |
| The **DNS records** | they said `apps.local` and `YOUR_SERVER_IP` — records that point nowhere |
| The **applications catalogue** | it is public now, because the setup wizard offers the applications before anyone has an account |
| The **guard** | it listens to the route now: a route marked public is public |
| The **project's push** | the project says whether a push deploys, so the console can show it as a switch |
| The **machine's state** | a new endpoint: what every container is using, read from the Docker daemon |
| The **traffic** | the requests each site carried, read from the edge's access log |
| The **WhatsApp door** | the Evolution API's address pointed at a container that does not exist; the api joins that network now |
| The **console at the root** | the compose service that serves it |

---

## 4. What is live

| | |
|---|---|
| `fidscript.com` | the console — the new one, built from this repository |
| `api.fidscript.com` | the platform API |
| `prometheus.fidscript.com` | the metrics (they were being swallowed by the platform's own routing) |
| `grafana.fidscript.com` | the dashboards |
| `loki.fidscript.com` | the logs |

The console is built as an image that carries only the standalone output,
so the machine that runs it needs neither the source nor the build tools.
Thirty-six tests pass. A crawl of thirty-five live pages finds no broken
links.

---

## 5. What is still open

| | |
|---|---|
| **The API moves home** | the last phase: the API, the packages and the installer come into this repository |
| **The applications' own source** | each application stays in its own project; the hub holds the platform's integration and the link |
| **The deployment's live tail** | the build log is polled, not streamed — the platform has no stream for it |
| **The redeploy** | the deployment screen has stop, start, roll back and remove; a one-click redeploy is missing |
| **The alert rules** | the API has them; the screen does not |
| **The inbound routes** | the API has them; the screen does not |
| **Maven** | the registry serves npm; Maven is not served on this deployment, and the screen says so |
| **The organisation model** | the decisions are recorded in `docs/DECISIONS.md` and are still owed |

---

## 6. How it was done

Thirty-one commits in this repository, ten in the platform's. Each one says
what it is and why it is — the messages are the record.

The order was the guide's: the shape and the API first, then the platform
level, then the project console, then the capabilities, then the flows —
and the interface was fixed **while** the screens were being built, not
after.
