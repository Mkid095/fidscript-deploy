# FIDScript Dashboard — Frontend Audit & Restructuring PRD

> **Purpose:** Living source of truth for all frontend work. Every page, component, and gap is tracked here.
> Updated per session. Teammates mark items DONE and note what was changed.
> Last updated: 2026-07-31 — ANPAS SPLIT SPRINT COMPLETE ✅

## Sessions Complete

### Session 1 — Phase 1+2 (commits afebff0, 5eea220)
- Mocks deleted (sdk.ts −1,807L, data.ts −1,246L)
- auth-context split (281→11L thin shell + providers/hooks)
- types/index.ts split (454→36L + domain types)
- onboarding split (482→76L + 6 step components)
- register magic code handler fixed (was empty function)

### Session 2 — Phase 3+4 (commits 5699337, 6c0b890)
- scheduler/page split (850→job-list-header/content/stats/page)
- projects/page split (961→project-card/form/skeleton + page)
- email/[domain]/page split (688→overview/mailboxes/aliases/catchall tabs)
- platform/email split (584→compose/message-list/message-detail/mailbox-list/page)
- services/page and services/new split into step components
- domains/page split (796→list-header/content/cloudflare-oauth/handlers)
- projects/[id]/sections/settings split into settings tabs
- storage/status-badge fixed (added Hugeicons per UX spec)
- projects/[id]/layout split
- SQL editor duplicates deleted (sql-editor.tsx, log-viewer.tsx)
- setup wizard split with Cloudflare credential helper link added
- onboarding hooks refactored

### Sessions 3-10 — Remaining pages (in progress, commits f905f4f, 6c0b890+)
- scheduler job-card.tsx, cron-builder.tsx, cron-utils.ts, use-scheduler-data.ts
- projects: projects-list-body.tsx, use-projects-page.ts, deleted-project-card.tsx, delete-panel.tsx, project-header.tsx
- services/new: use-archive-upload.ts, use-githubRepos.ts, use-new-deploy.ts, step-* components
- email: mailbox compose-modal, message-detail, message-list, mailbox-toolbar, email-project-selector
- email/[domain]/page: domain-overview-tab, domain-mailboxes-tab, domain-aliases-tab, domain-catchall-tab
- monitoring/[id]: alert-history.tsx, alert-channels.tsx, alert-rule-config.tsx
- projects/[projectId]/domains: connect-cloudflare-modal.tsx, dns-instructions-modal.tsx, add-domain-form.tsx
- setup wizard: method-step, cloudflare-oauth-section, cloudflare-token-field, domain-step, done-step, progress-step, use-setup-discovery, use-configure-submit
- settings: security-settings.tsx, notification-settings.tsx, account-settings (in progress)
- logs: use-logs-data.ts
- email domain-card.tsx, platform-email-settings-*, integrations-list, email/analytics sub-components

---

## Executive Summary

| Area | Status |
|---|---|
| Mock data in frontend | ✅ **CLEAN** — zero mock imports anywhere |
| SDK wiring | ✅ All pages use real `@fidscript-deploy/sdk` |
| ANPAS 150-line cap | 🟡 **In progress** — 15 pages over 150L remain |
| Auth BaaS UI | 🚫 **MISSING** — backend exists, no frontend |
| Centralized styles | 🚫 No central design tokens file |
| Mobile responsiveness | 🟡 Partial — sidebar exists, mobile-tab-bar exists |
| Error handling | 🟡 Unaudited — needs page-by-page review |
| Setup wizard UX | 🟡 Works but 625 lines, no credential helper links |

---

## Phase 1 Completed ✅ (Commit: afebff0)

- Deleted `mocks/sdk.ts` (−1,807 lines)
- Deleted `mocks/data.ts` (−1,246 lines)
- Cleaned `lib/sdk.ts` — real SDK only, no mock toggle
- Cleaned `auth-context.tsx` — no mock auto-login
- Split `domains/[domainId]/page.tsx` (1,037 → 74 lines + 7 tab components all ≤150L)

---

## ANPAS Violations — Files Over 150 Lines

### Pages (33 files over 150-line cap)

