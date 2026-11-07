# FIDScript

> **The console.** A control plane for your own hardware: it installs
> best-in-class applications once, and lets every project switch on only what
> it needs.

This repository is the **FIDScript web console** — a Next.js application that
talks to the FIDScript platform API.

```
docs/USER_FLOW_GUIDE.md      the vision — how a person moves through the product
docs/ARCHITECTURE.md         how this application is put together
docs/IMPLEMENTATION_PLAN.md  the work, phase by phase
docs/DECISIONS.md            the decisions taken, and the ones still owed
docs/USER_FLOW_SYSTEM.md      the audit of the system as it is today
```

---

## Running it

```bash
npm install
cp .env.example .env.local   # the API it talks to
npm run dev
```

The console needs the platform API. In development it points at
`NEXT_PUBLIC_API_URL`; the proxy route (`/console/api/v1/*`) forwards to it
and carries the session.

| | |
|---|---|
| `npm run dev` | the development server |
| `npm run build` | the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | the test suite |

---

## Putting it in front of the platform

The console is the platform's front door. It is built as an image that
carries only the standalone output, so the machine that runs it needs
neither the source nor the build tools.

```bash
docker build -t fidscript-console:latest \
  --build-arg NEXT_PUBLIC_API_URL=https://api.fidscript.com .
```

`NEXT_PUBLIC_API_URL` is **baked into the bundle at build time** — the
server reads the API's address from it, and the browser's calls go through
the console's own proxy. It is a build argument, not only an environment
variable.

The container answers on port 3001 and is reached at the root domain; the
routing lives in the platform's Traefik configuration, and the compose
service that runs it is named `dashboard` only so that the routing and the
install scripts keep pointing at the same place.

---

## The three levels

Everything in the product is at one of three levels, and the levels are the
route groups:

| Level | URL | The question it answers |
|---|---|---|
| **Platform** | `/overview`, `/projects`, `/settings` | "What is installed, and who am I?" |
| **Project** | `/projects/[projectId]/…` | "What does this project do, and what does it have?" |
| **Application** | `/settings/applications` | "Is the tooling this platform relies on healthy?" |

Three rules hold the product together:

1. **A screen belongs to exactly one level.**
2. **A menu is derived from what the thing really has** — never a fixed list.
3. **A one-time thing never sits in a permanent menu.**

---

## The state of the work

The plan is `docs/IMPLEMENTATION_PLAN.md`. The platform level, the project
console, the three capabilities, the deployment flow, the first-time
journey and the setup wizard are built.

The API is **not** in this repository yet. It runs, it is deployed, and the
console is built against it; it moves here in the last phase.

---

*Written 2026-11-07.*
