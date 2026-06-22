# F03 — First-Run Onboarding

> **Spec status:** draft
> **Backend inventory:** `docs/phases/frontend/backend/index.md`, `docs/phases/frontend/backend/auth.md`
> **Template:** `docs/phases/frontend/_template.md`

---

## §1. Purpose

The first-run onboarding wizard configures the platform for a new VPS installation. It runs once — after the installer completes — and is never shown again once the platform reaches `CONFIGURED` lifecycle.

Onboarding is a **configuration pass, not a usage pass**. It asks only for the minimum required to make the platform deployable: platform domain, server IP, and admin email. Everything else lives in Settings.

---

## §2. Goals

1. Configure the platform domain, IP, and administrative email
2. Run DNS, proxy, certificate, and email health checks in sequence
3. Surface the installation state transparently (async cert issuance shows a pending banner)
4. Redirect to `/login` immediately after `CONFIGURED` — no second screen
5. Never re-appear once the platform is configured

---

## §3. Entry Conditions

| Condition | Value |
|---|---|
| Route | `/onboarding` |
| Auth | None required |
| Lifecycle | `UNCONFIGURED` |
| Redirect | If `lifecycle !== UNCONFIGURED` → `/login` |

---

## §4. Exit Conditions

| Outcome | Destination |
|---|---|
| Success (all steps pass) | `/login` — `lifecycle = CONFIGURED` |
| Success (cert pending) | `/login` — banner shown in dashboard |
| Step failure | `/onboarding` — error shown inline, retry available |
| Already configured | `/login` — noop |

---

## §5. User Journey

### Screen 1 — Welcome

```
┌─────────────────────────────────────────────────────────────┐
│                        FIDScript                             │
│                                                              │
│              Create a new platform                           │
│                                                              │
│   ── or continue with an existing project ──                 │
│   (only shown if projects exist and user is authenticated)   │
│   ○ my-project    2 deployments                             │
│   ○ api-server    5 deployments                             │
└─────────────────────────────────────────────────────────────┘
```

- Authenticated users with existing projects see the project picker below the CTA.
- Unauthenticated users see only the primary CTA.
- No Restore, no Join Cluster on this screen.

### Screen 2 — Discovery (auto-runs)

```
Discovering your system…

✓  Server IP: 203.0.113.42  (auto-detected)
✓  Docker available
○  Existing installation
○  Cloudflare token
○  Traefik configuration
○  SSL certificate

[ Continue → ]
```

- Runs `GET /installation/discover` on mount.
- Each row updates as results arrive.
- `Continue` enabled when server IP is confirmed.

### Screen 3 — Configuration

```
Platform Name:   [FIDScript Deploy_______________]  ✓
Domain:          [deploy.example.com___________]   ✓  (valid domain)
Admin Email:     [admin@example.com___________]     ✓  (deliverable)

Fields validate inline as you type.

[← Back]                           [ Configure → ]
```

- `GET /installation/validate` called on each field change.
- Configure button enabled only when all fields are `valid: true`.
- Pre-populated from discovery results.

### Screen 4 — Progress

```
Configuring your platform…

✓  DNS records created
✓  Reverse proxy configured
✓  Email service restarted

○  Provisioning SSL certificate…   (async — does not block)
   Let's Encrypt contacted, challenge posted

[← Back]
```

- Verbose step log, one row per step.
- Steps 1–3 are synchronous; step 4 (cert) is async.
- Certificate row shows "Pending" but Continue is enabled after proxy step.
- SSE stream via `GET /installation/operations/:id/stream`.

### Screen 5 — Complete

```
✓  DNS configured
✓  Reverse proxy configured
✓  Email service configured
⏳  SSL certificate — provisioning…

Your platform is almost ready.

[→ Go to Login]
```

---

## §6. API Contract

### GET /installation/discover

Returns `DiscoveryResult` (no auth required):

```typescript
interface DiscoveryResult {
  serverIp: string;
  adminEmail: string | null;
  existingInstallation: {
    version: string | null;
    projectCount: number;
    userCount: number;
  } | null;
  suggestedAction: 'CREATE' | 'UPGRADE' | 'RESTORE' | 'JOIN';
  dockerAvailable: boolean;
  traefikConfigured: boolean;
  cloudflareTokenFound: boolean;
  existingCertificateFound: boolean;
}
```

**AUTH-01** — no auth required.

### GET /installation/status

Returns `InstallationStatus` (no auth required):

```typescript
interface InstallationStatus {
  lifecycle: 'UNCONFIGURED' | 'CONFIGURING' | 'CONFIGURED' | 'DEGRADED' | 'RECONFIGURING';
  lastOperationId: string | null;
}
```

**AUTH-01** — no auth required.

### GET /installation/validate

Validates a proposed configuration (no auth required):

```
GET /installation/validate?platformDomain=deploy.example.com&adminEmail=admin@example.com
```

```typescript
interface StepValidation {
  field: string;
  valid: boolean;
  issues: string[];
}
```

Returns `StepValidation[]`. **AUTH-01** — no auth required.

### POST /installation/configure

Starts the configuration operation (no auth required):

```typescript
// Request
interface ConfigureInstallationDto {
  platformName: string;
  platformDomain: string;
  serverIp: string;
  adminEmail: string;
}

// Response 202
interface ConfigureResponse {
  operationId: string;
}
```

**AUTH-01** — no auth required.

### GET /installation/operations/:id/stream

SSE stream for step progress (no auth required):

```
GET /installation/operations/:id/stream
```

