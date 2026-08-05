# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- `feat(dashboard): wire MCP page to real McpHub component — replaces stub with live API key generation, tool manifest, and stdio connection instructions`
- `feat(dashboard): wire domains wizard tab — guides users through DNS record setup with live health verification polling`
- `feat(dashboard): wire domains repairs tab — health check, zone sync/import, open incidents + verification history`

### Fixed
- `fix(sdk): add /api/v1 prefix to template method paths`

### Audit findings (api-mcp-audit)
- **`mcp-hub.tsx`**: Connect snippet hardcoded `https://api.deploy.fidscript.com/api/v1` — replaced with dynamic `window.location.origin` so it works in all environments.
- `sdk.mcp.*` module does not exist in `@fidscript/sdk` — MCP page falls back to `sdk.projects.createApiKey()` (PROJ-20) for key generation. Missing SDK coverage: `mcp.listTools()`, `mcp.enable()`, `mcp.disable()`, `mcp.listServers()`, `mcp.registerServer()`. Backend has MCP controller but no project-scoped server registry endpoints.
- MCP page has no per-role UI gating — developer/viewer roles see the full UI but can't perform write operations (enforced server-side only, not surfaced).

### Audit findings (storage-audit)
- Duplicate helper functions (`formatBytes`, `getFileTypeInfo`, `isPreviewable`, `iconForType`) existed in 4 files with 3 copies each. Extracted to `file-utils.ts`; all consumers updated.
- `Function` type alias (implicit `any`) used in 5 files for SDK method typing — replaced with `FidscriptSDK` import from `@fidscript-deploy/sdk`.
- All 37 storage files now pass ANPAS 150-line limit (max: `storage-list.tsx` at 142L).

### Audit findings (queues-audit)
- Wrong `type` values sent to API (`jetstream`/`redis`/`nats`/`memory`) — corrected to `stream`/`queue`/`workqueue` matching the backend DTO. Affected: `queues-list.tsx`, `queue-card.tsx`, `queue-detail.tsx`.
- `handleConsume` in `queue-detail.tsx` mixed consumed (pending) messages into whichever tab the user was viewing — fixed to switch to `pending` tab before displaying consumed messages.
- **`queue-detail.tsx`** (400L) decomposed into: `queue-detail-header.tsx` (59L), `queue-detail-stats-bar.tsx` (31L), `queue-detail-actions-toolbar.tsx` (58L), `queue-messages-table.tsx` (150L), `queue-detail-loading.tsx` (11L), `queue-detail-not-found.tsx` (19L), `queue-detail-modals.tsx` (70L), `queue-detail-modal-create.tsx` (17L), `queue-detail-modal-delete.tsx` (20L), `queue-detail-handlers.ts` (111L). Shell now 122L.
- **`queues-list.tsx`** (292L) decomposed into: `queues-list-header.tsx` (27L), `queues-create-modal.tsx` (95L), `queues-explanation-banner.tsx` (23L), `queues-delete-confirmation.tsx` (52L), `queues-list-handlers.ts` (92L). Shell now 124L.
- `use-queues-realtime.ts`: Added `QueueMessage` interface and `MessageTab` type as exports.

### Audit findings (realtime-audit)
- **`live-feed.tsx`** (328L) decomposed into: `use-realtime-socket.ts` (84L — socket lifecycle), `live-feed-connection-status.tsx` (67L — status pill + pause/clear), `live-feed.tsx` (80L — thin shell). Also wired pause to actual socket `setPausedRef`.
- Deleted dead files: `live-feed-fetch.ts` (91L, never imported), `live-feed-body.tsx` (110L, superseded), `live-feed-header.tsx` (66L, superseded by `live-feed-connection-status.tsx`).
- Unused `Project` import removed from `realtime-channel-list.tsx`.
- Backend gaps: RT-08 (private channel token) not implemented; presence display (RT-06/RT-07) not wired.

