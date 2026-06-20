# Backend Inventory — Functions, Queues, Scheduler, Realtime

See `index.md` for conventions. All HTTP routes JWT. **Zero public routes in this cluster.**

## Functions — `/api/v1/projects/:projectId/functions`

| ID | Method | Path | Request | Response | Events |
|----|--------|------|---------|----------|--------|
| FN-01 | POST | `/functions` | `CreateFunctionDto`{name,runtime(nodejs\|python\|php\|go\|rust),entryPoint?,memoryMb?,timeoutSeconds?,envVars?} | function (status:created) | `function.created` |
| FN-02 | GET | `/functions` | — | `{functions}` | none |
| FN-03 | GET | `/functions/:functionId` | — | function | none |
| FN-04 | PATCH | `/functions/:functionId` | {memoryMb?,timeoutSeconds?,envVars?,settings?} | function | none |
| FN-05 | DELETE | `/functions/:functionId` | — | `{deleted:true}` | `function.deleted` |
| FN-06 | POST | `/functions/:functionId/deploy` | `DeployFunctionDto`{code,version?,description?} | `{deployed:true,version}` | `function.deployed` |
| FN-07 | POST | `/functions/:functionId/invoke` | `InvokeFunctionDto`{payload?,sync?} | `{success,output?,error?,durationMs,memoryUsedMb?}` | `function.invoked`/`error` |
| FN-08 | GET | `/functions/:functionId/logs` | ?limit,?cursor | `{logs,nextCursor}` | none |
| FN-09 | GET | `/functions/:functionId/versions` | — | distinct versions | none |

## Queues — `/api/v1/projects/:projectId/queues`

| ID | Method | Path | Request | Response | Events |
|----|--------|------|---------|----------|--------|
| QUEUE-01 | POST | `/queues` | {name,type?(stream\|queue\|workqueue),retentionDays?,maxMessages?,maxBytes?,replicas?,retryAttempts?,retryDelaySeconds?,deadLetterQueue?} | queue | `queues.created` |
| QUEUE-02 | GET | `/queues` | — | `{queues}` | none |
| QUEUE-03 | GET | `/queues/:queueId` | — | queue | none |
| QUEUE-04 | PATCH | `/queues/:queueId` | retention/max/retry fields | queue | none |
| QUEUE-05 | DELETE | `/queues/:queueId` | — | `{deleted:true}` (+messages+consumer) | none |
| QUEUE-06 | GET | `/queues/:queueId/stats` | — | `{jsDepth,pending,delivered,acknowledged,failed,deadLettered,total}` | none |
| QUEUE-07 | POST | `/queues/:queueId/messages` | `PublishMessageDto`{body,headers?,delaySeconds?} | `{messageId,jsSeq,scheduledAt}` | `queues.message.published` |
| QUEUE-08 | POST | `/queues/:queueId/messages/batch` | {messages:[{body,headers?}]} | `{messageIds,count}` | `.published` |
| QUEUE-09 | POST | `/queues/:queueId/consume` | {consumerId?,maxMessages?,timeoutSeconds?} | `{messages,count}` | none |
| QUEUE-10 | POST | `/queues/:queueId/ack` | {messageIds[]} | `{acknowledged:n}` | `.acknowledged` |
| QUEUE-11 | POST | `/queues/:queueId/retry` | {messageIds[]} | `{retried:n}` | `.retried` |
| QUEUE-12 | POST | `/queues/:queueId/dead-letter` | {messageIds[],reason?} | `{moved:n,dlqId}` | `.dead_lettered` |
| QUEUE-13 | GET | `/queues/:queueId/messages` | ?status,?limit,?cursor | `{messages,nextCursor}` | none |

## Scheduler/Cron — `/api/v1/projects/:projectId/cron`

