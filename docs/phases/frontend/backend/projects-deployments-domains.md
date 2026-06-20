# Backend Inventory — Projects, Deployments, Domains

See `index.md` for conventions. Class-level `@UseGuards(JwtAuthGuard)` everywhere unless noted.
`req.user = { userId }`. Access enforced in services via `ProjectAccessService` (owner-or-member), with
role distinctions noted per route.

## Projects — `/api/v1/projects`

| ID | Method | Path | Access | Request | Response | Events |
|----|--------|------|--------|---------|----------|--------|
| PROJ-01 | GET | `/projects` | auth | ?status,?page,?limit | `{projects,pagination}` | none |
| PROJ-02 | POST | `/projects` | auth | `CreateProjectDto`{name,type(frontend\|backend\|worker\|cron\|docker\|static),description?,region?} | project | `projects.project.created` |
| PROJ-03 | GET | `/projects/:id` | any access | — | project | none |
| PROJ-04 | PATCH | `/projects/:id` | admin/owner | `UpdateProjectDto`{name?,description?} | project | `projects.project.updated` |
| PROJ-05 | DELETE | `/projects/:id` | owner | — | `{success:true}` (soft→DELETED) | `projects.project.deleted` |
| PROJ-06 | POST | `/projects/:id/suspend` | admin/owner | — | project | `.suspended` |
| PROJ-07 | POST | `/projects/:id/archive` | admin/owner | — | project | `.archived` |
| PROJ-08 | POST | `/projects/:id/restore` | admin/owner | — | project | `.restored` |
| PROJ-09 | POST | `/projects/:id/clone` | any access | `{name}` | project (env copied) | `.cloned` |
| PROJ-10 | GET | `/projects/:id/members` | any access | — | `{members:[{id,role,user}]}` | none |
| PROJ-11 | POST | `/projects/:id/members` | owner | `{email,role(admin\|developer\|viewer)}` | member | `projects.member.added` |
| PROJ-12 | DELETE | `/projects/:id/members/:userId` | owner | — | `{success:true}` | `.removed` |
| PROJ-13 | GET | `/projects/:id/invitations` | admin/owner | — | `{invitations}` | none |
| PROJ-14 | POST | `/projects/:id/invitations` | admin/owner | `{email,role}` ⚠ role free-text | `{invitationId,token,expiresAt}` | `.invitation.created` |
| PROJ-15 | DELETE | `/projects/:id/invitations/:invitationId` | admin/owner | — | `{success:true}` | `.revoked` |
| PROJ-16 | GET | `/projects/:id/env-vars` | any access | — | `{envVars:[{key,value}]}` (decrypted) | none |
| PROJ-17 | PUT | `/projects/:id/env-vars` | admin/owner | `{envVars:[{key,value}]}` | `{success:true}` | `projects.env_var.updated` |
| PROJ-18 | DELETE | `/projects/:id/env-vars/:key` | admin/owner | — | `{success:true}` | `.deleted` |
| PROJ-19 | GET | `/projects/:id/api-keys` | any access | — | `{apiKeys:[{id,name,permissions,lastUsedAt,expiresAt,createdAt}]}` | none |
| PROJ-20 | POST | `/projects/:id/api-keys` | admin/owner | ⚠ `dto:any` {name,permissions?,expiresAt?} | `{apiKey,key}` (`fpk_`, once) | `.api_key.created` |
| PROJ-21 | DELETE | `/projects/:id/api-keys/:keyId` | admin/owner | — | `{success:true}` | `.revoked` |
| PROJ-22 | POST | `/invitations/accept` | **public** | `{token}` | `{success:true,projectId}` | `.accepted` |

## Deployments — `/api/v1/projects/:projectId/deployments` (owner-or-member; role ignored)

