# Screen Inventory — Master List

> **Mental model.** FIDScript is an operator's **control plane** for the backend. Every screen
> renders **real backend entities** (the Prisma tables) with their **actual fields**, enables **real
> operations** (the inventory endpoints), and respects the **real auth context** — owner / admin /
> developer / viewer each see different fields, different buttons, different pages. A screen is not a
> visualization; it is the operator's console for one subsystem.
>
> This file is the **complete master list**. Per-screen deep specs (`_NN-*.md` in this folder) exist
> only for screens that earn one — non-obvious UX, multiple states, or novel patterns. Every row
> below is enforceable: if a screen isn't listed here, it shouldn't be built.

---

## Reading the table

Each row gives: **route · auth · renders (Prisma entities) · key fields displayed · operations (inventory IDs) · deep spec?**

Auth keys: `O` owner · `A` admin · `D` developer · `V` viewer · `P` platform auth (any signed-in user) ·
`—` public. "*" = action gated server-side too (UI greys it; backend re-validates).

---

## Public (F01)

| Screen | Route | Auth | Renders (Prisma) | Key fields | Operations | Deep spec |
|---|---|---|---|---|---|---|
| Landing | `/` | — | — | hero + install cmd + features + OSS | "Read the docs" → `/docs` | — |
| Docs index | `/docs` | — | `DOCS` content module | doc list grouped | open doc | — |
| Docs page | `/docs/[slug]` | — | `DOCS[slug]` (TS module) | title + body + copy btn | copy page text | — |

---

## Auth & first-run (F02 + F03)

| Screen | Route | Auth | Renders | Key fields | Operations | Deep spec |
|---|---|---|---|---|---|---|
| Login | `/login` | — | — | email, password (tab) / email + 6-digit OTP (magic tab) | `AUTH-02` · `AUTH-05/06` *(broken → use magic-code)* · **`/auth/magic-code` + `/auth/verify-magic-code` (new)** | ✅ `f02-auth.md` |
| Register | `/register` | — | — | email, password (strength), confirm | `AUTH-01` | ✅ |
| Force-change password | `/force-change-password` | JWT + `mustChangePassword=true` | `User` | current, new (strength), confirm | **`/auth/change-password` (new)** | ✅ |
| MFA challenge | `/login/mfa` | public + `mfaToken` | — | 6-digit TOTP | `AUTH-09` | — |
| First-run onboarding | `/onboarding` | — (post-install cookie) | — | 5-row health board (Docker / DB / Domain / SSL / Email) | run/fix each + `/health` polling | _todo (F03)_ |

---

## Workspace root + Project (F04)

