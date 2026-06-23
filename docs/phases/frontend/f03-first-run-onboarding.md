# F03 — First-Run Onboarding (as-built spec)

> **Status:** ✅ Implemented (2026-06-23). **Connects to:** backend Phase 01 (`SVC-*` health) and
> `installation/*` (INSTALL-01..INSTALL-05). Two entry-point routes exist: `/onboarding` (installer-initiated)
> and `/setup` (middleware-gated fallback).

## 1. Purpose

Two separate installation-entry routes exist in the as-built codebase, serving different entry contexts:

- **`/onboarding`** — the installer (`setup-wizard.sh`) calls this directly after provisioning the server.
  The user arrives here already authenticated as root or via the server's own session.
- **`/setup`** — middleware-gated: any request to a dashboard route when `lifecycle !== CONFIGURED`
  redirects here. Acts as a safety net for any path that bypasses `/onboarding`.

Both routes use the **same backend API** (`/api/v1/installation/*`) and produce the same outcome.
Having two avoids a hard redirect loop and lets the installer own the URL it navigates to.

## 2. Business Goal

Get the platform to `lifecycle=CONFIGURED` in the minimum number of steps. The philosophy is
**Configure Once**: only the fields that block deployment are asked up front; everything else lives
in Settings. Certificate issuance is async — it does not block the "platform ready" state.

## 3. User Personas

- **Installer / root user** — lands on `/onboarding` from the setup wizard script; has the admin email
  and domain already known; wants to confirm and proceed.
- **First visitor (unauthenticated)** — middleware redirects them to `/setup`; they fill in domain,
  email, and choose an auth method.

## 4. Complete User Journey

```
Server provisioned → setup-wizard.sh runs → calls /api/v1/installation/discover
  → lifecycle=UNCONFIGURED → wizard navigates to https://<server-ip>/onboarding

User lands on /onboarding:
  welcome screen → [Create a new platform] → discovery auto-runs
    → pre-fills serverIp + adminEmail (if found)
    → show discovery checklist (server/Docker/Traefik/cert status)
    → [Continue] → configure screen
      → platform name + domain (debounced API validation) + admin email
      → [Configure platform] → progress screen
        → POST /api/v1/installation/configure → SSE stream
        → lifecycle transitions UNCONFIGURED → CONFIGURING → CONFIGURED
        → on COMPLETED → cookie fidscript_onboarded=1 set
        → [Go to login]

Middleware redirect path (fallback):
  any /dashboard/* when lifecycle != CONFIGURED
    → redirect to /setup
    → same configure flow as above
    → on CONFIGURED → /setup redirects to /login (lifecycle check on mount)
```

## 5. Information Architecture

Both screens live outside the `(app)` shell — no sidebar, no auth required (the platform is not
configured yet so there is no session to have).

**Route map:**

| Route | Auth required | Middleware-gated | Entry point |
|---|---|---|---|
| `/onboarding` | No | No (always accessible) | Installer script |
| `/setup` | No | No (always accessible) | Middleware redirect |

## 6. Screen Specifications

### `/onboarding` — 5 screens (wizard)

**Welcome screen** (`welcome` step):
- Full-screen centered card on `bg-ink-950`
- Logo + "FIDScript" + "Self-hosted deployment platform" subtitle
- Single CTA: "Create a new platform" (primary button, full-width)
- Footer: "Need help? View the docs" link

**Discovery screen** (`discovery` step):
- Auto-runs `GET /api/v1/installation/discover` on mount
- Shows 5 health rows (HealthRow component): Server IP, Docker available, Cloudflare token,
  Traefik configured, SSL certificate
- Each row: label + ok/null/false dot indicator (grey/green/red)
- Manual IP entry shown only when auto-detect fails (serverIp === '0.0.0.0')
- "Continue" enabled when all checks pass (or serverIp resolved via manual entry)
- Retry button on discovery failure

