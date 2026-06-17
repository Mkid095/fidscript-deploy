# Phase 09: Email Platform (Stalwart)

> **Status:** In Progress  |  **Track:** Data/Compute  |  **Depends on:** Phase 07, Phase 05

## Objective

A real internal mail server: **send and receive mail** through a self-hosted Stalwart instance — DKIM/SPF/DMARC DNS automation, mailbox/alias/sender-identity management, SMTP submission, IMAP access, and a message inbox backed by Stalwart JMAP.

The platform serves three distinct email products under one API:

1. **Hosted Mailboxes** — Namecheap Private Email / Zoho-style IMAP/SMTP accounts users manage in Outlook, Thunderbird, or mobile mail. Built directly on Stalwart.
2. **Email API** — Resend-style programmatic sending with API keys and sender identities. No mailbox required to send.
3. **Inbox Platform** — Gmail-style webmail UI backed by Stalwart. The platform acts as a JMAP client reading from Stalwart.

## Architecture Principles

- **Control plane vs. mail infrastructure** — Platform owns domains, aliases, mailboxes, sender identities, API keys, permissions. Stalwart owns SMTP, IMAP, JMAP, mail storage, authentication, routing.
- **No triple storage** — Messages live in Stalwart. Platform stores metadata rows only for sent events, delivery events, and automation triggers. Inbox UI reads from Stalwart via JMAP, not from Postgres.
- **Stalwart owns passwords** — Platform stores only `stalwartAccountId`. Password reset goes API → Stalwart → returns new password once.
- **Sender identity gating** — Identities require domain to be ACTIVE (all DNS verified) before use.
- **Domain ownership verification** — TXT token required before enabling any sending.
- **Rate limiting** — Per-key per-day usage tracked in `email.api_usage`.

## Current State

**IN PROGRESS — schema restructured, all endpoints implemented, events wired.** As of 2026-06-17:

- **Schema restructured** — `email.domains`, `email.mailboxes`, `email.aliases`, `email.sender_identities`, `email.api_keys`, `email.messages`, `email.catch_all_rules`, `email.api_usage`, `email.suppressions`
- **Domain lifecycle** — PENDING → VERIFIED → ACTIVE (or FAILED). Ownership TXT + DNS setup combined into one verify step; full DNS (DKIM/SPF/DMARC/MX) validated in second step.
- **Platform generates mailbox passwords** — `resetMailboxPassword` never accepts user-supplied passwords; platform generates `crypto.randomBytes` and returns once.
- **Suppression list** — `email.suppressions` table with reasons: BOUNCE / COMPLAINT / UNSUBSCRIBE / MANUAL. Hard bounces add recipient to suppression; `sendEmail` checks suppression before sending. Sender identities are NOT invalidated.
- **Catch-all rate limiting** — `CatchAllRule.messagesPerMinute` (default 60) prevents spam amplification via public catch-all domains.
- **Ownership verification** — TXT token generated at domain creation; verified before DNS configuration
- **Stalwart JMAP client** — `StalwartJmapService` calls `POST /jmap` with bearer auth
- **All endpoints implemented** — domains, mailboxes, aliases (mailbox/external/webhook targets), sender identities, API keys, messages, catch-all
- **Alias routing in Stalwart** — aliases synced via Sieve script on target mailbox; rebuilt whenever aliases change
- **Webhook delivery** — inbound mail on alias with webhook target fires delivery webhook with retry (3x exponential backoff)
- **Events wired** — full set including `email.webhook_triggered`, `email.opened`, `email.clicked`, `email.complained`
- **API key scopes** — string array `["email.send", "email.domains.read", ...]`; `ForbiddenException` if scope missing
- **Rate limiting** — `dailyLimit`, `monthlyLimit`, `blockedUntil`, `lastFailureAt` per key per day
- **No MinIO for messages** — body read from Stalwart via JMAP at display time; metadata only in Postgres
- **Webhook security** — `X-Stalwart-Signature` HMAC-SHA256 on all inbound/bounce webhooks
- **Bounce ingestion** — `EmailEventsController.handleBounce` updates message status, adds to suppression list, emits `email.bounced`
- **SMTP status model** — `QUEUED → SUBMITTED → ACCEPTED → BOUNCED/FAILED`
- **Inbound webhook** — `X-Stalwart-Signature` HMAC verification on both `/email/inbound/webhook` and `/email/events/bounce`