| Screen | Route | Auth | Renders | Key fields | Operations | Deep spec |
|---|---|---|---|---|---|---|
| Workspace (Projects list) | `/dashboard` | P | `Project` (user's) | name, type, status, last activity | `PROJ-01` list · `PROJ-02` create | — |
| Create-project modal | overlay | P | — | name (live), type (preset), description? | `PROJ-02` | _todo_ |
| Project dashboard | `/dashboard/projects/:id` | O/A/D/V (view) | `Project`, recent `Deployment`, `Database`, `Function` summary | header: name/status/region; tabs deploy default | open tabs | _todo (F05 shell)_ |
| Project Settings → General | `…/settings?tab=general` | A | `Project` | name, description, type, region, status | `PROJ-04` | — |
| … → Env | `…/settings?tab=env` | A | `ProjectEnv` (decrypted values) | key, value (encrypted on wire) | `PROJ-16/17/18` (rotate aware: DB/MQ creds rewritten by services) | _todo_ |
| … → API Keys | `…/settings?tab=api-keys` | A | `ProjectApiKey` (no hash) | name, permissions, lastUsedAt, expiresAt; raw key shown once on create | `PROJ-19/20/21` | — |
| … → Members | `…/settings?tab=members` | O | `ProjectMember` (+ `User`) | email, role, joinedAt | `PROJ-10/11/12` | — |
| … → Invitations | `…/settings?tab=invitations` | O | `ProjectInvitation` | email, role, status, expiresAt | `PROJ-13/14/15` | — |
| … → Build Config | `…/settings?tab=build-config` | A | `BuildConfig` | strategy, buildCommand, outputDirectory, healthCheckPath, healthCheckPort, startupTimeoutSeconds | `DEPL-09/10` | — |
| … → Danger Zone | `…/settings?tab=danger` | O | `Project` | suspend / archive / restore / delete (type-to-confirm) | `PROJ-05/06/07/08` | — |
| Invitation accept | `/invitations/accept` | — | — | token (from email link) | `PROJ-22` | — |
| Project Activity | `/dashboard/projects/:id/activity` | O/A/D/V | unified `events.*` for the project | timestamp, actor, type, resource link | realtime feed | _todo_ |
| Project Health | `/dashboard/projects/:id/health` | O/A/D/V | derived from `SVC-01` + service probes | per-service status | — | — |

---

## Deployments (F06) — operator's console for the deployment state machine

| Screen | Route | Auth | Renders | Key fields | Operations | Deep spec |
|---|---|---|---|---|---|---|
| Deployments list | `…/deployments` | O/A/D/V | `Deployment` (+ `Release` summary) | status (state-machine color), imageTag, deploymentUrl, completedAt | tab Active / All / Logs / Build Config | — |
| New deployment modal | overlay | O/A/D/V | — | source `{git:{url,branch,dockerfilePath?}}` (preview "what will build"), strategy override? | `DEPL-02` · realtime `deployments.deployment.created…failed/succeeded` | _todo (F06)_ |
| Deployment detail | `…/deployments/:id` | O/A/D/V | `Deployment` + `Release` | state-machine timeline header · imageTag · sourceUrl · commitSha · `buildLogs` · live URL | `DEPL-05` stop · `DEPL-06` restart · `DEPL-07` delete · `DEPL-08` rollback (lists prior SUCCESS) | _todo_ |
| Deployment logs | `…/deployments/:id/logs` | O/A/D/V | `Release.buildLogs` | streaming stdout/stderr | `DEPL-04` (poll + stream) | — |
| Build config | `…/build-config` | A | `BuildConfig` | strategy, buildCommand, outputDirectory, healthCheckPath, healthCheckPort, startupTimeoutSeconds | `DEPL-09/10` | — |

---

## Functions (F07) — operator's console for the sandboxed runtime

| Screen | Route | Auth | Renders | Key fields | Operations | Deep spec |
|---|---|---|---|---|---|---|
| Functions list | `…/functions` | O/A/D/V | `Function` | name, runtime, status, currentVersion, last invoked | tab Functions / Versions | — |
| New function modal | overlay | O/A/D/V | — | name, runtime (greys unimplemented: php/go/rust), entryPoint, memoryMb, timeoutSeconds | `FN-01` | _todo_ |
| Function detail | `…/functions/:fn` | O/A/D/V | `Function`, `FunctionLog` | tabs **Code** (editor) · **Deploy** · **Invoke** · **Logs** | `FN-02..09` (deploy/invoke live via realtime) | _todo_ |

---

## Databases (F08) — operator's console for managed Postgres

| Screen | Route | Auth | Renders | Key fields | Operations | Deep spec |
|---|---|---|---|---|---|---|
| Databases list | `…/databases` | O/A/D/V | `Database` (no creds) | name, environment, type, status (provisioning/ready), size, usedBytes, maxConnections | new database | — |
| New database modal | overlay | O/A/D/V | — | name, environment (preset), size + maxConnections (Advanced) | `DB-01` (async — toast + poll) | _todo_ |
| Database detail | `…/databases/:db` | O/A/D/V | `Database` | tabs **Overview** (size, connections) · **Connection** (direct/pool strings, **no password**) · **Backups** (`BackupInfo` list + create/restore) · **Settings** | `DB-02..11` (rotate warns: "restart deployments") | _todo_ |

---

## Storage (F09) — operator's console for object storage

| Screen | Route | Auth | Renders | Key fields | Operations | Deep spec |
|---|---|---|---|---|---|---|
| Storage (buckets) | `…/storage` | O/A/D/V | `StorageBucket` | name, provider (greys cloudinary/telegram), isPublic, file count | new bucket | — |
| New bucket modal | overlay | O/A/D/V | — | name (sanitized live), isPublic, provider | `STOR-01` | — |
| Bucket detail / file browser | `…/storage/buckets/:b` | O/A/D/V | `StorageFile` | grid/list, key, mimeType, sizeBytes, etag, createdAt | drag-drop upload `STOR-05` · delete `STOR-06` · presign `STOR-07` · public-url `STOR-08` *(server-side vulnerable — UI must still gate)* | _todo_ |

---

## Realtime (F10a)

| Screen | Route | Auth | Renders | Key fields | Operations | Deep spec |
|---|---|---|---|---|---|---|
| Channels list | `…/realtime` | O/A/D/V | `RealtimeChannel` | name, isPrivate, presence count, last message | new channel | — |
| New channel modal | overlay | O/A/D/V | — | name, isPrivate, metadata | `RT-01` (raw token shown once) | — |
| Channel detail | `…/realtime/channels/:c` | O/A/D/V | `RealtimeMessage` + `RealtimePresence` | tabs **Messages** (live tail) · **Presence** (who's online) · **Test publish** | `RT-02..08` + socket gateway | _todo_ |

---

## Queues (F10b) — operator's console for NATS JetStream

| Screen | Route | Auth | Renders | Key fields | Operations | Deep spec |
|---|---|---|---|---|---|---|
| Queues list | `…/queues` | O/A/D/V | `Queue` (+ `QUEUE-06 stats`) | name, type, status, depth (jsDepth), pending, failed, deadLettered | new queue | — |
| New queue modal | overlay | O/A/D/V | — | name, type (preset), retentionDays, maxMessages, retries, DLQ | `QUEUE-01` (server-side worker auto-starts) | _todo_ |
| Queue detail | `…/queues/:q` | O/A/D/V | `QueueMessage` | tabs **Messages** (live tail by status) · **Stats** (depth/throughput/failed) · **Config** | `QUEUE-02..13` (ack/retry/DLQ inline per row) | _todo_ |

---

## Scheduler (F10c)

| Screen | Route | Auth | Renders | Key fields | Operations | Deep spec |
|---|---|---|---|---|---|---|
| Jobs list | `…/scheduler` | O/A/D/V | `CronJob` | name, cron expr, lastRunAt, nextRunAt, status | new job | — |
| New cron job modal | overlay | O/A/D/V | — | name, cron expr (human hint), timezone, target (function picker **or** endpoint URL), payload, retries | `CRON-01` | _todo_ |
| Job detail | `…/scheduler/jobs/:j` | O/A/D/V | `CronJob`, `CronJobRun` | tabs **Config** · **Runs** (history) · **Next run** | `CRON-02..08` (manual trigger streams realtime) | _todo_ |

---

## Email (F11) — operator's console for Stalwart

| Screen | Route | Auth | Renders | Key fields | Operations | Deep spec |
|---|---|---|---|---|---|---|
| Email → Domains | `…/email?tab=domains` | O/A/D/V | `EmailDomain` | domain, status (PENDING/VERIFIED/ACTIVE), DKIM/SPF/DMARC/MX ✓, emailProvider | add domain wizard | — |
| Email → Mailboxes | `…/email?tab=mailboxes` | O/A/D/V | `EmailMailbox` (no password hash) | email, quotaMb, isActive, imapHost/Port, smtpHost/Port | create + reset-password (one-time show) | — |
| Email → Aliases | `…/email?tab=aliases` | O/A/D/V | `EmailAlias` (+ targets joined) | localPart@domain, targets (mailboxes/external/webhook) | CRUD | — |
| Email → Identities | `…/email?tab=identities` | O/A/D/V | `SenderIdentity` | email, name, isVerified | CRUD | — |
| Email → API Keys | `…/email?tab=api-keys` | O/A/D/V | `EmailApiKey` (no hash) | name, scopes, daily/monthlyLimit, lastUsedAt | create (`ek_` shown once) | — |
| Email → Messages | `…/email?tab=messages` | O/A/D/V | `EmailMessage` | from/to, subject, status, folder, isRead, sentAt | list/get/star/read/delete | — |
| Add domain wizard | `…/email/domains/new` | O/A/D/V | — | domain + auto-setup hint (Principle 1) | `MAIL-01` → verify → `MAIL-05` (DKIM/SPF/DMARC/MX) | _todo_ |
| Mailbox detail | `…/email/mailboxes/:m` | O/A/D/V | `EmailMailbox` | quota, IMAP/SMTP, status (note: Stalwart "suspend" is a DB flag only — audit gap) | `MAIL-09..13` | — |

---

## Domains (F11)

| Screen | Route | Auth | Renders | Key fields | Operations | Deep spec |
|---|---|---|---|---|---|---|
| Domains list | `…/domains` | O/A/D/V | `Domain` | domain, deploymentId, dnsMode, sslStatus, ssl expiry (from health) | add domain | — |
| Add domain modal | overlay | A *(audit gap: any member currently — UI greys for non-A/D)* | — | domain, deployment, dnsMode (manual/cloudflare_auto), redirectMode | `DOM-02` | — |
| Domain detail | `…/domains/:d` | O/A/D/V | `Domain`, `DomainHealthCheck` (recent) | tabs **Overview** (status badge) · **DNS** (instructions w/ real IP, not placeholder) · **TLS** (cert + expiry) · **Email** (link to Email→Domains) · **Health** (live checks) | `DOM-03/04` · connect-cloudflare `DOM-05` *(audit gap — UI gates)* · delete `DOM-06` *(audit gap — UI gates)* | _todo_ |

---

## Monitoring (F11)

| Screen | Route | Auth | Renders | Key fields | Operations | Deep spec |
|---|---|---|---|---|---|---|
| Monitoring → Metrics | `…/monitoring?tab=metrics` | O/A/D/V | `Metric` (time-series) | name, value, labels, timestamp | record manual (`MON-03`); chart summary `MON-01/02/04` | — |
| → Alerts | `…/monitoring?tab=alerts` | O/A/D/V | `AlertRule`, `Alert` | name, condition, threshold, severity, status | CRUD rules `MON-05..09`; ack `MON-12`, resolve `MON-13` | — |
| → Channels | `…/monitoring?tab=channels` | A *(audit gap: any member — UI greys)* | `NotificationChannel` | name, type (greys slack/pagerduty per audit), config (per type) | CRUD `MON-14..18`; **Test** `MON-19` | — |
| Public Prometheus scrape | `GET /metrics` | — | platform metrics | text exposition | scrape | — |

---

## Logs (F11)

| Screen | Route | Auth | Renders | Key fields | Operations | Deep spec |
|---|---|---|---|---|---|---|
| Logs (streams) | `…/logs` | O/A/D/V | `LogStream` (with counts) | name, type, retentionDays, last-write | create stream | — |
| Stream viewer | `…/logs/streams/:s` | O/A/D/V | `LogEntry` | timeline histogram · level filter · search · live tail (pauseable) | write `LOG-05/06`; filter `LOG-07/08/09/10` | _todo_ |

---

## MCP (F11)

| Screen | Route | Auth | Renders | Key fields | Operations | Deep spec |
|---|---|---|---|---|---|---|
| MCP → Tools | `…/mcp?tab=tools` | O/A/D/V | manifest (108 tools) | name, description, related inventory ID | search/filter | _todo_ |
| → API Key | `…/mcp?tab=api-key` | A | — | raw key shown once + rotate | `PROJ-19/20/21` (project-scoped) | — |
| → Connect | `…/mcp?tab=connect` | O/A/D/V | templated snippet | Claude/Cursor JSON | copy | — |

---

## Account-level (outside any project)

| Screen | Route | Auth | Renders | Key fields | Operations | Deep spec |
|---|---|---|---|---|---|---|
| Profile | `/account/profile` | P | `User` | name, avatarUrl, email (read), mfaEnabled, lastLoginAt | `AUTH-11` (name, avatarUrl) | — |
| Sessions | `/account/sessions` | P | `Session` (current highlighted) | id, ip, userAgent, expiresAt, createdAt | revoke one `AUTH-13` / revoke all `AUTH-14` | — |
| MFA setup | `/account/mfa` | P | — | secret, QR otpauth URL | `AUTH-07/08`; MFA challenge `AUTH-09` | — |
| Platform API Keys (`fsk_`) | `/account/api-keys` | P | `ApiKey` (platform-level) | name, permissions, lastUsedAt, expiresAt | CRUD `AUTH-15/16/17` | — |

---

## Auth-context render rules (cross-cutting)

For every screen above, the render rule is:

- **`P` (platform)** — sees their own user fields + sessions + MFA + platform API keys.
- **`O` (owner)** — everything `A` can do **plus** project delete (`PROJ-05`), member remove (`PROJ-12`), Danger Zone.
- **`A` (admin)** — env (`PROJ-17`), API keys (`PROJ-20`), build config (`DEPL-10`), alert channels (`MON-14`), Cloudflare connection (`DOM-05` — *server gap, UI gates*), sender identity create, OAuth provider upsert.
- **`D` (developer)** — create deployments/functions/queues/cron/db/storage/email-dns, but no settings, no env edit, no members.
- **`V` (viewer)** — read-only everywhere. Numbers render, code does not (no "Deploy", no "Invoke", no env edit).

**The UI must render the difference, not hide it.** A developer on `/functions/:fn` sees the Code tab and an Invoke button; a viewer sees a `JSON.stringify` dump of the latest invocation + a "Read-only" pill. The button is **not just hidden** — the surrounding chrome reflects the role (Principle 8 of the UX spec).

## Backend gaps that change what a screen can show

Screens must render these gaps **honestly**, never fake them:

- `php|go|rust` runtimes → greyed with "not yet available" on the Functions new + runtime picker.
- `cloudinary|telegram` providers → greyed on the Storage new picker.
- `slack|pagerduty` channels → greyed on Monitoring channels.
- Skills module absent → no Skills screen exists.
- Templates/MCP coverage gaps (no Skills tool, no registry/health tool) → the Tools tab labels these.
- Email Stalwart v0.15.5: suspend is a DB flag only — the Mailbox detail must say so ("Stalwart
  login is not disabled — DB flag only"), not pretend it works.
- Email webhooks (MAIL-32..34) are open if `STALWART_WEBHOOK_SECRET` unset — Settings shows a warning.

## What comes next

1. **Per-screen deep specs** for the non-obvious screens (marked `✅` or `_todo_` above): one file per
   screen using `_template.md`. Start with the screens that drive Journeys 1–3 end-to-end.
2. **Component inventory** (`docs/product/components/`) — the reusable registry (every form control,
   table, drawer, toast, health badge) with every state.
3. **F00–F11 full specs** — one per phase, cross-referencing service specs + the screens in this
   inventory. Implementation stays paused.
