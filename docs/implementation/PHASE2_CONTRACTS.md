# Phase 2 — the contract between the layers

> The verification matrix for Phase 2. Every integration the platform has between its API, its
> SDK and its dashboard, and **what proves it**. A row is only *verified* when something fails
> when the contract breaks — a test, not a reading.
>
> Phase 2's objective: the three layers agree, the known integration failures are gone, and
> there is a testing foundation that proves it. **No visual redesign.**

---

## The matrix

| Integration | API verified | SDK verified | Dashboard verified | Automated test |
|---|---|---|---|---|
| **The SDK's paths** — every method's route | ✅ read from the controllers' own metadata | ✅ read from the SDK's source | — | `contract/sdk-contract.spec.ts` |
| **The scopes** — a scope declared on a route is enforced | ✅ the route's metadata | — | — | `contract/scope-enforcement.spec.ts` |
| **The email domains** — list, create, delete, verify | ✅ over HTTP, real database | ✅ the unwrapping | ✅ the list renders | `workflows.integration-spec.ts`, `domains-tab.test.tsx` |
| **The email mailboxes and aliases** — list | ✅ the same bare array | ✅ the unwrapping | ✅ | `workflows.integration-spec.ts` |
| **Adding a domain** — the envelope and the DNS steps | ✅ the envelope | ✅ typed | ✅ the steps are shown | `workflows.integration-spec.ts` |
| **The environment variables** — read, write, mask | ✅ the value by role | ✅ | ✅ | `workflows.integration-spec.ts` |
| **The environment variables' scope** (KI-10) | ✅ a key without `envvars:read` is refused | — | — | `contract/sdk-contract.spec.ts`, `authorization.integration-spec.ts` |
| **The functions** — create, read, the variables | ✅ the variables stay encrypted | ✅ | — | `workflows.integration-spec.ts` |
| **The functions' roles** — who may write, deploy, invoke | ✅ | — | — | `functions.controller.spec.ts` |
| **The databases** — read, and another project's | ✅ | ✅ the delete is project-scoped | ✅ | `workflows.integration-spec.ts`, `sdk-contract.spec.ts` |
| **The deployments** — read, list | ✅ | ✅ | — | `workflows.integration-spec.ts` |
| **The queues** — create, list | ✅ | ✅ | — | `workflows.integration-spec.ts` |
| **The project API key** — its own project, another project's | ✅ | ✅ | — | `authorization.integration-spec.ts` |
| **The project roles** — owner, admin, developer, viewer | ✅ | — | — | `authorization.integration-spec.ts` |
| **The tokens** — a refresh token, and the logout | ✅ | — | — | `authorization.integration-spec.ts` |
| **The sign-in method lookup** — no account enumeration | ✅ | — | — | `auth.service.spec.ts` |
| **The login's `next`** — no open redirect | — | — | ✅ | `auth-token-utils.test.ts` |
| **The toast** — the provider is above every screen | — | — | ✅ | `toast-provider.test.tsx` |
| **The MCP scopes** — a key with no scopes is refused nothing, a key with the wrong ones is | ✅ | — | — | `scope-guard.spec.ts` |

**What "verified" means here**

- *API verified* — the route was exercised over HTTP against a real database, or read out of
  the controller's own metadata by a test.
- *SDK verified* — the SDK's call was compared with the API's route, or its unwrapping was
  exercised against the API's real response shape.
- *Dashboard verified* — the component was rendered, with the real SDK, against a server that
  answers with the API's real shapes.

---

## The defects this phase closed

