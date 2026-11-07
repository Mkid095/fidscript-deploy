# Where we are

_The console, rebuilt from the user-flow guide, and the platform behind it._

Written 2026-11-07. This is the whole of it: what was asked, what was
built, what is live, what was found by using it, and what is still open.

**§6 is the newest part** — the faults that only a person using the
platform would find, what is fixed, and the five things that are not.

---

## 1. What was asked

The platform was to be rebuilt from `docs/USER_FLOW_GUIDE.md` — the guide
that says what the product _is_ rather than what it happens to have. Three
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

|                        |                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------- |
| The front door         | what the platform is, and the way in                                               |
| The platform level     | a sidebar — Overview · Projects · Settings · System                                |
| The project console    | a derived menu, and an overview that says what the project has and what to do next |
| The capabilities       | Email, Packages, WhatsApp — each wrapped, each truthful                            |
| The deployment flow    | source → detect → configure → deploy → live                                        |
| The first-time journey | what the platform is, your name, your first project, what to do next               |
| The setup wizard       | the domain, the administrator, the applications                                    |
| The guide              | thirteen pages, written down, with a test that keeps them                          |

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

| Capability   | What it does now                                                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Email**    | domains with the records they need and each record's live status, mailboxes, aliases, keys, sending, the deliverability counts, the message log |
| **Packages** | the registry's address, whether it answers, the published packages, and each package's versions, tags and README                                |
| **WhatsApp** | the project's door to the messaging platform: the key it holds (encrypted), the instances it owns, and the console behind an Advanced link      |

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

### 2.7 The home

The repository is the platform's home: the console, the API, the packages,
the command line, the MCP server, the installer and the applications.

```
apps/console   apps/api   apps/cli   apps/mcp-server
packages/      applications/   installer/   docs/
```

### 2.8 The hub

`applications/` holds every application the platform can have, with the
platform's own integration for it — the image it runs, the configuration it
is given, the secrets it needs, the console's screen that wraps it — and
where its own source lives.

An application's own code is not copied in: each is its own project with
its own history, and copying 2.7 GB of Instant would be duplication, not
a hub.

---

## 3. The platform behind it

The API is **in this repository now**, beside the console — so the
platform is one repository, and the deployment is built from it.

Eleven changes to it this week, each one fixing something that was
quietly wrong:

|                                |                                                                                                                                                                                                                                                                                          |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The project's **shape**        | `ProjectShape` and `deploymentOn` — what the console's menu is derived from                                                                                                                                                                                                              |
| The project's **state**        | it followed its provisioning; before that it stayed "creating" for ever                                                                                                                                                                                                                  |
| The **DNS records**            | they said `apps.local` and `YOUR_SERVER_IP` — records that point nowhere                                                                                                                                                                                                                 |
| The **applications catalogue** | it is public now, because the setup wizard offers the applications before anyone has an account                                                                                                                                                                                          |
| The **guard**                  | it listens to the route now: a route marked public is public                                                                                                                                                                                                                             |
| The **project's push**         | the project says whether a push deploys, so the console can show it as a switch                                                                                                                                                                                                          |
| The **machine's state**        | a new endpoint: what every container is using, read from the Docker daemon                                                                                                                                                                                                               |
| The **traffic**                | the requests each site carried, read from the edge's access log                                                                                                                                                                                                                          |
| The **WhatsApp door**          | the Evolution API's address pointed at a container that does not exist; the api joins that network now                                                                                                                                                                                   |
| The **console at the root**    | the compose service that serves it                                                                                                                                                                                                                                                       |
| The **logs of a container**    | the platform reads them from Loki, so a deployment's output can be followed while it runs                                                                                                                                                                                                |
| The **domain's records**       | the auto-DNS used stubbed callbacks, guessed the zone and guessed the target; it now writes with the project's own Cloudflare account, finds the zone by walking the labels up, points at the project's own host, and upserts the record instead of failing on one that is already there |
| The **platform's own names**   | a project can no longer take `app.`, `api.`, `grafana.` or any other name the platform answers on — the refusal says what to use instead                                                                                                                                                 |

---

## 4. What is live