| ID | Method | Path | Request | Response | Events |
|----|--------|------|---------|----------|--------|
| DEPL-01 | GET | `/deployments` | ?page,?limit | `{deployments,pagination}` | none |
| DEPL-02 | POST | `/deployments` | `CreateDeploymentDto`{source?:{type(git\|archive),git?:{url,credentials?,branch?,dockerfilePath?},archive?:{...}},branch?,commitSha?,strategy?,envVars?} | `{id,projectId,releaseId,status:'pending',deploymentUrl:null,...}` | `deployments.deployment.created` |
| DEPL-03 | GET | `/deployments/:id` | — | deployment | none |
| DEPL-04 | GET | `/deployments/:id/logs` | — | `{logs: release.buildLogs}` | none |
| DEPL-05 | POST | `/deployments/:id/stop` | — | deployment (stopped) | `.stopped` |
| DEPL-06 | POST | `/deployments/:id/restart` | — | deployment (→SUCCESS) | `.succeeded` |
| DEPL-07 | DELETE | `/deployments/:id` | — | `{success:true}` | `.stopped` |
| DEPL-08 | POST | `/deployments/:id/rollback` | target must be SUCCESS | deployment | `.rolled_back`+`.succeeded` |
| DEPL-09 | GET | `/build-config` | — | `{id,projectId,strategy,buildCommand,outputDirectory,healthCheckPath,healthCheckPort,startupTimeoutSeconds,...}` | none |
| DEPL-10 | PATCH | `/build-config` | `UpdateBuildConfigDto`{strategy?,buildCommand?,outputDirectory?,healthCheckPath?,healthCheckPort?} | build config | none |

## Domains — `/api/v1/projects/:projectId/domains`

| ID | Method | Path | Access | Request | Response | Events |
|----|--------|------|--------|---------|----------|--------|
| DOM-01 | GET | `/domains` | owner/member | — | `{domains}` | none |
| DOM-02 | POST | `/domains` | owner/member | `AddDomainDto`{domain,deploymentId,dnsMode?(manual\|cloudflare_auto),redirectMode?,sslEnabled?} | `{domain,instructions,emailWarning}` | `domain.added` |
| DOM-03 | GET | `/domains/:id/instructions` | owner/member | — | `{domain,instructions}` | none |
| DOM-04 | POST | `/domains/:id/verify` | owner/member | — | domain | `domain.pending_ownership`/`failed`/`tls_pending` |
| DOM-05 | POST | `/domains/connect-cloudflare` | ⚠ **no access check** | `{apiToken}` ⚠ no DTO | `{success,email,connectionId}` | none |
| DOM-06 | DELETE | `/domains/:id` | ⚠ **no access check** | — | `{success:true}` | `domain.deleted` |

## Capabilities

- **Projects**: CRUD + lifecycle (suspend/archive/restore), clone (copies env), members/invitations
  (token hash, 7d), encrypted env vars (AES-256-GCM), `fpk_` API keys (SHA-256 hash).
- **Deployments**: state machine `PENDING→BLOCKED→QUEUED→BUILDING→SUCCESS/FAILED/STOPPED/ROLLED_BACK`,
  per-project active-deployment lock, stuck-deployment recovery on boot. `DockerfileBuildProvider`:
  BuildKit, git clone (private via `.gitcred`), image `fidscript/<slug>:<version>`, Traefik labels via
  `execFileSync` (no shell), health probe from API container over `fidscript-app` network, profiles
  FRONTEND/BACKEND/STATIC/DOCKER/WORKER/CRON. **Git source only** (archive throws).
- **Domains**: DNS provider abstraction (Cloudflare impl), declarative TLS via Traefik ACME (observed by
  background health checker), DoH/dig DNS propagation + HTTP routing + SSL-expiry checks, MX provider
  detection (no MX records created), manual or cloudflare-auto DNS modes.

## Findings
- DOM-05/06 skip access checks (see `index.md` security caveats). · Deployments ignore role (any member
  can destroy/rollback). · Several precondition failures throw plain `Error`→HTTP 500. · DTO holes:
  PROJ-14 role free-text, PROJ-20 `dto:any`, DEPL-10 strategy not enum. · `DEPLOYING` state referenced
  but never written. · `BuildRunnerService` `new PrismaService()` bypasses DI.