| # | The defect | Where it was | The fix |
|---|---|---|---|
| 1 | The email console's lists were **empty everywhere** — the SDK unwrapped `{ domains }` and the API answers with the list | `packages/sdk/src/modules/email-mailboxes.ts` | The SDK accepts either shape, so a change on either side cannot empty a list silently again |
| 2 | **Adding a domain crashed the page** — the envelope was cast to a row | `apps/dashboard/.../email/create-domain-modal.tsx`, `.../projects/[projectId]/email/add-domain-modal.tsx` | The SDK types the answer; the modals use `created.domain` and **show the DNS steps** the API returns |
| 3 | The SDK's **database delete** called a route that does not exist | `packages/sdk/src/modules/databases.ts` | The delete is project-scoped, like the route |
| 4 | The SDK's **domain read** called a route that does not exist | `packages/sdk/src/modules/domains.ts`, `apps/api/.../domains.controller.ts` | The route exists now |
| 5 | The SDK's **file read** called a route that does not exist | `packages/sdk/src/modules/storage.ts`, `apps/api/.../storage.controller.ts` | The route exists now |
| 6 | The **backup schedule** called three routes that never existed — and the UI promised a "next run" nothing would honour | `packages/sdk/src/modules/databases-backups.ts`, `apps/dashboard/src/components/database/backup-settings-panel.tsx` | The calls are gone and the tab says what is true: the platform takes a backup when asked and does not yet run one on a schedule |
| 7 | **The environment variables had no scope** (KI-10) — a project key read the project's variable names whatever its scopes | `apps/api/.../projects-members.controller.ts` | `envvars:read` / `envvars:write`, and the scope guard now runs on that controller |
| 8 | **A declared scope could be inert** — the projects controller applied the scope guard on one route and declared scopes on another | `apps/api/.../projects-members.controller.ts` | The guard is on the controller, and a test reads every route's guard chain |
| 9 | **The SDK compiled against the published types**, not the workspace's — a type added in the workspace never reached it | `packages/sdk/package.json` | `workspace:*` — the SDK compiles against the source of truth |
| 10 | **Fifty-one of the sixty-one toasts never rendered** — the provider was in five of sixty-eight pages | `apps/dashboard/src/app/providers.tsx` | One provider, above everything |
| 11 | **The platform's own secrets could not be read** — a compound lookup cannot match a NULL column | `apps/api/.../infrastructure/secrets/secrets.service.ts` | A platform secret is found with `findFirst` |
| 12 | **The mail server's credential was handed over whole** (`admin:admin:<hash>`) | `apps/api/.../stalwart-email.provider.ts` | The user and the secret are split |

---

## The testing foundation

| Tier | What it is | How it runs |
|---|---|---|
| **Unit** | The pure logic — a service with a mocked database, a guard with a mocked request | `pnpm --filter @fidscript/api test` |
| **Contract** | The API's routes read from the controllers' metadata; the SDK's paths read from its source; the scope guards read from the route's guard chain | with the unit tier |
| **Integration** | The **real application**, over HTTP, against a database of its own | `pnpm --filter @fidscript/api test:integration` |
| **Dashboard component** | A component rendered, with the real SDK, against a server that answers with the API's real shapes | `pnpm --filter @fidscript/dashboard test` |
| **Security regression** | Every Phase 1 fix, as a test | both tiers |

The integration tier creates its own database, migrates it, runs against it and drops it —
including the databases and roles a provisioning run leaves behind. It never touches the
platform's data.

---

## Recorded, not done (the deferred list)

These belong to later phases. They are **recorded here** so that nothing is lost, and none of
them is Phase 2 work.

| Item | Phase | What Phase 2 found about it |
|---|---|---|
| The MFA step in the dashboard | F02 | The **API** is right on both paths (a challenge is issued); the dashboard has no step, so an MFA account cannot sign in |
| The organization interface | Phase 5 | The API and the SDK are there; the dashboard has none. The operator's decision stands: prepare the model, do not build an incomplete interface |
| The platform's mail domains | Phase 3 | The platform has no project of its own to own them — `PLATFORM_PROJECT_ID` is not set (KI-11) |
| Scheduled database backups | Phase 3 | The capability does not exist; the tab now says so instead of pretending |
| The navigation and the flat tree | Phase 3 | Untouched — out of scope |
| The platform overview | Phase 3 | Untouched |
| The design system | Phase 4 | Untouched |
| The full UI redesign | Phase 4+ | Untouched |
| The functions' sandbox gaps | Phase 4 | `TD-SEC-5a`–`d`: the user namespace, the blocking runner, the secrets on the argv, the unreachable data plane |

### The dependencies Phase 2 discovered

- **The SDK's published version (H32)** still carries the broken email methods. The corrected
  source is ready; publishing is a release decision, not a code change.
- **`registry.nextmavens.com` cannot be served from this platform** — the zone is in a different
  Cloudflare account, so no certificate can be issued for it, and the name resolves to a parking
  page. The live registry is `registry.fidscript.com` (KI-12).
- **The artifact storage service is down** (KI-13): port 4876 was taken by the Instant MCP
  bridge during the edge cutover and the storage service was not restarted elsewhere.