Events:

```
event: stepStarted       data: { "step": "dns", "description": "Creating DNS records..." }
event: stepCompleted     data: { "step": "dns", "description": "DNS records created", "duration": 1240 }
event: stepFailed        data: { "step": "proxy", "description": "Traefik write failed", "reason": "permission denied" }
event: operationFailed   data: { "reason": "ProxyStep failed" }
event: operationCompleted data: { "lifecycle": "CONFIGURED", "certificatePending": true }
```

---

## §7. Prisma Entities

### InstallationStatus (singleton, id="installation")

```prisma
model InstallationStatus {
  id             String               @id @default("installation")
  lifecycle      InstallationLifecycle @default(UNCONFIGURED)
  lastOperationId String?
  updatedAt      DateTime              @updatedAt
}

enum InstallationLifecycle {
  UNCONFIGURED
  CONFIGURING
  CONFIGURED
  DEGRADED
  RECONFIGURING
}
```

### InstallationOperation

```prisma
model InstallationOperation {
  id              String    @id @default(uuid())
  type            String             // 'CONFIGURE'
  status          String  @default("PENDING")  // PENDING | RUNNING | COMPLETED | FAILED
  currentStep     String?
  steps           Json?    // [{ step, startedAt, completedAt, error, result }]
  previousSnapshot Json?
  failureReason   String?
  createdAt       DateTime @default(now())
  completedAt     DateTime?
}
```

### InstallationSettings (singleton, id="installation")

```prisma
model InstallationSettings {
  id             String  @id @default("installation")
  platformName   String  @default("FIDScript Deploy")
  platformDomain String
  serverIp       String
  adminEmail     String
  dnsMode        String  @default("cloudflare_auto")
  branding       Json?
}
```

---

## §8. Backend Steps (from installation-steps.ts)

| Step | Name | Validates | Executes | Async |
|---|---|---|---|---|
| 1 | `DnsStep` | Cloudflare token + domain | Creates/updates DNS record | No |
| 2 | `ProxyStep` | Traefik writable | Writes Traefik dynamic.yml | No |
| 3 | `CertificateStep` | Domain resolves | Triggers Let's Encrypt ACME | **Yes** |
| 4 | `EmailStep` | Stalwart reachable | Restarts Stalwart | No |
| 5 | `HealthStep` | All services | Runs health probe | No |

Certificate issuance does not block the response. The orchestrator returns immediately after the ACME challenge is posted. A separate verifier polls Traefik until the cert is active.

---

## §9. Components

| Component | States | Notes |
|---|---|---|
| `HealthBadge` | `checking`, `success`, `warning`, `error` | Colored dot + label |
| `Skeleton` | — | Pulsing placeholder while discovery runs |
| `ErrorState` | — | Shown on step failure with retry |
| `ProgressStream` | — | SSE-connected log of steps |
| `Button` | primary, secondary, ghost, disabled, loading | — |
| `TextField` | default, validating, valid, invalid | Live validation feedback |

---

## §10. Component States

### HealthBadge

| State | Visual |
|---|---|
| `checking` | Spinning ring + "Checking…" |
| `success` | Green dot + green label |
| `warning` | Yellow dot + yellow label |
| `error` | Red dot + red label |

---

## §11. Auth Context

Onboarding is **pre-auth**. No session is required. The orchestrator is accessible without credentials because the platform cannot have auth until it is configured.

After `CONFIGURED`, the admin account created during installation becomes the first user.

---

## §12. Realtime Events

```
installation.lifecycle.changed         → { lifecycle }
installation.lifecycle.validation.started
installation.lifecycle.validation.completed
installation.lifecycle.operation.started
installation.lifecycle.operation.completed
installation.step.<name>.started       → { step, description }
installation.step.<name>.completed     → { step, description, duration }
installation.step.<name>.failed        → { step, reason }
```

Dashboard subscribes to `installation.lifecycle.changed` after onboarding. On cert-ready, the pending banner clears.

---

## §13. Navigation

| From | To | Condition |
|---|---|---|
| `/onboarding` | `/login` | `lifecycle !== UNCONFIGURED` |
| `/onboarding` | (stays) | step in progress |
| `/onboarding` | `/login` | all required steps pass |
| `/onboarding` | `/login` | certificate pending (banner shown in dashboard) |

---

## §14. Backend Gaps

| Gap | Mitigation |
|---|---|
| Certificate verification runs in-memory; if the API restarts before cert is active, the banner stays until manual refresh | "Refresh status" button polls `GET /installation/status` |

---

## §15. Accessibility

- All steps have `aria-live="polite"` regions
- Error messages are announced immediately
- Keyboard navigation: Tab through fields, Enter submits
- Color is not the only signal (icons accompany all status badges)

---

## §16. Acceptance Criteria

- [ ] `GET /installation/status` → `UNCONFIGURED` on a fresh install → `/onboarding` shown
- [ ] Discovery auto-runs and pre-populates platformDomain/adminEmail
- [ ] Each field validates inline (platformDomain format, adminEmail deliverability)
- [ ] Configure button enabled only when all validations pass
- [ ] POST /installation/configure → 202 with operationId
- [ ] SSE stream emits step events within 500ms of each step
- [ ] Certificate step shows "Pending" but does not block Continue
- [ ] On completion → redirect to `/login`
- [ ] Revisiting `/onboarding` when `CONFIGURED` → redirects to `/login`
- [ ] Dashboard shows SSL provisioning banner until cert is active
- [ ] No console errors; reduced-motion respected
