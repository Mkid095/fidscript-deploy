# Phase 07: Domains & TLS

> **Status:** Verified  |  **Track:** Core  |  **Depends on:** Phase 06

## Objective

Custom domains with real DNS verification and automatic TLS. Attach a custom domain (e.g. `app.example.com`) to a deployment, have the platform verify and configure DNS via Cloudflare, issue a Let's Encrypt certificate, and route HTTPS traffic to the app. This is also where the platform's own `deploy.fidscript.com` wildcard cert is wired for real.

## Current State

**IMPLEMENTED.** All deliverables complete as of 2026-06-19.

- `DnsProvider` interface + `CloudflareDnsProvider` — real Cloudflare API v4 calls
- `checkDns()` (now `verifyPlatformSubdomain`) queries Cloudflare API; not hardcoded
- `CLOUDFLARE_API_TOKEN_FILE` wired into both API and Traefik containers
- `SERVER_IP` env var set via setup-wizard, used for A record values
- Two Traefik ACME resolvers: `letsencrypt-dns` (DNS-01) and `letsencrypt-http` (HTTP-01)
- `Domain.deploymentId` FK wired — domains route to specific deployments
- `DomainVerification` via TXT record for custom domains

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

All files below are implemented (Phase 07 complete):

- `apps/api/src/modules/domains/providers/dns-provider.interface.ts` — DnsProvider interface
- `apps/api/src/modules/domains/providers/cloudflare-dns.provider.ts` — Cloudflare API v4 implementation
- `apps/api/src/modules/domains/domains.service.ts` — real checkDns + DNS setup/delete
- `apps/api/src/modules/domains/domains.controller.ts` — deploymentId added to add body
- `apps/api/src/modules/domains/domains.module.ts` — CloudflareDnsProvider injected
- `apps/api/prisma/schema.prisma` — Domain.deploymentId FK + reverse relation
- `apps/api/prisma/migrations/20260619000000_domains_tls_real/` — migration
- `installer/traefik/traefik.yml` — two ACME resolvers: letsencrypt-dns (DNS-01) + letsencrypt-http (HTTP-01)
- `installer/traefik/dynamic.yml` — letsencrypt-dns resolver on all platform routes
- `installer/docker/docker-compose.yml` — CF_API_TOKEN_FILE, SERVER_IP, cf_api_token secret
- `installer/scripts/setup-wizard.sh` — prompts for Cloudflare token + SERVER_IP, writes cf_api_token.txt
- `docs/services/domains.md` — updated service spec
- `DECISIONS.md` — ADR-022 (TLS / ACME approach)
- `AGENT_STATUS.md` — Phase 07 marked Verified, Phase 08 marked In Progress

## Next Phase

[Phase 08: Database Platform](./phase-08.md) — managed PostgreSQL, connection pooling, per-project databases.
