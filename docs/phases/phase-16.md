# Phase 16: SDK Platform

> **Status:** Planned  |  **Track:** Surfaces  |  **Depends on:** Phases 03–15 (the backend it wraps)

## Objective

One canonical TypeScript SDK that exposes the **entire** platform — every module, complete types, auth, pagination, streaming, and realtime — so the CLI, MCP server, and any external app call the API through a single, correct, published package. Today there are **two** SDKs with the same name and an arbitrary resolution winner.

## Current State

**PARTIAL — duplicated.** See `docs/AUDIT.md` §D (SDK). Specific defects:

- **Two SDKs** named `@fidscript/sdk`: `apps/sdk` (axios) and `packages/sdk` (fetch) → importers resolve to an arbitrary one.
- `apps/sdk` is the stronger one but is **missing a `databases` module**.
- Neither is published; neither has complete coverage of the 13 backend modules.

## Dependencies

- **Phases 03–15** — each SDK method requires its backing API endpoint to exist and work. The SDK is built incrementally as phases verify; this phase *completes and ships* the SDK once the core backend (03–08 minimum) is real, and grows with each subsequent phase.

## Deliverables

- [ ] **One canonical SDK.** Consolidate to a single package (base it on the stronger `apps/sdk`; move into `packages/sdk` and delete the duplicate). One name, one implementation, one `dist`.
- [ ] **Full module coverage.** `auth`, `projects` (+env, members, invitations), `deployments`, `storage`, `databases`, `domains`, `email`, `functions`, `queues`, `scheduler`, `realtime`, `monitoring`, `logs` — every backend module has a corresponding SDK namespace, including the missing **databases** module.
- [ ] **Complete TypeScript types.** Types for every request/response; generated from a shared schema (zod / OpenAPI) where possible so they can't drift from the API.
- [ ] **Auth done right.** API-key, bearer token, and session auth; automatic token refresh on expiry; credential injection on the client.
- [ ] **Pagination + streaming.** Async-iterator pagination for list endpoints; streaming for build logs / log tail.
- [ ] **Realtime client.** A `realtime` namespace wrapping the Socket.IO client (Phase 13) with typed events.
- [ ] **Error types + retries.** Typed errors (`FidscriptError`, `AuthError`, `NotFoundError`…); configurable retries with backoff on idempotent calls.
- [ ] **Publishable build.** `package.json` `exports`/`types`/`main`, dual CJS/ESM where feasible, a clean `dist`, README + runnable examples. Installs from a tarball and (future) npm.

## Technical Design

- **Core HTTP client:** one configured instance (baseURL, auth header injection, timeout, retries). Each module is a class/namespace composing client calls; the top-level `createFidscript({ apiKey | token })` returns `{ auth, projects, deployments, ... }`.
- **Types as the contract:** a `packages/types` schema (or generated from the Nest controllers) is the single source for both the API DTOs and the SDK types — no hand-maintained parallel definitions.
- **Isomorphic:** Node-first, but the realtime + storage-upload paths work in browsers (presigned PUT, socket.io-client) so the same SDK powers the dashboard.
- **Pagination:** `[Symbol.asyncIterator]` wrappers over cursor pages (`for await (const p of sdk.projects.list())`).

## Integration Points

- **This phase IS the programmatic surface.** Consumed by: CLI (18), MCP server (17), and any third-party app. The dashboard may use it or call the API directly.
- **Service registry:** n/a (it's a client), but the SDK doc lists every endpoint it covers.
- **Events:** the realtime namespace surfaces platform events to SDK consumers.

## Verification (VPS)

```bash
# Install from a built tarball and exercise the full path against the VPS:
pnpm pack --filter @fidscript/sdk
cd /tmp/sdk-smoke && npm i <tarball>
node -e '
  const { createFidscript } = require("@fidscript/sdk");
  const fs = createFidscript({ baseURL:"https://deploy.fidscript.com/api/v1", apiKey:"fsk_..." });
  const p = await fs.projects.create({ name:"smoke", slug:"smoke" });
  const d = await fs.databases.create({ projectId:p.id, name:"db" });      // databases module present
  for await (const l of fs.logs.query({ projectId:p.id })) { console.log(l); break; }
  fs.realtime.subscribe(`project:${p.id}:deployments`, e => console.log(e)); // realtime works
'
# types compile: a .ts consumer passes tsc with no errors
```

**Exit criterion:** a single `@fidscript/sdk` exists and resolves deterministically; it covers all 13 modules including databases; types compile; auth, pagination, streaming, and realtime all work against the VPS; it installs from a tarball. The duplicate is gone.

## Out of Scope / Future

- SDKs in other languages (Python, Go) — future, generated from the same schema.
- npm publishing + semver CI — future (tarball now).
- GraphQL surface — future.

## Risks

- Keeping two SDKs alive "just in case" perpetuates the split — delete the loser decisively and port any unique feature.
- Hand-maintained types drift from the API → generate from schema, or add a contract test that hits each endpoint.

## Files you'll touch (precision map)

- Two SDKs to consolidate (ADR-012): `apps/sdk/` (`@fidscript/sdk-node`, axios, **stronger but missing a `databases` module`) and `packages/sdk/` (`@fidscript/sdk`, fetch, has databases). `apps/sdk/src/client.ts` + per-module `src/<module>/index.ts`.
- Decision: merge the stronger into `packages/sdk` as the canonical `@fidscript/sdk`; delete the other; the dashboard (`apps/dashboard/package.json` depends on `@fidscript/sdk`) keeps that name.
- Types: derive from `packages/types` / the API to avoid drift; add the missing `databases` module + realtime client.

## Next Phase

[Phase 17: MCP Platform](./phase-17.md)