### Audit findings (functions-audit — follow-up refactor)
- **`function-code.tsx`** (239L) decomposed into: `function-code-header.tsx` (80L), `function-code-metrics.tsx` (60L), `function-code-state.ts` (83L — ResizeObserver + auto-save hook), `function-code-constants.ts` (58L — RUNTIME_LANG + STARTER_CODE). Shell now 116L.
- **`function-versions.tsx`** (234L) decomposed into: `function-versions-list.tsx` (132L), `function-version-row.tsx` (41L), `function-versions-diff-view.tsx` (58L). Shell now 77L.
- **`function-logs.tsx`**: Fixed unsubscribe race (same pattern as `use-function-realtime.ts`); fixed type cast `sdk as Record<string, unknown>` → `sdk as unknown as Record<string, unknown>`.
- **`page.tsx`**: Removed duplicate invoke state (`invokeResult`/`invokeError`) that was tracked in page AND displayed in `FunctionHeader` independently. `FunctionHeader` no longer receives invoke result props.
- `AlertCircle02Icon` not exported from hugeicons — replaced with `AlertCircleIcon` in `function-code-metrics.tsx`.

### Audit findings (databases-audit)
- **`database-context-body.tsx`** (127 lines) was orphaned — superseded by `database-context.tsx` which properly delegates to `database-fetch.ts` / `database-mutations.ts`. Deleted.
- **`ConnectionPanel`**: `connection()` and `rotatePassword()` were cast `as Record<string, string>` / `as { password: string }` without a typed interface. Added `DbConnectionInfo` interface with proper field types (host, port as number, user, connectionString, ssl, poolSize, pgbouncer fields). The "Show/Hide" password row and `connInfo.password` reference were removed — DB-07 never returns a password field, and DB-08 only returns the one-time password after rotation (shown in the rotation result card, not the connection info).
- Multiple component files exceed the ANPAS 150-line limit: `sql-editor-v2.tsx` (703), `data-grid.tsx` (478), `db-normalize.ts` (346), `database-context.tsx` (436), `backups-panel.tsx` (296), `backup-settings-panel.tsx` (285), `schema-explorer.tsx` (189), `connection-panel.tsx` (184). All require decomposition before merge.
- Realtime subscription for database status changes is not wired on the database list page. New/deleted databases will not appear/vanish in real time without manual refresh. Pattern to implement: `useDatabaseRealtime.ts` hook following `use-storage-realtime.ts`.
- `BackupSettingsPanel` fetches `getBackupSettings()` but never displays `BackupSettings` fields (`defaultBucket`, `maxManualBackups`, `autoBackupRetentionDays`).
- `BackupsPanel.handleCreate` calls `sdk.databases.backup(databaseId)` without passing `storageBucket` — backups always go to the default bucket regardless of UI selection.
- `normalizeFunction`, `normalizeDeployment` in `db-normalize.ts` are dead code — no database page uses them.
- `database-context.tsx` locally re-declares `DatabaseStatus` shadowing the exported `DatabaseStatus` from `@/types/database`.

### Audit findings (functions-audit)
- Functions page (`apps/dashboard/src/app/(app)/projects/[projectId]/functions/`) was audited against spec `docs/product/services/functions.md` and inventory `docs/phases/frontend/backend/compute.md` (FN-01..09). Findings (recorded for follow-up; no code changes applied in this session because the working tree was concurrently being edited by another agent and reverted to the prior state to avoid conflicts):
  - **`function-code.tsx`** is 239 lines, exceeds ANPAS 150-line limit. Recommended split: `function-code-editor.tsx` (Monaco wrapper, ~35 lines) + `function-code-toolbar.tsx` (~50 lines), leaving `function-code.tsx` at ~150 lines.
  - **`function-versions.tsx`** is 234 lines. Recommended split: `diff-view.tsx` (~50 lines) for the side-by-side DiffView helper, leaving `function-versions.tsx` at ~180 lines (still over; further split needed for the version list vs. the diff picker).
  - `use-function-realtime.ts` uses `as any` casts on the realtime SDK and has a race where `unsub` is captured inside a `.then` closure and called unconditionally on cleanup (may fire before `.then` resolves).
  - `function-card.tsx` duplicates the "View" link (clicking the function name AND clicking "View" both navigate), gates action buttons behind `group-hover:` (UX §12 keyboard-first violation — actions must be visible without hover), and inlines its own `RUNTIME_LABELS` (`node`/`python`) that doesn't match what the create modal sends (`nodejs20`/`python311`).
  - `function-list.tsx` empty-state CTA is a `<Link href="?createFunction=true">` which relies on the parent's `useSearchParams` handler — but the same component is reused under `/projects/[projectId]/functions` where that query-string handler is not mounted. The empty CTA silently fails to open the create modal in the project-scoped route.
  - `function-invoke.tsx` and `function-header.tsx` both render the invoke result. The detail page maintains `invokeResult` / `invokeError` state in the parent AND the Invoke tab maintains its own. The header's "Test" button calls `handleInvoke` from the parent (which only sets the parent's state), so the Invoke tab's local result never updates from header clicks. Duplicate state and a dead UI affordance.
  - `function-header.tsx` redeclares `RUNTIME_LABELS` and the `useState` for the delete confirm — same logic already lives in `function-card.tsx` and the settings tab. Suggested consolidation via `runtimeLabel()` helper in `function-utils.ts`.
  - `function-utils.ts` (10 lines) declares a runtime → starter-code map but only matches `node`/`python` while the create modal sends `nodejs20`/`python311` — runtime values diverge between create flow and code editor.
