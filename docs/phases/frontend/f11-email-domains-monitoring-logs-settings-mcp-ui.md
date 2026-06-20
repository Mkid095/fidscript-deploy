# F11 — Email + Domains + Monitoring + Logs + Settings + MCP UI (full spec)

> **Status:** ⏳ Spec complete — pending approval.
> **Connects to:** backend `MAIL-*` (`docs/phases/frontend/backend/data.md`), `DOM-*`
> (`projects-deployments-domains.md`), `MON-*` + `LOG-*` (`surfaces.md`), and `PROJ-*` for
> Settings. Cross-references F05 (shell), every F06–F10 (Settings → * is the canonical
> per-section home). Renders the **`EmailDomain` + `EmailMailbox` + `EmailAlias` +
> `SenderIdentity` + `EmailApiKey` + `EmailMessage` + `CatchAllRule` + `EmailSuppression`** +
> **`Domain` + `DomainHealthCheck` + `DomainConnection`** + **`Metric` + `AlertRule` + `Alert` +
> `NotificationChannel` + `Notification`** + **`LogStream` + `LogEntry`** + **Settings entities
> (`Project` + `ProjectMember` + `ProjectInvitation` + `ProjectApiKey` + `ProjectEnv` +
> `BuildConfig`)** + **MCP surface** Prisma entities.

## 1. Purpose
The catch-all for the six sections that don't fit elsewhere: **Email** (mailboxes, domains,
identities, API keys, messages), **Domains** (custom domains + TLS for deployments and
subdomains), **Monitoring** (metrics, alert rules, alert lifecycle, channels), **Logs** (unified
log streams + a viewer), **Settings** (the project's master config: general, env, API keys,
members, invitations, build config, danger zone), and **MCP** (the platform-as-MCP-server
surface). These are the "wiring" of the dashboard — without them, F06–F10 have nowhere to live.

## 2. Business Goal
Match the operator's console of Cloudflare + Resend + Datadog + Sentry: one place for
mail, one for domains, one for monitoring, one for logs, one for the project's master config,
one for the MCP surface. The principle: **the project is a system; these six sections are
the system's nervous system.**

## 3. Personas
- **Solo dev** — sets up email for the first deployment, adds a custom domain, configures a
  monitoring alert, checks logs after a deploy.
- **Backend dev** — manages email identities, watches the monitoring dashboard, drills into
  logs.
- **Team lead** — adds members, rotates API keys, manages Danger Zone, exposes the project
  via MCP to a Claude agent.
- **On-call** — opens Monitoring → Alerts, drills into a firing alert, jumps to Logs filtered
  to the same time window.
- **AI agent** — uses the MCP surface; the API key is in Settings → MCP.

## 4. Complete User Journey — by section

### Email
```
Open /dashboard/projects/:id/email (F05) → Domains tab preselected.
  → list of EmailDomain rows: domain, status badge, DKIM/SPF/DMARC/MX ✓/✗, emailProvider.
  → empty state: "No email domain yet — add one to send and receive mail." CTA
    "Add domain" → wizard.
  → Add domain wizard: domain input → "Add" → MAIL-01 → DNS instructions screen (TXT for
    ownership, then DKIM/SPF/DMARC/MX for verification) → "Verify" → MAIL-05 → transitions
    to VERIFIED → ACTIVE.
  → tabs: Domains · Mailboxes · Aliases · Identities · API Keys · Messages.
  → Mailboxes tab: list of EmailMailbox. Per-row: email, quotaMb, isActive, IMAP/SMTP
    host+port, kebab (Reset password, Suspend, Activate, Delete).
    Create mailbox modal: localPart + password (or auto-generate) → MAIL-06 → one-time
    password in toast.
  → Aliases tab: list of EmailAlias. Per-row: localPart@domain, targets (joined:
    mailboxes / external / webhooks).
  → Identities tab: list of SenderIdentity. Per-row: email, name, isVerified.
  → API Keys tab: list of EmailApiKey. Per-row: name, scopes, daily/monthlyLimit,
    lastUsedAt. Create modal → MAIL-21 → one-time key in toast.
  → Messages tab: list of EmailMessage (metadata only). Per-row: from, to, subject, status,
    folder, isRead, sentAt. Click → message detail (subject + body fetched via JMAP at
    display time).
```

