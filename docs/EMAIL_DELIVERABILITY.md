# Email Deliverability Roadmap

> **Scope lock (2026-06-19):** FIDScript Deploy is a **self-hosted** mail server for the *operator's own* domains and apps — a private alternative to (VPS + Zoho/Namecheap-email + Resend + a PaaS). It is **not** a public Email-as-a-Service (Mailgun/Resend/Postmark/SES/SendGrid). That distinction decides what we build.
>
> This doc is the source of truth for deliverability scope. Update it when scope changes. See `docs/phases/phase-09.md` for the email platform implementation, and `docs/AUDIT.md` §C (Email) for current state.

---

## Product positioning (why scope is small)

The operator owns the server and all the domains on it. There are no unrelated paying senders to police, no shared-IP reputation to isolate between tenants, no marketing/bulk blasts to ramp. Therefore the EaaS-grade machinery — separate reputation pools, automated warm-up, AI content scoring, customer reputation engines, human moderation, multi-IP pools — is **out of scope** until the product actually becomes a public EaaS.

What the operator *does* need: their own mail reliably reaching the inbox, and the tools to debug it when it doesn't.

---

## The keep / skip decision (locked)

**Build** — essential for any self-hosted mail server that wants inbox placement:

| Layer | Why it fits self-host | Status |
|---|---|---|
| Outbound reputation (SPF/DKIM/DMARC/PTR/HELO/TLS) | Without it, the operator's own mail hits spam | ✅ done 2026-06-19 (PTR pending operator action) |
| DNS verification → ACTIVE, with **DEGRADED** on later drift | DNS *will* drift; one-time verify is not enough | 🟡 partial — verifies SPF/DKIM/DMARC/MX; no PTR/TLS check, no DEGRADED |
| Continuous DNS health monitoring | Catch breakage before it blackholes mail | 🟡 partial — `domain-health.service.ts` does BROKEN/RECOVERED for web domains; not yet for email domains |
| Bounce classification (SMTP code → hard/soft/policy/spam/dns/tls/transport) | "Why didn't my mail arrive?" | 🟡 partial — `EmailMessage.status=BOUNCED` + `bounce-handler.service.ts`; no code/classification breakdown |
| Suppression list | Never re-mail dead/complained addresses | ✅ exists (`email.suppressions`: BOUNCE/COMPLAINT/UNSUBSCRIBE/MANUAL) |
| Rate limiting (per mailbox / identity / API key / project; min/hour/day) | Stop one runaway app from looking spammy | 🟡 partial — daily/monthly + catch-all `messagesPerMinute`; needs the finer dimensions |
| Outbound queue management (inspect / retry / cancel / view SMTP response) | The #1 ops feature: "my email didn't arrive" | ❌ Stalwart owns the queue; we need to expose it |
| Delivery logs + timeline (Queued→Submitted→Accepted→Delivered→…) | Developer debuggability | 🟡 partial — platform status exists; remote MX/TLS/250-OK chain + Delivered/Open/Click do not |
| Blacklist monitoring (Spamhaus/Barracuda/SORBS/UCEPROTECT, MS SNDS) | "Am *I* blocklisted?" — cheap, high-value | ❌ net-new scheduled job |
| Sender-health metrics (per-identity delivery/bounce/complaint %) | Light, no engine — just counters | ❌ net-new (light) |

**Skip** — EaaS/multi-tenant governance, not this product (revisit only if FIDScript becomes a public EaaS):

- Separate transactional/hosted/bulk streams — one SMTP pool is correct for the operator's own mail.
- Automated warm-up ramp — only for high-volume new-IP marketing sending.
- AI/content spam scoring — poor ROI; SpamAssassin can score inbound if ever needed.
- Customer reputation engine (0–100 tiers, captcha/manual-approval) — there are no external customers to govern.
- Human moderation / auto-freeze — same.
- Multi-IP reputation pools — only when multiple outbound SMTP servers exist.
- Full feedback-loop (FBL) ingestion — a light complaint counter suffices for now.