## Schema

```
email.domains
  id, project_id, domain,
  status (PENDING|VERIFIED|ACTIVE|FAILED),
  dkim_verified, spf_verified, dmarc_verified, mx_verified,
  dkim_selector, ownership_token, verified_at, created_at
  → email.suppressions[]

email.mailboxes
  id, domain_id, local_part, name, quota (bytes),
  is_active, stalwart_account_id, created_at, updated_at
  → email.messages[]
  Note: password owned by Stalwart — platform stores only stalwartAccountId.

email.aliases
  id, domain_id, local_part,
  targets (JSON: mailboxId | external address | webhook url),
  description, is_active, created_at, updated_at

email.sender_identities
  id, domain_id, email, name, is_verified, created_at

email.api_keys
  id, project_id, name, key_hash,
  scopes (string[]: email.send | email.domains.read | email.mailboxes.read | email.messages.read | email.identities.read),
  last_used_at, created_at
  → email.api_usage[]

email.api_usage
  id, project_id, api_key_id, date,
  sends, failures, bounces,
  daily_limit, monthly_limit,
  blocked_until, last_failure_at
  @@unique([project_id, api_key_id, date])

email.messages
  id, mailbox_id, sender_identity_id, project_id,
  from, to, subject, size_bytes,
  is_read, is_starred, is_draft, spam_score,
  status (QUEUED|SUBMITTED|ACCEPTED|BOUNCED|FAILED), error, created_at
  Note: body/attachments live in Stalwart — read via JMAP at display time

email.catch_all_rules
  id, domain_id, target (JSON: mailboxId | external address | webhook url),
  is_active, messages_per_minute (default 60)

email.suppressions
  id, domain_id, email, reason (BOUNCE|COMPLAINT|UNSUBSCRIBE|MANUAL), created_at
  @@unique([domain_id, email])
```

## API Endpoints

### Domains
```
POST   /projects/:projectId/email/domains                 Create domain + ownership token
GET    /projects/:projectId/email/domains
GET    /projects/:projectId/email/domains/:domainId
DELETE /projects/:projectId/email/domains/:domainId
POST   /projects/:projectId/email/domains/:domainId/verify   Step through lifecycle
POST   /projects/:projectId/email/domains/:domainId/catch-all
DELETE /projects/:projectId/email/domains/:domainId/catch-all
```

### Mailboxes (passwords owned by Stalwart — platform stores only stalwartAccountId)
```
POST   /projects/:projectId/email/mailboxes                   → returns credentials once
GET    /projects/:projectId/email/mailboxes
GET    /projects/:projectId/email/mailboxes/:mailboxId
PATCH  /projects/:projectId/email/mailboxes/:mailboxId
POST   /projects/:projectId/email/mailboxes/:mailboxId/suspend
POST   /projects/:projectId/email/mailboxes/:mailboxId/activate
POST   /projects/:projectId/email/mailboxes/:mailboxId/reset-password  → returns new once
DELETE /projects/:projectId/email/mailboxes/:mailboxId
```

### Aliases (webhook targets supported)
```
POST   /projects/:projectId/email/aliases
GET    /projects/:projectId/email/aliases
PATCH  /projects/:projectId/email/aliases/:aliasId
DELETE /projects/:projectId/email/aliases/:aliasId
```

