# Where we are

_The console, rebuilt from the user-flow guide, and the platform behind it._

Written 2026-11-07. This is the whole of it: what was asked, what was
built, what is live, what was found by using it, and what is still open.

**§6 is the faults a person found; §7 is the hand-over session that closed
them** — the five open items, what each took, and what was found on the way.

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

_Closed by the hand-over session — see §7._

|                                                                                               | Where it is written |
| --------------------------------------------------------------------------------------------- | ------------------- |
| ~~One set of credentials~~ — **done, verified live**                                          | P5.2, P5.4          |
| ~~The Databases page reaches the database~~ — **done**                                        | P5.5                |
| ~~The project's resources are created with the project~~ — **done, verified by creating one** | P5.6                |
| ~~A domain the project may own~~ — **done: `demo.fidscript.com` is in Cloudflare**            | P5.7                |
| ~~The console's deployment~~ — **done, deployed, and looked at on a phone**                   | P5.3                |

---

## 7. The hand-over session — the five, closed

_Everything in §6.4 was open at the start of this session. Here is what each
took, and what was found on the way. The decisions are **D16** and **D17**._

### 7.1 The page bars went out — and the phone look mattered (P5.3)

Deployed (`docker compose build dashboard && up -d dashboard`), then looked
at — desktop and phone, six screens each. The desktop was right. The phone
was not: the shell's sidebar is `w-64 flex-shrink-0` and would not move, so
on a 390px screen the menu took the width and the work got ~100px — badges
sat on top of row titles and names truncated to nothing.

The fix is the frame's, not the screens': `ResponsiveSidebar` — a column on
a wide screen, a drawer over the page on a small one, opened by a button the
page bar makes room for. Looked at again after: clean.

### 7.2 One set of credentials (P5.2, P5.4)

- **Stalwart**: the recovery administrator is now the platform's email with
  the platform's password, and the SMTP submission credential changed with
  it. Verified: JMAP auth as the email, `transporter.verify()` on 465, the
  old token refused with a 401.
- **InstantDB**: the platform's superuser token — a personal access token of
  the platform's own account — is now `secrets/instant_superuser_token.txt`,
  and the platform reads it from the file without a restart.
  `GET /projects/:id/instant` says `available: true`.
- **Grafana** was already done; the credentials screen reads and applies it
  over its own API.
- **Settings → Credentials** (P5.4) holds the decision: the identity, the
  toggle, the four applications and what each answers with, **Check every
  application** (live — a 401 reads as "refuses"), and **Apply** where it
  can be applied.

### 7.3 The platform could not reach Instant at all (found during P5.6)

`INSTANT_API_HOST` pointed at `fidscript_instant_server:8888` — an add-on
container that does not exist in this deployment. The Instant BaaS here is
the self-hosting stack (`self-hosting-server-1`), which publishes nothing
the api could reach. The api now joins the self-hosting stack's network and
reaches the server as `http://server:8888`. Without this, P5.5 and P5.6 had
nothing to land on.

### 7.4 The Databases page reaches the database (P5.5)