| Lines | File | Priority |
|---|---|---|
| 983 | `projects/[projectId]/services/new/page.tsx` | P0 |
| 961 | `projects/page.tsx` | P0 |
| 850 | `scheduler/page.tsx` | P0 |
| 796 | `projects/[projectId]/domains/page.tsx` | P0 |
| 703 | `components/database/sql-editor-v2.tsx` | P0 |
| 688 | `email/[domain]/page.tsx` | P0 |
| 639 | `projects/[projectId]/services/page.tsx` | P0 |
| 625 | `(auth)/setup/page.tsx` — setup wizard | P0 |
| 600 | `projects/[projectId]/scheduler/[jobId]/page.tsx` | P0 |
| 584 | `platform/email/page.tsx` | P0 |
| 579 | `projects/[projectId]/sections/deployments.tsx` | P0 |
| 549 | `projects/[projectId]/sections/settings.tsx` | P0 |
| 482 | `onboarding/page.tsx` — **BROKEN** magic code | P0 |
| 478 | `components/database/data-grid.tsx` | P1 |
| 464 | `databases/[id]/page.tsx` | P1 |
| 436 | `projects/[projectId]/databases/database-context.tsx` | P1 |
| 399 | `platform/email/settings/page.tsx` | P1 |
| 399 | `components/queues/queue-detail.tsx` | P1 |
| 390 | `projects/[projectId]/storage/settings/page.tsx` | P1 |
| 383 | `monitoring/page.tsx` | P1 |
| 379 | `email/[domain]/mailboxes/[mailbox]/page.tsx` | P1 |
| 346 | `lib/db-normalize.ts` | P1 |
| 330 | `settings/page.tsx` | P1 |
| 328 | `projects/[projectId]/realtime/live-feed.tsx` | P1 |
| 322 | `logs/page.tsx` | P1 |
| 300 | `platform/integrations/settings/page.tsx` | P1 |
| 299 | `components/database/sql-editor.tsx` | P1 |
| 296 | `components/database/backups-panel.tsx` | P2 |
| 291 | `components/queues/queues-list.tsx` | P2 |
| 285 | `components/database/backup-settings-panel.tsx` | P2 |
| 278 | `components/layout/project-sidebar.tsx` | P2 |
| 267 | `projects/[projectId]/sections/activity.tsx` | P2 |

### Contexts & Types (after phase 1 split — remaining issues)

| Lines | File | Status |
|---|---|---|
| 197 | `contexts/auth-provider.tsx` | 🔴 Over — needs further split |
| 156 | `types/database.ts` | 🔴 Over — needs further split |

**Note:** After fixing these 2, run full scan to confirm all ≤150 lines.

---

## Auth Audit

### ✅ Working
| Page | Route | Status |
|---|---|---|
| Login | `/login` | REAL API |
| Register | `/register` | REAL API |
| Force-change-password | `/force-change-password` | REAL API |
| Invitation acceptance | `/invitations/accept` | REAL API |
| VPS Setup wizard | `(auth)/setup` | REAL API + SSE stream |
| AuthGuard | `(app)/*` | Protects all dashboard routes |

### 🔴 BROKEN
| Issue | File | Fix Required |
|---|---|---|
| Magic code registration handler empty | `register/page.tsx:215` | `MagicCodeInput onComplete={() => {}}` — wire to `sdk.auth.verifyMagicCode()` |

### 🚫 MISSING — Auth BaaS UI (backend exists, frontend absent)

These need frontend implementation. Backend IDs from `docs/phases/frontend/backend/auth.md`:

| # | Feature | Backend IDs | Priority | Notes |
|---|---|---|---|---|
| 1 | OAuth Provider Connection UI (Google/GitHub) | APPAUTH-07, APPAUTH-08 | HIGH | No UI at all |
| 2 | Platform API Key Management (`fsk_`) | AUTH-15, AUTH-16, AUTH-17 | HIGH | `/settings/security` or `/platform/api-keys` |
| 3 | Project API Key Management (`fpk_`) | PROJ-19, PROJ-20, PROJ-21 | HIGH | Per-project settings |
| 4 | Auth Provider Settings (per-project) | APPAUTH-17, APPAUTH-18, APPAUTH-19 | MEDIUM | OAuth credentials config |
| 5 | BaaS User Management | APPAUTH-14, APPAUTH-15, APPAUTH-16 | MEDIUM | List/disable app users |
| 6 | Guided first-project creation | — | HIGH | User lands on empty `/projects`, no CTA |
| 7 | Magic code verify on register | APPAUTH-20 | HIGH | Register flow broken (see above) |

