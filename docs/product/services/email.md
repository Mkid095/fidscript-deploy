# Service: Email

Mail for the project's users: domains, mailboxes, aliases, sender identities, API keys, messages.
Powered by Stalwart (SMTP/JMAP) inside the platform.

## 1. Purpose
Send transactional mail (magic codes, deploy notifications, alerts) and receive mail (catch-alls,
webhooks) for the project — without paying for a third-party mail provider. The "one domain"
configured at install auto-configures MX, DKIM, SPF, DMARC.

## 2. Screens
- **Email** (sidebar §9): tabs *Domains / Mailboxes / Aliases / Identities / API Keys / Messages*.
- **Domain detail** (MAIL-03): verification checklist (DKIM/SPF/DMARC/MX), DNS instructions,
  ownership TXT, catch-all config.
- **Mailbox detail** (MAIL-08): quota, status, IMAP/SMTP connection, password reset.
- **Message viewer** (MAIL-26): HTML/text body, headers, attachments, star/read actions.

## 3. Data model
- `EmailDomain` — id, projectId, domain, status (`PENDING|VERIFIED|ACTIVE`), ownershipToken,
  dkimSelector, dkimVerified/spfVerified/dmarcVerified/mxVerified (booleans), emailProvider
  (auto-detected from MX), verifiedAt.
- `EmailMailbox` — id, domainId, email, name, passwordHash, quotaMb, isActive, imapHost/Port,
  smtpHost/Port, username. The password is **never returned** by any endpoint after create
  (reset-password is the only way to recover a lost one).
- `EmailAlias` — id, domainId, localPart, targets (`[{type: mailbox|external|webhook, ...}]`),
  isActive, description.
- `SenderIdentity` — id, domainId, email, localPart, name, isVerified.
- `EmailApiKey` — id, projectId, name, keyHash, scopes (`email.send`), dailyLimit (default 1000),
  monthlyLimit (default 30000), lastUsedAt.
- `EmailMessage` — id, projectId, mailboxId?, from, to, subject, text, html, status
  (`SUBMITTED|FAILED|BOUNCED`), isRead, isStarred, isDraft, folder, sentAt, attachments
  (metadata only).
- `EmailSuppression` — id, projectId, email, reason (`BOUNCE|COMPLAINT`), createdAt.

## 4. API mapping
- Domains: `MAIL-01..05` (add/list/get/verify/delete + catch-all `MAIL-30/31`).
- Mailboxes: `MAIL-06..13` (CRUD + suspend/activate + reset-password).
- Aliases: `MAIL-14..17`.
- Sender identities: `MAIL-18..20`.
- API keys: `MAIL-21..23` (`ek_…`, raw key shown once).
- Messages: `MAIL-24..29` (send + list + get + read/star/delete).
- **Webhooks (public, optional HMAC):** `MAIL-32` (inbound), `MAIL-33` (bounce), `MAIL-34`
  (complaint).

## 5. Realtime events
`email.{domain_added,domain_verified,domain_deleted,mailbox_created,alias_created,alias_deleted,
identity_created,identity_deleted,api_key_created,api_key_deleted,sent,received,bounced,complained,
webhook_triggered}` — the Messages and Domains tabs subscribe.

## 6. Settings
- **Add domain** auto-triggers DKIM/SPF/DMARC/MX verification; the wizard explains which TXT/CNAME
  records the user adds (or the platform does via Cloudflare if the zone is managed here).
- **Catch-all** per domain: `targetType: mailbox|external`, the target.
- **API keys** for programmatic sending (`POST /email/send` with `apiKeyId`); scopes, daily/monthly
  limits.
- **Suppression list** is auto-managed (hard bounce / complaint); not user-editable.

## 7. Automation
- **One domain → mail works** (Principle 1): add the domain → DKIM/SPF/DMARC/MX verified → send
  and receive mail.
- **Magic-code delivery** (from F02) reuses the same Stalwart SMTP path; outbox-bounded by
  per-key rate limit.
- **Suppression list** automatically blocks addresses that hard-bounced or complained.
- **Stalwart config** is rendered at install from `config.toml.template`; bcrypt-hashed admin token
  + system mailbox passwords are provisioned automatically.

## 8. Dependencies
- **Hard:** Stalwart container (`fidscript_stalwart`) + its admin token, the platform mail config
  (`mail.<domain>`, DKIM keys).
- **Soft:** Cloudflare (for automatic DNS / ACME / DKIM record creation — manual DNS works too).
- **Backend gaps** (from the audit — **be honest in the UI**):
  - Stalwart v0.15.5 lacks `deleteAccount`, `setAccountPassword`, `setAccountStatus`. Mailbox
    "suspend" only flips the DB `isActive` flag; it does **not** disable Stalwart login.
  - Mailbox-create DTO requires a `password` field, but the service **ignores** it and generates
    its own. The returned password is the generated one.
  - `MAIL-24` `folder` query only distinguishes inbox vs drafts.
  - Email services **don't** check project-membership — they rely on path-scoping. UI must
    reflect this (any authenticated user with the projectId in the URL can act on that project).
  - Webhooks (`MAIL-32/33/34`) are "secured" by HMAC **only if `STALWART_WEBHOOK_SECRET` is set**.
    If unset, they are open. Document this prominently.

## 9. Phase
**F11 (Email/Domains/Monitoring/Logs/Settings/MCP UI)** — pending spec.