### Domains
```
Open /dashboard/projects/:id/domains (F05) → Domains list.
  → list of Domain (project.domains) — distinct from EmailDomain (project.emailDomains).
    Per-row: domain, deploymentId, dnsMode, sslStatus, ssl expiry (from latest
    DomainHealthCheck.sslExpiresInDays), kebab.
  → empty state: "No custom domains — your deployments already get a free
    `<slug>.apps.<platform-domain>`. Add a custom domain for a clean URL."
  → "Add domain" modal (A only per audit gap — UI greys for D/V): domain + deployment +
    dnsMode (manual | cloudflare_auto) + redirectMode.
    → "Add" → DOM-02 → instructions screen.
  → click a domain → /domains/:d (detail):
      tabs: Overview · DNS · TLS · Email · Health.
      default: Overview.
  → Overview tab: status badge, sslStatus, dnsStatus, deploymentId, sslExpiresAt,
    dnsVerifiedAt, routingVerifiedAt, emailWarning.
  → DNS tab: instructions (real IP, not placeholder) + "Verify" button (DOM-04).
  → TLS tab: cert + expiry; "Re-issue" button; method (letsencrypt | custom | disabled).
  → Email tab: link to Email → Domains (filtered to this domain) — a domain can serve
    both deployments and email.
  → Health tab: recent DomainHealthCheck rows; live checks every 10 minutes server-side.
  → "Delete domain" (A only per audit gap — UI greys for D/V) → DOM-06.
```

### Monitoring
```
Open /dashboard/projects/:id/monitoring (F05) → Metrics tab preselected.
  → Metrics tab: time-series charts of Metric rows. Default: project-level metrics
    (deployments, errors, latency). Time range: 1h / 24h / 7d / 30d.
    "Record manual" button → MON-03 → adds a point.
  → Alerts tab: list of AlertRule + current Alert. Tabs: Rules | Active | History.
    Create rule modal: name, metric, condition (above | below | equals), threshold,
    durationSeconds, severity, channels (multi-select from existing channels), enabled.
    Per-row: name, condition, threshold, severity badge, status.
  → Channels tab: list of NotificationChannel. Create modal: name, type
    (email | slack | webhook | pagerduty), config (per type — email: address; webhook: url;
    slack: webhookUrl; pagerduty: integrationKey). Per-row: name, type, config
    (masked), kebab (Test | Edit | Delete).
    "Test" → MON-19 → sends a test notification.
  → Public scrape: GET /metrics (MON-20) for Prometheus.
```

### Logs
```
Open /dashboard/projects/:id/logs (F05) → Streams tab.
  → list of LogStream rows. Per-row: name, type pill, retentionDays, last-write, kebab.
  → empty state: "No log streams yet — create one to collect structured logs." Hint:
    application, function, deployment, email, system, audit.
  → Create stream modal: name, type, retentionDays.
  → click a stream → /logs/streams/:s (LogViewer):
      timeline histogram (LOG-09) at the top
      filter bar: level (info | warn | error | debug), search (regex), time range
      list of LogEntry: timestamp, level badge, message, metadata (expandable)
      live tail: pauseable; "Jump to latest" button when scrolled away
      "Wrap lines" toggle, "Copy all" button, "Download .log" button
  → Logs ingest: LOG-11 (X-API-Key) is for the runtime; the UI doesn't expose it
    (the Ingest API key is in the stream's settings, copyable).
```

### Settings
```
Open /dashboard/projects/:id/settings (F05) → General tab.
  → General (A): name, description, type (preset), region, status.
  → Env (A): list of ProjectEnv (decrypted values). Key, value (encrypted on wire; UI
    never displays the value in cleartext except on initial create). PATCH PROJ-17.
    Warning banner: "Rotating DB/MQ credentials requires service restart."
  → API Keys (A): list of ProjectApiKey. Name, permissions, lastUsedAt, expiresAt; raw
    key shown once on create. PROJ-19/20/21.
  → Members (O): list of ProjectMember. Email, role (owner | admin | developer | viewer),
    joinedAt. Add member modal → email + role → PROJ-11. Remove (O) → PROJ-12.
  → Invitations (O): list of ProjectInvitation. Email, role, status, expiresAt. Revoke
    → PROJ-15. Send invite modal.
  → Build Config (A): BuildConfig form (strategy, buildCommand, outputDirectory,
    healthCheckPath, healthCheckPort, startupTimeoutSeconds). DEPL-09/10.
  → Danger Zone (O): suspend / archive / restore / delete (type-to-confirm). PROJ-05/06/
    07/08.
```

