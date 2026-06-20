# Backend Inventory — Surfaces & Ops

See `index.md` for conventions.

## Monitoring — `/api/v1/projects/:projectId/monitoring` (JWT) + `/metrics` (public)

| ID | Method | Path | Request | Response | Events |
|----|--------|------|---------|----------|--------|
| MON-01 | GET | `/monitoring/metrics` | ?metric,?startTime,?endTime,?interval | points | none |
| MON-02 | GET | `/monitoring/metrics/:metric/summary` | ?interval | summary | none |
| MON-03 | POST | `/monitoring/metrics` | {metric,value,labels?} | recorded | none (evaluator emits on breach) |
| MON-04 | GET | `/monitoring/metrics/stats` | — | dashboard stats | none |
| MON-05 | POST | `/monitoring/alerts/rules` | {name,metric,condition(above\|below\|equals),threshold,durationSeconds?,severity?,channels?,enabled?} | rule | none |
| MON-06 | GET | `/monitoring/alerts/rules` | — | `{rules}` | none |
| MON-07 | GET | `/monitoring/alerts/rules/:ruleId` | — | rule | none |
| MON-08 | PATCH | `/monitoring/alerts/rules/:ruleId` | update | rule | none |
| MON-09 | DELETE | `/monitoring/alerts/rules/:ruleId` | — | deleted | none |
| MON-10 | GET | `/monitoring/alerts` | ?status(firing\|resolved\|pending),?severity | `{alerts}` | none |
| MON-11 | GET | `/monitoring/alerts/:alertId` | — | alert | none |
| MON-12 | POST | `/monitoring/alerts/:alertId/acknowledge` | — | alert | none |
| MON-13 | POST | `/monitoring/alerts/:alertId/resolve` | — | alert | none |
| MON-14 | POST | `/monitoring/channels` | {name,type(email\|slack\|webhook\|pagerduty),config} | channel | none |
| MON-15 | GET | `/monitoring/channels` | — | `{channels}` | none |
| MON-16 | GET | `/monitoring/channels/:channelId` | — | channel | none |
| MON-17 | PATCH | `/monitoring/channels/:channelId` | {name?,config?} | channel | none |
| MON-18 | DELETE | `/monitoring/channels/:channelId` | — | deleted | none |
| MON-19 | POST | `/monitoring/channels/:channelId/test` | — | test result | none |
| MON-20 | GET | `/metrics` | — (PUBLIC) | Prometheus text | none |

Events (services): `monitoring.alert.firing`, `.resolved`, `monitoring.notification.sent`, `.failed`.

## Logging — `/api/v1/projects/:projectId/logs` (JWT) + `/api/v1/logs/ingest` (API-key)

LOG-01 POST `/logs/streams` {name,type(application\|function\|deployment\|email\|system\|audit),retentionDays?} · LOG-02 GET · LOG-03 GET `:streamId` · LOG-04 DELETE · LOG-05 POST `/logs` {stream,level,message,metadata?} · LOG-06 POST `/logs/batch` · LOG-07 GET `/logs` (?stream,?level,?time,?search,?limit,?cursor) · LOG-08 GET `/logs/streams/:streamName` ⚠ collides with LOG-03 · LOG-09 GET `.../timeline` ?interval · LOG-10 GET `/logs/stats` ?stream · LOG-11 POST `/api/v1/logs/ingest` (X-API-Key) `{logs:[{level,source,message,metadata?,correlationId?,timestamp?}]}` → 202 `{accepted,overQuota,results}`.
Events: `logs.log.ingested` (sampled), `logs.pruned`, `logs.shipped`, `logs.ship_failed`, `logs.quota_exceeded`. Shippers: webhook, minio (gzipped JSONL).

