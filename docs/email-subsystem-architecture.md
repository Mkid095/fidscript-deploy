# Email Subsystem — Architecture v4
**FIDScript Deploy — Phase 09**
*Status: ACTIVE — implementing first-party mail platform*
*Revised: 2026-06-22*

---

## Current Priority: Complete the First-Party Mail Platform

**Stalwart v0.16.x** has been deployed (upgraded from v0.15.5). v0.16 adds JMAP-based
`Principal/set`, providing the mechanism required for programmatic role assignment.
This is **expected to resolve** the internal-directory authorization gap observed in v0.15,
but the end-to-end mailbox provisioning flow has not yet been validated on v0.16.

### Confirmed Findings

1. **Authentication succeeds** for all accounts, including individual mailboxes:
   ```
   auth.success accountName="test@deploy.fidscript.com" accountId=4
   ```
   Auth mechanism (PLAIN/bcrypt) works correctly.

2. **Authorization was blocked in v0.15** for internal-directory accounts on IMAP/SMTP:
   ```
   security.unauthorized details="authenticate"
   ```
   This was a **post-auth permission check** — the session was not granted access to the
   IMAP/SMTP protocol, even though credentials verified. Root cause: internal-directory
   principals created via `/api/principal` lacked role assignments; the `fallback-admin`
   bypassed this because it uses a separate authentication path.

3. **v0.16 provides the mechanism, not yet confirmed end-to-end:** The `Principal/set`
   JMAP method is available in v0.16. Determine whether newly created principals require
   an explicit role assignment via `Principal/set` — there is no evidence of automatic
   assignment. The api should use `Principal/set` to inspect and assign roles if supported.
   This needs end-to-end validation (see migration checklist below).

4. **JMAP-managed admin account works** on IMAP (accountId=d333333) — gets full
   capability listing and functional session.

**Implementation checklist:**

1. ✅ Outbound mail works reliably via Stalwart MTA
2. ✅ Inbound mail works reliably via Stalwart MX
3. ⏳ Mailboxes synchronize correctly (Stalwart ↔ database ↔ dashboard ↔ API)
4. ⏳ Aliases synchronize correctly
5. ⏳ Domains synchronize correctly
6. ✅ Installer provisions complete mail server automatically
7. ⏳ Dashboard accurately reflects live Stalwart state
8. ⏳ Health diagnostics are trustworthy (not placeholder values)
9. ⏳ Bounce handling works automatically (DSN → suppression)
10. ⏳ Queue retries behave correctly per notification type
11. ⏳ **IMAP/SMTP submission for individual mailbox accounts** — pending end-to-end validation on v0.16
12. ✅ No external provider is required for a functional installation

---

### Migration Validation Checklist

After upgrading to v0.16, verify each step before marking items complete.
**Start with Principal/set investigation — do not assume IMAP will work first.**

```
Stalwart v0.16 migration validation
──────────────────────────────────────────────────────────────────────
□  Upgrade to v0.16.10 and restart stalwart container
□  Verify database migration completed successfully
□  Create a test mailbox via the platform API
□  Inspect Principal/get — confirm principal record structure
□  Test Principal/set capabilities — determine what fields it exposes:
     roles, enabled/disabled, permissions, capabilities, grants
□  Assign role if supported by Principal/set
□  IMAP login: authenticate over IMAP (port 993) with mailbox credentials
□  SMTP AUTH: authenticate over SMTP submission (port 465/587)
□  Mail send: send an outbound message from the mailbox
□  Mail receive: deliver an inbound message to the mailbox
□  Dashboard sync: mailbox count and status reflect correctly
──────────────────────────────────────────────────────────────────────
Only mark items complete after confirmed passing — not assumptions.
Isolate failures: IMAP failing does not mean Principal/set is broken.
```

---

## Technical Findings (Stalwart v0.15 — historical, pre-upgrade)

### Config file schema — critical corrections

The Stalwart v0.15 TOML schema uses an expression language where **string literals
require single quotes**, not double quotes:

```toml
# WRONG — "internal" is parsed as an identifier, not a string:
session.auth.directory = "internal"        # → "Invalid variable" error
session.rcpt.directory = "internal"

# CORRECT — single quotes for string literals:
session.auth.directory = "'internal'"     # ✓
session.rcpt.directory = "'internal'"
```

This was the original cause of the IMAP auth failures. However, after fixing it, a
deeper bug surfaced: accounts created via the REST API have no roles, causing
`security.unauthorized` after `auth.success`.

### session.auth.require and imap.auth.* are database keys

Settings under `[session.auth]` and `[imap.auth]` in v0.15 are **database keys**, not
config-file keys. Defining them in `config.toml` produces warnings:

```
WARNING: Database key defined in local configuration
```

The values are written to RocksDB at startup and **override** any default. The
correct approach is to leave these unset in `config.toml` and configure them via
the admin web UI, or use `stalwart-cli server add-config` to set them in the database.

### Authentication flow (confirmed)

```
IMAP port 993 (TLS):
  AUTHENTICATE PLAIN test@ / TestPass123
    → auth.success (accountId=4, bcrypt verify passed) ✓
    → security.unauthorized ✗
    → connection closed by server (no IMAP response sent)
    ✓ Auth mechanism: PLAIN works
    ✓ Directory lookup: finds principal by email
    ✓ Secret verification: bcrypt correct
    ✗ Post-auth permission check: fails for internal-directory accounts

SMTP port 465 (TLS):
  AUTHENTICATE PLAIN test@ / TestPass123
    → 550 5.7.1 "Your account is not authorized"
    ✓ Auth mechanism: offered and accepted
    ✓ Secret verification: passed
    ✗ Authorization: fails for internal-directory accounts

Admin account (accountId=d333333, JMAP-managed):
  → Full IMAP session ✓
  → auth.success → full capability listing → functional session
```

The internal directory principals (test@=4, alert@=2) fail at the post-auth
permission check. The JMAP-managed admin account succeeds. The `fallback-admin`
uses a separate authentication path that bypasses this check.

### How to assign roles manually (unverified workaround for v0.15)

This is **hypothetical** — it has not been tested:

1. Open `https://mail.deploy.fidscript.com:8080` in a browser
2. Login as `admin` with the `STALWART_ADMIN_TOKEN`
3. Go to **Management → Directory → Accounts**
4. Click on the account (e.g., `test@deploy.fidscript.com`)
5. In the account editor, find **Roles** and add the `user` role
6. Save — theoretically the account can now authenticate via IMAP and SMTP submission

**This has NOT been confirmed to work.** The admin web UI may have the same
v0.15 REST API limitations and may not expose role assignment either.

The definitive fix is **upgrading to Stalwart v0.16+** which adds JMAP-based
`Principal/set` for programmatic role assignment.

---

*The full v4 architecture spec is preserved below for reference after the first-party platform is complete.*

---