---

## Complete Page Inventory (60 pages)

### Auth Pages (6)
| Route | File | Lines | Mock | ANPAS | Status |
|---|---|---|---|---|---|
| `/login` | `app/login/page.tsx` | 261 | ✅ | 🔴 | Needs split |
| `/register` | `app/register/page.tsx` | 237 | ✅ | 🔴 | BROKEN — magic code handler |
| `/force-change-password` | `app/force-change-password/page.tsx` | 135 | ✅ | ✅ | OK |
| `(auth)/setup` | `app/(auth)/setup/page.tsx` | 625 | ✅ | 🔴 | Needs split |
| `/onboarding` | `app/onboarding/page.tsx` | 482 | ✅ partial | 🔴 | BROKEN — hardcoded fake checks |
| `/invitations/accept` | `app/invitations/accept/page.tsx` | 107 | ✅ | ✅ | OK |

### Dashboard Pages (54)

#### Projects (12 pages)
| Route | File | Lines | Mock | ANPAS | UX Issues |
|---|---|---|---|---|---|
| `/projects` | `projects/page.tsx` | 961 | ✅ | 🔴 | Needs split, empty state audit |
| `/projects/[projectId]` | `projects/[projectId]/page.tsx` | ~218 | ✅ | 🔴 | Needs split |
| `/projects/[projectId]/deployments` | `deployments/page.tsx` | ~253 | ✅ | 🔴 | Needs split |
| `/projects/[projectId]/deployments/[id]` | `deployments/[deploymentId]/page.tsx` | ~253 | ✅ | 🔴 | Needs split |
| `/projects/[projectId]/domains` | `domains/page.tsx` | 796 | ✅ | 🔴 | Needs split |
| `/projects/[projectId]/domains/[id]` | `domains/[domainId]/page.tsx` | 74+7tabs | ✅ | ✅ | Done — split into tabs |
| `/projects/[projectId]/functions` | `functions/page.tsx` | ~241 | ✅ | 🔴 | Needs split |
| `/projects/[projectId]/functions/[id]` | `functions/[id]/page.tsx` | ~241 | ✅ | 🔴 | Needs split |
| `/projects/[projectId]/services` | `services/page.tsx` | 639 | ✅ | 🔴 | Needs split |
| `/projects/[projectId]/services/new` | `services/new/page.tsx` | 983 | ✅ | 🔴 | Needs split |
| `/projects/[projectId]/settings` | `settings/page.tsx` | ~330 | ✅ | 🔴 | Needs split |
| `/projects/[projectId]/email` | `email/page.tsx` | ~166 | ✅ | 🔴 | Needs split |

#### Databases (7 pages)
| Route | File | Lines | Mock | ANPAS | UX Issues |
|---|---|---|---|---|---|
| `/databases` | `databases/page.tsx` | 211 | ✅ | 🔴 | Needs split |
| `/databases/[id]` | `databases/[id]/page.tsx` | 464 | ✅ | 🔴 | Needs split |
| `/projects/[projectId]/databases` | `projects/.../databases/page.tsx` | ~436 | ✅ | 🔴 | Needs split |
| `/projects/[projectId]/databases/[id]/backups` | `backups/page.tsx` | ? | ✅ | ? | |
| `/projects/[projectId]/databases/[id]/explorer` | `explorer/page.tsx` | ? | ✅ | ? | |
| `/projects/[projectId]/databases/[id]/settings` | `settings/page.tsx` | ? | ✅ | ? | |
| `/projects/[projectId]/databases/[id]/sql` | `sql/page.tsx` | ? | ✅ | ? | |