### MCP
```
Open /dashboard/projects/:id/mcp (F05) → Tools tab preselected.
  → Tools tab: manifest of 108 tools. Search/filter. Per-tool: name, description, related
    inventory ID.
  → API Key tab (A): project-scoped API key. Raw key shown once on create. PROJ-19/20/21.
  → Connect tab: copy-pasteable JSON snippet for Claude / Cursor. "Copy" button.
```

## 5. Information Architecture

### Email
- `/dashboard/projects/:id/email?tab=domains` (default)
- `/dashboard/projects/:id/email?tab=mailboxes` (etc for aliases/identities/api-keys/messages)
- `/dashboard/projects/:id/email/domains/new` — add-domain wizard
- `/dashboard/projects/:id/email/mailboxes/:m` — mailbox detail

### Domains
- `/dashboard/projects/:id/domains` — list
- `/dashboard/projects/:id/domains/new` — add-domain modal
- `/dashboard/projects/:id/domains/:d` — domain detail (tabs: Overview / DNS / TLS / Email / Health)

### Monitoring
- `/dashboard/projects/:id/monitoring?tab=metrics` (default)
- `/dashboard/projects/:id/monitoring?tab=alerts` (sub-tabs: Rules | Active | History)
- `/dashboard/projects/:id/monitoring?tab=channels`

### Logs
- `/dashboard/projects/:id/logs` — streams list
- `/dashboard/projects/:id/logs/streams/:s` — stream viewer (LogViewer)

### Settings
- `/dashboard/projects/:id/settings?tab=general` (default)
- Sub-tabs: general | env | api-keys | members | invitations | build-config | danger

### MCP
- `/dashboard/projects/:id/mcp?tab=tools` (default)
- Sub-tabs: tools | api-key | connect

## 6. Screen Specifications

### Email (highlights; the rest follow the same pattern as F08)
- **Add domain wizard** — focused multi-step (not a multi-page):
  - **Step 1**: domain input. Live validation (valid hostname; not already in the system).
  - **Step 2**: ownership TXT record instructions (the `ownershipToken` from
    `EmailDomain.ownershipToken`). "I've added the TXT" → "Verify" → MAIL-05.
  - **Step 3**: DKIM/SPF/DMARC/MX instructions (auto-generated from the platform's DNS).
    "Verify all" → MAIL-05.
  - **Step 4**: ACTIVE. Summary card. "Add a mailbox" CTA.
  - All steps share a single screen with a left rail of steps; no full-page navigation.
- **Mailbox detail** — quota slider, IMAP/SMTP host:port (read-only), status, "Stalwart
  suspend is a DB flag only" **explicit note** (per the audit: `setAccountStatus` is a
  no-op in Stalwart v0.15.5; the UI surfaces this honestly).
- **Email webhooks warning** — if `STALWART_WEBHOOK_SECRET` is unset in the platform env,
  Settings → Email shows a warning banner: "Email webhooks (MAIL-32..34) are open. Set
  `STALWART_WEBHOOK_SECRET` to enable HMAC verification."

### Domains (highlights)
- **Domain detail / DNS tab** — shows the **real IP** (resolved from `SERVER_IP`), not a
  placeholder. The instructions are copy-pasteable. A "Verify" button calls DOM-04; the
  status transitions via realtime.
- **Connect Cloudflare** (DOM-05) — **no server-side access check** (per audit). The UI
  greys this for non-A/D roles; the audit note is in the spec. A backend hardening pass
  is required.
- **Delete domain** (DOM-06) — **no server-side access check** (per audit). UI greys for
  non-A/D. Backend hardening required.
- **Health tab** — recent `DomainHealthCheck` rows; live checks every 10 min server-side.
  The UI surfaces the last check timestamp + the result.

### Monitoring
- **Metrics tab** — default time-series charts of project-level metrics
  (deployments.succeeded, deployments.failed, function.invocations, etc.). The user can
  pin a chart, change the time range, or "Record manual" (MON-03).
- **Alerts tab** — three sub-tabs: Rules (CRUD on AlertRule), Active (current firing
  alerts), History (resolved alerts). Per-alert row: severity badge, name, status, fired
  at, ack/resolve actions.
