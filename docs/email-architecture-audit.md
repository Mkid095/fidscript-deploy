# Email Architecture Audit — 2026-06-21

> FIDScript is a self-hosted open-source platform. Every person who installs it should receive a production-ready email system automatically, with minimal manual intervention.

---

## 1. Current Architecture

### How Outbound Email Works

```
Dashboard (browser)
    ↓ POST /api/v1/auth/magic-code
FIDScript API (NestJS)
    ↓ PlatformMailService.send()
Stalwart (SMTP submission: admin + STALWART_ADMIN_TOKEN, port 587)
    ↓ [outbound] (EMPTY — no config)
Direct delivery to Gmail/Outlook MX servers
```

The API submits to Stalwart via SMTP AUTH on port 587. Stalwart then attempts direct delivery to the recipient's MX server. There is **no relay, no backup MX, no retry queue visible in config**.

### How Inbound Email Works

```
External MTA (Gmail, etc.)
    ↓ MX: mail.deploy.fidscript.com → VPS IP:72.61.89.110
Stalwart (port 25, no AUTH on MX)
    ↓
RocksDB store (local mailbox delivery)
```

Stalwart receives mail on port 25 (MX mode) and delivers to local mailboxes. No external delivery confirmation exists in the logs.

### How Magic Codes Are Sent

```
User clicks "Send Code" → API /auth/magic-code
    ↓
AuthMagicCodeService.requestCode()
    ↓
PlatformMailService.send() → nodemailer → Stalwart → Gmail MX
    ↓
MagicCode record created in DB (bcrypt hash, 10min TTL)
```

### How SMTP Is Configured

| Setting | Value |
|---------|-------|
| Host | `fidscript_stalwart` (Docker internal) |
| Port | 587 (STARTTLS) or 465 (implicit TLS) |
| AUTH user | `admin` |
| AUTH password | `STALWART_ADMIN_TOKEN` (32-byte hex, shared credential) |
| TLS | `rejectUnauthorized: false` (self-signed cert on internal hop) |
| FROM | `noreply@${PLATFORM_MAIL_HOST:-deploy.fidscript.com}` |

In practice: `noreply@mail.deploy.fidscript.com`

### How Stalwart Is Configured

| Aspect | Config |
|--------|--------|
| Version | v0.15.5 (pinned — v0.16 broke TOML schema) |
| hostname | `mail.deploy.fidscript.com` |
| DKIM | Enabled via `[auth.dkim]` — signs for `is_local_domain` matches |
| Local domains | Dynamically provisioned via JMAP API (not static config) |
| SMTP AUTH | `fallback-admin` with bcrypt-hashed `STALWART_ADMIN_TOKEN` |
| Queue | **No explicit `[queue]` block** — uses RocksDB defaults |
| Outbound | **EMPTY `[outbound]` block** — direct MX delivery with defaults |

### How DKIM Is Generated

1. API calls `POST /api/dkim` on Stalwart management API (port 8080)
2. Stalwart generates Ed25519 keypair, stores private key in RocksDB
3. API reads public key via `GET /api/dkim/<domain>`
4. API publishes TXT record: `default._domainkey.<domain>` → `v=DKIM1; k=ed25519; p=<base64>`
5. Selector: `default`

### How DNS Records Are Created

**Installer (`setup-wizard.sh`):**
- Creates: `app.A`, `jmap.A`, `storage.A`, `*.A` (wildcard for deployments)
- Does NOT create: MX, SPF, DKIM, DMARC for `deploy.fidscript.com`
- Does NOT create: A record for `mail.deploy.fidscript.com`

**Runtime API (`MailDnsService`):**
- Called for user-added domains in Mode B (`cloudflare_auto`)
- Creates: DKIM TXT, MX, SPF, DMARC
- NOT called for the platform domain itself

### MX / SPF / DMARC / Reverse DNS

| Record | deploy.fidscript.com | mail.deploy.fidscript.com |
|--------|---------------------|--------------------------|
| MX | `10 mail.deploy.fidscript.com` ✅ | None ❌ |
| A | None (wildcard `*.deploy.fidscript.com` covers) | `72.61.89.110` ✅ |
| SPF | `v=spf1 mx ~all` ✅ | None ❌ |
| DKIM | `v=DKIM1; k=ed25519; p=...` ✅ | None ❌ |
| DMARC | `v=DMARC1; p=quarantine` ✅ | None ❌ |
| PTR | `wh.realtime.nextmavens.cloud` (VPS provider owned) | Same |

The PTR record is controlled by the VPS provider (Realtime / CN pyr), NOT by the installer. This is a manual configuration step outside the installer's control.

---

## 2. Complete Gap Analysis

### Critical Gaps (email fails completely)

