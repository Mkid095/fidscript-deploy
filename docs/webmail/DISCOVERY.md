# Webmail platform — discovery report (read-only survey, 2026-11-09)

Mandate: inspect the existing Stalwart installation, the VPS mail path, and the
FIDScript email architecture **without making production changes**. Result: what
is configured, what is missing, what is broken, what needs the provider.

Everything below was observed live on the running VPS. No records were written,
no services restarted.

## 1. Stalwart installation

| Item | Finding |
|---|---|
| Image / version | `stalwartlabs/stalwart:v0.16.10` (container `fidscript_stalwart`, healthy) |
| Storage | RocksDB on the `fidscript_stalwart` volume. `config.json` bind-mount carries **only** the data-store location — v0.16 keeps every other setting in the DB, managed at runtime through the admin surface |
| Recovery admin | `STALWART_RECOVERY_ADMIN=user:password` (env), plain `name:password` |
| Mail ports | `25`, `465`, `993` published on `0.0.0.0`; container also listens on `443` (TLS), `995`, `4190` — internal only |
| HTTP listener | container `8080` → host `127.0.0.1:8090` (platform internal) and `127.0.0.1:8091` (Traefik loopback) |
| Public routes | `jmap.fidscript.com`, `stalwart-admin.fidscript.com` → `fidscript_stalwart:8080` via Traefik, `priority: 100`, Let's Encrypt DNS-01 — both reachable today (302/307 to the Stalwart UI) |
| License | Stalwart Mail server: AGPL-3.0-or-later (single binary). The webmail app is our own code; it must stay a clean-room application that talks JMAP/REST to Stalwart, not a fork of it |

### 1.1 The management surface is JMAP, not REST (v0.16)

The pre-0.16 REST management API (`/api/manager/...`, `/api/principal`) is **gone**
in this build — those routes 404. Admin operations now go through the standard
JMAP endpoint (`POST /jmap`, HTTP Basic auth) under the `urn:stalwart:jmap`
capability, using `x:`-prefixed methods. Verified live against this install:

- `x:Domain/get`, `x:Domain/set` (create-or-update, destroy) — **works**
- `x:Account/get`, `x:Account/set` (multi-variant: `User`, `Group`), `x:Account/query` — **works**
- `x:Certificate/get`, `x:Tenant/get` — exist (empty lists)
- `x:Queue/get`, `x:Config/get`, `x:SpamConfig/get`, `x:Key/get` — **not** method names
  in this build (unknownMethod); queue/config administration is covered separately
  (docs research open)
- `x:Log/get` — answered `serverUnavailable` once; the log module was flapping

The FIDScript API already wraps the working methods behind its `IEmailProvider`
(`apps/api/src/modules/email/providers/stalwart-email.provider.ts`) — domain,
mailbox (account), alias (group), password, enable/disable, quotas. The webmail
reuses that provider pattern; it does **not** reinvent the endpoints.

### 1.2 JMAP capability set (public well-known, verified)

`https://jmap.fidscript.com/.well-known/jmap` advertises:

