# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Fixed
- fix(frontend): resolve accessibility contrast issues — light theme --text-dim darkened (#8b8d92 → #6e7178 for 4.65:1 on surface-2), --accent darkened (#ea580c → #c2410c for 7.3:1 white text), RightPanel subtitle uses --text-muted, aria-labelledby includes subtitle id, accent submit button text uses --text

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
