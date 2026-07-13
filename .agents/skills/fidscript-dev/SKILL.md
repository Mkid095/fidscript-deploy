---
name: fidscript-dev
description: >
  FIDScript Deploy platform developer. Use whenever the user wants to build,
  modify, extend, or understand any part of the FIDScript Deploy monorepo —
  the NestJS API, Next.js dashboard, SDK modules, CLI commands, MCP server,
  Prisma schemas, event system, or any shared package. Triggers on: "add a new
  endpoint", "create a new SDK module", "add a field to the Prisma schema",
  "build a new dashboard page", "implement email webhooks", "add a CLI command",
  "add a new event type", "set up CI for a new package", or any task that
  involves writing code across the fidscript-deploy workspace.
---

# FIDScript Deploy — Developer Skill

You are a senior full-stack engineer building the FIDScript Deploy platform.
You have deep knowledge of every package in the monorepo and can implement features
across the entire stack.

## Workspace Map

```
fidscript-deploy/
├── apps/
│   ├── api/          NestJS + Prisma — REST API, WebSocket, NATS, Redis
│   ├── dashboard/   Next.js 15 — React 19, App Router, Tailwind v4
│   ├── cli/          Commander.js — terminal client
│   └── mcp-server/  MCP server — AI tool interface
├── packages/
│   ├── sdk/         @fidscript-deploy/sdk — TypeScript SDK
│   ├── events/      @fidscript-deploy/events — typed event emitter
│   ├── types/       @fidscript-deploy/types — shared types
│   ├── ui/          @fidscript-deploy/ui — UI components
│   └── eslint-config/
├── turbo.json       Build orchestration (^build = wait for dependencies)
├── prisma/          Schema lives at apps/api/prisma/schema.prisma
└── docker-compose.yml
```

## The #1 Rule

**Prisma schema is the source of truth.** If you're adding a database feature,
write the Prisma schema first, then generate the client, then update the API
service, then update the SDK. Never skip steps or the workspace will break.

## Workspace Commands

```bash
pnpm install          # install all deps
pnpm build           # build all packages (respects turbo dependency order)
pnpm dev             # start all dev servers
pnpm lint            # lint all packages
pnpm typecheck       # typecheck all packages
pnpm test            # test all packages
pnpm clean           # clean all dist outputs
pnpm --filter <pkg> build   # build single package
```

## Namespace Rule

Every package MUST use `@fidscript-deploy`. The old `@fidscript/` namespace
is dead. If you see it, replace it.

## Package Entry Points

When creating or modifying a package, follow this pattern exactly:

```json
{
  "name": "@fidscript-deploy/<pkg>",
  "type": "module",
  "main": "./dist/<pkg>/src/index.js",
  "types": "./dist/<pkg>/src/index.d.ts",
  "exports": {
    ".": "./dist/<pkg>/src/index.js",
    "./client": "./dist/<pkg>/src/client.js",
    "./modules/*": "./dist/<pkg>/src/modules/*.js"
  }
}
```

The SDK (`packages/sdk`) is the canonical reference — copy its structure.

## tsconfig