### Sender Identities (requires ACTIVE domain)
```
POST   /projects/:projectId/email/sender-identities
GET    /projects/:projectId/email/sender-identities
DELETE /projects/:projectId/email/sender-identities/:identityId
```

### API Keys (Resend-style — ek_... key shown once, rate limited)
```
POST   /projects/:projectId/email/api-keys
GET    /projects/:projectId/email/api-keys
DELETE /projects/:projectId/email/api-keys/:apiKeyId
```

### Send
```
POST   /projects/:projectId/email/send   apiKeyId for rate limit tracking
```

### Messages (metadata only — body from Stalwart via JMAP)
```
GET    /projects/:projectId/email/messages                       folder=, unread= filters
GET    /projects/:projectId/email/messages/:messageId
PATCH  /projects/:projectId/email/messages/read              bulk mark read
PATCH  /projects/:projectId/email/messages/:messageId/star
DELETE /projects/:projectId/email/messages                    metadata row only
```

### Inbound & Events (webhook endpoints — HMAC-SHA256 authenticated)
```
POST   /email/inbound/webhook   Stalwart sieve notify — X-Stalwart-Signature HMAC-SHA256
POST   /email/events/bounce     Stalwart bounce notification — X-Stalwart-Signature HMAC-SHA256
```

## Technical Design

### Domain Lifecycle
1. `PENDING` — created, ownership TXT token generated
2. User adds TXT record `{token}._email.{domain}`
3. `verifyDomain` (PENDING) → ownership verified + DNS records created → `VERIFIED`
4. `verifyDomain` (VERIFIED) → DKIM/SPF/DMARC/MX validated → `ACTIVE`
5. Mailboxes, aliases, sender identities require `ACTIVE` domain
6. Failed verification → `FAILED` (permanent, must re-add domain)

### Stalwart JMAP Client
- All management: `POST /jmap` with `Authorization: Bearer <STA_ADMIN_TOKEN>`
- Admin methods: `x:Domain/set`, `x:Account/set`
- Mailbox/identity methods: `jmapIdentityCreate`, `jmapSieveScriptSet`, `jmapSieveScriptDestroy`

### Alias Routing (Stalwart as Source of Truth)
- Alias forwarding rules live in Stalwart's Sieve scripts on the target mailbox — not in Postgres alone
- When an alias is created/deleted/updated: `rebuildMailboxSieveScript` aggregates ALL active aliases for that mailbox + the catch-all rule into one script and pushes to Stalwart via `jmapSieveScriptSet`
- Webhook targets are handled asynchronously by `WebhookService` (not Sieve): inbound notify → metadata → webhook delivery with 3x exponential backoff

### Webhook Delivery
- `WebhookService.deliver()` fires HTTP POST to registered URL with retry (1s / 5s / 15s)
- Payload: `{ event, messageId, projectId, mailboxId, to, from, subject, timestamp }`
- Emits `email.webhook_triggered` on success; logs permanently failed attempts

### Inbound Webhook Security
- All Stalwart → platform webhooks authenticated with `X-Stalwart-Signature: sha256=<HMAC-SHA256(body, STALWART_WEBHOOK_SECRET)`
- Both `/email/inbound/webhook` and `/email/events/bounce` verify HMAC before processing

### Bounce Ingestion
- Stalwart POSTs bounce event to `/email/events/bounce`
- `handleBounce` updates `EmailMessage.status → BOUNCED`, emits `email.bounced`
- Hard bounces (550 / user unknown) add the recipient to `email.suppressions` — sender identity is NOT invalidated
- Soft bounces are tracked in usage counters but do not suppress

### Suppression List
- `email.suppressions` stores `{ email, reason, created_at }` with unique constraint on `(domain_id, email)`
- Reasons: `BOUNCE` (permanent failure), `COMPLAINT` (spam FBL), `UNSUBSCRIBE`, `MANUAL`
- `sendEmail` checks suppression before sending — `ForbiddenException` if recipient is suppressed
- Complaints (FBL) handled via `/email/events/complaint` endpoint (same HMAC auth)