| # | Gap | Impact | Root Cause |
|----|-----|--------|------------|
| G1 | **`[outbound]` is empty** | Stalwart accepts mail but has no delivery path to external MX. Email silently fails or gets stuck with no indication. | Installer configures inbound MX but not outbound delivery |
| G2 | **No SPF/DKIM/DMARC for `mail.deploy.fidscript.com`** | Even if delivery worked, Gmail rejects with "sender is unauthentic" | Installer creates DNS for platform domain but `SMTP_FROM` uses `mail.` subdomain |
| G3 | **`mail.deploy.fidscript.com` has no DNS records** | SPF, DKIM, DMARC cannot validate mail from this subdomain | Installer never creates records for the `mail.` subdomain |

### High-Priority Gaps (degraded delivery)

| # | Gap | Impact |
|----|-----|--------|
| G4 | **No retry/queue mechanism** | Failed sends are synchronous — no retry on temporary outages |
| G5 | **PTR mismatch risk** | `hostname = mail.deploy.fidscript.com` but PTR is `wh.realtime.nextmavens.cloud` — strict receivers reject this |
| G6 | **IPv6 not configured** | No AAAA for `mail.deploy.fidscript.com` — IPv6-only senders cannot deliver |
| G7 | **No delivery monitoring** | No queue depth visibility, no failed delivery alerts, no health checks for SMTP delivery |

### Medium-Priority Gaps

| # | Gap | Impact |
|----|-----|--------|
| G8 | **Mailbox IMAP login broken** | `argon2id` hash required by Stalwart but `EmailBootstrapService` stores plaintext passwords |
| G9 | **Installer not idempotent** | Re-running regenerates credentials, breaks API→Stalwart auth |
| G10 | **No bare apex A record** | `deploy.fidscript.com` has no A record — wildcard covers subdomains but not the apex |

---

## 3. Architecture Options

### Option A — Direct Delivery (current, broken)

Stalwart delivers directly to Gmail/Outlook MX servers via port 25.

**Pros:**
- Zero external dependencies
- Full control over email infrastructure
- No per-email cost

**Cons:**
- **Requires perfect reputation from day one** — new IPs are instantly flagged by Gmail
- VPS IP reputation is unknown — likely poor for a cloud provider IP
- PTR record mismatch (`wh.realtime.nextmavens.cloud` vs `mail.deploy.fidscript.com`) causes instant rejection
- IPv6 must be configured
- No backup delivery path if MX is temporarily unavailable
- DMARC `p=quarantine` policy means soft-fail, not hard reject — email goes to spam

**Verdict:** NOT viable for authentication emails that must land in inbox immediately.

### Option B — SMTP Relay (recommended)

Use a transactional email service (Mailgun, SendGrid, Amazon SES, Postmark) as Stalwart's outbound relay. Stalwart queues and retries; relay handles reputation and delivery.

**Pros:**
- Relay providers have established IP reputations — email lands in inbox from day one
- Automatic retry, bounce handling, analytics built in
- No PTR/SPF/DKIM/DMARC expertise required
- DMARC `p=reject` achievable via relay's own infrastructure
- Works from any VPS IP (reputation is the relay's, not the VPS's)

**Cons:**
- Requires operator to create an account with a provider (free tier available for all major providers)
- Per-email cost at scale (but free tiers are generous: Mailgun 1,000/month, SES 62,000/month)

**Implementation approach:**
- Stalwart `[outbound.relay]` points to relay SMTP
- API sends via relay instead of Stalwart direct submission
- Or: keep Stalwart for inbound, use API→relay for outbound

### Option C — Hybrid: Stalwart for Inbound + API→Relay for Outbound

Inbound mail (MX role) handled by Stalwart. Outbound magic codes sent via API→SMTP relay directly (bypassing Stalwart).

**Pros:**
- Operators can receive mail at custom domains (Stalwart handles MX)
- Outbound is reliable from day one via relay
- No Stalwart outbound configuration needed

**Cons:**
- Two separate email sending paths (complexity)
- Operators need both MX setup and relay credentials

### Option D — Self-Hosted Relay (Mailcow / Postfix on the VPS)

Run Postfix as a smart host between Stalwart and the internet, with proper reputation management.

**Pros:**
- Full control, no third-party dependency
- Can act as both inbound MX and outbound relay

**Cons:**
- Significant additional complexity (Mailcow = 15+ Docker images)
- Requires as much configuration as a relay provider
- Overkill for authentication emails

---

## 4. Recommended Architecture

**Option B — SMTP Relay** is the correct choice for a self-hosted platform.

Rationale:
1. Authentication emails (magic codes, password resets) MUST arrive reliably — this is the core authentication flow
2. VPS IPs have poor/no reputation — direct delivery will fail or land in spam
3. Free tiers exist (Mailgun 1,000/month, SES 62,000/month, SendGrid 100/day)
4. The operator only needs to create a free account — no credit card required for Mailgun's free tier
5. This is how every production self-hosted platform handles email (Ghost, Discourse, Matomo, etc.)

### Pluggable Transport Design

The architecture must support multiple relay providers:

