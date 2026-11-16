# Webmail

A self-hosted webmail and mail-management platform on [Stalwart](https://stalw.art).
Stalwart is the mail server and the source of truth for everything in the
mail system; this application is the complete user-facing experience on top
of it:

- **Dashboard** — the platform's accounts and domains at a glance (admin), or
  the account's own mailboxes, counts, and identities (mailbox user).
- **Inbox and folders** — message list, read, thread flags, bulk actions,
  move between folders, search across all mail, and per-message views with
  attachments.
- **Compose** — plain or HTML (with a live, sandboxed preview), attachments
  to Stalwart's blob store, drafts that survive a closed tab, and real
  submission.
- **Settings** — identities and signatures, the vacation responder, and
  sieve filters (including forwarding, which is the honest `redirect` rule).
- **Contacts** — the address book as Stalwart keeps it.
- **Admin** — create/suspend/delete mailboxes, reset passwords, quotas,
  add domains and aliases, and the audit trail of what the admin has done.

It runs **standalone on a VPS** or **inside the FIDScript stack**. FIDScript
is one integration and provisioning layer, not a requirement: the same
application and business logic deploy either way.

## What is in Stalwart, and what is here

The boundary matters, so it is stated plainly:

| Lives in **Stalwart** (authoritative) | Lives in **this app** |
|---|---|
| Mailboxes, passwords, quotas, spam state, messages, drafts, threads | The app admin account, app sessions |
| Identities, signatures, sending state | Email templates, the audit log |
| Sieve filters, vacation responder | Abuses / bounces / complaint suppression |
| The address book (JMAP contacts) | Deliverability findings (a cache) |

Nothing about a message is mirrored here. If it is mail, it is in Stalwart.

## Requirements

- A running **Stalwart ≥ 0.16** (this targets the JMAP management surface —
  `x:Account`, `x:Domain`, … — that 0.16 introduced).
- Node 20+ to build locally.
- Docker, for the container deployment.

## Standalone install

1. **Reach Stalwart.** Note the address of its HTTP listener — in this repo's
   FIDScript stack that is `http://fidscript_stalwart:8080`; standalone it is
   whatever your Stalwart listens on (often `http://127.0.0.1:8080`).
2. **Copy the folder** `apps/webmail/` to the target host.
3. **Configure the env.** Start from `.env.example`:

   ```
   STALWART_URL=http://127.0.0.1:8080
   STALWART_ADMIN_USER=admin@example.org
   STALWART_ADMIN_PASSWORD=<the Stalwart recovery-admin password>
   WEBMAIL_ADMIN_EMAIL=admin@localhost
   WEBMAIL_ADMIN_PASSWORD=<choose one; generated+logged if empty>
   WEBMAIL_BASE_URL=http://127.0.0.1:3100
   ```

4. **Run.**

   ```
   docker compose up -d --build
   ```

   The app comes up on `127.0.0.1:3100` (loopback — put your reverse proxy
   in front and set `WEBMAIL_BASE_URL` to the public host). Sign in as the
   admin, add your domain, and create the first mailbox.

### The two credentials, kept apart

- `STALWART_ADMIN_USER`/`STALWART_ADMIN_PASSWORD` — the Stalwart
  recovery-admin. Used **only** server-side, for admin operations (accounts,
  domains, quotas, aliases). It never reaches the browser.
- The **application admin** (`WEBMAIL_ADMIN_*`) — the human who signs into
  this UI to manage mailboxes. Stored in this app's database, hashed.
- A **mailbox user** signs in with their own mailbox password, which the
  app verifies against Stalwart and holds **in process memory for the
  session only** — so they move between pages without re-typing it, and a
  server restart simply asks them to sign in again. Nothing about it is on
  disk.

## FIDScript-integrated install

The same image is added to the FIDScript platform compose file as one
service on the platform network:

- `STALWART_URL` → `http://fidscript_stalwart:8080`
- the admin credential → the platform's recovery-admin (the same one the
  FIDScript API already uses for its `IEmailProvider`)
- a route in Traefik for `webmail.<platform-domain>`, `priority: 100`, with
  the Let's Encrypt DNS resolver — the same shape as the `jmap` and
  `stalwart-admin` routes, because the API router claims `/api` on every
  host and these must win for their own.

A project **owns its mail domain** (`<project>.fidscript.com` or its own
domain, per the one-domain-per-project rule). Mailboxes are
`name@<that-domain>`. Domain provisioning, MX/SPF/DKIM/DMARC, and the
system mailboxes are the FIDScript API's job — it is authoritative for the
project/domain business rules. This application's admin surface stays
consistent with that state; it does not write the FIDScript database
directly.

## Backups and restore

Two things hold state, and both are files:

- **This app's database** — SQLite, on the `webmail-data` volume (standalone)
  or `/data` (FIDScript). Back it up: `sqlite3 /data/webmail.db ".backup
  /backups/webmail-$(date +%F).db"`. Restore: stop the app, replace the
  file, start it.
- **Stalwart's store** — its RocksDB volume. Stalwart documents its own
  backup/restore; the mailbox data, messages, and settings live there.

Restoring both together gives you the whole platform. The order does not
matter for a cold restore.

## Upgrades

The app is built from a pinned image tag. To upgrade: rebuild the image,
`docker compose up -d` — the SQLite schema is applied with `prisma db push`
on boot, which is additive. Stalwart upgrades are Stalwart's own process;
pin the Stalwart version in the FIDScript `.env` (`STALWART_VERSION`) and
change it deliberately.

## License

The application's code is MIT. Stalwart itself is dual-licensed
(AGPL-3.0 community edition + enterprise); the community edition is what
this targets, and no enterprise feature is assumed.