- All findings above are non-blocking. The current implementation compiles (0 TS errors in functions scope) and the dashboard build passes through the functions route. Type errors in scope exist only in `apps/dashboard/src/app/(app)/email/[domain]/page.tsx` and `services/services-registry.tsx` (both out of scope for the functions audit).

### Fixed
- feat(dashboard): storage page audited and re-implemented per spec `docs/product/services/storage.md` and inventory `docs/phases/frontend/backend/data.md` (STOR-01..08). Bucket detail (`bucket-detail.tsx`) reduced from 160 → 145 lines by extracting `use-bucket-realtime.ts` (40 lines, realtime subscription) and `use-file-preview.ts` (38 lines, preview URL fetch + cache). Upload modal (`upload-files-modal.tsx`) reduced from 218 → 92 lines by extracting `use-modal-upload.ts` (74 lines, queue + upload loop) and `upload-file-row.tsx` (63 lines, per-file status row). All 22 storage files now ≤ 150 lines. Bucket card delete no longer orphans bucket-detail realtime handlers (realtime effect re-extracted to `use-bucket-realtime` and uses `handlersRef` to avoid re-subscribing on every render — same fix applied to `use-storage-realtime`). Created bucket form (`create-bucket-form.tsx`) now exposes the spec-required `isPublic` toggle and disables cloudinary/telegram/s3 provider options that are aspirational per the audit ("not yet available"). Stale `previewUrls` entries cleared on file delete. Removed dead files: `storage/settings/provider-card.tsx` (replaced by `storage-settings-provider.tsx`), `storage/settings/storage-banner.tsx` (settings page uses inline banner), and `bucket-settings-panel.tsx` (never imported). `use-storage-settings.ts` 'use client' directive moved to file top per Next.js convention. Bucket type unified in `bucket.ts` (single source-of-truth, mirroring SDK `Bucket`).
- fix(auth): seed no longer skips on admin email mismatch — `prisma/seed.ts` now checks whether ANY admin exists before creating one. Previously, if `ADMIN_EMAIL` in docker-compose did not match the seeded admin's email, the seed silently skipped but a subsequent installation flow could create a duplicate admin. Now it safely skips if any admin already exists with a different email. (`apps/api/prisma/seed.ts`)
- feat(dashboard): email page re-implemented — replaced single-domain listing with 6-tab `Email` console (Domains / Mailboxes / Aliases / Identities / API Keys / Messages) wired to real MAIL-01..29 endpoints per spec `docs/product/services/email.md` and inventory `docs/phases/frontend/backend/data.md`. Honest backend-gap banner surfaces the Stalwart v0.15.5 suspend limitation, auto-generated mailbox password, and open inbound webhooks (MAIL-32/33/34) unless `STALWART_WEBHOOK_SECRET` is set. All files under 150 lines; ANPAS-compliant (no helpers/utils, CSS variables only, no business logic in components). Mailbox create + API key create both reveal their one-time secret inline. Identities + API Keys use raw fetch (the SDK does not expose those controllers). (`apps/dashboard/src/app/(app)/projects/[projectId]/email/page.tsx` + `email-tabs.tsx`, `domains-tab.tsx`, `domain-card.tsx`, `add-domain-modal.tsx`, `mailboxes-tab.tsx`, `mailbox-card.tsx`, `add-mailbox-modal.tsx`, `aliases-tab.tsx`, `alias-card.tsx`, `add-alias-modal.tsx`, `identities-tab.tsx`, `identity-card.tsx`, `add-identity-modal.tsx`, `api-keys-tab.tsx`, `api-key-card.tsx`, `add-api-key-modal.tsx`, `messages-tab.tsx`, `message-row.tsx`, `email-shared.tsx`; deleted dead `project-email-card.tsx`.) — `prisma/seed.ts` now checks whether ANY admin exists before creating one. Previously, if `ADMIN_EMAIL` in docker-compose did not match the seeded admin's email, the seed silently skipped but a subsequent installation flow could create a duplicate admin. Now it safely skips if any admin already exists with a different email. (`apps/api/prisma/seed.ts`)
- fix(auth): `inviteKeyword` validation in register service now correctly checks `SIGNUP_INVITE_KEYWORD` env var without shadowing the outer variable, and the missing `UnauthorizedException` import is restored. (`apps/api/src/modules/auth/services/auth-register.service.ts`)
- fix(auth): rate limiting restructured — account lockout check (`rateLimiter.count`) now runs AFTER user lookup, not before. This prevents an attacker from probing which emails are registered by observing whether a non-existent email triggers the "too many attempts" response. (`apps/api/src/modules/auth/services/auth-login.service.ts`)
- feat(auth): added `POST /auth/forgot-password` endpoint as a dedicated alias for `/auth/send-verification` with `type=PASSWORD_RESET`. (`apps/api/src/modules/auth/controllers/auth.controller.ts`)
- feat(auth): `RegisterDto` now accepts `inviteKeyword` field; `AuthRegisterService` validates it against `SIGNUP_INVITE_KEYWORD` env var (case-insensitive, skips if env var is unset). (`apps/api/src/modules/auth/dto/register.dto.ts`, `apps/api/src/modules/auth/services/auth-register.service.ts`)
- fix(auth): password change now updates `User.passwordHash` in addition to `UserCredential.secretHash` — login verifies against `User.passwordHash` (`auth-login.service.ts:83`), so without this update the seed's bootstrap hash remained the only thing accepted and a UI password change silently had no effect on future logins. After this fix, a successful `/change-password` is immediately honoured at next login. (`apps/api/src/modules/auth/services/auth-password.service.ts`)
- fix(installer): `install.sh` and `setup-wizard.sh` no longer overwrite populated secret files (`secrets/postgres_password.txt`, `secrets/jwt_secret.txt`, `secrets/stalwart_admin_token.txt`, etc.). Re-running the installer on an existing deployment previously rotated every credential, invalidating DB connections, JWT signing keys, Stalwart admin tokens, and Stalwart webhook secrets — locking the operator out and breaking running services. A `generate_secret` helper now skips files that are non-empty. (`installer/scripts/install.sh`, `installer/scripts/setup-wizard.sh`)
- fix(installer): `setup-wizard.sh` no longer overwrites `secrets/api.env` on every run — re-running would otherwise blank the operator's GITHUB_CLIENT_ID/SECRET and force a container recreate. (`installer/scripts/setup-wizard.sh`)
- fix(installer): `install.sh` no longer overwrites `secrets/api.env` on re-run — same preservation invariant as the wizard. (`installer/scripts/install.sh`)
- fix(installer): aligned `SMTP_SUBMISSION_PASS` in `installer/docker/.env`, `installer/docker/secrets/api.env`, and `installer/docker/secrets/smtp_submission_pass.txt` to the current `secrets/stalwart_admin_token.txt` (`Tqu6QQHLg8AIGK5x`). They had drifted apart, causing SMTP submission to fail against the Stalwart admin token after the stalwart token was rotated. Added comments documenting the stalwart_admin_token ↔ SMTP_SUBMISSION_PASS invariant.
- feat(installer): `api-entrypoint.sh` honours `SKIP_SEED=1` env var to bypass `prisma db seed` on container start. The seed itself is idempotent, but this gives operators an explicit knob. `docker-compose.yml` exposes it as `SKIP_SEED=${SKIP_SEED:-0}`.