---

## Roadmap

### Phase A — Essential (reliability + debuggability)
1. **Prereq: fix Stalwart log output** — `/opt/stalwart/logs` is never created, so transaction logs vanish. Without this, delivery logs / SMTP diagnostics are impossible.
2. **Bounce classification** — capture SMTP code + message on `EmailMessage`, classify (hard/soft/policy/spam/dns/tls/transport). Feeds suppression + dashboards.
3. **DEGRADED domain state** — extend email-domain health (mirror web `domain-health.service.ts`); re-check SPF/DKIM/DMARC/MX + add PTR/TLS/HELO; transition ACTIVE→DEGRADED on breakage, auto-recover.
4. **Expose the outbound queue** — surface Stalwart's queue (`stalwart-cli queue` / management API) as an admin API: list queued/deferred/retrying/failed, retry, cancel, view remote SMTP response. (Stalwart already retries 4xx and bounces 5xx — we expose, we do **not** rebuild the retry engine.)
5. **Delivery logs / timeline** — capture the remote-MX → TLS → 250-OK → queue-id chain per message; surface in a per-message timeline.
6. *(Have)* suppression list, simple rate limiting.

### Phase B — Operational (visibility)
7. **Blacklist monitoring** — scheduled DNSBL check of the sending IP(s); alert on listing with provider + impact.
8. **Sender-health metrics** — per-identity delivered/bounce/complaint %, "Healthy / Needs attention" flag. Counters only, no scoring engine.
9. **Domain-health dashboard** — the per-domain ✅/⚠ grid (DNS/SPF/DKIM/DMARC/PTR/TLS/Blacklist/SMTP/IMAP/JMAP + Health %).
10. **SMTP diagnostics** — delivery timeline + queue + logs rolled into a per-message debug view.

### Phase C — Future (only if FIDScript becomes a public EaaS)
Separate reputation pools · warm-up automation · dedicated IPs · customer reputation scoring · abuse detection · FBL ingestion · marketing/bulk infrastructure.

---

## Known gaps discovered (2026-06-19)

- **Mailbox IMAP/SMTP login fails.** Mailboxes created via `StalwartAccountService.createAccount` store the password as **plaintext** in the principal's `secrets`. Stalwart's default `passwordHashAlgorithm = argon2id` does not accept it on `AUTHENTICATE PLAIN` — the connection is dropped after auth. **Impact:** outbound sending (admin-token auth) and inbound delivery both work; only *reading* a hosted mailbox via IMAP/SMTP/JMAP login is broken. **Fix (Phase A):** hash the password before storing (argon2id/bcrypt to match `passwordHashAlgorithm`), or store with the right scheme prefix so Stalwart verifies it.
- **`stalwart-cli export account` from inside the container is broken** after setting `server.hostname = mail.<domain>`: the JMAP session advertises `http://mail.<domain>:8080/jmap/`, which is unroutable from inside the container (only `fidscript_stalwart:8080` is). The platform's `StalwartJmapService` is unaffected (it connects to the docker hostname directly). External JMAP clients use `jmap.<domain>` via Traefik, which is correct. Cosmetic only.

---

## Architecture note: Stalwart is the MTA

Stalwart owns: outbound queue, retry/backoff schedule, per-transaction SMTP logging, TLS negotiation, MX delivery. The platform (NestJS) owns: control plane (domains, identities, mailboxes, API keys, suppression, events, dashboards). **Phase A's queue/retry/log work is exposing Stalwart's behavior + capturing its events into our schema — not reimplementing an MTA in the app.** Delivery events flow Stalwart → platform via the existing webhook/bounce pipeline (extend it), not by polling the queue for state.

---

## Estimated coverage
For FIDScript as it exists today, Phases A + B deliver ~90% of the practical reliability and troubleshooting capability expected of a modern self-hosted email platform, without taking on multi-tenant EaaS complexity. Phase C is deferred until scope requires it.
