# Phase 00: Architecture & Build Foundation

> **Status:** Planned  |  **Track:** Foundation  |  **Depends on:** nothing (this is the root)

## Objective

Make the monorepo **compile, type-check, and containerize**. Nothing downstream can be verified until this is true, so this is Phase 0. The exit criterion is mechanical: `pnpm install` → `pnpm build` → `docker build` all succeed with zero type errors.

## Current State

**Does not compile or build.** See `docs/AUDIT.md` §A (blockers #1–#5, #9). Specific defects:

- `apps/api` is `module: commonjs` + `package.json "type": "module"` + every import uses `.js` extensions → emitted `require('./x.js')` resolves to files that do not exist.
- Workspace packages (`@fidscript/types`, `@fidscript/shared`, `@fidscript/events`) declare `main: ./dist/index.js` but `dist/` is never built → imports resolve to nothing.
- `ai.service.ts` and `marketplace.service.ts` import a non-existent `EventsService`/`events.service.js` (real file is `event.service.ts`, class `EventService`) → **compile failure**.
- `ai.service.ts` injects `@Inject('AI_PROVIDER')` but `ai.module.ts` provides `AIProvider` (symbol) → DI mismatch.
- No `Dockerfile` for the API or the dashboard → `docker compose up` cannot build them.
- `@modelcontextprotocol/sdk` is absent from `pnpm-lock.yaml` → the MCP server cannot start.
- Literal `{dto}` directories (unexpanded brace from a generator) exist under several modules.

## Dependencies

None. Every later phase depends on this one.

## Deliverables

- [ ] **Module-system decision, applied consistently.** Pick CommonJS for the API (NestJS's comfort zone): `apps/api` `package.json` → `"type": "commonjs"`; `tsconfig.json` → `module: commonjs`, `moduleResolution: node`; **remove all `.js` extensions** from local imports across `apps/api/src`. (ESM/nodenext is recorded as a future option in `DECISIONS.md`, not adopted now.)
- [ ] **Workspace build pipeline.** `turbo.json` `build` emits `packages/*/dist` before `apps/*` build (`dependsOn: ["^build"]` + sane `inputs`/`outputs`). `pnpm build` from the root produces all `dist/` artifacts. Fix any `package.json` `main`/`exports`/`types` fields to point at built output.
- [ ] **All modules compile.** Fix the two import bugs (`EventsService` → `EventService`, `events.service.js` → `event.service.ts`) and the AI DI token (align `provide:` and `@Inject()`). `pnpm typecheck` is clean repo-wide. (Full AI/Marketplace *logic* is Phases 22/23; here we only make them compile.)
- [ ] **Delete the literal `{dto}` directories**; confirm the real `dto/` dirs are intact.
- [ ] **`apps/api/Dockerfile`** — multi-stage: (1) install + `prisma generate` + `nest build`; (2) slim runtime with only `dist/` + `node_modules` + `prisma/`. Non-root user.
- [ ] **`apps/dashboard/Dockerfile`** — Next.js standalone output (`output: 'standalone'` in `next.config.ts`), multi-stage, non-root.
- [ ] **Lockfile reconciled.** `pnpm install` regenerates `pnpm-lock.yaml` including `@modelcontextprotocol/sdk` and all current workspace deps; `--frozen-lockfile` succeeds.
- [ ] **Canonical frontend decided.** `apps/dashboard` is the dashboard (Phase 19). Archive/remove the orphan root `src/` Vite scaffold (missing `main.tsx`, missing deps). Record the decision in `DECISIONS.md`.
- [ ] `pnpm typecheck` and `pnpm build` pass locally.

## Technical Design

- **CommonJS rationale:** NestJS 10, Prisma, and most of the Nest ecosystem are CommonJS-first. The scaffold is currently half-CJS / half-ESM, which is the worst case (broken resolution). Standardizing on CommonJS removes the entire class of errors at the cost of ESM purity (acceptable; revisit later).
- **Turbo build order:** packages have no app dependency; apps depend on packages. `^build` guarantees a package's `dist` exists before an app that imports it builds.
- **Docker multi-stage** keeps images small and keeps the build toolchain out of the runtime image. Prisma needs the schema + generated client at runtime.

## Integration Points

- **Events:** none yet (the bus is Phase 02).
- **Service registry:** none yet (Phase 02).
- **SDK / MCP / CLI / Dashboard:** these apps must exist in the build graph and compile, but their *content* is built in their own phases (16–20). Phase 00 only guarantees they build (the dashboard builds its placeholder page; the MCP server builds and can start; the SDK builds).

## Verification (VPS)

```bash
pnpm install --frozen-lockfile          # lockfile reconciled
pnpm typecheck                          # 0 errors across all workspaces
pnpm build                              # all dist/ artifacts produced
docker build -f apps/api/Dockerfile       apps/api        # succeeds
docker build -f apps/dashboard/Dockerfile apps/dashboard  # succeeds
```

**Exit criterion:** all of the above succeed with no errors. The app still does not *run end-to-end* (that needs Phase 01's infra + migrations), but it is now a buildable artifact.

## Out of Scope / Future

- Running the app, the database, or any infra (Phase 01).
- Any feature logic — modules only need to *compile*, not work.
- ESM migration (future ADR).

## Risks

- Prisma generated-client path discovery in the slim runtime image (verify it finds `schema.prisma`).
- Next.js standalone mode requires all imported packages flagged in `next.config.ts`.
- Removing `.js` extensions is a large mechanical sweep — do it with a codemod and verify via `typecheck`, not by hand.

## Files you'll touch (precision map)

> **Phase 00 is VERIFIED (commit `047ca53`).** This map records what was done — use it to orient, not to redo.

- Module system: `apps/api/package.json` (`type: commonjs`); `apps/api/tsconfig.json` (commonjs/node + `experimentalDecorators`, `emitDecoratorMetadata`, `noEmit:false`, `strictPropertyInitialization:false`); every `packages/*/{tsconfig,package}.json` (CommonJS, `noEmit:false`).
- Build pipeline: `tsconfig.base.json` (`noEmit:true` — overridden per consumer); `turbo.json` (`^build` already correct).
- Compile fixes: `apps/api/src/modules/ai/ai.module.ts` + `ai.service.ts`; `apps/api/src/modules/marketplace/marketplace.service.ts`; `apps/api/prisma/schema.prisma` (added `Project.aiConversations`); `apps/mcp-server/src/server.ts` + `handlers.ts`.
- Containerize: `apps/api/Dockerfile`, `apps/dashboard/Dockerfile`, `.dockerignore`, `apps/dashboard/next.config.ts` (`output:'standalone'` + `outputFileTracingRoot`).
- Removed/renamed: orphan `src/` (recoverable at `f1dd6f2`), `apps/mcp-server/src/index.ts`, `{src}`/`{dto}` dirs; `apps/sdk` → `@fidscript/sdk-node` (ADR-012).

## Next Phase

[Phase 01: Installer & Infrastructure Stack](./phase-01.md)