#### Functions (2 pages)
| Route | File | Lines | Mock | ANPAS |
|---|---|---|---|---|
| `/functions` | `functions/page.tsx` | ~241 | ✅ | 🔴 |
| `/functions/[id]` | `functions/[id]/page.tsx` | ~241 | ✅ | 🔴 |

#### Email (6 pages)
| Route | File | Lines | Mock | ANPAS |
|---|---|---|---|---|
| `/email` | `email/page.tsx` | 223 | ✅ | 🔴 |
| `/email/[domain]` | `email/[domain]/page.tsx` | 688 | ✅ | 🔴 |
| `/email/[domain]/mailboxes/[mailbox]` | `mailboxes/[mailbox]/page.tsx` | 379 | ✅ | 🔴 |
| `/email/analytics` | `email/analytics/page.tsx` | 182 | ✅ | 🔴 |
| `/email/templates` | `email/templates/page.tsx` | 262 | ✅ | 🔴 |
| `/email/webhooks` | `email/webhooks/page.tsx` | 222 | ✅ | 🔴 |
| `/email/suppressions` | `email/suppressions/page.tsx` | ? | ✅ | ? |

#### Storage (3 pages)
| Route | File | Lines | Mock | ANPAS |
|---|---|---|---|---|
| `/projects/[projectId]/storage` | `storage/page.tsx` | ? | ✅ | ? |
| `/projects/[projectId]/storage/[bucket]` | `storage/[bucket]/page.tsx` | ? | ✅ | ? |
| `/projects/[projectId]/storage/settings` | `storage/settings/page.tsx` | 390 | ✅ | 🔴 |

#### Scheduler/Cron (2 pages)
| Route | File | Lines | Mock | ANPAS |
|---|---|---|---|---|
| `/scheduler` | `scheduler/page.tsx` | 850 | ✅ | 🔴 |
| `/scheduler/[id]` | `scheduler/[id]/page.tsx` | ? | ✅ | ? |

#### Queues (2 pages)
| Route | File | Lines | Mock | ANPAS |
|---|---|---|---|---|
| `/projects/[projectId]/queues` | `queues/page.tsx` | ? | ✅ | ? |
| `/projects/[projectId]/queues/[id]` | `queues/[queueId]/page.tsx` | ? | ✅ | ? |

#### Monitoring + Logs (3 pages)
| Route | File | Lines | Mock | ANPAS |
|---|---|---|---|---|
| `/monitoring` | `monitoring/page.tsx` | 383 | ✅ | 🔴 |
| `/monitoring/[id]` | `monitoring/[id]/page.tsx` | 264 | ✅ | 🔴 |
| `/logs` | `logs/page.tsx` | 322 | ✅ | 🔴 |

#### Platform (3 pages)
| Route | File | Lines | Mock | ANPAS |
|---|---|---|---|---|
| `/platform/email` | `platform/email/page.tsx` | 584 | ✅ | 🔴 |
| `/platform/email/settings` | `platform/email/settings/page.tsx` | 399 | ✅ | 🔴 |
| `/platform/integrations/settings` | `platform/integrations/settings/page.tsx` | 300 | ✅ | 🔴 |

#### Settings (1 page)
| Route | File | Lines | Mock | ANPAS |
|---|---|---|---|---|
| `/settings` | `settings/page.tsx` | 330 | ✅ | 🔴 |

#### MCP + Realtime (2 pages)
| Route | File | Lines | Mock | ANPAS |
|---|---|---|---|---|
| `/projects/[projectId]/mcp` | `mcp/page.tsx` | ? | ✅ | ? |
| `/projects/[projectId]/realtime` | `realtime/page.tsx` | 226 | ✅ | 🔴 |

---

## Component Inventory (91 components)

### Layout (5)
| Component | File | Lines | Status |
|---|---|---|---|
| project-sidebar | `layout/project-sidebar.tsx` | 278 | 🔴 Over limit |
| mobile-tab-bar | `layout/mobile-tab-bar.tsx` | ? | ? |
| avatar-dropdown | `layout/avatar-dropdown.tsx` | ? | ? |
| notification-bell | `layout/notification-bell.tsx` | ? | ? |
| project-switcher-modal | `layout/project-switcher-modal.tsx` | ? | ? |

