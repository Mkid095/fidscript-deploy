# Service: Domains

Custom domains + TLS for deployments and platform subdomains. Auto-verification of DNS + routing
+ background SSL-expiry health checks.

## 1. Purpose
Your deployment at `my-app.apps.example.com` works out of the box (wildcard). Add a custom domain
and the platform verifies it, issues a cert via Traefik ACME, and surfaces a `BROKEN` state if DNS
or TLS ever drift.

## 2. Screens
- **Domains** (sidebar §10): list of custom domains.
- **Domain detail**: tabs *Overview / DNS / TLS / Email / Health*. DNS shows the instructions
  (A / CNAME / TXT for ownership); TLS shows the Traefik-issued cert + expiry; Email is a shortcut
  to the Email → Domains add flow; Health is the live check (DNS / HTTP / SSL).

## 3. Data model
- `Domain` — id, projectId, domain, deploymentId, dnsMode (`manual|cloudflare_auto`),
  redirectMode (`none|www_to_root|root_to_www`), sslEnabled, sslStatus, ownershipToken
  (the TXT record the user adds), verifiedAt.
- `DomainHealthCheck` — id, domainId, timestamp, dnsOk, routingOk, sslOk, errorMessage.

## 4. API mapping
- `DOM-01..04` (list/add/instructions/verify). `DOM-05` (connect Cloudflare). `DOM-06` (delete).
- The health checker (`DomainHealthService`) is **not** an HTTP route — it runs on a schedule
  and emits `domain.verified`/`domain.broken`/`domain.recovered` based on its probes.

## 5. Realtime events
- `domain.added`, `domain.deleted` (HTTP CRUD).
- `domain.pending_ownership`, `domain.failed`, `domain.tls_pending` (from the verify endpoint).
- `domain.verified`, `domain.broken`, `domain.recovered` (from the background health checker).

## 6. Settings
- **Add domain:** domain, deployment to bind to, `dnsMode` (`manual` = user adds records; or
  `cloudflare_auto` = platform does it via the Cloudflare token), `redirectMode` (optional), TLS
  (default on).
- **Cloudflare connection** (`DOM-05`): stored at the project level via the CF API token
  (encrypted). Connecting the zone unlocks `cloudflare_auto`.

## 7. Automation
- **DNS propagation check** via Cloudflare DoH (with `dig +short` fallback) during `verify`.
- **HTTP routing check** is a GET to `http://<domain>/.well-known/fidscript` (404 + fidscript body
  = success).
- **SSL cert** is **observed**, not directly issued by us: Traefik ACME issues; the background
  health check reads the peer cert `valid_to` and promotes the domain to `ACTIVE` once the cert
  is seen.
- **Health loop** (not user-triggered): every few minutes, per domain. Surfaces
  `domain.broken` → re-checks → `domain.recovered`.

## 8. Dependencies
- **Hard:** Traefik + ACME (DNS-01 via Cloudflare, HTTP-01 fallback). Cloudflare token is
  required for `cloudflare_auto`; manual mode works without it.
- **Hard:** a deployment to bind to.
- **Backend gaps** (from the audit — **flag in the UI**):
  - `DOM-05` (connect Cloudflare) and `DOM-06` (delete) have **no project-access check** — any
    authenticated user can act on any project's domains. The UI greys these for non-members,
    but this is server-side vulnerable.
  - The verify response uses a literal `YOUR_SERVER_IP` placeholder in the instructions (not the
    real IP). UI should render the real IP for the user.
  - No MX records are ever created by the platform — the `emailProvider` field detects what's
    there.

## 9. Phase
**F11** — pending spec.