### Changed
- feat(dashboard): projects list empty state UI — `projects-list-body.tsx` redesigned with cleaner single-message copy, larger icon in circular surface-2 badge, more vertical spacing (py-16), prominent centered "New project" CTA using `bg-[var(--accent)] text-[var(--text)]`; card uses `bg-[var(--surface)]` instead of `--surface-2`; replaced generic Search icon with Folder icon; `aria-live` on title + description; role/aria-label on region. `projects-list-header.tsx` New-project button now applies accent classes directly so the accent color is visible across themes.
- fix(dashboard): databases list page — removed `any` types from event handlers and error catches (`page.tsx`); provision form now exposes an environment selector (production/staging/preview/development) per spec §6; defensive `region` runtime-check dropped in favour of the SDK's `db.environment` field. MySQL/Redis options render as disabled with "not yet available" copy so the gap is honest. Created `database-create-form.tsx` then folded back into `page.tsx` to keep the file under 150 lines. (`apps/dashboard/src/app/(app)/projects/[projectId]/databases/page.tsx`)
- refactor(dashboard): deduplicated `DatabaseStatus` / `RealtimeTableInfo` in `database-utils.ts` — now re-exports from `@/types` instead of declaring local copies. (`apps/dashboard/src/app/(app)/projects/[projectId]/databases/database-utils.ts`)