Base `tsconfig.base.json` has `noEmit: true`. Any emitting package MUST override:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": false
  }
}
```

## How to Build a New API Feature

1. **Prisma first**: Add the model/enum to `apps/api/prisma/schema.prisma`
   - Every enum needs `@@schema("public")` or target schema
   - Every relation needs its inverse declared
   - Run `pnpm --filter @fidscript/api generate` to regenerate client
2. **API service**: Add NestJS controller + service in `apps/api/src/`
3. **SDK module**: Add methods to the relevant SDK module in `packages/sdk/src/modules/`
4. **Types**: Export new types from `packages/types/src/`
5. **Events**: If the feature emits events, register schema in `packages/types/src/events/`
6. **Dashboard**: If UI needed, add to `apps/dashboard/src/app/(app)/`
7. **Verify**: `pnpm typecheck && pnpm lint`
8. **CI**: No changes needed — CI runs all packages automatically

## How to Build a New SDK Module

1. Create `packages/sdk/src/modules/<name>.ts`
2. Implement using `FidscriptClient`:
   ```typescript
   export class <Name>Module {
     constructor(private client: FidscriptClient) {}
     async list() { return this.client.get('/<name>'); }
     async get(id: string) { return this.client.get(`/&lt;name&gt;/${id}`); }
     async create(data: unknown) { return this.client.post('/&lt;name&gt;', data); }
   }
   ```
3. Export from `packages/sdk/src/index.ts`
4. Add to `createFidscript()` return object
5. Export types from `packages/types/src/`

## How to Add a Dashboard Page

1. Add route in `apps/dashboard/src/app/(app)/&lt;section&gt;/page.tsx`
2. Use `makeSdk()` from `lib/sdk.ts` — handles mock vs real automatically
3. For data fetching use React Query or Server Components
4. For forms: use server actions or API routes under `app/api/`
5. Token refresh is automatic via `onUnauthorized` callback in `sdk.ts`

## How to Add a CLI Command

1. Add to `apps/cli/src/bin/fidscript.ts` under the relevant subcommand group
2. Use dynamic SDK import: `const { createFidscript } = await import('@fidscript-deploy/sdk')`
3. Load credentials via `loadCredentials()` from `../config/index`
4. Handle errors with `die('message')` (exits with code 1)
5. Use `printTable()` helper for formatted output

## How to Add an Event

1. Add schema to `packages/types/src/events/event-registry.ts`
2. Add legacy alias if needed to `LEGACY_EVENT_ALIASES` in types
3. Emit via `@fidscript-deploy/events` in the API:
   ```typescript
   import { validatePayload } from '@fidscript-deploy/events';
   const payload = validatePayload('domain.verified', { domainId, projectId });
   eventEmitter.emit('domain.verified', payload);
   ```
4. Consumer handles in a NATS listener or worker

## Error Handling

Use typed SDK errors from `@fidscript-deploy/sdk/modules/errors`:
```typescript
import { AuthError, NotFoundError } from '@fidscript-deploy/sdk/modules/errors';
```

On the API side, throw NestJS exceptions or let the global filter handle them.
Use `failureType` for email status — NOT `status.error`.

## Dashboard Mock Mode

For development without a backend:
```bash
NEXT_PUBLIC_USE_MOCK_API=true pnpm --filter @fidscript/dashboard dev
```
The mock SDK is in `apps/dashboard/src/mocks/sdk.ts`.

## Key Files

| File | Purpose |
|------|---------|
| `apps/api/src/main.ts` | NestJS bootstrap, global prefix, CORS, Socket.IO adapter |
| `apps/api/prisma/schema.prisma` | All database models — the source of truth |
| `packages/sdk/src/index.ts` | `createFidscript()` — all SDK modules |
| `packages/sdk/src/client.ts` | FidscriptClient — axios + 401 interceptor + token refresh |
| `packages/events/src/event-emitter.ts` | `validatePayload`, `resolveEventType`, `buildPlatformEvent` |
| `packages/types/src/events/event-registry.ts` | All event schemas |
| `apps/dashboard/src/lib/sdk.ts` | Dashboard SDK init — mock vs real mode |
| `apps/dashboard/src/mocks/sdk.ts` | Full mock SDK for local development |
| `apps/cli/src/bin/fidscript.ts` | All CLI commands |
| `turbo.json` | Build dependency graph — `dependsOn: ["^build"]` |

## Reference Files

- `references/architecture.md` — Full platform architecture, all services, data flows
- `references/prisma-schema.md` — Every model, enum, and relationship pattern
- `references/sdk-modules.md` — SDK module methods, FidscriptClient internals, error types
- `references/package-conventions.md` — Correct package.json, tsconfig, exports patterns
- `references/events.md` — Event system, schema registry, migration, legacy aliases
- `references/dashboard.md` — SDK init, mock mode, token refresh, ESLint suppressions
- `references/cli.md` — CLI patterns, credential storage, all commands

If you need details on a specific area, read the relevant reference file first.

## Output Format for Feature Implementation

When implementing a feature, show:

```
## What I'll build
Brief description of the approach.

## Changes
- apps/api/src/... — what changed
- packages/sdk/src/... — what changed
- packages/types/src/... — what changed
- apps/dashboard/src/... — what changed (if applicable)

## Verification
pnpm typecheck && pnpm lint && pnpm build
```

Then implement the code. Be thorough — this is a full-stack platform and
missing any step will break the workspace.
