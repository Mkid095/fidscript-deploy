# Phase 3 — the navigation and the platform overview

> Phase 3 in full: what the navigation is now, every route the dashboard
> serves and who owns it, where the overview's numbers come from, and what
> is still wrong.
>
> The objective was never to make the dashboard look more impressive. It was
> to make FIDScript easier to understand, navigate and operate — without
> hiding architectural problems behind attractive UI.

---

## 1. The navigation architecture

Two levels, and they do not mix.

**The platform's navigation** — in the top bar, the same on every screen
that is not inside a project:

| Item | Where it goes | What it is |
|---|---|---|
| Overview | `/overview` | what is happening across your projects |
| Projects | `/projects` | the projects you can reach |
| Applications | `/applications` | what this platform can have |
| API & MCP | `/mcp` | your keys, the CLI and the agent connections |
| Settings | `/settings` | your account, and the platform's own surfaces |

**The project console** — a project's own resources, in its sidebar, in two
modes (an application developer and a backend developer). The groups are
always **Project** (overview, members, activity) and **Settings**; the groups
in between depend on what the project is for.

The rule the architecture follows: **a service that belongs to the platform
is not offered as if it were a project's, and a project's resources are not
offered as if they were the platform's.** The account's API keys, the mail
console and the Cloudflare connection are the platform's; a project's
databases and functions are the project's.

### What was broken, and what it is now

| The defect | Now |
|---|---|
| The top bar had two items (Applications, Projects) and no overview | five items, and the overview is the landing |
| The sidebar's links were built from the project's **id** while the address carried its **slug** — the active state never matched | the links are built from the project **as it is in the address** |
| The project's overview, members and activity existed as `?section=` query parameters that nothing linked to | they are pages, in the sidebar |
| `/functions`, `/databases`, `/logs`, `/monitoring`, `/scheduler`, `/email` were a second way of asking for the same screens, reachable from nowhere | they send the caller to the project console |
| The mail console, the mail settings and the Cloudflare connection were three screens with **no way in** | they are under Settings → This platform |
| The signed-in operator landed on the marketing page | `/` sends a signed-in operator to the overview; the marketing page stays for everybody else |
| The domain detail and the mailbox detail were only in the flat email console | they are in the project console, and the domain card links to them |

---

## 2. The route inventory

Every route the dashboard serves, who owns it, and where it is reachable
from. It is the **source of truth** — `apps/dashboard/src/navigation/route-inventory.ts` — and
a test reads the route tree on disk and fails when the two disagree
(`route-inventory.test.ts`). That is what stops the next twenty-two orphans
from appearing.

