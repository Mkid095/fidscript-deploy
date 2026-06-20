# Technical Debt Registry

> Every compromise recorded in one place — no scattered `TODO`s. Each entry has the six fields
> below. Distinct from `docs/backend-prerequisites.md` (which is "capabilities the frontend
> needs that don't exist"); this is "compromises we made to ship, and why."
>
> **Fields:** Description · Reason · Temp/Permanent · Impact · Planned resolution · Priority.
>
> **Priority:** P0 (security/data-loss, fix before production) · P1 (correctness/UX, fix soon)
> · P2 (polish, fix when convenient). **Status:** 🟥 open · 🟧 scheduled · ✅ resolved.

---

## Security / authorization (P0 — close in the hardening pass)

| ID | Description | Reason | T/P | Impact | Resolution | Priority |
|---|---|---|---|---|---|---|
| `TD-SEC-1` | `DOM-05`/`DOM-06` skip project-access checks | Pre-hardening scaffold; functional but ungated | Temp | Any member can connect-Cloudflare / delete a domain | `PREREQ-SEC-1`; UI greys for non-A/D meanwhile | P0 |
| `TD-SEC-2` | Email services lack project-access checks | Path-scoping only, no membership re-validation | Temp | Cross-project read/write possible by a crafted request | `PREREQ-SEC-2`; UI greys for non-members | P0 |
| `TD-SEC-3` | `STOR-08` public-URL skips access check | Same scaffold gap | Temp | Anyone can mint a public URL for any bucket | `PREREQ-SEC-3`; UI greys for non-members | P0 |
| `TD-SEC-4` | Email webhooks open if `STALWART_WEBHOOK_SECRET` unset | HMAC is optional | Temp | Unauthenticated inbound webhook spoofing | `PREREQ-SEC-4`; UI shows a warning banner | P0 |
| `TD-SEC-5` | Functions runtime has **no sandboxing** | `child_process.exec`, Docker socket mounted, `/tmp` storage | Temp | A function can read `/etc/shadow` / the host | Hardening track (AUDIT §C); **mandatory before multi-tenant production** | P0 |

## Correctness / honesty (P1)

| ID | Description | Reason | T/P | Impact | Resolution | Priority |
|---|---|---|---|---|---|---|
| `TD-COR-1` | Stalwart v0.15.5 suspend is a DB flag only | `setAccountStatus`/`deleteAccount`/`setAccountPassword` are no-ops upstream | Temp (until upgrade) | A "suspended" mailbox can still log in via IMAP/SMTP | `PREREQ-EMAIL-1`; UI surfaces honestly (`<MailboxStatusPill>`) | P1 |
| `TD-COR-2` | `PROJ-20` API-key DTO is `@Body() dto: any` | Missing class-validator | Temp | No server-side validation on create-API-key | `PREREQ-PROJ-4`; UI validates locally | P1 |
| `TD-COR-3` | `PROJ-14` invitation `role` is free-text | Not an enum | Temp | Any string accepted as a role | `PREREQ-PROJ-5`; UI constrains | P1 |
| `TD-COR-4` | Event emits lack actor/IP/UA context | Columns exist; emit sites don't populate them | Temp | Activity feed is less rich; audit trail incomplete | `PREREQ-AUDIT-1` | P1 |

## UX / functional gaps (P1–P2, UI-mitigated today)

| ID | Description | Reason | T/P | Impact | Resolution | Priority |
|---|---|---|---|---|---|---|
| `TD-UX-1` | Build-logs endpoint returns one string, not a stream | `DEPL-04` returns `{logs: release.buildLogs}` | Temp | Live-tail UX polls every 2s during BUILDING | `PREREQ-FN-1` (push-based `logs.appended` event) | P2 |
| `TD-UX-2` | `QUEUE-06` stats don't emit realtime | No event for stat changes | Temp | Queue Stats tab polls every 10s | `PREREQ-LOG-2` | P2 |
| `TD-UX-3` | Log `retentionDays` never enforced | No retention sweep exists | Temp | Logs grow unbounded | `PREREQ-LOG-1` (scheduler sweep) | P2 |
| `TD-UX-4` | No in-dashboard SQL console | Not built | Temp | DB detail shows greyed "coming soon" | `PREREQ-DB-1` | P2 |
| `TD-UX-5` | Scheduler "skip next run" missing | Endpoint not built | Temp | Button greyed "coming soon" | `PREREQ-SCHED-1` | P2 |

## Scope boundaries (Permanent — not debt, documented as such)

These are **not** debt to pay off; they are deliberate product scope (ADRs). Listed here so a
contributor doesn't file them as bugs.

| ID | Description | ADR |
|---|---|---|
| `TD-SCOPE-1` | `php`/`go`/`rust` runtimes not implemented | ADR-031 (greyed, never faked) |
| `TD-SCOPE-2` | `mysql`/`redis` DB types not implemented | ADR-031 |
| `TD-SCOPE-3` | `cloudinary`/`telegram` storage providers not implemented | ADR-031 |
| `TD-SCOPE-4` | `slack`/`pagerduty` notification channels not wired | ADR-031 |
| `TD-SCOPE-5` | No billing / SaaS hosting | ADR-029 (permanent) |

---

## Process

- **Adding debt:** when you ship a compromise, add an entry here in the same commit (Definition
  of Done criterion). Cross-link the `PREREQ-*` if one exists.
- **Resolving debt:** flip the entry to ✅, note the commit, and remove the UI mitigation if
  one existed.
- **Promotion:** if a P1/P2 item escalates (e.g. a security review), move it to P0 and into
  the active phase.

## Change log
- 2026-06-20 — Initial registry. Seeded from the UI-mitigated gaps in
  `docs/backend-prerequisites.md` + the AUDIT §C findings. 5 P0 security, 4 P1 correctness,
  5 P1–P2 UX, 5 permanent scope boundaries.