```
EmailTransport (interface)
    ├── NullTransport         ← testing/demonstration (swallows mail)
    ├── SmtpDirectTransport    ← direct delivery (requires perfect reputation)
    ├── MailgunRelay          ← Mailgun SMTP relay
    ├── SESRelay              ← Amazon SES SMTP
    ├── SendGridRelay         ← SendGrid SMTP
    └── CustomSmtpRelay       ← Operator-provided SMTP credentials
```

The installer asks the operator to select a transport. If "Mailgun" is selected, the operator provides an API key (free tier signup). If "Skip", the platform runs without email until configured manually.

---

## 5. Installer Changes Required

### New Prompt Flow

```
=== Email Configuration ===

How should the platform send emails?
  [1] Mailgun (recommended — free 1,000/month)
  [2] Amazon SES (62,000/month free tier)
  [3] SendGrid (100/day free)
  [4] Custom SMTP relay
  [5] Skip for now (email features disabled)

> 1

Enter your Mailgun API key: [________________________]
(Mailgun domain will be auto-detected from DNS)
```

### Minimal User Input

| Input | Why Unavoidable |
|-------|----------------|
| SMTP relay API key / credentials | Legally requires operator to have an account |
| DNS verification for relay domain | Relay provider requires domain ownership |

### What Installer Configures Automatically

- DKIM/SPF/DMARC via relay provider's DNS verification (automated via provider API)
- SMTP credentials stored in secrets
- API `EmailTransport` instantiated with chosen relay
- Health checks updated to test relay connectivity
- Installer validates email delivery before completion (test send to `admin_email`)

---

## 6. DNS Requirements

Regardless of relay choice, the platform needs:

| Record | For | Method |
|--------|------|--------|
| A (or AAAA) for `mail.` | Inbound MX hostname | Installer creates (or operator) |
| MX → `mail.` | Inbound mail delivery | Installer creates (or operator) |
| A for `deploy.fidscript.com` | Dashboard routing | Already created by installer |
| `*.deploy.fidscript.com` | Deployment routing | Already created by installer |

For the relay: the operator adds DKIM/SPF records for the relay's sending domain (automated by the relay provider's domain verification flow).

---

## 7. Security Considerations

1. **SMTP credentials in secrets** — never in `.env` history or logs
2. **Relay credentials scoped** — use per-domain API keys where possible (Mailgun's domain-scoped keys)
3. **No open relay** — Stalwart port 587 requires AUTH; port 25 is MX-only (no AUTH per config)
4. **Bounce handling** — webhook endpoint must verify `X-Stalwart-Signature` HMAC before processing
5. **Suppression lists** — relay handles bounce/complaint suppression automatically

---

## 8. Operational Considerations

1. **Bounce rate monitoring** — relay providers handle this; Stalwart webhook updates `EmailSuppression` table
2. **Email health dashboard** — platform should surface delivery failures in the monitoring UI
3. **Mailbox storage** — Stalwart RocksDB volume must be backed up (named Docker volume)
4. **Relayed email shows "via" in Gmail** — normal for non-DMARC-aligned sending domains; relay's SPF/DKIM helps

---

## 9. Phased Implementation Plan

### Phase 1 — Emergency Fix (NOW)
Fix the immediate blocker so magic codes work:

1. Change `SMTP_FROM` from `noreply@mail.deploy.fidscript.com` to `noreply@deploy.fidscript.com`
2. Add SPF/DKIM/DMARC records for `deploy.fidscript.com` (already exist — verified)
3. Configure Stalwart `[outbound]` with a working relay (Mailgun free tier)
4. Test magic code delivery to Gmail

### Phase 2 — Pluggable Transports
Implement the transport interface:

1. `EmailTransport` interface with concrete implementations
2. Installer prompts for transport selection
3. Health check tests relay connectivity
4. Test send on installation completion

### Phase 3 — Installer Audit Fixes
Make the installer production-grade:

1. Fix non-idempotent credential regeneration
2. Create `mail.deploy.fidscript.com` A record
3. Create MX record pointing to `mail.deploy.fidscript.com`
4. Warn operator if PTR record doesn't match `mail.DEPLOY_DOMAIN`
5. Test SMTP delivery as part of installer completion

### Phase 4 — Full Reliability
Production-ready email subsystem:

1. Retry queue for failed sends (BullMQ or similar)
2. Delivery monitoring / alerting
3. IPv6 configuration
4. DMARC aggregate report handling
5. Mailbox IMAP login fix (argon2id vs plaintext)

---

## Summary

The current email architecture is **fundamentally incomplete** — Stalwart is configured as an MX (inbound) but its `[outbound]` block is empty, meaning it cannot deliver mail to external addresses. Even if that were fixed, the sender domain (`mail.deploy.fidscript.com`) has no SPF/DKIM/DMARC records, so Gmail would reject delivery.

The correct architecture for an autonomous open-source platform is **SMTP relay** — Mailgun's free tier requires only an API key and zero credit card. The installer should prompt for this once, configure it automatically, and validate email delivery before completion.
