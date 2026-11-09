# Webmail — status

_Where the webmail platform stands: what is built, what was verified against
the live Stalwart, what is deployed, what is still owed. The discovery and
the plan are `DISCOVERY.md` and `PLAN.md` beside this file._

---

## 1. What is live

|                        | Where it is                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------ |
| The webmail            | `https://webmail.fidscript.com` — the host service `fidscript-webmail` (port 3100),  |
|                        | behind the Traefik router `webmail`, with the platform's wildcard certificate        |
| The mail system        | Stalwart `v0.16.10` in Docker (`fidscript_stalwart`), JMAP on `:8090`                |
| The mailboxes          | `kennedy@fidscript.com` and `postmaster@fidscript.com` — the ones the admin created   |
|                        | through the webmail, verified against Stalwart, kept as the deliverable               |

The app answers at `/` (the dashboard), `/login`, `/mail/*` (the folders,
the messages, the search), `/compose`, `/settings`, `/contacts`,
`/templates`, `/admin`, and `/admin/health`. The API answers under
`/api/*`. Nothing it does is decorative: every number on a screen is read
from Stalwart or from the application's own database at the moment the
screen is painted.

---

## 2. What is built, and what was verified live

_Verified means: exercised against the running Stalwart, not asserted in a
test that mocks it. The residue of each verification — test messages,
suppression rows — was destroyed; the two mailboxes above were kept._