| Route | Owner | Reachable from | Canonical |
|---|---|---|---|
| `/` | public | — | yes |
| `/home` | public | — | yes |
| `/docs` | public | 'landing' | yes |
| `/docs/[slug]` | public | 'landing' | yes |
| `/login` | auth | 'landing' | yes |
| `/register` | auth | 'landing' | yes |
| `/forgot-password` | auth | — | yes |
| `/invitations/accept` | auth | — | yes |
| `/setup` | auth | — | yes |
| `/onboarding` | auth | — | yes |
| `/force-change-password` | auth | — | yes |
| `/overview` | platform | 'platform' | yes |
| `/projects` | platform | 'platform' | yes |
| `/applications` | platform | 'platform' | yes |
| `/applications/email` | platform | 'platform' | yes |
| `/applications/package-manager` | platform | 'platform' | yes |
| `/settings` | platform | 'platform' | yes |
| `/mcp` | platform | 'platform' | yes |
| `/deployments/new` | platform | 'platform' | yes |
| `/platform/email` | platform-surface | 'settings' | yes |
| `/platform/email/settings` | platform-surface | 'settings' | yes |
| `/platform/integrations/settings` | platform-surface | 'settings' | yes |
| `/projects/[projectId]` | project | — | yes |
| `/projects/[projectId]/overview` | project | 'project:overview' | yes |
| `/projects/[projectId]/services` | project | 'project:services' | yes |
| `/projects/[projectId]/services/new` | project | — | yes |
| `/projects/[projectId]/functions` | project | 'project:functions' | yes |
| `/projects/[projectId]/functions/[id]` | project | — | yes |
| `/projects/[projectId]/deployments` | project | 'project:deployments' | yes |
| `/projects/[projectId]/deployments/[deploymentId]` | project | — | yes |
| `/projects/[projectId]/deployments/build-config` | project | — | yes |
| `/projects/[projectId]/databases` | project | 'project:databases' | yes |
| `/projects/[projectId]/databases/[databaseId]` | project | — | yes |
| `/projects/[projectId]/databases/[databaseId]/backups` | project | — | yes |
| `/projects/[projectId]/databases/[databaseId]/explorer` | project | — | yes |
| `/projects/[projectId]/databases/[databaseId]/realtime` | project | — | yes |
| `/projects/[projectId]/databases/[databaseId]/settings` | project | — | yes |
| `/projects/[projectId]/databases/[databaseId]/sql` | project | — | yes |
| `/projects/[projectId]/storage` | project | 'project:storage' | yes |
| `/projects/[projectId]/storage/[bucket]` | project | — | yes |
| `/projects/[projectId]/storage/settings` | project | — | yes |
| `/projects/[projectId]/instant` | project | 'project:instant' | yes |
| `/projects/[projectId]/domains` | project | 'project:domains' | yes |
| `/projects/[projectId]/domains/[domainId]` | project | — | yes |
| `/projects/[projectId]/email` | project | 'project:email' | yes |
| `/projects/[projectId]/email/analytics` | project | 'email' | yes |
| `/projects/[projectId]/email/templates` | project | 'email' | yes |
| `/projects/[projectId]/email/webhooks` | project | 'email' | yes |
| `/projects/[projectId]/email/suppressions` | project | 'email' | yes |
| `/projects/[projectId]/email/domains/[domainId]` | project | 'email' | yes |
| `/projects/[projectId]/email/domains/[domainId]/mailboxes/[mailboxId]` | project | 'email' | yes |
| `/projects/[projectId]/scheduler` | project | 'project:scheduler' | yes |
| `/projects/[projectId]/scheduler/[jobId]` | project | — | yes |
| `/projects/[projectId]/monitoring` | project | 'project:monitoring' | yes |
| `/projects/[projectId]/monitoring/[id]` | project | — | yes |
| `/projects/[projectId]/logs` | project | 'project:logs' | yes |
| `/projects/[projectId]/mcp` | project | 'project:mcp' | yes |
| `/projects/[projectId]/queues` | project | 'project:queues' | yes |
| `/projects/[projectId]/queues/[queueId]` | project | — | yes |
| `/projects/[projectId]/realtime` | project | 'project:realtime' | yes |
| `/projects/[projectId]/members` | project | 'project:members' | yes |
| `/projects/[projectId]/activity` | project | 'project:activity' | yes |
| `/projects/[projectId]/settings` | project | 'project:settings' | yes |
| `/functions` | project | — | **redirects to the project console** |
| `/functions/[id]` | project | — | **redirects to the project console** |
| `/databases` | project | — | **redirects to the project console** |
| `/databases/[id]` | project | — | **redirects to the project console** |
| `/logs` | project | — | **redirects to the project console** |
| `/monitoring` | project | — | **redirects to the project console** |
| `/monitoring/[id]` | project | — | **redirects to the project console** |
| `/scheduler` | project | — | **redirects to the project console** |
| `/scheduler/[id]` | project | — | **redirects to the project console** |
| `/email` | project | — | **redirects to the project console** |
| `/email/[domain]` | project | — | **redirects to the project console** |
| `/email/[domain]/mailboxes/[mailbox]` | project | — | **redirects to the project console** |
| `/email/analytics` | project | — | **redirects to the project console** |
| `/email/templates` | project | — | **redirects to the project console** |
| `/email/webhooks` | project | — | **redirects to the project console** |
| `/email/suppressions` | project | — | **redirects to the project console** |


**Reading the table.** *Owner* is who the route belongs to: the platform,
a project, the platform's own surfaces, the front door, or the pages around
signing in. *Reachable from* is where a person can get there — `—` means
the route is a **detail screen**, reached by clicking a row rather than
from the navigation. *Canonical* says whether the route is the address for
its screen, or whether it **sends the caller somewhere else**.

---

## 3. The overview's data