## Templates — `/api/v1/projects/:projectId/templates` (JWT)
TMPL-01 POST {name,description?,category,content,variables?:[{name,description?,defaultValue?,required?}],isPublic?} · 02 GET ?category · 03 GET `/categories` · 04 GET `:id` · 05 PATCH · 06 DELETE · 07 POST `/generate` {templateId,name,variables} · 08 POST `/generate-and-deploy` {templateId,name,variables,strategy?}.
Events: `template.created`, `template.deleted`, `template.project_generated`, `templates.template.applied`.

## AI — `/api/v1/projects/:projectId/ai` (JWT; Gemini provider)
AI-01 POST `/conversations` {type?,model?,metadata?} · 02 GET · 03 GET `:id` · 04 POST `:id/messages` {content,role?,model?,stream?} · 05 DELETE · 06 POST `/chat` {content} · 07 POST `/chat/stream` {content} · 08 POST `/diagnose` {error,context?,deploymentId?} · 09 POST `/recommendations` {resourceType?,currentSetup?} · 10 POST `/deploy` {projectId?,deploymentId?,action?} · 11 POST `/generate` {description,requirements?,templateId?}.
Events: `ai.conversation.created/deleted`, `ai.error_diagnosed`, `ai.recommendation.generated`, `ai.deployment.assisted`, `ai.project.generation_assisted`.

## Marketplace — `/api/v1/marketplace` (public reads; JWT writes; admin approve/reject/featured/verify)
MKT-01 GET ?{type,category,search,sort,limit,offset} · MKT-02 GET `/featured` · MKT-03 GET `/categories` · MKT-04 GET `:slug` · MKT-05 POST `:slug/reviews` {rating,title?,content?} · MKT-06 POST `:slug/download` · MKT-07 POST `/submit` {type,name,...} · MKT-08 GET `/my/submissions` · MKT-09 PATCH `/items/:id` ⚠ no owner check · MKT-10 POST `/items/:id/approve` (admin) · MKT-11 `/reject` · MKT-12 `/featured` {featured} · MKT-13 `/verify`.
Events: `marketplace.item.submitted`, `.approved`, `marketplace.review.created`.

## Registry & Health (public)
SVC-01 GET `/api/v1/services` · SVC-02 GET `/api/v1/services/:name` · SVC-03 GET `/api/v1/health` (aggregate) · SVC-04 GET `/api/v1/health/live` · SVC-05 GET `/api/v1/health/ready`.

## MCP server (`apps/mcp-server`, stdio, server `fidscript`)
Proxies to the API. **108 tools** across: auth(6), projects(10), deployments(6), storage(7), databases(8), email(8), functions(9), queues(9), cron(8), realtime(4), monitoring(10), logging(6), app-auth(7), ai(10), marketplace(9). **No tools for templates, skills, or registry/health.**

## SDK — `packages/sdk` (`@fidscript/sdk`, canonical)
`createFidscript()` → 14 modules: `auth, projects, deployments, storage, databases, domains, email, functions, queues, cron, realtime, monitoring, logs, templates` + typed errors (`FidscriptError/AuthError/NotFoundError/ValidationError/RateLimitError`) + retries + `RealtimeModule` (socket.io-client) + `logs.ingest()` (X-API-Key). (Legacy `apps/sdk` has 11 modules, no databases/domains/templates/marketplace — being superseded.)

## CLI — `apps/cli` (`@fidscript/cli`, commander)
`login <key>` · `logout` · `whoami` · `projects create <name> [--type]` · `projects list` · `logs tail [-p] [-s] [-l]` · `init <template> <name> [-p]` · `deployments list [-p]`. Global `-o table|json|raw`. Creds at `~/.fidscript/credentials.json` (0600). Small subset of SDK only.

## Findings
- LOG-08 shadows LOG-03 (same path pattern, declaration order). · AI controller reads `req.user.id` (others read `req.user.userId`) — JWT claim inconsistency. · MKT-09 no ownership check (see `index.md`). · monitoring.controller.ts is dead code. · MCP/SDK/CLI do not yet cover templates/skills/registry/marketplace uniformly. · `monitoring.controller.ts` (4-line comment file) is unregistered dead code.