| Feature                                                     | Verified live?                                                                  |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| The platform admin's sign-in and the mailbox's sign-in      | yes — two different credentials, kept apart; the mailbox's is re-checked against Stalwart, and the session's credential is held in memory only |
| The dashboard (the mailboxes and the identities Stalwart has for the signed-in person) | yes |
| The inbox — read, the flags, the move, the destroy          | yes — through JMAP's `Email/set` and `Mailbox/set`                              |
| Composing — plain and HTML, the attachment into Stalwart's blob store, the draft that keeps, the signature | yes — a send with an attachment arrived in the inbox; the part's bytes came back exactly |
| The two-phase send (`EmailSubmission` needs the `emailId` and the `identityId`) | yes — the create is into the drafts, the submission is separate, the draft is destroyed after |
| The sent, the drafts, the spam, the trash, the archive      | yes — by their roles                                                            |
| Custom folders (create, rename, destroy)                     | yes                                                                              |
| The settings — the signature, the vacation response, the filters as a Sieve script, the forwarding in them | yes — the round-trip through Stalwart; the Sieve is syntax-checked by Stalwart on the write |
| The contacts (the address book, read)                        | read only — Stalwart's JMAP contacts is a read surface here; the write is owed  |
| The administration — the accounts, the domains, the aliases, the audit trail | yes — the creation of the two mailboxes above went through it |
| The mail health (the DNS, the TLS, the banner, the blocklists) | yes — real network answers; every line is marked `verified` (checked now) or `observed` (read from a record), and the cleartext ports say "check by hand" instead of pretending |
| The outbound abuse protection (the suppression list, the per-account limits, the young account's stricter ones) | yes — the blocks came back as 429s with the reasons; the residue was cleaned |
| The HTML designer (the rich editor, the block builder, the source) and the templates | yes — the six starters are seeded on first boot, a template test-send delivered its HTML into the inbox, and the HTML is sanitized on the save |

The email the designer makes is email-safe: table layouts, inline styles,
a plain-text alternative for every template, and a preview that is a
script-less sandbox. The rich editor's own iframe is opaque to the
application's sessions — it cannot reach the cookies or the authenticated
endpoints — and the template's HTML cannot keep a script across the save.

---

## 3. What is owed — the honest list

_Said plainly, the way `PLAN.md` says it will be._

| Owed                                                                        | Why it is open                                                                    |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| The FIDScript platform's email bootstrap (the FK fault, the false `VERIFIED`) | it is the **platform's** code; the fix is ready, and it lands when the operator signs off on deploying the API |
| The mail's DNS for the platform's own domains (the MX, the SPF, the DMARC, the MTA-STS, the TLS-RPT) | the same sign-off; nothing here touches the records until it is taken |
| The contacts' write (a new card, an edit, the sync)                          | Stalwart's surface as configured here is read-only; the write needs the `CardDAV`/JMAP contacts capability turned on, then the app's calls |
| MJML as an import (the optional nicety)                                      | the designer already takes plain email HTML; MJML is a conversion, not a need     |
| The campaign module (the architecture is reserved, the bulk send is off)     | the reservation is in the plan; the module itself is not built, and it is not built on purpose |
| The DMARC's report ingestion (the `rua` into the dashboard)                 | the health module reads the records; the reports' mail is not yet parsed into the screen |
| The inbound complaint handling (the `List-Unsubscribe`'s POST, the bounces back into the suppression list) | the outbound side is done; the inbound complaint path is the next abuse work |

What is **not** owed, and should not be reported as open:

- the deliverability: the health screen says what is verified and what is
  observed, and it does not claim inbox placement;
- the two credentials: the application's sign-in and the mailbox's sign-in
  are separate, and the Stalwart administrative credential never reaches a
  browser;
- the deployment: it is the host service and the Traefik route, and the
  Docker path is written (`Dockerfile`, `docker-compose.yml`, the
  `README.md`) for a fresh machine.

---

## 4. The backup and the restore — the drill of 2026-11-09

The two things that would be lost without a backup: the application's own
database (the sessions, the audit trail, the templates, the suppression
list, the send statistics — the SQLite at
`apps/webmail/data/webmail.db`), and Stalwart's data (the mailboxes, the
messages, the directory, the settings — the RocksDB at the Docker volume
`fidscript_stalwart`).

**The backup, taken without stopping anything:**

```
$BK=/opt/fidscript-deploy/backups/webmail-drill-$(date +%Y%m%d-%H%M%S)
sudo mkdir -p "$BK" && sudo chown ken:ken "$BK"

# Stalwart's volume, whole
sudo cp -a /var/lib/docker/volumes/fidscript_stalwart/_data "$BK/stalwart-volume"

# The application's database, as an online backup (not a file copy)
cd apps/webmail
sqlite3 data/webmail.db ".backup '$BK/webmail.db'"
```

**The check, run on the drill's result:**

- `sqlite3 "$BK/webmail.db" 'PRAGMA integrity_check;'` → `ok`;
- the rows the application cares about were present in the backup: the six
  templates, the send statistics, the sessions, the audit trail;
- Stalwart's volume had the whole RocksDB set — the `CURRENT`, the
  `MANIFEST`, the `OPTIONS`, the table files, and the log — 28 files, the
  count and the content matching the live volume.

**The restore, when it is needed:**

- The application's database: stop the service
  (`sudo systemctl stop fidscript-webmail`), put the file back at
  `apps/webmail/data/webmail.db`, start it. The schema is in `prisma/`; a
  `npx prisma db push` will create any table a newer build added.
- Stalwart's data: stop the container
  (`sudo docker stop fidscript_stalwart`), replace the volume's `_data`
  with `stalwart-volume/`, start it. Stalwart recovers from the log at the
  open; a `LOG.old` left by a clean close is its own housekeeping, not a
  fault. The configuration is a bind mount, not in the volume, so the
  restore keeps the running configuration.

The backup of the volume, taken while Stalwart is running, is a copy of a
live database: it is the right tool for a drill and for the regular
backup, and the restore above is the way it comes back. For a backup that
must be bit-exact under every circumstance, stop Stalwart for the minute
of the copy — that is the only difference.

---

## 5. The license

The application's own code is **MIT** (`apps/webmail/LICENSE` — the file
the task asked for). Its dependencies, checked against their package
records: **MIT** — Next.js, React, React DOM, Tailwind CSS, Node's types;
**Apache-2.0** — Prisma, TypeScript. The mail system behind it, Stalwart,
is **AGPL-3.0** (the enterprise features are a separate, paid license the
deployment does not use). Nothing in the application's dependency set is
proprietary, and nothing requires a network service to build or to run.

The consequence of the AGPL for the person who runs this: if Stalwart is
offered as a network service, the AGPL's terms apply to **Stalwart** —
not to this application, which is a separate program that talks to it
over the network. The application's own source stays MIT.

---

## 6. Where the record lives

|                                                        | What it is                                   |
| ------------------------------------------------------ | -------------------------------------------- |
| `docs/webmail/DISCOVERY.md`                            | what the mail system had, was missing, or had broken — the eleven items, no change made |
| `docs/webmail/PLAN.md`                                 | the architecture: the two credentials apart, the data's owners, the JMAP's shapes, the phases |
| this file                                                | where it stands now                            |
| `apps/webmail/README.md`                               | the install, the two deployment shapes, the backup, the license |
| `apps/webmail/.env.example`                            | every variable, named and explained          |

The commits, in the order they landed: `91be706` the discovery and the
plan, `013f7c3` the application, `99fe373` the lockfile, `454997c` the
health and the abuse protection, `da56383` the route and the host
service, `9885581` the designer and the templates.
