# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

- ANPAS project structure initialized (`.ai/` layer, docs/decisions/, CHANGELOG.md)
- `docs/decisions/ADR-template.md` added

### Removed

- `apps/dashboard/src/mocks/sdk.ts` (1,807 lines) — deleted mock SDK, production now always uses real `@fidscript-deploy/sdk`
- `apps/dashboard/src/mocks/data.ts` (1,246 lines) — deleted all mock data

### Changed

- `apps/dashboard/src/lib/sdk.ts` — removed `USE_MOCK`, `IS_MOCK_MODE`, `createMockSdk` import; `makeSdk()` now always returns real SDK with `baseURL: API_BASE_URL` and `onUnauthorized: refreshAccessToken`
- `apps/dashboard/src/contexts/auth-context.tsx` — removed `IS_MOCK_MODE` and `mockUser`; session restore now only uses real auth flow (localStorage tokens -> `sdk.auth.me()` -> refresh on failure)
- `apps/dashboard/src/app/(app)/projects/[projectId]/domains/[domainId]/page.tsx` — removed mock type/data imports; `wizard` and `repairs` tabs now show "not yet available" placeholder (no real backend API exists for these features)
- `apps/dashboard/src/app/(app)/projects/[projectId]/domains/[domainId]/` — split 1,037-line `page.tsx` into 7 sub-components (overview-tab, dns-tab, health-tab, email-tab, ssl-tab, wizard-tab, repairs-tab), each self-managing its own data fetching; page.tsx is now a 74-line thin shell

- Initial ANPAS bootstrap — 2026-07-30
