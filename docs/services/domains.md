# Domain Service

> **Phase:** 07  |  **Status:** Implemented  |  **Owner:** Phase 07

## Overview

Domain registration, DNS validation, and automatic TLS via Let's Encrypt.

### Two DNS Configuration Modes

| Mode | Trigger | How it works |
|------|---------|-------------|
| **Mode A — Manual DNS (default)** | `dnsMode: 'manual'` | Platform shows DNS records user must configure manually. No Cloudflare API calls. |
| **Mode B — Cloudflare Auto** | `dnsMode: 'cloudflare_auto'` | Platform creates DNS records via Cloudflare API automatically. |

Mode A is always the default. Mode B is opt-in and requires connecting a Cloudflare account first.

### Three Verification Checks

Every domain goes through three verification checks before reaching `ACTIVE`:

1. **DNS Propagation** — the required DNS records exist in Cloudflare (Mode B) or public DNS (Mode A)
2. **DNS Resolution** — the domain actually resolves (confirmed via Cloudflare DoH or `dig`)
3. **HTTP Routing** — `GET http://<domain>/.well-known/fidscript` reaches the platform

Only when all three pass does `dnsStatus` become `ACTIVE`.

### Domain Lifecycle

```
PENDING → VALIDATING → ACTIVE
                     ↘ FAILED (verification failed)
                     ↘ BROKEN (was ACTIVE but routing dropped)
```

| Status | Meaning |
|--------|---------|
| `PENDING` | Added, verification not yet attempted |
| `VALIDATING` | Verification in progress (propagation + resolution + routing) |
| `ACTIVE` | All checks passed, serving traffic |
| `BROKEN` | Was ACTIVE but HTTP routing check failed (e.g. user deleted CNAME) |
| `FAILED` | Verification failed permanently |

### SSL Status

SSL is tracked independently of DNS:

| Status | Meaning |
|--------|---------|
| `PENDING` | Not yet issued |
| `ISSUING` | ACME certificate in flight |
| `ACTIVE` | Certificate issued and serving |
| `FAILED` | Certificate issuance or renewal failed |
| `EXPIRED` | Certificate was valid but has expired |

### Email Safety

Before auto-creating DNS records (Mode B), the platform checks for MX records. If found:

- `emailWarning: true` is set on the domain
- Only CNAME and TXT records are created
- MX/SPF/DKIM/DMARC records are **never touched or overwritten**
- User is warned in the API response and dashboard

Common email providers detected: Google Workspace, Microsoft 365, Zoho, Amazon SES, Mailgun.

### Apex Domain Support

Root domains (e.g. `example.com`) cannot use CNAME records. For apex domains:
- **Mode A**: Platform instructs user to create an **A record** pointing to `SERVER_IP`
- **Mode B**: Platform creates an **A record** (not CNAME) automatically

### Multiple Domains Per Deployment

A deployment can have multiple domains simultaneously:
- One domain is marked `isPrimary: true` (first added, or explicitly set)
- Used for redirects (e.g. redirect `www.example.com` → `example.com`)

---

## Database Schema

### projects.domains

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `project_id` | UUID FK | Which project owns this domain |
| `deployment_id` | UUID FK (nullable) | Which deployment this domain routes to |
| `domain` | VARCHAR(255) | Full domain, e.g. `app.example.com` |
| `is_custom` | BOOLEAN | `true` for user-owned domains, `false` for platform subdomains |
| `is_primary` | BOOLEAN | `true` for the primary domain on a deployment |
| `apex_domain` | BOOLEAN | `true` for root domains (no subdomain part) |
| `dns_mode` | VARCHAR(50) | `'manual'` (default) or `'cloudflare_auto'` |
| `ssl_enabled` | BOOLEAN | Kill-switch for TLS |
| `ssl_status` | ENUM | `PENDING \| ISSUING \| ACTIVE \| FAILED \| EXPIRED` |
| `ssl_method` | VARCHAR(50) | `'letsencrypt'` (default), `'custom'`, `'disabled'` |
| `dns_status` | ENUM | `PENDING \| VALIDATING \| ACTIVE \| BROKEN \| FAILED` |
| `dns_verified_at` | TIMESTAMPTZ | When DNS check passed |
| `routing_verified_at` | TIMESTAMPTZ | When HTTP routing check passed |
| `email_warning` | BOOLEAN | `true` if MX records were detected |