**Configure screen** (`configure` step):
- Platform name (default: "FIDScript Deploy")
- Platform domain: debounced API validation (`GET /api/v1/installation/validate?platformDomain=`)
  - While validating: "checking…" in yellow
  - Valid: green ✓ + "Looks good"
  - Invalid: red error message
- Administrator email (pre-filled from discovery)
- All fields validate inline; Configure button enabled when all valid

**Progress screen** (`progress` step):
- Full-screen, no navigation possible
- SSE stream from `GET /api/v1/installation/operations/{id}/stream`
- Log list: each step appends `○ <step-name>` on start, `✓ <step-name>` on complete
- Failed step: `✗ <reason>` in red
- Certificate step shows `certPending=true` on COMPLETED (SSL provisioning is async)

**Complete screen** (`complete` step):
- Centered card: green checkmark, "Platform configured"
- If cert pending: yellow banner "SSL certificate is being provisioned — usually takes under 2 minutes"
- [Go to login] → sets `fidscript_onboarded=1` cookie → navigates to `/login`

### `/setup` — 4 screens (method-selection wizard)

**Auth method selection** (`method` step):
- Logo + "Platform Setup" heading
- Two cards side-by-side: Magic Code (recommended) | Email + Password
- Hugeicons icons (Mail01Icon / LockPasswordIcon)
- Click either → advance to domain step

**Domain & credentials form** (`domain` step):
- Back button (returns to method selection)
- Auth method badge (shown in corner)
- Fields: Platform Name, Platform Domain (with inline debounced validation), Cloudflare API Token (optional),
  Admin Email, Admin Password + Confirm Password (only when authMethod === PASSWORD)
- Inline domain validation same as `/onboarding`
- [Configure Platform] → progress step

**Progress screen** (`progress` step):
- Same SSE stream as `/onboarding`
- Step list with spinner/checkmark/error indicators per step
- Error state: "Configuration failed" message + [Run setup again] button

**Done screen** (`done` step):
- Same as `/onboarding` complete
- "Visit your dashboard" → navigates to `https://{domain}` (or IP-based URL)

## 7. Component Specifications

- **`HealthRow`** — props `{ label, detail?, ok: boolean | null }`; renders a row with a coloured dot
  (grey=pending, green=ok, red=fail). Used on `/onboarding` discovery step.
- **`DiscoveryChecklist`** — renders array of `HealthRow` for the discovery result. Handles loading
  state (all dots grey) and error state (all dots red).
- **`SetupWizard`** (logic only, not a separate component) — local state machine in the page file
  managing `method → domain → progress → done` transitions.
- **`DomainField`** — inline-validated domain input; states: idle, validating (yellow), valid (green),
  invalid (red error text). AbortController cancels in-flight requests on re-type.

## 8. API Mapping (cross-ref `backend/installation.md`)

| Screen/Action | Endpoint | Method | Body | On success | On error |
|---|---|---|---|---|---|
| Discovery | `INSTALL-02` `/installation/discover` | GET | — | pre-fill form | non-fatal |
| Domain validation | `INSTALL-04` `/installation/validate` | GET | query: `platformDomain` | green ✓ | red error |
| Configure | `INSTALL-05` `/installation/configure` | POST | `ConfigureInstallationDto` | `{operationId}` | 400 |
| Progress stream | `INSTALL-06` `/installation/operations/:id/stream` | GET (SSE) | — | event stream | — |
| Lifecycle status | `INSTALL-01` `/installation/status` | GET | — | `{lifecycle}` | — |

**Loading states:** discovery shows skeleton rows; progress shows spinner. **Caching:** lifecycle
cached in-memory for 8s in middleware (survives Next.js HMR). **Retry:** discovery has explicit
Retry button; configure failure has "Run setup again". **Offline:** discovery fails gracefully with
"Unable to contact installation service" banner.

## 9. Backend Integration Map

