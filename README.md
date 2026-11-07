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
`NEXT_PUBLIC_API_URL`; the proxy route (`/api/v1/*`) forwards to it and
carries the session.

| | |
|---|---|
| `npm run dev` | the development server |
| `npm run build` | the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | the test suite |

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

The plan is `docs/IMPLEMENTATION_PLAN.md`. The first phase — the platform
level — is under way.

The API is **not** in this repository yet. It runs, it is deployed, and the
console is built against it; it moves here in the last phase.

---

*Written 2026-11-07.*