`core`, `mail`, `calendars`, `calendars:parse`, `contacts`, `contacts:parse`,
`filenode`, `principals`, `principals:availability`, `submission`,
`vacationresponse`, `sieve` (Stalwart sieve engine v1.0.0), `blob`,
plus EventPush primitives (`PushSubscription`/`EventSource` were present in the
admin's permission set). Upload limits: 50 MB per upload, 500 objects per get/set,
16 calls per request.

This is the full surface a webmail needs: read/query/sync, compose+submit,
attachments, identities, signatures, threads, filters (Sieve), vacation
responder, contacts, push.

### 1.3 What Stalwart knows today

- One domain: `fidscript.com` (id `b`), created by the installer, with
  `subAddressing: Enabled`, `allowRelaying: false`, `dnsManagement: Manual`,
  `certificateManagement: Manual`, and an **automatic DKIM** policy
  (ed25519 + rsa, 90-day rotation, selectors `v1-<alg>-<date>`).
- Stalwart generated a full `dnsZoneFile` for it: MX, `v=spf1 mx -all`,
  DMARC `p=reject`, DKIM keys, MTA-STS, TLS-RPT, SRVs, autoconfig. Two defects
  in that generated zone: the MX points at the **container hostname**
  (`c170d7843154.`) and the DMARC report address is a bare `mailto:postmaster`.
- **Zero accounts** (`x:Account/get` → empty). The system mailboxes the
  platform is supposed to have (`postmaster@`, `alert@`, `noreply@`) do not
  exist — see §4.

## 2. The public network path

| Check | Result |
|---|---|
| Public IPv4 | `72.61.89.110` |
| Public IPv6 | egress present (`2a02:4780:…`, Hetzner-range) but **no AAAA record** for fidscript.com |
| PTR | `mail.fidscript.com.` ↔ `72.61.89.110`, and `A mail.fidscript.com = 72.61.89.110` — **forward-confirmed rDNS: good** |
| Nameservers | Cloudflare (`felipe`/`val.ns.cloudflare.com`) |
| `MX fidscript.com` | **→ `eforward1..5.registrar-servers.com` (eNom parking). The apex MX was never repointed after the Cloudflare cutover.** |
| `TXT fidscript.com` (SPF) | **`v=spf1 include:spf.efwd.registrar-servers.com ~all` — the registrar's SPF, not ours** |
| DMARC / DKIM / MTA-STS / TLS-RPT at apex | **absent** |
| `demo.fidscript.com` mail DNS | **nothing at all** (no MX/SPF/DMARC/DKIM) — see §4.2 |
| Host firewall | `INPUT` policy `ACCEPT`, no drops on 25/465/993/443; ufw inactive — inbound mail ports are reachable |
| Port-25 **egress** | **Unverified from inside this VPS** (this environment's resolver cannot look up external MX names, so the banner probe was inconclusive). Needs provider confirmation |
| SMTP/IMAP TLS | Stalwart's auto-generated `rcgen` self-signed cert (validity 1975–4096). Works for internal submission (`rejectUnauthorized:false`, which the platform already uses); external clients would need cert pinning or a real certificate |

## 3. What is configured and healthy

- Public JMAP + admin-UI routes with valid Let's Encrypt certs.
- Stalwart reachable from the platform network at `fidscript_stalwart:8080`
  (that is what the FIDScript API's `STALWART_JMAP_URL` points at).
- SMTP submission on `465` used by the platform's outbound mail (token auth).
- Webhook plumbing is provisioned (`STALWART_WEBHOOK_SECRET` loaded at API boot).
- Reverse DNS is set and forward-confirmed.
- Stalwart's DKIM auto-rotation policy is configured (keys exist, selectors
  `v1-ed25519-20261106` / `v1-rsa-20261106` — but **not published** in DNS).

## 4. What is broken (live, in the FIDScript API today)

### 4.1 The email bootstrap fails on a foreign key — system mailboxes never created

On API boot, `EmailBootstrapService` upserts the platform's `EmailDomain` row with
`PLATFORM_PROJECT_ID` defaulting to `00000000-…` because the env var is unset.
The real platform project is `cc42b53b-c6d0-40ad-849f-1e982a6d10e2` ("Fidscript"),
so the upsert dies: `Foreign key constraint violated: domains_project_id_fkey`.
Everything after that line is skipped — including creating
`postmaster@/alert@/noreply@fidscript.com` in Stalwart, and registering
`fidscript.com` for the inbound webhook. Consequences today:

- No `postmaster@fidscript.com` (RFC 5321 requirement for a working MX).
- The inbound webhook would answer "Domain not found" for fidscript.com mail.
- The API log shows `Email bootstrap skipped: <Prisma FK error>` on every boot.

### 4.2 `demo.fidscript.com` reports "VERIFIED" with zero verification

`email.domains` row: status `VERIFIED`, but `mx_verified/spf_verified/
dkim_verified/dmarc_verified` are all **false**, and the public DNS for
`demo.fidscript.com` contains **no mail records at all**. The status was
flipped on record *submission*, not on confirmation — exactly the
"never show it as written" defect. The readiness flags must be driven by
actual lookups.

## 5. What requires the infrastructure provider (or registrar)

1. **Port-25 outbound** from this VPS — unconfirmed. If the provider blocks it,
   outbound delivery to the internet fails and we need either a provider
   unblock or a relay submission account.
2. **PTR/rDNS** is under provider control today and is set correctly — keep it
   stable; any IP change must update PTR.
3. The fidscript.com zone is in Cloudflare, so the MX/SPF/DMARC/DKIM/MTA-STS
   repairs in §2 are **self-service** (our CF token) — no provider ticket, but
   they are prerequisites for inbound mail to the platform domain.

## 6. Stalwart admin UI sign-in (the open stalwart-admin issue)

`/admin/login` is an OAuth/OIDC flow whose issuer is the **container hostname**
(`https://c170d7843154`) — Stalwart's public URL is unset, so discovery points
the browser at an unreachable host. REST Basic auth works for admin calls. The
fix is a Stalwart runtime setting (public URL + an OAuth client), which the
webmail's admin surface makes largely unnecessary: the webmail's admin area is
our own UI over the admin JMAP methods, not Stalwart's bundled admin.
