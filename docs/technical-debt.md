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
| `TD-SEC-1` | The domain endpoints check **membership** but not the **role** | The pre-hardening scaffold guarded the route, not the privilege | Temp | A project `viewer` can connect Cloudflare or delete a domain | `PREREQ-SEC-1`; the one shared rule (`ProjectAccessService`) now exists and the functions console uses it | P0 |
| `TD-SEC-2` | The email services check **membership** but not the **role** | Same | Temp | A `viewer` can read and write another member's mail settings | `PREREQ-SEC-2`; UI greys for non-members | P0 |
| `TD-SEC-3` | `STOR-08` checks **membership** but not the **role** | Same | Temp | A `viewer` can mint a public URL for any bucket in the project | `PREREQ-SEC-3`; UI greys for non-members | P0 |
| `TD-SEC-4` | ~~Email webhooks open if `STALWART_WEBHOOK_SECRET` unset~~ **RESOLVED (Phase 1)** | — | — | The signature is now **required**, the HMAC is computed over the **raw** body, and the platform **refuses** the webhook when no secret is configured | Done — `webhook-signature.service.ts`, verified live (unsigned → 401, wrongly signed → 401) | ✅ |
| `TD-SEC-5` | ~~Functions runtime has no sandboxing~~ **THE ENTRY WAS WRONG — rewritten below** | — | — | — | — | — |

**`TD-SEC-5` as it actually is (corrected 2026-11-06).** The runtime **is** sandboxed: the
container runs with `--network none`, `--read-only`, `--cap-drop ALL`,
`--security-opt no-new-privileges`, a 64 MB `noexec` tmpfs, and memory/CPU/pid limits; the code
is piped in over **stdin** and never bind-mounted. Three narrower gaps remain, and they are the
real ones:

| ID | Description | Reason | T/P | Impact | Resolution | Priority |
|---|---|---|---|---|---|---|
| `TD-SEC-5a` | The container has no `--userns=remap` and no `--user`, so it runs as **root in the host's user namespace** — and the API container holds the Docker socket read-write | The socket is needed for builds | Temp | A container escape is host root | Run the function container as a non-root user with a remapped namespace | P0 |
| `TD-SEC-5b` | The runner uses `execFileSync`, which **blocks the API's event loop** for the whole container run, and `timeoutSeconds` has **no upper bound** | The runner predates the async build work | Temp | One project member can freeze the whole API for as long as they ask | Make the run asynchronous, as the deployment build already is, and cap the timeout | P0 |
| `TD-SEC-5c` | The function's variables are passed on the **`docker` argv** (`-e KEY=VALUE`), so every secret is visible in `/proc/<pid>/cmdline` to any local user | The runner builds its argument list inline | Temp | A local user reads another tenant's function secrets | Pass them with `--env-file` | P1 |
| `TD-SEC-5d` | `--network none` makes the project's **Instant data plane unreachable** from a function | The isolation and the data plane contradict each other | Temp | An edge function cannot reach the app's own data | Give the function container a route to the project's data plane, and nothing else | P1 |

## Correctness / honesty (P1)

| ID | Description | Reason | T/P | Impact | Resolution | Priority |
|---|---|---|---|---|---|---|
| `TD-COR-0` | ~~The dashboard's sign-in does not answer the API's **`mfaRequired`** answer~~ **RESOLVED (Phase 5A)** | — | — | — | The challenge screen, the enrollment, the recovery codes and the disable all exist now; the API answers correctly on both paths and the dashboard finishes the sign-in | ✅ |
| `TD-COR-0c` | The **email-verification gate** is inert: `EmailVerifiedGuard` is registered *before* the guard that authenticates the caller, so it never sees a user | The guard was written when there was no email-verification flow to make meaningful | Temp | Nobody is actually required to verify their address — `emailVerifiedAt` is written but never checked | The **flow** works now (the API sends the email on registration, the link confirms the address, the dashboard has the screen). The **gate** is a separate decision: every existing account has `emailVerifiedAt = null`, so turning it on would lock every one of them out. It needs a column that says "this account is required to verify" (default false), and a proof that the platform's mail reaches outside its own domain. **Phase 5B decision.** | P1 |
| `TD-COR-0d` | `POST /auth/register` answers **409 "Email already registered"** | The form needs to tell the person that the address is taken | Temp | An account-enumeration oracle — but only **behind the company password**, which is the gate on registration | The two cheap oracles (the login message and the reset request) are closed. This one is left deliberately: the company password is checked first, and the message is useful feedback. Revisit with the registration rate limit. | P2 |
| `TD-COR-0e` | The verification, reset and invitation tokens are stored in **plain** in the database | The token is the lookup key | Temp | A database read (or a backup) yields live reset tokens | Hash the token and look it up by hash, the way the magic codes already are (`bcrypt`, `codeHash`). The column is `VerificationToken.token`, indexed by a unique constraint — a hash keeps that shape. | P2 |

| `TD-COR-0b` | `GET /projects/:id/env-vars` carries **no scope requirement**, so a project key reads the project's variable NAMES whatever its scopes | The route was written before scopes existed | Temp | A key with `functions:read` learns the names of the project's variables (the values stay masked) | Give the route `@RequireScope('projects:read')` | P2 |

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
| `TD-ARCH-1` | Stalwart transporter config duplicated | `SmtpSendService.send` and `PlatformMailService.send` each inline the same ~6-line nodemailer transporter config (host/port/secure/auth/tls) | Temp | Drift risk if the Stalwart transport config changes | Extract a shared `buildStalwartTransporter(config)` helper both call; refactor when a 3rd caller appears | P2 |

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
- 2026-11-06 — **Corrected, not just updated.** `TD-SEC-1/2/3` said the endpoints "skip
  project-access checks"; they check **membership** — what is missing is the **role**, and the
  entry now says so. `TD-SEC-4` is **resolved** (Phase 1). `TD-SEC-5` was **wrong**: the runtime
  *is* sandboxed, and the entry is rewritten as the three narrower gaps that are real
  (`TD-SEC-5a`–`d`). Two new entries record what Phase 1 found and did not close
  (`TD-COR-0`, `TD-COR-0b`).
- 2026-06-20 — Initial registry. Seeded from the UI-mitigated gaps in
  `docs/backend-prerequisites.md` + the AUDIT §C findings. 5 P0 security, 4 P1 correctness,
  5 P1–P2 UX, 5 permanent scope boundaries.