| ID | Method | Path | Request | Response | Events |
|----|--------|------|---------|----------|--------|
| CRON-01 | POST | `/cron` | {name,cronExpression,timezone?,endpoint?,functionId?,payload?,enabled?,retryAttempts?,retryDelaySeconds?,timeoutSeconds?} | job (nextRunAt) | `cron.job_created` |
| CRON-02 | GET | `/cron` | — | `{jobs}` | none |
| CRON-03 | GET | `/cron/:jobId` | — | job | none |
| CRON-04 | PATCH | `/cron/:jobId` | update fields | job | `cron.job_updated` |
| CRON-05 | DELETE | `/cron/:jobId` | — | `{deleted:true}` | `cron.job_deleted` |
| CRON-06 | POST | `/cron/:jobId/trigger` | {payload?} | `{runId,status,error?}` | `cron.job_run_started`+`completed`/`failed` |
| CRON-07 | GET | `/cron/:jobId/next-run` | — | `{nextRunAt}` | none |
| CRON-08 | GET | `/cron/:jobId/runs` | ?limit,?cursor,?status | `{runs,nextCursor}` | none |

## Realtime — `/api/v1/projects/:projectId/realtime` + WS gateway `/realtime`

| ID | Method | Path | Request | Response | Events |
|----|--------|------|---------|----------|--------|
| RT-01 | POST | `/realtime/channels` | {name,isPrivate?,metadata?} | channel (private→hashed token) | `realtime.channel_created` |
| RT-02 | GET | `/realtime/channels` | — | `{channels}` | none |
| RT-03 | GET | `/realtime/channels/:channelId` | — | channel | none |
| RT-04 | DELETE | `/realtime/channels/:channelId` | — | `{deleted:true}` | `realtime.channel_deleted` |
| RT-05 | GET | `/realtime/channels/:channelId/messages` | ?limit,?cursor | `{messages,nextCursor}` | none |
| RT-06 | POST | `/realtime/presence` | {channelId,status(online\|away\|busy\|offline)} | presence | none |
| RT-07 | GET | `/realtime/channels/:channelId/presence` | — | `{presence}` | none |
| RT-08 | POST | `/realtime/channels/:channelId/token` | {userId} | `{token}` (once) | none |

**WS gateway `/realtime`** — JWT at handshake (`handshake.auth.token` or `Authorization`).
- **Inbound**: `join_channel`{channelId,token?} · `leave_channel` · `message`{channelId,content,event?} · `set_presence`{channelId?,status} · `get_presence`{channelId} · `subscribe_project`{projectId} (owner/member gate → joins `project:<id>`) · `unsubscribe_project`.
- **Outbound**: `connected`{socketId} · `error`{message} · `client_joined`/`client_left` · `message`{id,channelId,userId,content,event,timestamp} · `presence`/`presence_update` · `channel_deleted` · **any platform event** fanned out to `project:<id>` (`{type,timestamp,data}`).

## Capabilities
- **Functions**: sandboxed exec (`docker run --rm -i`, no network, read-only, mem/cpu/pids caps, code via stdin); nodejs+python implemented (php/go/rust not). Per-invoke `FunctionLog`; versions derived from logs.
- **Queues**: NATS JetStream durable pull consumers (explicit ack, ack_wait=visibility, max_deliver=retries), autonomous server-side worker (survives restart via `bootAllQueues`), DLQ auto-create, delayed publish via `Nats-Delay` header, graceful Prisma-only degraded mode, targets http/function/internal.
- **Scheduler**: cron re-registered on bootstrap (`onApplicationBootstrap`), Redis SETNX distributed lock (no double-fire), targets function (invoke) or http (fetch), `CronJobRun` history.
- **Realtime**: socket.io `channelId` rooms + canonical `project:<id>` room; `RealtimeBridgeService` fans out **all** platform events to project rooms (authorization structural — only members subscribe); Redis adapter for multi-instance; Redis+Prisma presence; private channels via bcrypt token.

## Findings
- php/go/rust runtimes unimplemented (only nodejs/python). · `memoryUsedMb` is a placeholder. · Functions env-vars comment says "decrypted" but no decrypt call in path. · Queue `jsSeq` stashed in Prisma `errorMessage` field. · Event naming inconsistent (`template.created` vs `templates.template.applied`).