```
GET /installation/discover → InstallationOrchestratorService.discover()
  → checks: serverIp (config), adminEmail (DB query), lifecycle (InstallationStatus),
    cfFromEnv (CLOUDFLARE_API_TOKEN_FILE env), dockerAvailable (always true in container),
    traefikConfigured (always true), existingCertificateFound (lifecycle === CONFIGURED)

POST /installation/configure → InstallationOrchestratorService.configure()
  → acquires Redis lock → transaction: create InstallationOperation + transition lifecycle
  → runSteps(): dns → proxy → certificate (async) → email → health
  → transaction: upsert InstallationSettings + createInstallationSettingsVersion + update lifecycle
  → emit events: installation.lifecycle.* (picked up by RealtimeBridgeService)

SSE /installation/operations/{id}/stream → InstallationOrchestratorService.streamProgress()
  → polls InstallationOperation every 500ms → yields {status, currentStep, steps, failureReason}
  → until COMPLETED/FAILED/10min-timeout
```

## 10. User Experience Specification

**Discovery:** auto-runs once on mount; user sees dots flicker from grey to green as checks resolve.
If serverIp is '0.0.0.0', the manual IP field appears and the "Server IP" row shows a warning detail.
**Configure:** domain field validates with 500ms debounce; Configure button stays disabled while
validating. Cloudflare token is optional — if omitted, DNS step uses manual mode. **Progress:**
certificate step shows `pending: true`; the COMPLETED response sets `certPending=true` and the
complete screen shows a yellow banner. **Navigation guards:** progress screen has no back button;
configure screen has back button to method selection. **Cookie:** `fidscript_onboarded=1` is set
on success and checked on the `/onboarding` mount to redirect already-onboarded users to `/login`.

## 11. Design Philosophy

Minimal, professional, fast. The installer script owns the URL the user first sees — the UI should
feel like a natural continuation of the server setup, not a marketing page. Two separate routes
avoid circular redirects and let the installer own its entry point. Certificate async UX is
honest: we tell the user it takes 30–90s and show a banner until it's ready.

## 12. Configuration Philosophy

Only three things block a deployment:

1. **Domain** — the DNS name the platform serves at; Traefik routes based on this.
2. **Admin email** — the initial owner account; also the from-address for platform-generated mail.
3. **Auth method** — PASSWORD or MAGIC_CODE for the admin's first login.

Cloudflare token is optional (manual DNS if absent). Everything else (timezone, update channel,
telemetry, backups) lives in Settings.

## 13. Automation Rules

- **Installer script** (`setup-wizard.sh`) calls `/onboarding` directly after provisioning.
- **Middleware** redirects all non-API requests to `/setup` when `lifecycle !== CONFIGURED`.
- **`fidscript_onboarded` cookie** prevents re-entry to `/onboarding` for returning users.
- **Redis lock** (`installation:orchestrate`) prevents concurrent configure calls.
- **Certificate step is async** — does not block the COMPLETED response; polling via Traefik ACME
  state is outside the scope of this screen.

## 14. Backend Prerequisites

None beyond what is already verified (Phase 01). The `InstallationOrchestratorService` and
`InstallationController` are complete and tested. No new endpoints needed.

## 15. Dependencies

- F02 (Authentication) — required because the admin logs in after onboarding.
- Phase 01 (Installer) — the `setup-wizard.sh` script navigates to `/onboarding`.

## 16. Acceptance Criteria (from implementation)

- [x] `/onboarding` welcome → discovery → configure → progress → complete flow works end-to-end
- [x] `/setup` method → domain → progress → done flow works end-to-end
- [x] Domain field validates with 500ms debounce against `GET /installation/validate`
- [x] CONFIGURED lifecycle: `/setup` redirects to `/login` on mount; `/onboarding` sets cookie and redirects
- [x] SSE progress stream renders step-by-step with spinner → checkmark/error states
- [x] `fidscript_onboarded=1` cookie prevents re-entry to `/onboarding`
- [x] Middleware passes `/setup` and `/onboarding` through without redirect
- [x] Already-onboarded visitor to `/onboarding` redirected to `/login`
- [x] Magic Code / Password method selection works and persists through the wizard
- [x] Inline domain validation shows yellow "checking…" → green ✓ or red error message