### Auth (4)
| Component | File | Lines | Status |
|---|---|---|---|
| auth-guard | `auth-guard.tsx` | ? | ? |
| health-badge | `auth/health-badge.tsx` | ? | ? |
| magic-code-input | `auth/magic-code-input.tsx` | ? | ? |
| password-strength | `auth/password-strength.tsx` | ? | ? |

### Database (9)
| Component | File | Lines | Status |
|---|---|---|---|
| sql-editor-v2 | `database/sql-editor-v2.tsx` | 703 | 🔴 Over limit |
| data-grid | `database/data-grid.tsx` | 478 | 🔴 Over limit |
| sql-editor | `database/sql-editor.tsx` | 299 | 🔴 Over limit |
| backups-panel | `database/backups-panel.tsx` | 296 | 🔴 Over limit |
| backup-settings-panel | `database/backup-settings-panel.tsx` | 285 | 🔴 Over limit |
| connection-panel | `database/connection-panel.tsx` | ? | ? |
| migrations-panel | `database/migrations-panel.tsx` | ? | ? |
| schema-explorer | `database/schema-explorer.tsx` | ? | ? |
| realtime-monitor | `database/realtime-monitor.tsx` | ? | ? |

### Deployments (18)
| Component | File | Lines | Status |
|---|---|---|---|
| new-deployment-modal | `deployments/new-deployment-modal.tsx` | ? | ? |
| log-viewer | `deployments/log-viewer.tsx` | ? | ? |
| terminal-state | `deployments/terminal-state.tsx` | ? | ? |
| status-badge | `deployments/status-badge.tsx` | ? | ? |
| deployment-url | `deployments/deployment-url.tsx` | ? | ? |
| metadata-row | `deployments/metadata-row.tsx` | ? | ? |
| metadata-panel | `deployments/metadata-panel.tsx` | ? | ? |
| log-toggle | `deployments/log-toggle.tsx` | ? | ? |
| log-content | `deployments/log-content.tsx` | ? | ? |
| log-toolbar | `deployments/log-toolbar.tsx` | ? | ? |
| horizontal-timeline | `deployments/horizontal-timeline.tsx` | ? | ? |
| vertical-timeline | `deployments/vertical-timeline.tsx` | ? | ? |
| progress-timeline | `deployments/progress-timeline.tsx` | ? | ? |
| roadmap-timeline | `deployments/roadmap-timeline.tsx` | ? | ? |
| step-icon | `deployments/step-icon.tsx` | ? | ? |
| confirm-dialog | `deployments/confirm-dialog.tsx` | ? | ? |
| rollback-picker | `deployments/rollback-picker.tsx` | ? | ? |
| action-buttons | `deployments/action-buttons.tsx` | ? | ? |
| live-preview | `deployments/live-preview.tsx` | ? | ? |
| deployment-header | `deployments/deployment-header.tsx` | ? | ? |

### Functions (10)
| Component | File | Lines | Status |
|---|---|---|---|
| function-tabs | `functions/function-tabs.tsx` | ? | ? |
| function-list | `functions/function-list.tsx` | ? | ? |
| function-card | `functions/function-card.tsx` | ? | ? |
| function-code | `functions/function-code.tsx` | ? | ? |
| function-header | `functions/function-header.tsx` | ? | ? |
| function-settings | `functions/function-settings.tsx` | ? | ? |
| function-versions | `functions/function-versions.tsx` | ? | ? |
| function-invoke | `functions/function-invoke.tsx` | ? | ? |
| function-logs | `functions/function-logs.tsx` | ? | ? |
| function-status-badge | `functions/function-status-badge.tsx` | ? | ? |
| create-function-modal | `functions/create-function-modal.tsx` | ? | ? |