The overview answers for **the caller's own projects**: the ones they own,
the ones they are a member of, and the ones their workspaces own. Nothing
counts over the platform as a whole, so it never answers a question about
another tenant's work — or about the infrastructure.

| Section | Where the numbers come from | The API |
|---|---|---|
| Projects | the caller's projects, counted by status | `GET /api/v1/overview` → `projects` |
| Deployments | the caller's deployments — the running ones, the failures, the recent ones | `projects` → `deployments` |
| Alerts | the caller's alerts that have not been resolved | `alerts` |
| Activity | the caller's platform events, the last ten | `activity` |
| Where to go next | the platform's own links | — |

The endpoint is `GET /api/v1/overview` (the API's `OverviewService`), and the SDK's
`sdk.overview.get()` is what the page calls. There is **no** widget for
anything the platform cannot answer honestly: no "platform health", no
"resource usage", no invented activity. What the platform does not know is
not shown.

---

## 4. What changed, route by route

| | |
|---|---|
| **New** | `/overview` — the platform overview |
| **New** | `/projects/[projectId]/overview`, `/members`, `/activity` — the project's own sections, as pages |
| **New** | `/projects/[projectId]/email/analytics`, `/templates`, `/webhooks`, `/suppressions` — the email console's other screens, inside the project console |
| **New** | `/projects/[projectId]/email/domains/[domainId]` (+ `/mailboxes/[mailboxId]`) — the domain and mailbox details |
| **Redirects** | the sixteen flat paths above → the project console |
| **Reachable again** | `/platform/email`, `/platform/email/settings`, `/platform/integrations/settings` — under Settings → This platform |
| **Changed** | `/` — a signed-in operator is sent to `/overview` |
| **Changed** | the sign-in's destination — `/overview` instead of `/applications` |

**Deep links stay valid.** A link to `/functions` still works: it lands on
the project console's functions, for the project the caller was last in.

---

## 5. The tests

| What | Where | Tests |
|---|---|---|
| The route inventory against the route tree on disk | `route-inventory.test.ts` | 8 |
| The platform navigation — the links, the active state | `route-inventory.test.ts` | (above) |
| The project navigation — the roles, the groups, the mobile items | `sidebar-hooks.test.ts` | 11 |
| The flat paths → the project console | `redirect-to-project.test.tsx` | 3 |
| The overview — the data, the empty state, the failure | `overview.test.tsx` | 6 |
| The overview, over HTTP, against a real database | `apps/api/src/testing/overview.integration-spec.ts` | 5 |
| The email console's domains (Phase 2) | `domains-tab.test.tsx` | 2 |
| The toast (Phase 2) | `toast-provider.test.tsx` | 2 |
| The login's `next` (Phase 1) | `auth-token-utils.test.ts` | 5 |

**Results:** the dashboard's suite is **37 tests in 6 files**; the API's
integration tier is **27 tests in 7 files** (the Phase 1 and Phase 2 suites
still pass); the API's unit tier is **115 tests**; the typecheck passes in
**all 12 workspaces**.

---

## 6. What is still wrong

Recorded, not fixed — each belongs to a later phase.

| The defect | Where it is recorded |
|---|---|
| The organization interface does not exist, though the API has 18 endpoints for it | the operator's decision: prepare the model, do not build an incomplete interface |
| The dashboard has no MFA step, so an account with MFA cannot sign in | `KI-9` |
| The platform cannot register its own mail domains — it has no project to own them | `KI-11` |
| The deployment's action buttons contradict the API, and `BLOCKED` and `ROLLED_BACK` are dead ends | the audit's H11 |
| A failed deployment does not say why | the audit's H14 |
| The sidebar has no command palette, no global search and no header project switcher | the audit's M3 |
| The flat route tree still exists as a set of redirects — they are the old addresses, kept working | this document's inventory |

### For Phase 4

- The **route inventory test** is the thing to extend: it already fails when a
  route is on disk and not in the inventory, so a new screen cannot appear
  without being catalogued.
- The **overview** should grow a section when the platform can answer
  honestly — the applications' own status is the obvious candidate, and it is
  already in the applications screen.
- The **project console's navigation** is mode-dependent (deploy / BaaS). The
  mode is kept in `localStorage` per project; making it a property of the
  project itself is a later decision.
