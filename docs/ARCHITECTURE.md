# FIDScript — architecture

> **What this project is, how it is put together, and the decisions that
> shape it.**
>
> The vision is `docs/USER_FLOW_GUIDE.md`. This document is how that vision
> becomes code. The work itself is in `docs/IMPLEMENTATION_PLAN.md`.

---

## 1. What this repository is

**One Next.js application: the FIDScript console.** The platform's API is a
separate service that the console talks to; it is not part of this
repository yet (see §7).

The console is where an operator does everything: installing applications,
creating projects, deploying applications, watching them run.

```
fidscript/
├── docs/            the vision, this document, the plan, the decisions
├── public/          the logo and the static assets
├── src/
│   ├── app/         the routes — one group per level
│   ├── components/  the design system, and the components on top of it
│   ├── lib/         the API client, the menu builder, the helpers
│   ├── hooks/       the behaviour that is not a component
│   └── types/       the shapes the API serves
├── package.json
├── next.config.mjs
├── tsconfig.json
└── postcss.config.mjs
```

**Not a monorepo.** The old repository was one, and it carried packages the
console does not need: a CLI, an MCP server, a shared SDK, an event union. The
console needs one thing from the platform — the API — and a set of
primitives. Both live here.

---

## 2. The three levels are the routing model

The guide's first rule is that a screen belongs to exactly one level. In the
code, **a level is a route group** — so the level of a screen is visible in
its path, and it cannot drift.

| Group | URL | Who is it for | Guard |
|---|---|---|---|
| `(public)` | `/` | a visitor | none |
| `(auth)` | `/login`, `/register`, `/setup`, … | a person signing in, or an operator installing | none (the setup wizard has its own token) |
| `(platform)` | `/overview`, `/projects`, `/settings`, … | the operator | a session |
| `(project)` | `/projects/[projectId]/…` | a project's owner and members | a session **and** access to that project |

