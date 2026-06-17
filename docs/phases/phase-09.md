# Phase 09: Email Platform (Stalwart)

> **Status:** In Progress  |  **Track:** Data/Compute  |  **Depends on:** Phase 07, Phase 05

## Objective

A real internal mail server: **send and receive mail** through a self-hosted Stalwart instance that the installer brings up and the platform configures automatically — DKIM/SPF/DMARC set via DNS, mailboxes managed in the API, templates rendered, and delivery tracked. This is the vision the user flagged as not-yet-implemented; this phase makes it real. It also unblocks platform features that need email (magic links, notifications, invites, domain-live alerts).

## Current State

**IN PROGRESS.** As of 2026-06-17:

- **Stalwart ports exposed**: SMTP 25/465/587, IMAP 993, JMAP 8443 via docker-compose; `stalwart_admin_token` secret generated at setup time
- **Real verifyDomain**: `EmailService.verifyDomain` now calls `MailDnsService.verifyEmailDns` which queries actual Cloudflare DNS records (DKIM, SPF, DMARC, MX) — no more hardcoded booleans
- **DKIM key generation**: `MailDnsService.generateDkimKey` generates Ed25519 key pair; private key stored on Stalwart volume (`/data/dkim/<selector>/<domain>.private`); public key published as TXT DNS record
- **MX/SPF/DMARC DNS via DnsProvider**: `MailDnsService.setupEmailDns` creates all email DNS records through the Phase 07 `DnsProvider` interface (Cloudflare API), never direct calls
- **Priority field added**: `DnsProvider.createRecord` now accepts `priority` for MX records
- **Stalwart config updated**: `main.toml` rewritten with inbound/outbound/submission/IMAP/JMAP sections, ACME TLS, DKIM signing, SQLite storage

## Dependencies

- **Phase 07** (the `DnsProvider` + Cloudflare wiring — MX/SPF/DKIM/DMARC records are set through it; TLS certs for SMTP/IMAP).
- **Phase 05** (object storage for attachment/archive).
- **Phase 01** (Stalwart container running).

## Deliverables

