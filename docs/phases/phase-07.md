# Phase 07: Domains & TLS

> **Status:** Planned  |  **Track:** Core  |  **Depends on:** Phase 06

## Objective

Custom domains with real DNS verification and automatic TLS. Attach a custom domain (e.g. `app.example.com`) to a deployment, have the platform verify and configure DNS via Cloudflare, issue a Let's Encrypt certificate, and route HTTPS traffic to the app. This is also where the platform's own `deploy.fidscript.com` wildcard cert is wired for real.

## Current State

**STUB.** See `docs/AUDIT.md` §C (Domains). Specific defects:

- `checkDns()` returns `true` unconditionally — every domain "verifies" instantly.
- No Cloudflare (or any DNS provider) API calls anywhere.
- No Let's Encrypt / ACME integration; no real certificate issuance.
- `'YOUR_SERVER_IP'` placeholder where the server IP should be.

## Dependencies

- **Phase 06** (a deployment must exist to attach a domain to).
- **Cloudflare credentials** for the `deploy.fidscript.com` zone (see memory: `cloudflare-config`). They exist but are **not wired into code** — this phase wires them.
- **Phase 01** (Traefik running, the ACME resolver configured structurally).

## Deliverables

- [ ] **DNS provider abstraction.** A `DnsProvider` interface (`createRecord`, `deleteRecord`, `getRecord`, `verifyRecord`) with a **Cloudflare** implementation. Never hardcode Cloudflare in callers (Development Rule 5). Future providers (Route53, DigitalOcean) drop in.
- [ ] **Wire the real Cloudflare creds.** API token from `CLOUDFLARE_API_TOKEN_FILE`, zone id resolved for `deploy.fidscript.com`. Fail closed if missing.
- [ ] **Real DNS verification.** `checkDns()` actually queries Cloudflare (and/or resolves the record) and only returns `verified` when the record exists and points correctly — never a hardcoded `true`.
- [ ] **Domain → deployment mapping.** Attach one or more custom domains to a deployment; Traefik learns the route (Docker label / dynamic config) so `app.example.com` hits that container.
- [ ] **Automatic TLS via Traefik ACME.** Configure the Let's Encrypt resolver with the **DNS-01 challenge via Cloudflare** (so wildcard `*.deploy.fidscript.com` and domains without open 80 work). HTTP-01 as a fallback for arbitrary custom domains the user points at us. Traefik handles issuance **and** renewal automatically.
- [ ] **Domain ownership verification.** For domains on a zone we don't control, verify ownership via a `_fidscript.<host>` TXT record the user adds.
- [ ] **Wildcard for the platform's own apps.** `*.apps.deploy.fidscript.com` covered by a single wildcard cert (DNS-01) so Phase 06 deployment URLs are HTTPS by default.
- [ ] **Lifecycle.** Add/remove a domain; removing cleans up the DNS record (for records we own) and the Traefik route.

## Technical Design

- **Provider interface:** `interface DnsProvider { createRecord(opts): Promise<Record>; deleteRecord(id): Promise<void>; listRecords(host): Promise<Record[]>; }` — callers depend on the interface, the Cloudflare impl is injected. Credentials read once at boot from `_FILE`.
- **Traefik ACME config:** `certificatesResolvers.le.acme.dnsChallenge.provider=cloudflare` with the token exported as `CF_API_TOKEN` to the Traefik container. Staging endpoint (`acme-staging`) for dev to avoid rate limits; production endpoint for real issuance.
- **Verification flow:** `addDomain(host, deploymentId)` → if on our zone, create/ensure the CNAME/A → poll Cloudflare until live → mark `verified` → Traefik issues the cert (watch for it) → mark `tls_ready`. If off-zone, surface the TXT record the user must add and poll until present.
- **Why DNS-01 for wildcard:** HTTP-01 can't issue `*.apps...` wildcards and needs 80 open; DNS-01 issues wildcards and works behind firewalls — the right default for a self-hosted platform.

## Integration Points

- **Events emitted:** `domains.domain.added/verified/cert_issued/failed/removed`. Consumed by audit (02); `cert_issued` can trigger a "your domain is live" email (09).
- **Service registry:** registers `domains`.
- **SDK (16):** `domains.add/list/verify/remove`.
- **CLI (18):** `fidscript domains add/verify`.
- **Dashboard (19):** custom-domains settings + DNS instructions + status.
- **Consumes:** Deployments (06) — a domain points at a deployment; the deployment must be `LIVE`.

## Verification (VPS)

```bash
# Using a real host you control on the fidscript.com zone, e.g. demo.fidscript.com:
curl -fsS -X POST .../api/v1/projects/$PID/domains \
  -d '{"host":"demo.fidscript.com","deploymentId":"<DEPL>"}' | jq .status   # → verified, tls_ready

# DNS was really created in Cloudflare (not faked):
# (in Cloudflare dashboard, or: dig +short demo.fidscript.com → resolves to the server / CNAME)

# Real cert + live traffic:
curl -fsSv https://demo.fidscript.com 2>&1 | grep -E 'subject|issuer'   # issuer: Let's Encrypt; 200 body

# Platform wildcard works for app subdomains:
curl -fsSv https://<slug>.apps.deploy.fidscript.com   # valid cert, served

# Remove:
curl -fsS -X DELETE .../domains/<id>
curl -s -o /dev/null -w "%{http_code}" https://demo.fidscript.com   # 404 / not routed
```

**Exit criterion:** a real custom domain resolves (record actually created in Cloudflare), a real Let's Encrypt certificate is issued, HTTPS serves the deployment, and removal cleans up. No `return true` DNS checks, no `'YOUR_SERVER_IP'` placeholder.

## Out of Scope / Future

- Buying/registering domains (never — DNS management only).
- Additional DNS providers (Route53, etc.) — interface-ready, impl later.
- CAA/advanced DNSSEC management (future).

## Risks

- **Let's Encrypt rate limits** during iteration — use the staging ACME endpoint while developing, flip to prod for the final verify.
- Cloudflare token scopes too narrow → DNS writes fail; document the required token permissions (Zone:DNS:Edit for the zone).
- DNS propagation delays make verification flaky → poll with backoff, expose "pending" status honestly rather than claiming instant verification.

## Files you'll touch (precision map)

- Stub lives at: `apps/api/src/modules/domains/domains.service.ts` (`checkDns()` returns `true`; `'YOUR_SERVER_IP'` placeholder; no provider calls anywhere).
- Prisma: `Domain`, enum `DomainStatus`.
- Create: a DNS provider interface + Cloudflare implementation (`apps/api/src/modules/domains/providers/`); wire `CLOUDFLARE_API_TOKEN_FILE` (creds exist in memory `cloudflare-config`, **not yet in code**).
- Infra: Traefik ACME `dnsChallenge` (Cloudflare) in `installer/traefik/traefik.yml`; staging endpoint for dev.

## Next Phase

[Phase 08: Database Platform](./phase-08.md)