The project's Instant app opens in Instant's own console with the app id in
the link (`/dash?app={appId}` — the shape Instant's own source uses); the
backend-as-a-service console is named beside it. The Backend screen's door
and the overview's console link carry the app id too.

The Fidscript project was given its backend through the platform's own
provisioning path — the same one P5.6 runs at creation.

### 7.5 A project is born with its resources (P5.6)

Verified by creating a project of shape `BOTH`: its Instant app came up
ACTIVE and its WhatsApp instance was created on the platform's own key,
connected and reachable — no pasted key. The proof project was then removed
completely: Evolution instance deleted, Instant app unlinked, project and
children hard-deleted. Nothing test-shaped is left.

### 7.6 A domain the project owns (P5.7)

The stale row (`app.fidscript.com`) was removed; **`demo.fidscript.com`**
was added through the console and **Write the records** pressed. The record
is in Cloudflare and resolves on the public internet:

```
_fidscript-verification.demo.fidscript.com  TXT  "FIDScript verified acb71195…"
demo.fidscript.com                          CNAME fidscript-6d39d5fa.apps.fidscript.com
```

The CNAME points at the **project's host** — and the look caught that the
READ path still pointed at `demo.apps.fidscript.com` (the domain's first
label) in three places even though the write was right. All three take the
project's slug now.

### 7.7 What was found and not taken — the honest list

| Found                                                                                                                                                                                                   | Where it stands                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| The domain card's badge says **"failed"** when the truth is "the records are right; nothing is deployed on it yet"                                                                                      | the verify's HTTP-routing step has no deployment to find   |
| The domain rows' per-record status stays **"pending"** — no live check for deployment records (the email records have one)                                                                              | `GET …/dns-records` returns the required list, not a check |
| The console has **no remove-domain button** — the stale row was removed through the API                                                                                                                 | `DELETE /projects/:id/domains/:id` exists                  |
| The WhatsApp screen lists **every instance the platform's key can see**, not just the project's                                                                                                         | `WhatsappState.instances` is the platform-wide list        |
| The project sidebar never shows a **WhatsApp** item (`capabilities.whatsapp` is hardcoded `false` in the layout); the screen is reachable from the overview's Capabilities                              | `projects/[projectId]/layout.tsx`                          |
| The **email capability is still unconfigured**: `fidscript.com`'s MX points at the registrar's forwarding, Stalwart holds no mailboxes, and a full system-mail send was not tested (auth verified only) | the guide's Stalwart configuration checklist               |
| The zone picker's default zone is whichever the API lists first, not the project's likeliest                                                                                                            | cosmetic                                                   |

### 7.8 The secrets that changed — for the operator's own record

| Secret                                           | Now holds                                                                                                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `secrets/stalwart_admin_token.txt`               | the platform password (the mail administrator's)                                                                                                                    |
| `secrets/smtp_submission_pass.txt` / `_user.txt` | the platform password / the platform email                                                                                                                          |
| `secrets/stalwart_credentials.txt`               | the email and the password, as a pair                                                                                                                               |
| `secrets/instant_superuser_token.txt`            | the Instant account's personal access token (moved from the operator's own MCP config)                                                                              |
| `secrets/evolution_api_key.txt`                  | the WhatsApp platform's key, so the platform can give a project its identity                                                                                        |
| `.env`                                           | `STALWART_RECOVERY_ADMIN`, `STALWART_JMAP_USER`, `STALWART_JMAP_PASSWORD`, `SMTP_SUBMISSION_*`, `INSTANT_SUPERUSER_EMAIL`, `INSTANT_API_HOST`, `GRAFANA_ADMIN_USER` |

The old values are gone by design — the old token was refused with a 401
before anything else was verified, and a rollback is still possible: the
current `.env` and `secrets/` show every value that was set, and the mail
administrator accepts whatever `STALWART_RECOVERY_ADMIN` says at startup.

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

P5 is closed. What is open, and the files that hold it:

| The task                                                                                                                   | The files                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **The email capability** — the Stalwart configuration checklist (§8.3 of the guide), mailboxes, a full send                | `apps/api/src/modules/email/`, the guide's checklist; the MX for `fidscript.com` still points at the registrar's forwarding |
| **The domain card's truths** — "nothing deployed yet" instead of "failed"; live per-record statuses; a remove button       | `apps/api/src/modules/domains/services/domain-health.service.ts`, `apps/console/src/components/project/domain-card.tsx`     |
| **WhatsApp scoping** — the project's screen lists the project's instance first, the others could be named "the platform's" | `apps/api/src/modules/whatsapp/whatsapp.service.ts`                                                                         |
| **The sidebar's WhatsApp item** — derived from the project's identity instead of hardcoded off                             | `apps/console/src/app/(project)/projects/[projectId]/layout.tsx`                                                            |
| **The page bars for the remaining screens** — the next pass of the same rule                                               | `apps/console/src/components/ui/page.tsx`                                                                                   |

## 9. The deployment and the interface — the second session

_The deployment was followed end to end — a real application, from git to
answering on its own domain — and the screens a person lives in were redrawn._

### 9.1 What the deployment was hiding

A deployment was created from git and followed to the end. Four faults fell
out of it, all fixed:

- **A failure never reached the build log.** The clone error lived only in
  the api's own logs; the screen showed an empty box for ever. Now the
  failure is appended to the release's log (scrubbed), and the build's
  lines are flushed the moment the build dies.
- **A GitHub token leaked.** The owner's credential was embedded into the
  clone URL of _any_ git source — a `file://` remote included — and a clone
  failure quoted the whole URL into the log. Credentials ride only on
  https remotes now, and every log line passes a scrubber
  (`runner/scrub-secrets.ts`).
- **git refused to clone a repository owned by another user** — the image
  now marks directories safe at the system level, where git honours it
  (`-c safe.directory` is ignored by design).
- **The deployment container's name was 65 characters** — past DNS's
  63-character limit — so every custom-domain route pointed at a name that
  could not resolve and answered 502. One naming helper
  (`runner/container-name.ts`), eight characters of id, all constructors.

### 9.2 What works now, verified live

A demo application was deployed, and:

- the build log **appears while the build runs** and tells the truth when it
  fails — error lines marked, the window opening on the tail, copy with one
  press, long logs truncated from the top with the count said out loud;
- the deployment answered on **its own subdomain**
  (`https://{slug}.apps.fidscript.com`) with a valid certificate the moment
  it was healthy;
- **`demo.fidscript.com` was pointed at it** — a new
  `POST …/domains/:id/attach` endpoint, an "End the others"-style control on
  the deployment page — and answered 200 with a valid cert;
- a **monorepo** repository is detected as several applications
  (libraries filtered out), the wizard picks the one to build, the plan
  falls through to the first app that runs when the root is not an
  application, and the finish screen offers the rest in turn.

### 9.3 The interface

- **One dialog primitive** (`ui/dialog.tsx`) — every panel that opens over
  the page behaves the same way now; the new-project dialog uses it.
- **/settings** is two columns: the account, two-factor and the sessions on
  the left; the platform's surfaces beside them. The sessions list gained
  **End the others** (`DELETE /auth/sessions/others`) — one press ends the
  130-odd stale sessions an agent's work leaves behind, and keeps the one
  that pressed.
- **/projects** cards carry the project's description and when it last
  deployed.
- **The project's settings** are two columns: what the project is called
  and what it is on the left; the members, the variables and a visually
  distinct danger zone beside them.
- **/system** puts memory and CPU side by side; the deployments list shows
  a human name ("Deploy · Nov 8, 04:20", or the repo it came from) instead
  of a raw UUID.

---

## 10. The SSL lifecycle — the domain finally says the truth

_The universal-deployment brief (`docs/DEPLOYMENT_AUDIT.md`) was audited,
proposed, and its first phase implemented on the operator's go-ahead._

The reconciliation worker **had never processed a job**: its JetStream
consumer filtered on the bare subject while every job published to
`subject.<domainId>`. Fixed (self-healing consumer, filter corrected,
replaced on boot), and then the SSL lifecycle works:

- a domain pointed at a healthy deployment gets its **certificate pre-warmed**
  (one tolerant request starts Traefik's ACME immediately);
- the honest HTTPS check **promotes a domain to ACTIVE/ACTIVE from any
  state** — the `FAILED`/`ISSUING` dead-end is gone;
- the **real certificate expiry** is recorded (read from the TLS socket);
- a certificate crossing 30 days emits a renewal event, once;
- Cloudflare **proxy detection** is persisted and shown ("Cloudflare
  proxied" / "DNS only");
- a successful deployment **enqueues its domains' verification** and the
  project's domain attachments **follow the live deployment**;
- the verify's "nothing deployed" is not a failure; the SSL renew/reissue
  endpoints do the real work or say so.

Verified live: `demo.fidscript.com` reads `ACTIVE / ACTIVE / HEALTHY` with
`SSL · expires 2027-02-06` on its card, after a day stuck at FAILED/ISSUING.

Also landed with it: the deployment wizard offers the project's existing
domains; the deployments list marks the **live** deployment and renames
BLOCKED to "queued behind the live build"; the container health gate falls
back to the root path; and a **Python builder** (Django/Flask/FastAPI/
plain-Python on `python:3.12-slim`) was verified live with a FastAPI
application deployed from git — it replaced the previous deployment as the
one live target, exactly as the one-production-target rule says.

---

## 11. The interface's behaviour — how the console feels

_The layer that makes every page and every action feel the same._

- **A toast for every action's result.** One primitive
  (`ui/toast.tsx`): a small panel in the screen's corner, in the tone of
  the news — success, error, info — that arrives with a slide, stays long
  enough to read, and goes by itself. Wired into the deployment actions
  (stop, start, rollback, redeploy, remove), the domain actions (write the
  records, check them, point a name at a deployment, take it off), the DNS
  account (connect, disconnect), and the sessions (end one, end the
  others). No more result paragraphs buried in the card an action
  happened in.
- **A bar that says a navigation is happening**
  (`ui/navigation-progress.tsx`): it starts on any internal link's click,
  crawls while the server answers, and finishes when the route lands. A
  click no longer feels dead.
- **Loading shapes that match the pages they become**: the skeletons were
  re-anchored to the frame (left edge, sticky bar included) and gained
  list and detail variants; every deep segment — one deployment, the
  system page, each settings section — has its own `loading.tsx`, so
  navigation shows the page's silhouette instead of the old one freezing.
- **A confirm dialog for the acts that cannot be undone**: removing a
  deployment, disconnecting the DNS account — the same centred dialog with
  the consequences named, over a blurred page.
- **Content settles** instead of snapping: a short fade-and-rise on the
  page's body (skipped for `prefers-reduced-motion`).

---

_Written 2026-11-07. The hand-over session's part is §7; the deployment and
the interface are §9; the SSL lifecycle is §10; the interface's behaviour
is §11._

## 12. The numbers on the project — logs, monitoring, and the way the server reaches the API

- **The log filters were refused wholesale.** The platform's validation
  pipe runs with `forbidNonWhitelisted`, and an undecorated DTO field is a
  property that "should not exist" — so any log query carrying even one
  filter came back 400, and the page read "The entries could not be
  read." Every logging DTO (streams, the log read, the writes, the batch)
  now declares every field it accepts, and the monitoring metrics DTO
  took the same treatment. Dates are transformed with `@Type(() => Date)`
  and validated with `@IsDate()`: the transform runs before the
  validators, so an `@IsDateString()` after it would refuse every range.
- **The metrics were zero by construction.** Nothing ever wrote to the
  metric table, so a busy, healthy application read as zero.
  `MetricsSamplerService` reads `docker stats` for every running
  deployment container once a minute and records
  `container.cpu_percent` and `container.memory_bytes`, labelled by
  container and deployment; the window is a day, and the pruner keeps it
  so. A project's monitoring page is a measurement now.
- **The switch's knob sat outside its track.** An absolutely-positioned
  element with no `left` takes its static position, which moves with the
  surrounding text alignment — inside a centred context the knob
  escaped the 36-pixel track entirely. It is anchored at `left-0` now.
- **The server reached the API the long way round.** Every server-side
  fetch — the pages' data, the browser's proxy, the sign-in, the token
  renewal, the installation — went out through the public edge and back,
  and a slow round-trip on each page's fetch is the whole interface
  feeling slow; a flaky one is the sign-in redirect loop. The deployment
  tells the console the internal address (`API_INTERNAL_URL`), but the
  build was folding the `process.env.X ?? …` chain to the baked-in
  public literal, so the runtime variable was never read. Reading it
  through an opaque alias makes the access survive to runtime; the pages
  now answer over the shared network instead of the edge.
- **The project's dashboard became a dashboard.** The overview is the
  project's services: the app (what is up, its address, the way in), the
  domains and which of them are live, the databases and which are
  broken, the functions, the mail, the storage, the packages, and the
  machine's WhatsApp — each with its real number, each a link to the
  page that does it — and the recent activity beside them. The guide's
  next step keeps its tested order.
- **The deployment's checkout carries the fixes.** The installer builds
  the API from its own checkout; the logging and monitoring fixes were
  synced there, and its `SystemService` learned to inject the config it
  was already calling.

---

_Written 2026-11-07. The hand-over session's part is §7; the deployment
and the interface are §9; the SSL lifecycle is §10; the interface's
behaviour is §11; the project's numbers are §12. The platform is live._

## 13. The registry and the observability numbers, on the short way round

- **The package page's catalogue was fetched the long way round, and the
  long way is slow.** `registry.fidscript.com` is Cloudfront-fronted and
  its full-catalogue answer (`/-/all`, every package in the store) took a
  quarter of a minute to stream — longer than the page's abort, so the page
  read "did not answer" every time. The dashboard now joins the registry's
  own network and fetches `REGISTRY_INTERNAL_URL` directly, and the
  catalogue is kept **warm** in the server process: fresh for five
  minutes, the stale list served at once while the new one is fetched on
  its own, and asked for at boot so no person's page is the one that waits
  for the first slow answer.
- **The machine's own numbers were read through the edge, too.** Loki and
  Prometheus are on the shared network the whole time; the console reached
  them by their public names and paid the round-trip on the logs page's
  "what the containers wrote" and every metric. They are now read from
  `LOKI_INTERNAL_URL` / `PROMETHEUS_INTERNAL_URL` when the deployment says
  where they are, and only through the edge when it does not.

---

_Written 2026-11-07 through 11-08. §12 is the project's numbers; §13 is
the short way round to the registry and the machine's own numbers. The
platform is live._
