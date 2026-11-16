# Webmail platform — architecture and implementation plan

Companion to `DISCOVERY.md` (the survey findings). This is the plan the
implementation follows. Decisions are stated as decisions; open ones are marked.
`STATUS.md` is where the implementation stands: what is built, what was
verified against the live Stalwart, the backup drill, the license.

## 1. What we are building

A complete webmail management platform on Stalwart, as an independent
application in **`apps/webmail/`**:

- Its own Next.js app (App Router, TypeScript, Tailwind) with its own
  `package.json`, config, env, auth, and deployment files.
- It must run **standalone on any VPS** (its own Stalwart, its own DB) **and**
  inside the FIDScript stack. Same code and business logic in both; FIDScript
  is one integration/provisioning layer, not a dependency.
- Full flow: dashboard, inbox, compose, threads, folders, spam, contacts,
  settings (identities, signatures, forwarding, filters, vacation), search,
  admin account/domain/alias management, and a mail-health/deliverability
  module.

Stalwart is the **authoritative source of truth** for mail: accounts,
mailboxes, messages, drafts, threads, spam state, quotas. The webmail app
stores **only** what is not in Stalwart: app users/sessions, templates,
audit log, abuse/bounce suppression lists, deliverability findings. No
parallel message database — that would be a fake integration.

## 2. The two credentials, kept strictly apart

The platform has two auth concerns and they stay separate everywhere:

1. **App sign-in** (who is using the webmail).
2. **Stalwart mailbox auth** (proving the mailbox exists / talking JMAP as it).

### App sign-in

- **Admin user**: one platform admin, created on first boot (email +
  password, stored argon2-hashed in the app DB). All *admin* operations
  (create/delete/suspend mailboxes, domains, aliases, quotas) go through this
  role.
- **Mailbox user**: anyone with a Stalwart mailbox signs in with
  `name@domain` + their mailbox password. The app **verifies** it against
  Stalwart (a JMAP call as that user, or SMTP AUTH) before opening a session —
  the mailbox password is never stored in the app DB; Stalwart owns it.
- Sessions: HttpOnly + Secure + SameSite=Lax cookie; per-IP rate limiting on
  login; CSRF tokens on state-changing routes; audit log entry per sign-in.
- Cross-project isolation: a mailbox session sees **only** its own account;
  admin sessions manage accounts by explicit admin action and every one is
  audit-logged.

### Privileged Stalwart access

- Admin JMAP calls (`x:Account`, `x:Domain`, `x:Certificate`, …) run
  **server-side only**, with the Stalwart admin credential from env
  (`STALWART_ADMIN_USER`/`STALWART_ADMIN_PASSWORD` — the recovery-admin pair;
  the FIDScript API already runs these with the same credential).
- Per-mailbox JMAP calls run server-side with that mailbox's own credential.
- The browser **never** sees either credential; it talks only to our API
  routes. (This is also what makes per-page navigation password-free: the
  cookie session covers the whole visit.)

## 3. Data ownership

| Data | Lives in | Notes |
|---|---|---|
| Mailboxes, passwords, quotas, spam state, messages | Stalwart | `x:Account`, `Email/*`, keywords |
| Domains + DKIM policy | Stalwart | `x:Domain` |
| Identities, signatures | Stalwart | `Identity/*` |
| Sieve filters, vacation | Stalwart | `SieveScript/*`, `VacationResponse/*` |
| App admin user, app sessions | app DB | |
| Email templates | app DB | HTML/text + category (Stalwart has no template store) |
| Audit log | app DB | every admin action, every sign-in |
| Abuse/bounce/complaint suppression | app DB | enforced at our submission proxy |
| Deliverability findings | app DB (cache) | computed on demand, never "verified" by assumption |

App DB: **SQLite** (zero-ops, single-file backup/restore) by default,
Postgres via `DATABASE_URL` if desired. Prisma in both.

## 4. JMAP integration pattern

- A small server-side JMAP client (no external dep; batched method calls,
  `X-Stalwart-Session-State` handling, error envelope parsing) — mirroring
  what `StalwartEmailProvider` already does in the FIDScript API, but
  standalone (the webmail app does **not** import FIDScript code).
- **Mailbox read/sync**: `Mailbox/query` → `Email/query` + `Email/get` with
  per-mailbox session states; `Email/changes` + `Mailbox/changes` for
  incremental sync; `Thread/get` for threading; EventPush (`st:PushSubscription`)
  where available, with changes-polling as the fallback. No tight polling.
- **Compose/send**: `EmailSubmission/set` + `Email/save` (drafts) + `blob`
  upload for attachments. Identities from `Identity/get`.
- **Search**: `Email/query` `text`/`from`/`to`/`subject`/`keyword`/`date`
  filters — JMAP-native, not our own index.
- Admin: `x:Account/set` create/update/destroy, `x:Domain/set`,
  `x:Certificate` for TLS, quotas via the account's `quotas`.

## 5. FIDScript integration mode

When deployed inside the FIDScript stack (one extra compose service, no code
branch):

- A project **owns its mail domain** — the `<project>.fidscript.com`
  subdomain (or a domain of the project's own, via the existing one-domain-per
  project rule). Mailboxes are `name@<that-domain>`.
- Provisioning (domain exists in Stalwart, MX/SPF/DKIM/DMARC records, system
  mailboxes) is driven by the **FIDScript API**, which is authoritative for
  project/domain business rules; the webmail's admin surface calls the same
  admin JMAP methods and stays consistent with the project's domain state.
