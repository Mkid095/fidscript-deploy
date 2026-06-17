# Domain Service

> **Phase:** 07  |  **Status:** Implemented  |  **Owner:** Phase 07

## Overview

Domain registration, DNS validation, SSL provisioning, and health monitoring.

### Two DNS Configuration Modes

| Mode | Trigger | How it works |
|------|---------|-------------|
| **Mode A — Manual DNS (default)** | `dnsMode: 'manual'` | Platform shows DNS records user configures manually. No Cloudflare API calls. |
| **Mode B — Cloudflare Auto** | `dnsMode: 'cloudflare_auto'` | Platform creates DNS records via Cloudflare API automatically. Opt-in only. |

### Verification Pipeline

Every domain goes through 5 mandatory steps before reaching `ACTIVE`:

```
1. PENDING            → Domain added, no verification yet
2. OWNERSHIP_PENDING → TXT record _fidscript.<domain> confirmed (proves ownership)
3. VALIDATING         → DNS propagation + resolution checks
4. ACTIVE             → DNS + routing + SSL all verified
```

If any check fails: `FAILED` (permanent). If an active domain later fails a health check: `BROKEN`.

### Domain Lifecycle

| Status | Meaning |
|--------|---------|
| `PENDING` | Added, no verification attempted |
| `OWNERSHIP_PENDING` | TXT record created, waiting for user to confirm (Mode B) or for user to add TXT (Mode A) |
| `VALIDATING` | Ownership confirmed, checking DNS propagation + routing |
| `ACTIVE` | All checks passed, serving traffic |
| `BROKEN` | Was ACTIVE but failed a health check (e.g. CNAME deleted) |
| `FAILED` | Verification failed permanently |

### SSL Status (independent of DNS)

| Status | Meaning |
|--------|---------|
| `PENDING` | Not yet issued |
| `ISSUING` | ACME certificate in flight |
| `ACTIVE` | Certificate issued and serving |
| `FAILED` | Certificate issuance or renewal failed |
| `EXPIRED` | Certificate has expired |

### WWW Redirects

When adding a domain, user can specify `redirectMode`:

| Value | Behaviour |
|-------|-----------|
| `'none'` | No redirect |
| `'www_to_root'` | `www.example.com` → `example.com` |
| `'root_to_www'` | `example.com` → `www.example.com` |

### Email Safety

Before auto-creating DNS records (Mode B), the platform checks for MX records. If found:

- `emailWarning: true` and `emailProvider` are set
- Only CNAME/TXT/A records are created
- **MX/SPF/DKIM/DMARC are never touched**
- Known providers: `GOOGLE_WORKSPACE`, `MICROSOFT_365`, `ZOHO`, `SES`, `MAILGUN`, `CUSTOM`

### Apex Domain Support

Root domains (e.g. `example.com`) cannot use CNAME records:

- **Mode A**: Platform instructs user to create an **A record** pointing to `SERVER_IP`
- **Mode B**: Platform creates an **A record** automatically

### Multiple Domains Per Deployment

A deployment supports multiple domains simultaneously. One is marked `isPrimary: true` (first added). Used for redirect logic.

---

## Database Schema

### projects.domains

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `project_id` | UUID FK | |
| `deployment_id` | UUID FK (nullable) | Which deployment this domain routes to |
| `domain` | VARCHAR(255) | Full domain, e.g. `app.example.com` |
| `is_custom` | BOOLEAN | `true` for user-owned domains |
| `is_primary` | BOOLEAN | Primary domain for redirect logic |
| `apex_domain` | BOOLEAN | `true` for root domains |
| `dns_mode` | VARCHAR(50) | `'manual'` (default) or `'cloudflare_auto'` |
| `redirect_mode` | VARCHAR(50) | `'none'` (default), `'www_to_root'`, `'root_to_www'` |
| `ssl_enabled` | BOOLEAN | Kill-switch |
| `ssl_status` | ENUM | `PENDING \| ISSUING \| ACTIVE \| FAILED \| EXPIRED` |
| `ssl_method` | VARCHAR(50) | `'letsencrypt'` (default), `'custom'`, `'disabled'` |
| `dns_status` | ENUM | `PENDING \| OWNERSHIP_PENDING \| VALIDATING \| ACTIVE \| BROKEN \| FAILED` |
| `dns_verified_at` | TIMESTAMPTZ | |
| `routing_verified_at` | TIMESTAMPTZ | When HTTP routing confirmed |
| `email_warning` | BOOLEAN | MX records were detected |
| `email_provider` | VARCHAR(100) | `GOOGLE_WORKSPACE`, `MICROSOFT_365`, etc. |