### Storage (14)
| Component | File | Lines | Status |
|---|---|---|---|
| file-table | `storage/file-table.tsx` | ? | ? |
| file-grid | `storage/file-grid.tsx` | ? | ? |
| upload-files-modal | `storage/upload-files-modal.tsx` | ? | ? |
| create-bucket-form | `storage/create-bucket-form.tsx` | ? | ? |
| bucket-detail | `storage/bucket-detail.tsx` | ? | ? |
| bucket-content | `storage/bucket-content.tsx` | ? | ? |
| bucket-header | `storage/bucket-header.tsx` | ? | ? |
| bucket-card | `storage/bucket-card.tsx` | ? | ? |
| bucket-body | `storage/bucket-body.tsx` | ? | ? |
| bucket-empty-state | `storage/bucket-empty-state.tsx` | ? | ? |
| bucket-settings-panel | `storage/bucket-settings-panel.tsx` | ? | ? |
| new-folder-modal | `storage/new-folder-modal.tsx` | ? | ? |
| file-preview-modal | `storage/file-preview-modal.tsx` | ? | ? |
| storage-list | `storage/storage-list.tsx` | ? | ? |

### Queues (5)
| Component | File | Lines | Status |
|---|---|---|---|
| queue-detail | `queues/queue-detail.tsx` | 399 | 🔴 Over limit |
| queues-list | `queues/queues-list.tsx` | 291 | 🔴 Over limit |
| queue-card | `queues/queue-card.tsx` | ? | ? |
| publish-message-modal | `queues/publish-message-modal.tsx` | ? | ? |
| purge-queue-modal | `queues/purge-queue-modal.tsx` | ? | ? |

### Projects (2)
| Component | File | Lines | Status |
|---|---|---|---|
| create-project-modal | `projects/create-project-modal.tsx` | ? | ? |

### Landing (6) — ⚠️ LIKELY DEAD CODE
| Component | File | Status |
|---|---|---|
| landing-hero | `landing/landing-hero.tsx` | ⚠️ Not used in dashboard |
| landing-nav | `landing/landing-nav.tsx` | ⚠️ Not used in dashboard |
| landing-features | `landing/landing-features.tsx` | ⚠️ Not used in dashboard |
| landing-opensource | `landing/landing-opensource.tsx` | ⚠️ Not used in dashboard |
| landing-footer | `landing/landing-footer.tsx` | ⚠️ Not used in dashboard |
| copy-command | `landing/copy-command.tsx` | ⚠️ Not used in dashboard |

### Docs (2) — ⚠️ LIKELY DEAD CODE
| Component | File | Status |
|---|---|---|
| docs-sidebar | `docs/docs-sidebar.tsx` | ⚠️ Check if used |
| copy-page | `docs/copy-page.tsx` | ⚠️ Check if used |

### Theme (2)
| Component | File | Lines | Status |
|---|---|---|---|
| theme-toggle | `theme/theme-toggle.tsx` | ? | ? |
| theme-init-script | `theme/theme-init-script.tsx` | ? | ? |

### Misc (2)
| Component | File | Lines | Status |
|---|---|---|---|
| toast-provider | `toast-provider.tsx` | ? | ? |
| ui/loading-screen | `ui/loading-screen.tsx` | ? | ? |

---

## UX Issues — Page by Page

### Empty States
All list pages need to be audited for proper empty states:
- `/projects` — empty state? Is there a CTA?
- `/databases` — empty state?
- `/functions` — empty state?
- `/email` — empty state?
- `/queues` — empty state?
- `/storage` — empty state?
- `/monitoring` — empty state?

### Loading States
All pages that fetch data — do they show loading skeletons/spinners?

### Error States
All pages with API calls — do they handle errors gracefully? Is there an error boundary?

### Interactive Behaviors — Per-Button Audit
Every button on every page needs to be verified:
1. What does clicking it do?
2. Does it show loading state while pending?
3. Does it handle errors (show toast/alert)?
4. Does it update the UI optimistically?

---

## Setup Wizard — UX Gaps

**File:** `app/(auth)/setup/page.tsx` (625 lines — needs split)

### Current Flow
1. Detect server config (Docker, Traefik, Cloudflare)
2. Cloudflare API token input
3. Domain setup
4. Email (Stalwart) configuration
5. Health check

