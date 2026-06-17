# Domain Service

> **Phase:** 07  |  **Status:** Implemented  |  **Owner:** Phase 07

## Overview

Domain registration, DNS validation via Cloudflare API, and automatic TLS certificate provisioning via Traefik ACME (DNS-01 challenge). Two resolvers handle two distinct DNS ownership scenarios:

| Resolver | Challenge | Use case |
|----------|-----------|----------|
| `letsencrypt-dns` | DNS-01 via Cloudflare | Platform subdomains + any domain on our Cloudflare zone |
| `letsencrypt-http` | HTTP-01 | Custom domains where user adds CNAME to our IP |

---

## Architecture

### DNS Provider Interface

`DnsProvider` interface (`apps/api/src/modules/domains/providers/dns-provider.interface.ts`) — callers depend on the interface, not Cloudflare:

```typescript
interface DnsProvider {
  name: string;
  createRecord(opts: { zoneId, type, name, content, ttl?, proxied? }): Promise<DnsRecord>;
  deleteRecord(opts: { zoneId, recordId }): Promise<void>;
  listRecords(opts: { zoneId, name, type? }): Promise<DnsRecord[]>;
  verifyRecord(opts: { zoneId, name, type, expectedContent, allowProxy? }): Promise<boolean>;
  getZoneId(domain: string): Promise<string | null>;
  createPlatformSubdomain(subdomain: string): Promise<DnsRecord>;  // platform convenience
  deletePlatformSubdomain(subdomain: string): Promise<void>;       // platform convenience
}
```

Implemented by `CloudflareDnsProvider` — token read from `CLOUDFLARE_API_TOKEN_FILE`.

### Domain Types

**Platform subdomains** (e.g. `demo.apps.deploy.fidscript.com`):
- Created as A record via Cloudflare API: `<slug>.apps.deploy.fidscript.com` → `SERVER_IP`
- Verified by polling Cloudflare API until record is live
- TLS: Traefik `letsencrypt-dns` resolver (DNS-01)

**Custom domains** (e.g. `app.example.com`):
- TXT record issued for ownership verification: `_fidscript-verification.app.example.com` → verification token
- User then adds CNAME to `<slug>.apps.deploy.fidscript.com`
- TLS: Traefik `letsencrypt-http` resolver (HTTP-01 fallback) or `letsencrypt-dns` if on Cloudflare

---

## Database Schema

### projects.domains

```sql
CREATE TABLE projects.domains (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID REFERENCES projects.projects(id) ON DELETE CASCADE,
  deployment_id UUID REFERENCES projects.deployments(id) ON DELETE SET NULL,  -- which deployment routes here
  domain        VARCHAR(255) NOT NULL,
  is_custom     BOOLEAN DEFAULT false,
  ssl_enabled   BOOLEAN DEFAULT true,
  ssl_cert_arn  VARCHAR(255),  -- reserved for future cert-manager integration
  dns_status    VARCHAR(50) DEFAULT 'PENDING',  -- PENDING | VALIDATING | VALID | FAILED
  dns_verified_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
-- Unique per project
CREATE UNIQUE INDEX ON projects.domains (project_id, domain);
-- Index for reverse lookup by deployment
CREATE INDEX ON projects.domains (deployment_id) WHERE deployment_id IS NOT NULL;
```

### DomainStatus values

| Value | Meaning |
|-------|---------|
| `PENDING` | Record created, DNS not yet set up |
| `VALIDATING` | DNS record created, waiting for propagation |
| `VALID` | DNS verified, cert issuance in progress |
| `FAILED` | Verification failed |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/projects/:projectId/domains` | List project domains |
| `POST` | `/api/v1/projects/:projectId/domains` | Add domain to a deployment |
| `DELETE` | `/api/v1/projects/:projectId/domains/:id` | Remove domain + clean up DNS |
| `POST` | `/api/v1/projects/:projectId/domains/:id/verify` | Re-verify DNS |

`POST /domains` body: `{ domain: string, deploymentId: string, sslEnabled?: boolean }`

---

## Events Emitted

| Event | When |
|-------|------|
| `domain.added` | Domain record created in DB |
| `domain.verified` | DNS check passed, dnsStatus → VALID |
| `domain.failed` | DNS check failed, dnsStatus → FAILED |
| `domain.deleted` | Domain removed |

---

## Traefik Configuration

Two certificate resolvers in `installer/traefik/traefik.yml`:

```yaml
certificatesResolvers:
  letsencrypt-dns:
    acme:
      email: admin@deploy.fidscript.com
      storage: /acme-dns/acme-dns.json
      dnsChallenge:
        provider: cloudflare
        resolvers: ["1.1.1.1", "1.0.0.1"]
      caServer: https://acme-staging-v02.api.letsencrypt.org/directory  # staging

  letsencrypt-http:
    acme:
      email: admin@deploy.fidscript.com
      storage: /acme-http/acme-http.json
      httpChallenge:
        entryPoint: web
      caServer: https://acme-staging-v02.api.letsencrypt.org/directory
```

Both use **staging** ACME endpoint to avoid rate limits during iteration.
Flip `caServer` to production (`https://acme-v02.api.letsencrypt.org/directory`) after initial verification.

**Required env vars for Traefik container:**
- `CF_API_TOKEN_FILE=/run/secrets/cf_api_token` — Cloudflare API token

**Required env vars for API container:**
- `SERVER_IP` — public IP of the VPS
- `PLATFORM_DOMAIN=deploy.fidscript.com`
- `CLOUDFLARE_API_TOKEN_FILE=/run/secrets/cf_api_token`

---

## DNS Verification Flow

```
add(domain, deploymentId)
  -> isPlatform = domain.endsWith(".deploy.fidscript.com")
  -> if platform:
       createPlatformSubdomain(slug)
       -> Cloudflare API: create A record <slug>.apps.deploy.fidscript.com -> SERVER_IP
       -> pollCloudflare until live (max 60s, 12 x 5s)
       -> dnsStatus = VALID or VALIDATING
  -> else (custom):
       create TXT record _fidscript-verification.<domain> -> token
       -> dnsStatus = VALIDATING

verify(domainId)
  -> if platform:
       pollCloudflare for A record
       -> dnsStatus = VALID
  -> else:
       pollCloudflare for TXT record
       -> dnsStatus = VALID
```

---

## Files

| File | Role |
|------|------|
| `apps/api/src/modules/domains/domains.service.ts` | HTTP handler: add/list/delete/verify |
| `apps/api/src/modules/domains/domains.controller.ts` | REST controller |
| `apps/api/src/modules/domains/domains.module.ts` | DI module |
| `apps/api/src/modules/domains/providers/dns-provider.interface.ts` | DnsProvider interface |
| `apps/api/src/modules/domains/providers/cloudflare-dns.provider.ts` | Cloudflare API v4 implementation |
| `apps/api/prisma/schema.prisma` | Domain model + deploymentId FK |
| `apps/api/prisma/migrations/20260619000000_domains_tls_real/` | deploymentId column migration |
| `installer/traefik/traefik.yml` | ACME DNS-01 + HTTP-01 resolvers |
| `installer/traefik/dynamic.yml` | Router TLS resolver (letsencrypt-dns) |
| `installer/docker/docker-compose.yml` | CF_API_TOKEN_FILE, SERVER_IP env vars |
| `installer/scripts/setup-wizard.sh` | Prompts for Cloudflare token + SERVER_IP |

---

## Out of Scope

- Cert-manager integration (SSL cert ARNs stored but not used — future)
- Additional DNS providers (interface-ready, Cloudflare only for now)
- DNSSEC management
- CAA records
