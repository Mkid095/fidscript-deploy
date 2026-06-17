# Email Service

> **Status:** PARTIAL — schema restructured, all endpoints implemented, Stalwart JMAP wired, events wired. | **Phase:** 09

The platform provides three distinct email products:

1. **Hosted Mailboxes** — IMAP/SMTP accounts managed via Outlook, Thunderbird, or mobile mail
2. **Email API** — Resend-style programmatic sending with API keys and sender identities
3. **Inbox Platform** — Gmail-style message browsing backed by Stalwart

---

## Database Schema

### `email.domains`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `project_id` | UUID | FK to `projects.projects` |
| `domain` | VARCHAR(255) | e.g. `example.com` |
| `status` | `PENDING \| VERIFICATION_PENDING \| ACTIVE \| FAILED` | |
| `dkim_verified` | BOOLEAN | DNS TXT record match |
| `spf_verified` | BOOLEAN | DNS TXT record match |
| `dmarc_verified` | BOOLEAN | DNS TXT record match |
| `mx_verified` | BOOLEAN | MX record present |
| `dkim_selector` | VARCHAR(255) | e.g. `default` |
| `verified_at` | TIMESTAMPTZ | When all records verified |
| `created_at` | TIMESTAMPTZ | |

`@@unique([project_id, domain])`

### `email.mailboxes`

Real IMAP/SMTP accounts. `local_part` is everything before `@`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `domain_id` | UUID | FK to `email.domains` |
| `local_part` | VARCHAR(255) | e.g. `john` |
| `password_hash` | VARCHAR(255) | bcrypt |
| `name` | VARCHAR(255) | Display name |
| `quota` | BIGINT | Bytes (default 10 GB) |
| `is_active` | BOOLEAN | Suspended = false |
| `stalwart_account_id` | VARCHAR(255) | Stalwart's internal account ID |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

`@@unique([domain_id, local_part])`

### `email.aliases`

Forwarding addresses — no password, no IMAP access.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `domain_id` | UUID | FK to `email.domains` |
| `local_part` | VARCHAR(255) | e.g. `sales` |
| `targets` | JSON | `[{type:"mailbox",mailboxId:"uuid"}]` or `[{type:"external",address:"foo@gmail.com"}]` |
| `description` | TEXT | Optional |
| `is_active` | BOOLEAN | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

`@@unique([domain_id, local_part])`

### `email.sender_identities`

API sending identities — no mailbox required.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `domain_id` | UUID | FK to `email.domains` |
| `email` | VARCHAR(255) | Full address, e.g. `noreply@example.com` |
| `name` | VARCHAR(255) | Display name, e.g. `No Reply` |
| `is_verified` | BOOLEAN | Auto-true if matching mailbox exists |
| `created_at` | TIMESTAMPTZ | |

`@@unique([domain_id, email])`

### `email.api_keys`

Programmatic sending keys — Resend-style.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `project_id` | UUID | FK to `projects.projects` |
| `name` | VARCHAR(255) | e.g. `Production`, `Staging` |
| `key_hash` | VARCHAR(255) | bcrypt of `ek_...` key |
| `last_used_at` | TIMESTAMPTZ | Updated on each API call |
| `created_at` | TIMESTAMPTZ | |

### `email.messages`

Metadata only — body and attachments stored in MinIO.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `mailbox_id` | UUID? | FK to `email.mailboxes` (null for sent messages) |
| `sender_identity_id` | UUID? | FK to `email.sender_identities` |
| `project_id` | UUID | FK to `projects.projects` |
| `from` | VARCHAR(255) | Sender address |
| `to` | VARCHAR(255) | Recipient address |
| `subject` | VARCHAR(500) | |
| `storage_key` | VARCHAR(1024) | MinIO key, e.g. `email/{projectId}/{msgId}.json` |
| `size_bytes` | BIGINT | |
| `is_read` | BOOLEAN | |
| `is_starred` | BOOLEAN | |
| `is_draft` | BOOLEAN | |
| `spam_score` | FLOAT | |
| `status` | `PENDING \| SENT \| DELIVERED \| BOUNCED \| FAILED` | |
| `error` | TEXT | SMTP error if failed |
| `created_at` | TIMESTAMPTZ | |

Indexes: `(mailbox_id, created_at)`, `(project_id, created_at)`

### `email.catch_all_rules`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `domain_id` | UUID | FK to `email.domains` |
| `target` | JSON | `{type:"mailbox",mailboxId}` or `{type:"external",address}` |
| `is_active` | BOOLEAN | |
| `created_at` | TIMESTAMPTZ | |

`@@unique([domain_id])`

---

## API Endpoints