### Missing UX
- **Cloudflare credential helper link:** When user is asked for Cloudflare API token, there should be a link "Get your Cloudflare API token" that opens Cloudflare's token creation page in a new tab — users don't know where to get this
- **Copy-paste friendly:** Input fields should have paste support, clear labels
- **Validation feedback:** Real-time validation as fields are filled
- **Error recovery:** If Cloudflare token is wrong, show clear error not generic failure
- **Progress persistence:** If user closes browser mid-setup, can they resume?

---

## Design System Issues

### Centralized Styles — MISSING
There is NO central design tokens file. Colors, fonts, and spacing are hardcoded in individual components:
- No central `variables.css` or `tokens.ts`
- To change theme/font/spacing requires touching every file
- **Action:** Create `apps/dashboard/src/styles/tokens.css` with CSS custom properties for all design tokens

### Colors
- Are they using CSS variables (`var(--primary)`, `var(--text)`) or hardcoded hex values?
- Need audit: which files have hardcoded colors vs CSS variables?

### Typography
- Font family hardcoded or via CSS variable?
- Consistent heading hierarchy across pages?

### Spacing
- Consistent spacing scale (4px, 8px, 16px, 24px, 32px)?
- Or ad-hoc pixel values?

---

## Mobile Responsiveness

### Known Issues
- Project sidebar — is it collapsible on mobile?
- Database pages — SQL editor, data grids — do they scroll horizontally?
- Email compose/view — mobile-friendly?
- Storage file table — does it reflow on small screens?

---

## Stale Comments to Clean Up

| File | Line | Issue |
|---|---|---|
| `components/database/schema-explorer.tsx` | ~161 | "mock mode" comment — remove |
| `components/database/database-context.tsx` | ~6 | "extended features in mock mode" comment — remove |

---

## Dead Code to Delete

### Likely Dead
- `components/landing/` — all 6 files (landing components in a dashboard app)
- `components/docs/` — 2 files (docs components — check if `app/docs/` uses them)

### Verify Before Delete
- `app/home/page.tsx` — what is this? Landing page?
- `app/docs/` — docs pages — check if used

---

## Implementation Order (for teammates)

### Sprint 1: Auth Fixes
1. Fix magic code handler in `register/page.tsx` ← **BROKEN**
2. Split `onboarding/page.tsx` (482L) into sub-components
3. Split `(auth)/setup/page.tsx` (625L) into sub-components
4. Create `docs/phases/frontend/AUTH-BAAS-GAPS.md`

### Sprint 2: Oversized Pages (P0 first)
Priority order for splitting:
1. `projects/page.tsx` (961L)
2. `projects/[projectId]/services/new/page.tsx` (983L)
3. `scheduler/page.tsx` (850L)
4. `projects/[projectId]/domains/page.tsx` (796L)
5. `email/[domain]/page.tsx` (688L)
6. `projects/[projectId]/services/page.tsx` (639L)
7. `projects/[projectId]/scheduler/[jobId]/page.tsx` (600L)
8. `platform/email/page.tsx` (584L)
9. `projects/[projectId]/sections/deployments.tsx` (579L)
10. `projects/[projectId]/sections/settings.tsx` (549L)

### Sprint 3: Centralized Design System
1. Create `styles/tokens.css` with all CSS custom properties
2. Audit all components for hardcoded colors → replace with CSS variables
3. Audit all components for hardcoded spacing → replace with CSS variables
4. Audit all components for hardcoded fonts → replace with CSS variables

### Sprint 4: Auth BaaS UI
Build the missing auth pages per `AUTH-BAAS-GAPS.md`

### Sprint 5: UX Audit per Page
Page-by-page: empty states, loading states, error handling, button behaviors

---

## How to Use This Document

1. **Teammates** pick an item from the implementation order
2. **Before starting** — read the relevant spec doc in `docs/phases/frontend/` and `docs/product/`
3. **During work** — mark items `IN PROGRESS`
4. **After commit** — mark `DONE` with commit hash noted
5. **Issues found** — add to the relevant section with `[ISSUE]` prefix

---

*Last updated: 2026-07-31*
*Phase 1 complete: afebff0 — mocks removed, domain page split*