### projects.domain_health_checks

Written every ~10 minutes by the background monitor. Enables uptime history, analytics, and future status pages.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `domain_id` | UUID FK | |
| `checked_at` | TIMESTAMPTZ | |
| `dns_ok` | BOOLEAN | |
| `routing_ok` | BOOLEAN | |
| `ssl_ok` | BOOLEAN | |
| `response_time_ms` | INT | |
| `status` | VARCHAR(20) | `'ok' \| 'degraded' \| 'broken'` |
| `error_message` | TEXT | |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/projects/:projectId/domains` | List domains |
| `POST` | `/api/v1/projects/:projectId/domains` | Add domain (`dnsMode`, `deploymentId`, `redirectMode`, `sslEnabled`) |
| `GET` | `/api/v1/projects/:projectId/domains/:id/instructions` | Get DNS instructions (Mode A) |
| `POST` | `/api/v1/projects/:projectId/domains/:id/verify` | Run full verification pipeline |
| `POST` | `/api/v1/projects/:projectId/domains/connect-cloudflare` | Connect Cloudflare account (Mode B) |
| `DELETE` | `/api/v1/projects/:projectId/domains/:id` | Delete domain |

`POST /domains` body:
```json
{
  "domain": "app.example.com",
  "deploymentId": "uuid",
  "dnsMode": "manual",
  "redirectMode": "www_to_root",
  "sslEnabled": true
}
```

---

## Verification Flow

```
add(domain)
  → isApex = (split('.').length === 2)
  → emailWarning = checkMxRecords(domain)
  → dnsStatus = PENDING
  → if Mode B:
       createPlatformSubdomain() — TXT + CNAME/A
       dnsStatus = OWNERSHIP_PENDING

verify(domainId)
  → dnsStatus = OWNERSHIP_PENDING:
       checkOwnership() — verifies TXT record
       → fail → dnsStatus = FAILED
       → pass → dnsStatus = VALIDATING

  → dnsStatus = VALIDATING:
       checkDnsPropagation() + checkDnsResolution()
       → fail → dnsStatus = FAILED
       → pass → checkHttpRouting()

  → checkHttpRouting():
       → fail → dnsStatus = FAILED
       → pass → dnsStatus = ACTIVE, sslStatus = ISSUING
```

---

## Background Health Monitoring

Called every ~10 minutes by the scheduler (Phase 14). Records a `DomainHealthCheck` row per domain, then transitions:

```
ACTIVE  → BROKEN  (dnsOk=false OR routingOk=false)
BROKEN  → ACTIVE  (routingOk=true on next run)
```

Events emitted: `domain.broken`, `domain.recovered`.

---

## Events Emitted

| Event | When |
|-------|------|
| `domain.added` | Domain record created |
| `domain.pending_ownership` | Ownership check not yet passed |
| `domain.verified` | dnsStatus = ACTIVE |
| `domain.failed` | dnsStatus = FAILED |
| `domain.broken` | ACTIVE → BROKEN |
| `domain.recovered` | BROKEN → ACTIVE |
| `domain.deleted` | Domain removed |

---

## Files

| File | Role |
|------|------|
| `apps/api/src/modules/domains/domains.service.ts` | All operations + 5-step verify pipeline + health monitor |
| `apps/api/src/modules/domains/domains.controller.ts` | REST endpoints |
| `apps/api/src/modules/domains/domains.module.ts` | DI module |
| `apps/api/src/modules/domains/providers/dns-provider.interface.ts` | DnsProvider interface |
| `apps/api/src/modules/domains/providers/cloudflare-dns.provider.ts` | Cloudflare API v4 implementation |
| `apps/api/src/modules/verification/verification.controller.ts` | `GET /.well-known/fidscript` public endpoint |
| `apps/api/prisma/schema.prisma` | Domain + DomainHealthCheck models + enums |
| `apps/api/prisma/migrations/20260619000000_domains_tls_real/` | Full migration |
| `installer/traefik/traefik.yml` | ACME DNS-01 + HTTP-01 resolvers |
| `installer/traefik/dynamic.yml` | letsencrypt-dns on platform routes |
| `installer/docker/docker-compose.yml` | CF_API_TOKEN_FILE, SERVER_IP wired |
| `installer/scripts/setup-wizard.sh` | Prompts for CF token + SERVER_IP |