- **Channels tab** — CRUD on NotificationChannel. Per-type config form:
  - **email**: address (string, validated)
  - **slack**: webhookUrl (validated as https://hooks.slack.com/...)
  - **webhook**: url + method (POST) + headers (k/v) + body template
  - **pagerduty**: integrationKey (32 hex chars)
  - **slack** and **pagerduty** are **greyed with "not yet available" + tooltip** per
    the audit (channels list the types but the integrations aren't wired).
- **"Test"** on a channel calls MON-19 → sends a test notification. Result in a toast
  (success / failure with the error).

### Logs
- **Streams list** — per-stream card: name, type pill (application | function | deployment
  | email | system | audit), retentionDays, "last write X ago", kebab (Copy ingest key
  | Edit retention | Delete).
- **LogViewer** (the canonical log viewer; shared with Deployments logs, Function logs,
  Queue messages, Realtime messages):
  - **Timeline histogram** (LOG-09) at the top: stacked bars by level over the time range.
  - **Filter bar**: level multi-select, search (regex, live count), time range (Last 1h /
    24h / 7d / 30d / Custom).
  - **List of LogEntry**: timestamp (ms), level badge, message, metadata (collapsible
    JSON viewer). Click a row → modal with the full entry.
  - **Live tail**: pauseable; "Jump to latest" button when scrolled away.
  - **"Wrap lines"** toggle, **"Copy all"** button (copies the rendered text), **"Download
    .log"** (downloads the entries as a .log file).

### Settings (highlights; the canonical home for the project's master config)
- **General tab** (A): name (editable), description, type (preset; can change but the
  change is destructive), region (select), status (read-only).
- **Env tab** (A): `KeyValueTable` of `ProjectEnv`. Each row: key, value (masked; click
  "Reveal" to show the decrypted value, scoped to the current session; logged in
  audit). Add row: key (validated: `^[A-Z_][A-Z0-9_]*$`), value. Delete with confirm.
  - **Warning banner**: "Rotating DB/MQ credentials requires restarting the dependent
    services. Use the rotate action in Databases → Connection tab."
  - "Show encrypted values" is a session-scoped toggle; turning it off re-masks all
    values.
- **API Keys tab** (A): list of `ProjectApiKey` (name, permissions, lastUsedAt,
  expiresAt). Create modal: name, permissions (multi-select), expiresAt (optional).
  Raw key shown once. Revoke with confirm.
- **Members tab** (O): list of `ProjectMember` + role. Add member: email + role (admin
  | developer | viewer). Remove (O only). Role change (O only).
- **Invitations tab** (O): list of `ProjectInvitation`. Send invite: email + role →
  PROJ-13; the email is sent (per the audit, the email send is the platform's SMTP;
  for now the UI surfaces the link for manual copy if email delivery fails).
- **Build Config tab** (A): `BuildConfig` form.
- **Danger Zone** (O):
  - **Suspend** (PROJ-05) — ConfirmDialog; "All deployments will be stopped; members
    cannot deploy new changes." → confirm.
  - **Archive** (PROJ-06) — ConfirmDialog; "Project will be hidden from the workspace;
    data is preserved."
  - **Restore** (PROJ-07) — visible when status ∈ {SUSPENDED, ARCHIVED}.
  - **Delete** (PROJ-08) — type-to-confirm with project name.

### MCP
- **Tools tab** — manifest of 108 tools. Search input (filters by name + description),
  filter by inventory cluster (auth | projects | deployments | functions | …). Per-tool
  row: name, description, related inventory ID (e.g. `DEPL-02`), "Open docs" link to
  the API reference (if exists).
- **API Key tab** (A): the project's MCP API key. Raw key shown once on create. Revoke
  + recreate flow.
- **Connect tab** — copy-pasteable JSON snippet for Claude Desktop and Cursor. The
  snippet includes the API key + the project ID + the WS gateway URL. "Copy" button.
  A second snippet for HTTP-only clients (uses the REST API instead of the WS gateway).

## 7. Component Specifications
- `<DataTable>` ✅ — most lists.
- `<EntityCard>` ✅ — most cards.
- `<HealthBadge>`, `<CodeBlock>`, `<KeyValueTable>`, `<LogViewer>` ✅ (from F11), `<TimeSeriesChart>`,
  `<Sparkline>`, `<Modal>`, `<ConfirmDialog>`, `<Toast>`, `<EmptyState>`, `<Skeleton>`,
  `<ErrorState>`, `<LockedPanel>`, `<Button>`, `<Toggle>`, `<Select>`, `<Slider>`, `<Tabs>`.
- `<AddDomainWizard>` — spec'd here; the multi-step domain setup.
- `<ChannelConfigForm>` — per-type config form; spec'd here.
- `<McpToolManifest>` — the search + filter view; spec'd here.

## 8. API Mapping

### Email
Per `docs/phases/frontend/backend/data.md`:
- **MAIL-01..05** — Domains (CRUD + verify).
- **MAIL-06..13** — Mailboxes (CRUD + suspend/activate/reset-password).
- **MAIL-14..17** — Aliases.
- **MAIL-18..20** — Sender identities.
- **MAIL-21..23** — API keys.
- **MAIL-24..29** — Messages (send, list, get, mark read/starred, delete).
- **MAIL-30..31** — Catch-all.
- **MAIL-32..34** — Webhooks (PUBLIC).

### Domains
- **DOM-01..04** — CRUD + verify.
- **DOM-05** — Connect Cloudflare (**no access check, audit gap**).
- **DOM-06** — Delete domain (**no access check, audit gap**).

### Monitoring
- **MON-01..04** — Metrics (list, summary, record, stats).
- **MON-05..09** — Alert rules (CRUD).
- **MON-10..13** — Alerts (list, get, acknowledge, resolve).
- **MON-14..18** — Channels (CRUD).
- **MON-19** — Test channel.
- **MON-20** — Public Prometheus scrape.

### Logs
- **LOG-01..04** — Streams (CRUD).
- **LOG-05..10** — Log entries (write, batch, list, timeline, stats).
- **LOG-11** — Ingest API (X-API-Key, PUBLIC).

### Settings
- **PROJ-04** — Update project.
- **PROJ-05/06/07/08** — Lifecycle.
- **PROJ-10/11/12** — Members.
- **PROJ-13/14/15/22** — Invitations.
- **PROJ-16/17/18** — Env vars.
- **PROJ-19/20/21** — API keys.
- **DEPL-09/10** — Build config.

### MCP
- **PROJ-19/20/21** — API keys (the same as Settings).
- The MCP tool manifest is fetched from the MCP server itself (`/tools` or equivalent).

## 9. Backend Integration Map
```
Email:
  Domains tab → sdk.email.domains.list(projectId)
    → realtime subscribe to project:<id> events
      → email.domain_added/verified/deleted → list updates
  Mailboxes tab → sdk.email.mailboxes.list(domainId)
    → mailbox detail subscribes to email.<id> events
  Messages tab → sdk.email.messages.list(mailboxId, {folder, unread, limit, offset})
    → message detail → JMAP fetch (per audit: body is in Stalwart, not the platform's DB)
Domains:
  List → sdk.domains.list(projectId)
  Detail → sdk.domains.get(id) + DOM-04 (verify on demand)
  Health tab polls DOM-04 (or derives from DomainHealthCheck rows)
Monitoring:
  Metrics tab → sdk.monitoring.metrics.list(projectId, {metric, startTime, endTime, interval})
    → renders <TimeSeriesChart>
  Alerts tab → sdk.monitoring.alerts.rules.list + alerts.list (Active | History)
  Channels tab → sdk.monitoring.channels.list(projectId)
Logs:
  Streams list → sdk.logs.streams.list(projectId)
  LogViewer → sdk.logs.list({stream, level, search, time, limit, cursor})
    → WS subscribe to log:<stream> for live tail
Settings:
  Each tab is a thin wrapper over the corresponding inventory endpoint
  Lifecycle actions (suspend/archive/restore/delete) → PROJ-05/06/07/08
MCP:
  Tools tab → mcp.listTools() (via the MCP server's REST endpoint or WS gateway)
  API Key tab → PROJ-19/20/21
  Connect tab → pure copy; no network call
```

## 10. User Experience Specification
- **The 6 sections are siblings, not a hierarchy.** Email is not under Settings; Domains is
  not under Email. The user navigates by intent ("add a domain for mail" → Email → Domains;
  "add a domain for the deployment" → Domains).
- **The Settings tab is the master config** — General, Env, API Keys, Members,
  Invitations, Build Config, Danger Zone. Every per-service section has a "Settings"
  shortcut in its kebab that deep-links to the relevant Settings sub-tab.
- **The LogViewer is the canonical log surface** — shared across Deployments, Functions,
  Queues, Realtime, Logs, and any future log-emitting service. The user learns it once.
- **Greying unimplemented pieces** is the honest path: `slack` and `pagerduty` channel
  types; `php`/`go`/`rust` function runtimes; `mysql`/`redis` database types; `cloudinary`/
  `telegram` storage providers — all greyed with "not yet available" + tooltip. Never
  faked.
- **Audit gaps are surfaced, not hidden**: "Stalwart suspend is a DB flag only" is
  explicit on the Mailbox detail; "DOM-05/DOM-06 lack server-side access checks" is
  documented in the spec; the UI greys for non-A/D roles but the gap is real.
- **One-time secrets** — mailbox passwords, API keys, MCP keys are shown once. After
  dismissal, the user must rotate to get a new one.
- **Realtime is ambient** — every list updates without page reload; every state-machine
  transition surfaces in the UI.

## 11. Design Philosophy
- **Configure once.** The user does not configure the email gateway, the DNS provider, the
  monitoring pipeline, or the log store. The platform provides them. The user configures
  the project's specific settings (which channels to alert, which env vars to set, which
  members to add).
- **Beginner first.** The empty state for each section is the create button + a one-
  sentence orientation. The "Add domain" wizard is the canonical example: the user
  follows the steps, the platform does the rest.
- **Production-ready by default.** HMAC for email webhooks (when configured), SSL for
  domains (Let's Encrypt by default), Prometheus-compatible metrics, structured logging,
  per-role permissions. The user gets production-grade without thinking.
- **Everything observable.** Metrics charts, alert lifecycle, log viewer, domain health
  checks — the user can always answer "is the system healthy?".
- **One dashboard.** The six sections live next to each other in the sidebar; the user
  can jump between them in one click. The shared components (LogViewer, TimeSeriesChart,
  KeyValueTable) make the six feel like one tool.

## 12. Configuration Philosophy
- **Email** — user-tunable at add: domain, mailboxes (per-domain), aliases, identities,
  API keys (per-project). User-tunable after: same.
- **Domains** — user-tunable at add: domain, deployment, dnsMode, redirectMode. User-
  tunable after: dnsMode, redirectMode, ssl method.
- **Monitoring** — user-tunable: rules (CRUD), channels (CRUD), manual metric records.
- **Logs** — user-tunable: stream retention (per stream).
- **Settings** — user-tunable per tab; see §6.
- **MCP** — user-tunable: API key (create/revoke), tool manifest (read-only).
- **Greying is honest** — `slack`/`pagerduty` channel types are greyed; the audit
  confirms they're not wired.

## 13. Automation Rules
- **Add domain wizard** — the steps are derived from the platform's known DNS records;
  the user follows the instructions, the platform verifies.
- **One-time secrets** — mailbox passwords, API keys (project + email + MCP), the channel
  one-time token are shown once.
- **Show encrypted values** — session-scoped toggle in Settings → Env; logged in audit
  on every reveal.
- **Realtime** — every list subscribes to the project room; the LogViewer subscribes to
  the stream room; alerts fire and resolve in real time.
- **Greying rule** — channel types, runtime types, database types, storage providers
  are loaded from single constants; anything not in the list is greyed.
- **Audit note surfacing** — "Stalwart suspend is a DB flag only" is a permanent note on
  the Mailbox detail; "Email webhooks open" is a banner on Settings → Email when the env
  var is unset.

## 14. Endpoint Documentation
Per the cluster inventories. Notable specifics for F11:

- **`MAIL-24 Send`** — accepts `from?` (defaults to `SMTP_FROM` if omitted). Returns
  `{messageId, accepted, status, error?}`. Status transitions via realtime: SUBMITTED →
  ACCEPTED → (optionally) BOUNCED.
- **`MAIL-32..34 Webhooks`** — PUBLIC endpoints; HMAC optional via
  `STALWART_WEBHOOK_SECRET`. The UI surfaces the "open" state when the env var is unset.
- **`DOM-05 Connect Cloudflare`** — `{apiToken}` with **no DTO validation** (per audit).
  The UI greys for non-A/D roles; backend hardening is a follow-up.
- **`DOM-06 Delete domain`** — **no access check** (per audit). UI greys for non-A/D;
  backend hardening is a follow-up.
- **`MON-19 Test channel`** — sends a test notification to the channel. Returns the
  result inline. Used in the Channels tab's "Test" kebab.
- **`LOG-11 Ingest`** — X-API-Key auth, PUBLIC. The key is in the stream's settings
  (copyable). Returns 202 `{accepted, overQuota, results}`.
- **Email services lack project-access checks** (path-scoping only) per
  `docs/phases/frontend/backend/index.md`. The UI greys for non-members; backend
  hardening is a follow-up.

Backend gaps the UI must work around:
- `slack` and `pagerduty` channel types are not implemented (audit). UI greys.
- `DOM-05` and `DOM-06` lack server-side access checks. UI greys for non-A/D.
- Email services lack project-access checks. UI greys for non-members.
- Stalwart v0.15.5: `setAccountStatus` is a no-op. UI surfaces "DB flag only."
- Email webhook HMAC is optional; the UI surfaces the "open" state.

## 15. Feature Dependency Graph
- **Hard**: F00, F02, F05.
- **Hard backend**: every inventory cited above; the realtime event families; the SMTP
  pipeline; the DNS + ACME pipeline; the monitoring pipeline; the log store.
- **Gated by F11**: nothing (it's the catch-all).
- **Backend gaps that affect this screen**:
  - `slack` / `pagerduty` channels not implemented (UI greys).
  - `DOM-05` / `DOM-06` lack server-side access checks (UI greys).
  - Email services lack project-access checks (UI greys for non-members).
  - Stalwart suspend is a DB flag only (UI surfaces honestly).
  - Email webhooks are open if `STALWART_WEBHOOK_SECRET` unset (UI shows banner).

## 16. Acceptance Criteria
1. Email → Domains tab lists EmailDomain rows; the empty state is "No email domain yet —
   add one to send and receive mail." + CTA "Add domain."
2. The Add domain wizard walks the user through ownership TXT → DKIM/SPF/DMARC/MX →
   ACTIVE; the status transitions via realtime events.
3. Email → Mailboxes → Create mailbox → MAIL-06 → one-time password in a toast.
4. Email → Mailboxes → detail → "Stalwart suspend is a DB flag only" note is visible.
5. Email → API Keys → Create → MAIL-21 → one-time `ek_` key in a toast.
6. Email → Messages tab lists EmailMessage rows; the detail fetches the body via JMAP.
7. Settings → Email shows a warning banner when `STALWART_WEBHOOK_SECRET` is unset.
8. Domains list shows `Domain` rows; the empty state surfaces the free subdomain.
9. Add domain → DOM-02 → DNS instructions with the **real IP** (not a placeholder).
10. Domain detail's DNS tab → "Verify" calls DOM-04; status transitions via realtime.
11. Domain detail's Connect Cloudflare / Delete are greys for non-A/D per the audit gap.
12. Monitoring → Metrics tab renders time-series charts with 1h/24h/7d/30d range.
13. Monitoring → Alerts tab has Rules / Active / History sub-tabs; per-alert ack + resolve.
14. Monitoring → Channels tab lists channels; `slack` and `pagerduty` are greys with
    "not yet available" + tooltip.
15. "Test" on a channel calls MON-19; result in a toast.
16. Logs → Streams list; create stream → LOG-01; click → LogViewer with timeline + filter
    + live tail.
17. LogViewer's live tail is pauseable; "Jump to latest" appears when scrolled away.
18. Settings → General / Env / API Keys / Members / Invitations / Build Config / Danger
    Zone each render the right per-role chrome (A / O).
19. Settings → Env shows the values mask; "Reveal" is session-scoped and audit-logged.
20. Settings → Danger Zone suspend / archive / restore / delete have type-to-confirm.
21. MCP → Tools tab lists 108 tools with search + filter; per-tool shows the related
    inventory ID.
22. MCP → API Key tab (A) shows the raw key once on create; revoke + recreate.
23. MCP → Connect tab has copy-pasteable JSON snippets for Claude / Cursor.
24. Greying unimplemented pieces is the honest path: `slack`/`pagerduty` greys in
    channels; the Audit notes are surfaced in the relevant screens.
25. `pnpm --filter @fidscript/dashboard build` clean; this spec updated to match shipped
    behavior.

## Change log
- 2026-06-20 — Initial full 16-section spec. Covers 6 sidebar items (Email, Domains,
  Monitoring, Logs, Settings, MCP) in one document. Documents 5 backend gaps surfaced by
  the audit that affect these screens: (1) `slack`/`pagerduty` channel types not
  implemented; (2) `DOM-05`/`DOM-06` lack server-side access checks; (3) email services
  lack project-access checks; (4) Stalwart suspend is a DB flag only; (5) email webhooks
  are open if `STALWART_WEBHOOK_SECRET` unset.