### Fixed
- fix(dashboard): light theme eye-strain — `--canvas` softened from `#ffffff` to `#f5f6f8` (soft off-white reduces blow-out); surface hierarchy inverted so `--surface = #ffffff` (white cards pop on the off-white canvas) and `--surface-2` deepened to `#eef0f3` for the app chrome / header band; `--rail` family adjusted to match the new tonal range. `--text` (#1a1a1a) and `--text-muted` (#55575c) already met WCAG AA — left unchanged.

### Fixed
- fix(frontend): resolve accessibility contrast issues — light theme --text-dim darkened (#8b8d92 → #6e7178 for 4.65:1 on surface-2), --accent darkened (#ea580c → #c2410c for 7.3:1 white text), RightPanel subtitle uses --text-muted, aria-labelledby includes subtitle id, accent submit button text uses --text

### Added
- feat(dashboard): register page redesigned — now uses `AuthPageShell` layout consistent with login page (centered card, proper visual hierarchy, logo, footer with sign-in link). `register-form.tsx` extracted into `register/components/` sub-components: `auth-method-toggle.tsx`, `password-registration-form.tsx`, `magic-code-registration-step.tsx`, `magic-code-confirm-step.tsx`, `invite-keyword-input.tsx`. All files under 150 lines.
- feat(dashboard): registration now requires an invite keyword (`"nextmavens"`, case-insensitive) verified client-side via SHA-256 hash comparison before the backend call. Keyword field placed at the top of both password and magic-code registration forms with inline error display.
- feat(dashboard): registration no longer auto-logs in after password signup — shows pending state. Magic-code registration shows a separate confirmation step after sending the code. Backend errors displayed inline via `LoginErrorBanner`, not buried.
- feat(dashboard): add `forgot-password` page at `/forgot-password` — email input, sends password reset via `auth.sendVerification(type=PASSWORD_RESET)`, shows success state with "check your inbox" envelope icon and option to try again. Layout matches login page via `AuthPageShell`.
- feat(dashboard): `AuthProvider` gains `forgotPassword(email)` method backed by `sdk.auth.sendVerification(email, 'PASSWORD_RESET')` — plumbed through `auth-methods.ts`, `auth-provider.tsx`, and `auth-types.ts`.
- fix(dashboard): removed hardcoded orange `bg-orange-900/20 border-orange-800/40` magic-code notice in register form — replaced with CSS variable `bg-[var(--warning)]/10 border-[var(--warning)]/20`.
- fix(dashboard): removed duplicate `placeholder:text-[var(--var(--text-dim))]` typo in magic-code email input field (`register-form.tsx`).
- feat(dashboard): polish project cards — `project-card.tsx` and `deleted-project-card.tsx` now use `bg-[var(--surface)]` for card background, `hover:bg-[var(--hover)]` consistently, accent-colored "Open →" indicator on hover, and CSS-variable-only colors for all status badges / time icons / action buttons (edit, delete, restore, purge)

### Changed
- feat(dashboard): login page redesign — extracted into 8 components (auth-page-shell, auth-method-tabs, password-form, magic-code-form, login-error-banner, platform-auth-badge), all under 150 lines; handlers in use-login-form hook
- feat(dashboard): onboarding page redesign — extracted into 6 components (onboarding-shell, form-field, auth-method-selector, password-fields, basic-config-fields), all under 150 lines
- feat(dashboard): add an accessible light/dark theme toggle to the login card and persist the selection in localStorage (`apps/dashboard/src/app/login/login-theme-toggle.tsx`, `apps/dashboard/src/app/login/page.client.tsx`, `apps/dashboard/src/app/login/components/auth-page-shell.tsx`)
- fix(dashboard): login page — server component fetches auth method server-side so SSR renders correct form immediately; CORS issue bypassed via dashboard API proxy route at /api/v1/installation/status
- fix(dashboard): login page uses local /logo.svg instead of broken Cloudinary URL
- fix(dashboard): login page shows "Platform auth: Password" badge when method is configured; hides tab strip entirely
- fix(dashboard): login page auto-detects platform auth method from /api/v1/installation/status — shows only PASSWORD or MAGIC_CODE form, never both tabs when platform is configured
- fix(dashboard): onboarding configure step now captures and persists auth method + admin password to PostgreSQL via installation API
- fix(dashboard): welcome step checks lifecycle on mount — shows "Go to login" when platform is already CONFIGURED
- fix(installer): traefik dynamic.yml — fixed malformed YAML (backtick-in-template syntax), corrected service names (dashboard, api), corrected cert resolver name (letsencrypt-dns), corrected service URLs to match actual container ports
- fix(dashboard): rebuild and deploy dashboard container — also fixed stale API container (entrypoint override removed from compose)
- refactor(dashboard): split oversized scheduler-job-detail (600L), databases/[id] (464L), monitoring (383L), platform/email/settings (399L), storage/settings (390L), databases/page (211L), email/analytics (182L) pages:
  - `projects/[projectId]/scheduler/[jobId]/` → page (130L) + use-job-detail hook + job-detail-header + job-runs-list + job-edit-form-body + job-edit-modal + run-detail-modal + run-timeline + stat-card
  - `databases/[id]/` → page (132L) + use-database-detail hook + db-overview-card + db-backups-list + db-connection-card + db-versions-list + db-settings + db-toast + db-detail-header
  - `monitoring/page.tsx` → page (106L) + use-monitoring-data hook + alert-list + alert-create-modal
  - `platform/email/settings/page.tsx` → page (105L) + use-email-settings hook + email-settings-form
  - `projects/[projectId]/storage/settings/page.tsx` → page (93L) + use-storage-settings hook + storage-settings-provider + storage-settings-cloudinary + storage-settings-telegram
  - `databases/page.tsx` (129L) — already under 150L
  - `email/analytics/page.tsx` (69L) — already under 150L
  - All files under 150 lines per ANPAS rule
- refactor(dashboard): split oversized scheduler, domains, settings, logs, platform/integrations/settings, login, register, databases, and email/analytics pages to meet 150-line limit
- refactor(dashboard): split settings, logs, integrations/settings, login, register pages to meet 150-line limit
- refactor(dashboard): split oversized email/mailbox, templates, monitoring detail, email root, deployments, functions, realtime, webhooks, platform/email, and email/[domain] pages:
  - `email/[domain]/mailboxes/[mailbox]/` (379L) → page (148L) + message-list (58L) + message-detail (84L) + compose-modal (84L) + mailbox-toolbar (60L) + mailbox-empty-state (44L) + message-panel (31L)
  - `email/templates/` (262L) → page (129L) + template-editor-modal (103L) + template-preview-modal (44L)
  - `monitoring/[id]/` (264L) → page (108L) + alert-history (65L) + alert-actions (74L) + alert-rule-config (41L) + alert-channels (30L)
  - `email/page.tsx` (223L) → page (118L) + create-domain-modal (57L) + domain-card (44L) + email-project-selector (28L)
  - `projects/[projectId]/deployments/[deploymentId]/` → page (128L) + deployment-actions (98L) + deployment-detail-body (131L) + use-deployment-realtime (32L)
  - `projects/[projectId]/functions/[id]/` → page (147L) + function-utils (33L) + use-function-realtime (32L)
  - `projects/[projectId]/realtime/` → page (129L) + realtime-channel-list (87L)
  - `email/webhooks/` → page (137L) + create-webhook-modal (77L)
  - `platform/email/` → page (150L) + platform-email-compose-form (106L) + platform-email-compose-modal (72L) + platform-email-mailbox-list (65L) + platform-email-message-list (64L) + platform-email-message-detail (50L) + platform-email-create-mailbox-modal (47L) + platform-email-mailbox-created-card (31L) + platform-email-attachment-chips (26L) + platform-email-send-mail (26L) + platform-email-three-panel (40L)
  - `email/[domain]/` → page (150L) + domain-header (36L) + domain-tabs (43L)
  - All files under 150 lines per ANPAS rule
- refactor(dashboard): split `apps/dashboard/src/contexts/auth-context.tsx` (281L) into auth-provider.tsx/auth-session.ts/auth-methods.ts/auth-token-utils.ts/auth-types.ts/use-auth.ts (all <150L)
- refactor(dashboard): split `apps/dashboard/src/types/index.ts` (454L) into domain-specific files under `types/` (all <150L)
- refactor(dashboard): split `apps/dashboard/src/app/(app)/projects/page.tsx` (961L) into sub-components + use-projects-page hook (all <150L)
- refactor(dashboard): split `apps/dashboard/src/app/(app)/projects/[projectId]/services/page.tsx` (639L) into services-section-inner/services-header/services-body (all <150L)
- refactor(dashboard): split `apps/dashboard/src/app/(app)/projects/[projectId]/services/new/page.tsx` (983L) into step-source/step-select/step-configure/step-review + hooks (all <150L)

- `apps/dashboard/src/components/storage/status-badge.tsx` (20L) — added Hugeicons icons (`CheckmarkCircle01Icon` / `MinusCircleIcon`) to status badge, matching UX spec requirement that "a status badge always has label + icon"
- Split `app/(app)/projects/[projectId]/layout.tsx` (218L) into ANPAS-compliant sub-components:
  - `layout.tsx` (135L) — thin shell with data fetching and composition
  - `project-header.tsx` (105L) — header with logo, breadcrumb, theme toggle, avatar, project switcher
  - `use-local-storage.ts` (18L) — extracted `useLocalStorage` hook
  - `sections/settings/` folder — split 549-line `settings.tsx` into tab components:
    - `index.tsx` (63L) — tab shell
    - `general-tab.tsx` (72L) — name, description, subdomain
    - `environment-tab.tsx` (125L) — encrypted env vars with reveal/hide
    - `apikeys-tab.tsx` (97L) — project API keys CRUD
    - `build-tab.tsx` (94L) — build configuration
    - `danger-tab.tsx` (54L) — delete project
    - `add-env-modal.tsx` (60L) — add env var modal
    - `create-api-key-modal.tsx` (89L) — create API key modal
    - All files under 150 lines per ANPAS rule
- Split `contexts/auth-context.tsx` (281 lines) into ANPAS-compliant files:
  - `contexts/auth-provider.tsx` (126 lines) — AuthProvider component
  - `contexts/auth-session.ts` (70 lines) — session restoration hook
  - `contexts/auth-methods.ts` (97 lines) — auth method implementations
  - `contexts/auth-token-utils.ts` (32 lines) — token storage utilities
  - `contexts/auth-types.ts` (24 lines) — AuthState/AuthContextValue interfaces
  - `contexts/use-auth.ts` (9 lines) — useAuth hook
  - `contexts/auth-context.tsx` (11 lines) — backwards-compatibility barrel
- Split `types/index.ts` (454 lines) into domain-specific files under `types/`:
  - `types/index.ts` (36 lines) — re-exports all types
  - `types/user.ts`, `types/project.ts`, `types/deployment.ts`, `types/function.ts`, `types/queue.ts`, `types/cron.ts`, `types/logs.ts`, `types/monitoring.ts`, `types/storage.ts`, `types/realtime.ts`, `types/database.ts`, `types/database-backup.ts`, `types/email.ts` — domain-specific type exports
  - All files under 150 lines per ANPAS rule

### Removed

- `apps/dashboard/src/mocks/sdk.ts` (1,807 lines) — deleted mock SDK, production now always uses real `@fidscript-deploy/sdk`
- `apps/dashboard/src/mocks/data.ts` (1,246 lines) — deleted all mock data
- Stale "mock mode" comments removed from `schema-explorer.tsx` and `database-context.tsx`

### Changed

- `apps/dashboard/src/lib/sdk.ts` — removed `USE_MOCK`, `IS_MOCK_MODE`, `createMockSdk` import; `makeSdk()` now always returns real SDK with `baseURL: API_BASE_URL` and `onUnauthorized: refreshAccessToken`
- `apps/dashboard/src/contexts/auth-context.tsx` — removed `IS_MOCK_MODE` and `mockUser`; session restore now only uses real auth flow (localStorage tokens -> `sdk.auth.me()` -> refresh on failure)
- `apps/dashboard/src/app/(app)/projects/[projectId]/domains/[domainId]/page.tsx` — removed mock type/data imports; `wizard` and `repairs` tabs now show "not yet available" placeholder (no real backend API exists for these features)
- `apps/dashboard/src/app/(app)/projects/[projectId]/domains/[domainId]/` — split 1,037-line `page.tsx` into 7 sub-components (overview-tab, dns-tab, health-tab, email-tab, ssl-tab, wizard-tab, repairs-tab), each self-managing its own data fetching; page.tsx is now a 74-line thin shell
- `apps/dashboard/src/app/(app)/email/[domain]/` — split 688-line `page.tsx` into tab components (domain-overview-tab, domain-mailboxes-tab, domain-aliases-tab, domain-catchall-tab, domain-catchall-config-modal), page.tsx now 176-line shell
- `apps/dashboard/src/app/(app)/platform/email/` — split 584-line `page.tsx` into platform-email-compose-form, platform-email-compose-modal, platform-email-mailbox-list, platform-email-message-list, platform-email-message-detail, platform-email-create-mailbox-modal, platform-email-mailbox-created-card, platform-email-attachment-chips; page.tsx now 208-line shell

- Initial ANPAS bootstrap — 2026-07-30

### Fixed

- `apps/dashboard/src/app/register/page.tsx` — fixed broken magic-code verification: `MagicCodeInput onComplete` was empty `() => {}`; now calls `verifyMagicCode(email, code)` and shows "Invalid or expired code" on failure; also fixed duplicate `sendMagicCode` call in `handleMagicCodeSubmit` since `register()` already sends the code
- `apps/dashboard/src/app/onboarding/page.tsx` (482 lines) — split into ANPAS-compliant sub-components under `app/onboarding/`:
  - `steps/welcome-step.tsx` (25L), `steps/discovery-step.tsx` (79L), `steps/configure-step.tsx` (126L), `steps/progress-step.tsx` (48L), `steps/complete-step.tsx` (29L)
  - `components/health-row.tsx` (25L)
  - `hooks/use-discovery.ts` (92L) — discovery fetch logic
  - `hooks/use-configure-sse.ts` (139L) — configure API + SSE progress stream
  - `page.tsx` is now a 77-line thin shell that lifts state and delegates to step components
  - All files under 150 lines per ANPAS rule
- `apps/dashboard/src/app/(auth)/setup/page.tsx` (625 lines) — split into ANPAS-compliant sub-components:
  - `shared/setup-logo.tsx` (18L), `steps/method-step.tsx` (53L), `steps/domain-step.tsx` (146L), `steps/progress-step.tsx` (86L), `steps/done-step.tsx` (50L)
  - `steps/cloudflare-oauth-section.tsx` (84L), `steps/password-fields.tsx` (42L), `steps/auth-method-badge.tsx` (23L), `steps/cloudflare-token-field.tsx` (22L), `steps/admin-email-field.tsx` (22L), `steps/platform-name-field.tsx` (21L)
  - `hooks/use-setup-sse.ts` (71L), `hooks/use-domain-validation.ts` (44L), `hooks/use-configure-submit.ts` (48L), `hooks/use-setup-discovery.ts` (27L)
  - `page.tsx` is now a 146-line thin shell that orchestrates step components
  - All files under 150 lines per ANPAS rule
