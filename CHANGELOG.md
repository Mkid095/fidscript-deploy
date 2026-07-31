# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Changed

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

- Initial ANPAS bootstrap — 2026-07-30