- The webmail never writes FIDScript's Postgres directly; it reads project
  context through the FIDScript API (or its own env in standalone mode).

## 6. Mail health & deliverability module

Server-side checks that **actually look at the world** (no simulated
green):

- **Infrastructure**: A/AAAA/MX/PTR lookups, forward-confirmed rDNS, SMTP
  banner + EHLO, port-25/465 connectivity, TLS cert chain/validity, IP
  reputation (blocklist queries), HELO identity.
- **DNS authentication**: generate the exact records Stalwart wants (from
  its `dnsZoneFile` + DKIM selectors) and **verify each one with a real
  lookup**; validate SPF syntax and the DNS-lookup limit; publish-only on
  request (or via the project's Cloudflare connection in integrated mode).
  **State is `pending` until a lookup confirms it — never "written".**
- **Inbound spam**: expose Stalwart's spam settings (threshold, DNSBL,
  SPF/DKIM/DMARC checks, greylisting, Sieve junk routing) with admin controls;
  configurable policy, no auto-discard of legitimate mail.
- **Outbound abuse protection** (app-level, enforced at our submission proxy):
  per-user / per-domain / per-tenant send rate + daily limits, recipient
  caps, new-account sending restrictions, anomaly flags (sudden volume,
  unusual external domains), queue throttling, temporary suspension, audit
  log; bounce processing (hard/soft/repeat + invalid-recipient suppression
  lists) and complaint handling where the receiving provider feeds back.
- **Reporting**: DNS health, authentication, reverse DNS, TLS, blocklist,
  outbound queue, bounce, complaint, sending-volume, and abuse reports —
  each clearly labelled *verified configuration* vs *observed behaviour*
  (no inbox-placement guarantees are claimed anywhere).

## 7. HTML email design, templates, campaigns

- **Composer**: rich-text editor (contenteditable, email-safe subset), plain
  HTML/CSS source editor, live preview, sanitization on save (no scripts,
  no `javascript:` URLs), plain-text alternative generated from HTML.
- **Templates**: stored in app DB; import/export HTML; category; test-send;
  initial starter set (business letter, receipt, invoice, notification,
  newsletter, announcement).
- **Campaign**: *architecture reserved, not implemented* — a
  `CampaignModule` interface with subscriber/consent/unsubscribe/schedule/
  throttle/suppression seams, **disabled by default**, so bulk sending is
  opt-in and bounded. No unlimited mass-send path.
- MJML: optional later compile step; the safe-HTML pipeline is the baseline.

## 8. Deployment

Two configurations, one app:

- **Standalone**: `apps/webmail/docker-compose.yml` + `Dockerfile` (Next
  standalone output), reverse-proxy (Caddy/nginx) with HTTPS, env file
  (documented), Stalwart reachable via `STALWART_URL`. Backup = `sqlite`
  file + Stalwart RocksDB volume; restore procedure in `README`.
- **FIDScript-integrated**: added to the platform compose file as one service
  on the platform network; Stalwart + Traefik already present; its own route
  (`webmail.<platform-domain>`). No shared image with the console.

## 9. Phases (working app at the end of each)

1. **Scaffold + connect**: app structure, auth (admin boot + mailbox
   sign-in), JMAP client, admin JMAP calls; a login that actually proves a
   mailbox against Stalwart. *Depends on: a mailbox existing (phase-2 work
   is interleaved here — we create the first real account to test against).*
2. **Domain + mailbox management**: create/suspend/delete mailboxes, quotas,
   aliases, domains; admin UI over it; plus the FIDScript
   `email-bootstrap` FK fix so system mailboxes exist.
3. **Inbox + sync**: message list/read, threads, unread counts, incremental
   sync + push, folder operations (create/rename/move/delete).
4. **Composer**: compose/reply/forward/drafts, attachments (upload),
   identities + signatures, send via `EmailSubmission`.
5. **Spam/search/contacts**: spam folder + training where Stalwart supports
   it (else honest "not supported" state), JMAP search, contacts (investigate
   JMAP contacts support first — persistence decision pending that result).
6. **Settings**: forwarding, Sieve filters (via Stalwart), vacation
   responder, storage view, security (password change, sessions where
   Stalwart supports it).
7. **Admin + deliverability**: audit log, abuse/bounce/complaint handling,
   send-limit enforcement, the full mail-health module with real checks.
8. **Ship**: integration tests against the live Stalwart, deployment
   verification, hardening, backup/restore docs, license/dependency review.

## 10. Dependencies and blockers (from discovery)

- **Fix first (FIDScript side, small)**: the `email-bootstrap` foreign-key
  failure (`PLATFORM_PROJECT_ID` unset) — blocks the system mailboxes and the
  inbound-webhook domain registration. §4 of DISCOVERY.
- **Port-25 outbound** unconfirmed (provider may block it) — blocks genuine
  outbound deliverability; everything else is testable now.
- **Apex DNS** (MX/SPF/DMARC/DKIM for fidscript.com + the project subdomain)
  unpublished/pointing at the registrar — blocks real inbound/outbound for
  the platform domain; self-service via the Cloudflare token.
- **Stalwart admin UI OIDC issuer** is the container hostname — independent
  bug (DISCOVERY §6); the webmail's own admin UI is not affected.
- Contact/address-book persistence: **investigate Stalwart's JMAP Contacts
  support before choosing** (phase 5) — may need a `st:AddressBook`
  capability check; if absent, contacts live in the app DB and that decision
  is documented.