**Indexes:** `(project_id, domain)` unique; `(deployment_id)` for reverse lookup; `(dns_status)`; `(ssl_status)`

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/projects/:projectId/domains` | List all domains for a project |
| `POST` | `/api/v1/projects/:projectId/domains` | Add domain (`dnsMode`, `deploymentId`, `sslEnabled`) |
| `GET` | `/api/v1/projects/:projectId/domains/:id/instructions` | Get DNS instructions (Mode A) |
| `POST` | `/api/v1/projects/:projectId/domains/:id/verify` | Full verification (DNS + resolution + routing) |
| `POST` | `/api/v1/projects/:projectId/domains/connect-cloudflare` | Connect Cloudflare account (Mode B) |
| `DELETE` | `/api/v1/projects/:projectId/domains/:id` | Delete domain + clean up DNS |

`POST /domains` body:
```json
{
  "domain": "app.example.com",
  "deploymentId": "uuid",
  "sslEnabled": true,
  "dnsMode": "manual",
  "isPrimary": false
}
```

`POST /connect-cloudflare` body: `{ "apiToken": "cfut_..." }`

---

## Verification Flow

```
add(domain, deploymentId)
  → isApex = (domain has no dot-split parts > 2)
  → emailWarning = checkMxRecords(domain).hasMx   // for Mode B and info
  → if Mode A: return { instructions } (CNAME/TXT/A records user must create)
  → if Mode B:
       create TXT _fidscript-verification.<domain> via Cloudflare API
       create CNAME (or A for apex) via Cloudflare API
       dnsStatus = VALIDATING

verify(domainId)
  → dnsStatus = VALIDATING
  → checkDnsPropagation()    → dig / Cloudflare API
  → checkDnsResolution()     → Cloudflare DoH + dig
  → checkHttpRouting()        → GET http://<domain>/.well-known/fidscript
  → all pass → dnsStatus = ACTIVE, sslStatus = ISSUING
  → routing fails → dnsStatus = FAILED
```

---

## Events Emitted

| Event | When |
|-------|------|
| `domain.added` | Domain record created |
| `domain.verified` | All three checks passed, dnsStatus = ACTIVE |
| `domain.failed` | DNS or routing check failed |
| `domain.broken` | Previously ACTIVE domain failed a health check |
| `domain.recovered` | BROKEN domain passed a subsequent health check |
| `domain.deleted` | Domain removed |

---

## Files

| File | Role |
|------|------|
| `apps/api/src/modules/domains/domains.service.ts` | All domain operations, verification checks, Mode A/B |
| `apps/api/src/modules/domains/domains.controller.ts` | REST endpoints |
| `apps/api/src/modules/domains/domains.module.ts` | DI module |
| `apps/api/src/modules/domains/providers/dns-provider.interface.ts` | DnsProvider interface |
| `apps/api/src/modules/domains/providers/cloudflare-dns.provider.ts` | Cloudflare API v4 implementation |
| `apps/api/src/modules/verification/verification.controller.ts` | `GET /.well-known/fidscript` public endpoint |
| `apps/api/prisma/schema.prisma` | Domain model + SslStatus enum |
| `apps/api/prisma/migrations/20260619000000_domains_tls_real/` | All new columns + BROKEN status + SslStatus |
| `installer/traefik/traefik.yml` | ACME DNS-01 + HTTP-01 resolvers |
| `installer/traefik/dynamic.yml` | Platform routes with letsencrypt-dns |
| `installer/docker/docker-compose.yml` | CF_API_TOKEN_FILE, SERVER_IP |
| `installer/scripts/setup-wizard.sh` | Prompts for Cloudflare token + SERVER_IP |

---

## Out of Scope

- Buying/registering domains
- Automatic WWW redirects (Phase 19 dashboard)
- Domain monitoring background worker (Phase 14 — `checkHealth()` method exists, needs scheduler)
- Custom SSL certificate upload
- Additional DNS providers beyond Cloudflare (interface-ready, implementation deferred)