### SMTP Status Model
- `QUEUED` — message created, not yet submitted to SMTP
- `SUBMITTED` — submitted to Stalwart SMTP relay
- `ACCEPTED` — accepted by remote MTA
- `BOUNCED` — permanently rejected by remote MTA
- `FAILED` — local error (validation, auth, network)

### API Key Scopes
- `scopes string[]` — e.g. `["email.send"]` or `["email.send", "email.messages.read"]`
- Valid: `email.send | email.domains.read | email.mailboxes.read | email.messages.read | email.identities.read`
- Enforced at send time via `checkApiKeyCanSend` → `ForbiddenException` if scope missing or rate limit hit

### Rate Limiting
- `email.api_usage` upserted on every send with sends/failures/bounces per key per day
- `dailyLimit` (default 1000) and `monthlyLimit` (default 30000) checked before accepting send
- `blockedUntil` set after repeated failures; cleared when usage is low


## Integration Points

- **DNS:** Phase 07 `DnsProvider` (Cloudflare) for all record management
- **Storage:** None for messages (Stalwart owns mail storage)
- **Events:** All `email.*` events through Phase 02 event bus
- **SDK (16):** `email.domains.*`, `email.mailboxes.*`, `email.aliases.*`, `email.senderIdentities.*`, `email.apiKeys.*`, `email.messages.*`, `email.send`
- **CLI (18):** `fidscript email domains create`, `fidscript email mailboxes create`, `fidscript email send`

## Verification (VPS)

```bash
# 1) Add domain → receive ownership token
curl -fsS -X POST $API/api/v1/projects/$PID/email/domains \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"domain":"mail.example.com"}'
# Save ownershipToken from response

# 2) Add TXT record: {token}._email.mail.example.com = {token}
# Then verify — ownership confirmed and DNS records created in one step
curl -fsS -X POST $API/api/v1/projects/$PID/email/domains/$DOMAIN_ID/verify \
  -H "Authorization: Bearer $TOKEN"

# 3) Create mailbox → platform generates password, shown once only
curl -fsS -X POST $API/api/v1/projects/$PID/email/mailboxes \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"domain":"mail.example.com","localPart":"john"}'
# Save the returned password — it is shown only this time

# 4) Create sender identity (requires ACTIVE domain)
curl -fsS -X POST $API/api/v1/projects/$PID/email/sender-identities \
  -d '{"domain":"mail.example.com","email":"noreply@mail.example.com"}'

# 5) Create API key → save ek_... key
curl -fsS -X POST $API/api/v1/projects/$PID/email/api-keys \
  -H "Authorization: Bearer $TOKEN" -d '{"name":"Production"}'

# 6) Send
curl -fsS -X POST $API/api/v1/projects/$PID/email/send \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"from":"noreply@mail.example.com","to":"user@gmail.com","subject":"Hi","text":"Hello"}'

# 7) Inbound: mail to john@mail.example.com from external → check:
curl -fsS $API/api/v1/projects/$PID/email/messages \
  -H "Authorization: Bearer $TOKEN" | jq .
```

## Files you'll touch

- `apps/api/prisma/schema.prisma` — new email schema
- `apps/api/src/modules/email/stalwart-jmap.service.ts` — JMAP admin client
- `apps/api/src/modules/email/email.service.ts` — complete rewrite
- `apps/api/src/modules/email/email.controller.ts` — all endpoints
- `apps/api/src/modules/email/email.module.ts`
- `apps/api/src/modules/email/mail-dns.service.ts` — added verifyOwnership
- `apps/api/src/modules/email/dto/` — all DTOs
- `packages/events/src/index.ts` — email.* event types
- `docs/phases/phase-09.md` — this doc

## Next Phase

[Phase 10: Functions Runtime](./phase-10.md)
