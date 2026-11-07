# FIDScript

> **The console.** A control plane for your own hardware: it installs
> best-in-class applications once, and lets every project switch on only what
> it needs.

This repository is the **platform's home** — the console, the API, the
packages, the command line, the installer and the applications that the
platform can have.

```
apps/
  console/                 the one Next.js app that serves the platform
  api/                     the platform API — the console's other half
  cli/                     the command line
  mcp-server/              the MCP server an agent talks to
packages/                 the SDK, the events and the types the apps share
applications/              the hub: every application, and the platform's
                           integration with it
installer/                the installation — one command, then a few steps
docs/                     the guide, the architecture, the plan, the progress
```

---

## Running it

The console needs the platform API. In development it points at
`NEXT_PUBLIC_API_URL`; its proxy route (`/console/api/v1/*`) forwards to the
API and carries the session.

```bash
pnpm install
cp apps/console/.env.example apps/console/.env.local
pnpm --filter @fidscript/console dev
```

| | |
|---|---|
| `pnpm dev` | everything, through turbo |
| `pnpm build` | the production builds |
| `pnpm test` | the test suites |
| `pnpm typecheck` | the type checks |
| `pnpm db:migrate` | the API's migrations |

---

## Putting it in front of the platform

The console is built as an image that carries only the standalone output, so
the machine that runs it needs neither the source nor the build tools.

```bash
docker build -f apps/console/Dockerfile -t fidscript-console:latest \
  --build-arg NEXT_PUBLIC_API_URL=https://api.fidscript.com .
```

`NEXT_PUBLIC_API_URL` is **baked into the bundle at build time** — the
server reads the API's address from it, and the browser's calls go through
the console's own proxy.

The API's image is built the same way, from `apps/api/Dockerfile` ✓.

---

## The three levels

Everything in the product is at one of three levels, and the levels are the
route groups:

| Level | URL | The question it answers |
|---|---|---|
| **Platform** | `/overview`, `/projects`, `/settings`, `/system` | "What is installed, and who am I?" |
| **Project** | `/projects/[projectId]/…` | "What does this project do, and what does it have?" |
| **Application** | `/settings/applications` | "Is the tooling this platform relies on healthy?" |

Three rules hold the product together:

1. **A screen belongs to exactly one level.**
2. **A menu is derived from what the thing really has** — never a fixed list.
3. **A one-time thing never sits in a permanent menu.**

---

## The state of the work

`docs/IMPLEMENTATION_PLAN.md` says what the plan is;
`docs/PROGRESS.md` says where we are.

---

*Written 2026-11-07.*