|                            |                                                                       |
| -------------------------- | --------------------------------------------------------------------- |
| `fidscript.com`            | the console — the new one, built from this repository                 |
| `api.fidscript.com`        | the platform API                                                      |
| `prometheus.fidscript.com` | the metrics (they were being swallowed by the platform's own routing) |
| `grafana.fidscript.com`    | the dashboards                                                        |
| `loki.fidscript.com`       | the logs                                                              |

The console is built as an image that carries only the standalone output,
so the machine that runs it needs neither the source nor the build tools.
Thirty-six tests pass. A crawl of thirty-five live pages finds no broken
links.

---

## 5. What was finished this week

|                            |                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **The API moves home**     | the API, the packages, the command line, the MCP server and the installer are in this repository; the deployment builds from it |
| **The live log**           | the deployment screen follows the application's own output, read from the machine that runs it                                  |
| **The redeploy**           | one button builds the same source again                                                                                         |
| **The alert rules**        | the rules that say when to speak up, and the channels it goes to                                                                |
| **The inbound routes**     | where the mail goes when it arrives, and the webhooks that are told                                                             |
| **Maven**                  | it was served all along — `maven.fidscript.com` carries the Instant SDKs                                                        |
| **The organisation model** | answered in D11, and the project's settings show the workspace it belongs to                                                    |

---

## 6. The second half of the week — what a person found

Everything above was built against the plan. Everything below was found by
**using the live platform**, and each of these is written up in
`docs/IMPLEMENTATION_PLAN.md` as **P5**.

### 6.1 The domain could not be written — **fixed**

The screen said _"No Cloudflare connection found for this domain"_, and the
records it asked for pointed at `app.apps.fidscript.com`, which is nobody's
host. Four faults, all in the API:

- the auto-configure's callbacks were **stubs** — they found no zone and
  wrote nothing;
- the zone lookup asked for the **exact** name, so a subdomain never found
  the zone it lives in;
- the CNAME target was built from the **domain's first label**;
- the record was **created, never updated** — and Cloudflare refuses to
  create a record that already exists.

All four are fixed: the project's own Cloudflare account is used, the zone
is found by walking the labels up, the record points at the **project's**
host, and the record is **upserted** (D13, D14). The platform's own names
are now refused with a sentence that says what to use instead (D12).

### 6.2 Grafana had no credential anybody knew — **fixed**

The admin answered to `admin`, and the password was a machine token in a
secrets file. It now answers to the platform's own email with the
platform's own password, and the login is verified.

### 6.3 Every screen was missing its bar — **fixed, not yet deployed**

The sidebar was there and the content was there, and the bar that carries a
screen's name and its actions was not. The bar is now part of the frame
(D15): `Page` takes the title and the actions and renders the bar itself,
sticky, above the scrolling body. Twenty-four screens were migrated.

### 6.4 What is still open — the short list

|                                                                                                                             | Where it is written |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| **One set of credentials** — Stalwart's admin, InstantDB's account, and the **Settings screen** that decides it             | P5.2, P5.4          |
| **The Databases page reaches the database** — the links to the project's InstantDB app and its backend-as-a-service console | P5.5                |
| **The project's resources are created with the project** — an Instant app, the WhatsApp identity                            | P5.6                |
| **A domain the project may own** — `app.fidscript.com` is the console's alias and stays that way                            | P5.7                |
| **The console's deployment** — the page bars are built and tested, not yet in front of anybody                              | P5.3                |

---

## 7. How it was done

Thirty-one commits in this repository, ten in the platform's. Each one says
what it is and why it is — the messages are the record.

The order was the guide's: the shape and the API first, then the platform
level, then the project console, then the capabilities, then the flows —
and the interface was fixed **while** the screens were being built, not
after.

The last of it was found the other way: by a person using the platform. The
domain that would not write, the credential nobody knew, the bar that was
missing from every screen — none of those are in the plan, and all of them
are now in it (**P5**) with the reason they were missed and the order they
are fixed in.

---

## 8. Where to pick it up

| The task                        | The files                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The domain's records**        | `apps/api/src/modules/domains/services/{domain-dns,domain-cloudflare-auto,domain-health,domain-add}.service.ts`, `apps/api/src/modules/infrastructure/primitives/project-cloudflare-provider.ts`, `apps/api/src/modules/domains/services/reserved-hosts.ts`                                                                                 |
| **The page bars**               | `apps/console/src/components/ui/page.tsx` (the frame), `apps/console/src/components/ui/card.tsx` (`PageHeader`)                                                                                                                                                                                                                             |
| **One set of credentials**      | `apps/api/src/modules/email/services/mail-console.service.ts` (what the mail server answers with), `apps/api/src/modules/email/providers/stalwart-email.provider.ts` (how the platform authenticates to it), `installer/docker/secrets/stalwart_admin_token.txt` and `smtp_submission_pass.txt` (the two secrets that must change together) |
| **The credentials in Settings** | `apps/console/src/app/(platform)/settings/` — the hub, and the new section                                                                                                                                                                                                                                                                  |
| **The Databases page**          | `apps/console/src/app/(project)/projects/[projectId]/databases/page.tsx`, and the InstantDB client in `apps/console/src/lib/api/project.ts`                                                                                                                                                                                                 |
| **The project's resources**     | `apps/api/src/modules/projects/services/project-create.service.ts`                                                                                                                                                                                                                                                                          |

_Written 2026-11-07._