### Domains
```
POST   /api/v1/projects/:projectId/email/domains
GET    /api/v1/projects/:projectId/email/domains
GET    /api/v1/projects/:projectId/email/domains/:domainId
DELETE /api/v1/projects/:projectId/email/domains/:domainId
POST   /api/v1/projects/:projectId/email/domains/:domainId/verify
POST   /api/v1/projects/:projectId/email/domains/:domainId/catch-all
DELETE /api/v1/projects/:projectId/email/domains/:domainId/catch-all
```

### Mailboxes
```
POST   /api/v1/projects/:projectId/email/mailboxes                      # → returns Outlook credentials once
GET    /api/v1/projects/:projectId/email/mailboxes
GET    /api/v1/projects/:projectId/email/mailboxes/:mailboxId
PATCH  /api/v1/projects/:projectId/email/mailboxes/:mailboxId
POST   /api/v1/projects/:projectId/email/mailboxes/:mailboxId/suspend
POST   /api/v1/projects/:projectId/email/mailboxes/:mailboxId/activate
POST   /api/v1/projects/:projectId/email/mailboxes/:mailboxId/reset-password
DELETE /api/v1/projects/:projectId/email/mailboxes/:mailboxId
```

### Aliases
```
POST   /api/v1/projects/:projectId/email/aliases
GET    /api/v1/projects/:projectId/email/aliases
PATCH  /api/v1/projects/:projectId/email/aliases/:aliasId
DELETE /api/v1/projects/:projectId/email/aliases/:aliasId
```

### Sender Identities
```
POST   /api/v1/projects/:projectId/email/sender-identities
GET    /api/v1/projects/:projectId/email/sender-identities
DELETE /api/v1/projects/:projectId/email/sender-identities/:identityId
```

### API Keys
```
POST   /api/v1/projects/:projectId/email/api-keys          # → key shown once
GET    /api/v1/projects/:projectId/email/api-keys         # no secrets
DELETE /api/v1/projects/:projectId/email/api-keys/:apiKeyId
```

### Send
```
POST   /api/v1/projects/:projectId/email/send
```

### Messages
```
GET    /api/v1/projects/:projectId/email/messages                       # folder=, unread= filters
GET    /api/v1/projects/:projectId/email/messages/:messageId
GET    /api/v1/projects/:projectId/email/messages/:messageId/content  # body from MinIO
PATCH  /api/v1/projects/:projectId/email/messages/read               # bulk mark read
PATCH  /api/v1/projects/:projectId/email/messages/:messageId/star
DELETE /api/v1/projects/:projectId/email/messages                     # MinIO cleanup
```

### Inbound
```
POST   /email/inbound/webhook   # Stalwart sieve notify (no project auth)
```

---

## Events Produced

| Event | Trigger |
|-------|---------|
| `email.domain_added` | Domain registered |
| `email.domain_verified` | DNS verification passes |
| `email.domain_deleted` | Domain and all mailboxes deleted |
| `email.mailbox_created` | Mailbox created (credentials returned once) |
| `email.mailbox_deleted` | Mailbox and messages deleted |
| `email.alias_created` | Alias created |
| `email.alias_deleted` | Alias deleted |
| `email.identity_created` | Sender identity created |
| `email.identity_deleted` | Sender identity deleted |
| `email.api_key_created` | API key created (raw key returned once) |
| `email.api_key_deleted` | API key revoked |
| `email.sent` | Message submitted to Stalwart SMTP |
| `email.received` | Inbound message stored from Stalwart webhook |

## Events Consumed

None.

---

## Service Dependencies

- **Stalwart** — JMAP management API (`/jmap`), SMTP submission (587), IMAP (993)
- **MinIO** — `fidscript-email` bucket for message body/attachment storage
- **DNS Provider** — Phase 07 Cloudflare wiring for DKIM/SPF/DMARC/MX records
- **Event Bus** — Phase 02 for `email.*` event fan-out

---

## Client Setup Credentials

When a mailbox is created, the API returns these values for Outlook/Thunderbird/mobile setup:

```json
{
  "email": "john@example.com",
  "imapHost": "mail.deploy.fidscript.com",
  "imapPort": 993,
  "smtpHost": "mail.deploy.fidscript.com",
  "smtpPort": 587,
  "username": "john@example.com",
  "password": "..."  // shown only once, never stored plaintext
}
```

---

## Security Notes

- Mailbox passwords stored as bcrypt hashes (not plaintext, not Argon2 in Postgres — Stalwart handles Argon2 internally)
- API keys stored as bcrypt hashes — raw `ek_...` key shown only once at creation
- Inbound webhook (`/email/inbound/webhook`) has no project auth — called by Stalwart sieve internally
- Tenant isolation enforced at every query via `projectId`

---

## Out of Scope

- Webmail UI (Phase 19 Dashboard)
- Calendar / CalDAV / CardDAV beyond Stalwart defaults
- Campaign / newsletter / broadcast
- Click/open tracking
- SMTP relay fallback (Resend/SES)