Route groups do not appear in the URL, so `/projects` (the platform's list)
and `/projects/[projectId]` (a project) live at different levels without
either one shadowing the other.

### The top bar has three items

`Overview · Projects · Settings`, and nothing else. The applications and the
keys are **settings**, not destinations — a one-time thing does not sit in a
permanent menu.

### The project sidebar is derived

Never a fixed list. It is a pure function of four inputs:

```ts
interface MenuInput {
  shape: 'BACKEND' | 'DEPLOYMENT' | 'BOTH';
  deploymentOn: boolean;
  capabilities: { email: boolean; whatsapp: boolean; packages: boolean };
  resources: { functions: number; databases: number; deployments: number; domains: number };
  role: 'owner' | 'admin' | 'developer' | 'viewer';
}
```

The rule: **the menu shows what the project has; the overview shows what it
could have.** A project with no database has no "Databases" item, and its
overview offers to create one.

---

## 3. The data layer

### One client, written for this app

`src/lib/api/` is a small, typed client for the platform's HTTP API. It is
not a port of the old SDK — it is written for the screens this app has.

```
src/lib/api/
├── client.ts      the fetch wrapper: auth, errors, JSON
├── types.ts       the shapes the API serves
├── platform.ts    overview, applications, settings
├── projects.ts    the list, the create, the shape
└── ...
```

Every call returns a typed result or throws a typed error. The error carries
the API's status and message, so a screen can say **what** went wrong
instead of "something went wrong".

### The session lives in an httpOnly cookie

The old dashboard kept the access token in `localStorage`, where any script
on the origin could read it, and duplicated it under two keys.

**This one does not.** The tokens are set as **httpOnly, SameSite=Lax
cookies** by the proxy route, and the browser never sees them. The proxy
attaches the bearer to the upstream request; on a 401 it refreshes once and
retries.

```
browser ──cookie──▶ /console/api/v1/* (the proxy, a route handler)
                       │  reads the cookie, attaches the bearer
                       ▼
                    the platform API
```

A server component reads the session by calling the API **through the proxy**
with the incoming cookie — so the same code path works on the server and in
the browser, and there is no second auth mechanism.

The proxy's path is `/console/api/v1/*`, not `/api/v1/*`: the platform's API
answers on `/api/*` at the root domain too, and the console's proxy must
not be mistaken for it.

### Server components by default

A screen that only shows data is a **server component**. It fetches during
the render and sends HTML. Interactivity — a form, a menu, a dialog — is a
client component.

This is not a style preference: it is what keeps the token out of the
browser's JavaScript heap, and it is what makes the first paint cheap.

---

## 4. The design system

`src/components/ui/` — the primitives. They live **inside** the app, not in
a package, because there is one consumer and a package boundary would be a
package to version.

The rules, from the guide:

- **Every control has a name.** A label with no `htmlFor` is decorative
  text to a screen reader.
- **A dialog is a dialog**: `role="dialog"`, `aria-modal`, a name, the
  focus inside it, and the focus back where it came from.
- **The focus ring is visible** — the accent at 4px with a canvas-coloured
  gap, which clears the 3:1 WCAG 2.2 asks for.
- **One spacing, one radius, one shadow scale**, all from CSS variables in
  `src/app/globals.css`, mapped into Tailwind's `@theme`.
- **Colour carries meaning.** The accent is the action colour. Nothing is
  decorative violet.

### The token file

`src/app/globals.css` holds the two themes (light and dark) as CSS
variables, and Tailwind's `@theme` maps them to utilities. One file, one
place; a component never writes a hex colour.

---

## 5. The API relationship, and what happens to the old code

The platform's API is **a given**. It runs, it is deployed, and it stays
where it is while this app is built.

The console is written against the API's **existing contract**:
`/api/v1/overview`, `/api/v1/projects`, `/api/v1/auth/*`,
`/api/v1/applications`, `/api/v1/installation/status`, and the rest.

**The one contract change the console needs** is the project's shape:

```prisma
enum ProjectShape { BACKEND DEPLOYMENT BOTH }

model Project {
  shape        ProjectShape @default(DEPLOYMENT)
  deploymentOn Boolean      @default(true)
}
```

It is **additive** — a new column with a default, and two optional request
fields. It is implemented in the running API first, because the API rejects
unknown request fields (`forbidNonWhitelisted`), so the console cannot send a
shape the API would refuse.

The old dashboard's code is **not** ported. Its screens were built for a
shape the guide retired; the new ones are built for the guide's shape. What
survives is not code but **decisions** — which are in `docs/DECISIONS.md`.

---

## 6. The screens

### The platform level

| Route | What it is |
|---|---|
| `/` | the front door: what the platform is, and the way in |
| `/overview` | the operator's landing page: their projects, the platform's health, the applications that are installed, and the next action |
| `/projects` | the projects they can reach, and **New project** |
| `/settings` | the hub: account, applications, API keys & MCP, integrations, platform email, audit |
| `/settings/applications` | every installed application: status, version, console, restart, install more |
| `/settings/api-keys` | the platform's keys, their scopes, and the MCP server |
| `/login` · `/register` · `/login/mfa` · … | the auth screens |

### The project level

| Route | What it is |
|---|---|
| `/projects/[projectId]` | **redirects to the overview** — never to a section |
| `/projects/[projectId]/overview` | what this project is, what it has, what to do next |
| `/projects/[projectId]/deployments` | the deployed applications — one word for one thing |
| `/projects/[projectId]/settings` | what this project is: its shape, its capabilities, its members |

### The naming rules, in code

- A screen's title says its **level**: "Platform settings", "Project settings".
- A deployment is a **deployment**. The word "services" is not used.
- A menu item appears only when the project has the thing.
- One canonical route per screen; everything else redirects.

---

## 7. The order of the work

The API moves into this repository **after** the console works against the
running one — the console is the thing the guide is about, and it can be
built against a running API today.

```
docs          the vision, the architecture, the plan
  ↓
the console   the platform level, then the project level
  ↓
the API       moves here, module by module, with the console as its test
```

---

## 8. What this document does not decide

- **The organization model.** It is still unresolved, and it is a product
  decision, not an architectural one. `docs/IMPLEMENTATION_PLAN.md` lists
  what Phase 5B needs to settle.
- **Which capabilities the applications expose.** The guide rules per
  application; the shape of each API is the API's business.

---

*Written 2026-11-07.*