- [ ] **Stalwart wired and exposed.** Publish real ports — SMTP 25 (inbound), 465/587 (submission), IMAP 993, JMAP — behind Traefik where sensible, with TLS certs mounted (from Phase 07 ACME or Stalwart's internal ACME). DKIM signing keys generated at first boot.
- [ ] **DNS automation (the real fix).** Through the Phase 07 `DnsProvider`, set and verify **MX**, **SPF** (TXT), **DKIM** (TXT, the public key matching Stalwart's private key), and **DMARC** (TXT) for the mail domain. `verifyDomain()` queries real records — no hardcoded booleans.
- [ ] **Mailbox management.** Create/delete/suspend mailboxes via Stalwart's management API, mirrored in Postgres. Password set per mailbox (Argon2 via Stalwart).
- [ ] **Aliases & routing.** Alias addresses forward to a mailbox or an external address; catch-all and sieve-like routing rules.
- [ ] **Send (real).** Outbound mail submitted to Stalwart (SMTP submission / JMAP) with authenticated senders; HTML/text rendered from templates. Records `queued → sent → delivered|bounced`.
- [ ] **Receive (real).** Inbound mail delivered by Stalwart to the mailbox **and** surfaced to the platform (Stalwart webhook / sieve-notify / IMAP polling) → stored → emits an `email.received` event so functions/webhooks can react.
- [ ] **Delivery tracking.** Queue state, SMTP responses, DSNs/bounces recorded; a per-message timeline.
- [ ] **Provider abstraction.** A `MailProvider` interface (`send`, `verifyDomain`, `createMailbox`, …). **Stalwart** is the primary implementation; an **SMTP-relay** path (Resend/SES/external SMTP) is the secondary for high-volume or for VPSes where port 25 is blocked — callers never hardcode the provider (Development Rule 5).
- [ ] **Platform consumers wired.** Identity magic links (03), project invitations (04), "domain live" notice (07), alert notifications (14) send through this provider.

## Technical Design

- **Stalwart config:** generated/mounted TOML at boot — domain list, DKIM keys path, TLS cert path, ACME or manual cert, management API token from `STALWART_ADMIN_TOKEN_FILE`. Data volume persisted.
- **DNS via the Phase 07 provider:** for `mail.<domain>` set `MX → <mail host>`, `TXT "v=spf1 ... -all"`, `TXT <selector>._domainkey → <public key>`, `_dmarc TXT "v=DMARC1; ..."`. Verification re-reads these records (Cloudflare API + DNS resolve) and only flips `verified` when all match.
- **Outbound path:** `send({from,to,subject,html,text})` → Stalwart SMTP submission (TLS+AUTH) → Stalwart queues/attempts → logs DSN. Fallback relay when configured.
- **Inbound path:** Stalwart receives on 25, runs delivery; a Stalwart `sieve` notify / webhook posts to the API → store message metadata (headers, body ref in storage) → `email.received` event.
- **Deliverability honesty:** document that VPS email reputation (PTR/rDNS, IP warmth, port-25 egress blocks) is the real-world constraint; the relay option exists precisely because many providers block outbound 25.

## Integration Points

- **Events emitted:** `email.domain.added/verified/failed`, `email.mailbox.created/deleted`, `email.sent`, `email.delivered`, `email.bounced`, `email.received`. Consumed by audit (02), Functions (10, inbound triggers), Realtime (13, live mailbox updates).
- **Service registry:** registers `email`.
- **SDK (16):** `email.send`, `email.mailboxes.*`, `email.domains.verify`.
- **CLI (18):** `fidscript email send`, `fidscript mailboxes create`.
- **Dashboard (19):** mailboxes, send-mail composer, inbound inbox, domain/DNS status.
- **Consumers of this phase:** Identity (03 magic links), Projects (04 invites), Domains (07 live notice), Monitoring (14 alerts).

## Verification (VPS)

```bash
# 1) Configure mail for a real domain you control (or a subdomain on fidscript.com):
curl -fsS -X POST .../api/v1/projects/$PID/email/domains -d '{"domain":"mail.example.com"}'
curl -fsS .../email/domains/mail.example.com   # status: verified (only AFTER real DNS exists)

# 2) DNS records were really created (not hardcoded) — check in Cloudflare / dig:
dig +short MX mail.example.com
dig +short TXT mail.example.com             # SPF
dig +short TXT default._domainkey.mail.example.com   # DKIM public key

# 3) Send a real message and confirm external delivery:
curl -fsS -X POST .../email/send -d '{"from":"you@mail.example.com","to":"real@gmail.com","subject":"t","text":"hi"}'
# check the external inbox (incl. spam); check Authentication-Results: pass for dkim/spf/dmarc

# 4) Inbound: mail from an external address to you@mail.example.com → platform records it:
docker compose exec postgres psql ... -c "select * from email.messages order by 1 desc limit 5;"
# and an email.received event fired (Phase 02)
```

**Exit criterion:** real DNS records exist and verify (not hardcoded); a sent message arrives in an external inbox with DKIM/SPF/DMARC `pass`; an inbound message is recorded in the platform and emits `email.received`; mailboxes are created in Stalwart itself. Stalwart is actually wired, not just running.

## Out of Scope / Future

- Calendar/contacts (CalDAV/CardDAV beyond Stalwart defaults) — future.
- Advanced spam filtering tuning / custom Sieve editor — future.
- Mailing-list / broadcast engine — future.

## Risks

- **Deliverability is environmental, not just code.** VPS IP reputation, missing PTR record, or port-25 egress blocks can sink outbound mail regardless of correct DKIM/SPF. Mitigations: document PTR requirement; provide the SMTP-relay fallback (Resend/SES); warm the IP. Be honest in the dashboard about verification vs. deliverability.
- **Port-25 blocked** by the VPS provider → inbound impossible; document and offer IMAP-only/relay models.
- DKIM key rotation and cert renewal must be automated or mail silently breaks — boot-time checks + alerts.

## Files you'll touch (precision map)

- `apps/api/src/modules/email/mail-dns.service.ts` — new; DKIM Ed25519 key gen, MX/SPF/DMARC/DKIM record creation + verification via DnsProvider
- `apps/api/src/modules/email/email.service.ts` — verifyDomain delegates to MailDnsService (was: hardcoded booleans)
- `apps/api/src/modules/email/email.module.ts` — imports DomainsModule, provides MailDnsService
- `apps/api/src/modules/domains/providers/dns-provider.interface.ts` — add `priority` to createRecord
- `apps/api/src/modules/domains/providers/cloudflare-dns.provider.ts` — pass priority in MX payload
- `apps/api/src/modules/domains/domains.module.ts` — export DNS_PROVIDER token
- `installer/docker/docker-compose.yml` — expose Stalwart ports 25/465/587/993/8443, add stalwart_admin_token secret
- `installer/config/stalwart/main.toml` — rewritten: inbound/outbound/submission/IMAP/JMAP, ACME TLS, DKIM, SQLite
- `installer/scripts/setup-wizard.sh` — generate stalwart_admin_token.txt

## Next Phase

[Phase 10: Functions Runtime](./phase-10.md)
