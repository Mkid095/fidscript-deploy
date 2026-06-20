# Backend Inventory — Storage, Databases, Email

See `index.md` for conventions. All routes JWT + project-access (owner/member) unless noted.

## Storage — `/api/v1/projects/:projectId/storage`

| ID | Method | Path | Request | Response | Events |
|----|--------|------|---------|----------|--------|
| STOR-01 | POST | `/storage/buckets` | {name,isPublic?,provider?(default internal)} | bucket | `storage.bucket.created` |
| STOR-02 | GET | `/storage/buckets` | — | `{buckets}` | none |
| STOR-03 | DELETE | `/storage/buckets/:bucketId` | — | `{success:true}` (403 if not empty) | `storage.bucket.deleted` |
| STOR-04 | GET | `/storage/buckets/:bucketId/files` | ?prefix,?page,?limit | `{files,pagination}` | none |
| STOR-05 | POST | `/storage/buckets/:bucketId/files` | {data(base64),key?,originalName?,mimeType?} | file | `storage.file.uploaded` |
| STOR-06 | DELETE | `/storage/buckets/:bucketId/files/:fileId` | — | `{success:true}` | `storage.file.deleted` |
| STOR-07 | POST | `/storage/buckets/:bucketId/presign` | {key,expiresIn?(3600)} | `{url}` | none |
| STOR-08 | GET | `/storage/buckets/:bucketId/public-url` | ?key | `{url}` ⚠ no access check | none |

## Databases — `/api/v1/projects/:projectId/databases`

| ID | Method | Path | Request | Response | Events |
|----|--------|------|---------|----------|--------|
| DB-01 | POST | `/databases` | {name,environment?,type?(pg/mysql/redis),version?,size?,maxConnections?,provider?} | `{id,projectId,name,status}` (async provision; creds stripped) | `database.provisioned` |
| DB-02 | GET | `/databases` | — | `{databases}` (BigInt→Number, creds stripped) | none |
| DB-03 | GET | `/databases/:databaseId` | — | db (creds stripped) | none |
| DB-04 | PATCH | `/databases/:databaseId` | {settings?,backupRetentionDays?} | db | `database.updated` |
| DB-05 | DELETE | `/databases/:databaseId` | — | `{deleted:true}` | `database.deleted` |
| DB-06 | GET | `/databases/:databaseId/status` | — | `{status:healthy\|unhealthy\|unknown}` | none |
| DB-07 | GET | `/databases/:databaseId/connection` | ?poolOnly | `{host,port,database[,username],connectionString}` (pw never returned) | none |
| DB-08 | POST | `/databases/:databaseId/credentials/rotate` | — | `{rotated:true}` (rewrites `DATABASE_URL`/`DB_*` env) | none |
| DB-09 | POST | `/databases/:databaseId/backups` | {description?} | `{id,status:'in_progress',...}` (async) | `database.backup_started`→`.backup_completed` |
| DB-10 | GET | `/databases/:databaseId/backups` | — | `{backups}` | none |
| DB-11 | POST | `/databases/:databaseId/backups/:backupId/restore` | {backupId,targetDatabaseId?} | `{restored:true}` | `database.restored` |

## Email — `/api/v1/projects/:projectId/email` (+ public webhooks)

**Domains** (`/email/domains`): MAIL-01 POST add · MAIL-02 GET list · MAIL-03 GET `:domainId` · MAIL-04 DELETE · MAIL-05 POST `:domainId/verify` (PENDING→VERIFIED→ACTIVE; dkim/spf/dmarc/mx flags). Events: `email.domain_added/verified/deleted`.

**Mailboxes** (`/email/mailboxes`): MAIL-06 POST {domain,localPart,password,name?,quotaMb?} → `{id,email,name,quotaMb,imapHost,imapPort:993,smtpHost,smtpPort:587,username,password}` (temp pw shown once). MAIL-07 GET · MAIL-08 GET `:id` · MAIL-09 PATCH · MAIL-10 POST `:id/suspend` · MAIL-11 POST `:id/activate` · MAIL-12 POST `:id/reset-password` (new pw once) · MAIL-13 DELETE. Event: `email.mailbox_created`.

**Aliases** (`/email/aliases`): MAIL-14 POST {domain,localPart,targets:[{type:mailbox\|external\|webhook,...}],description?} · MAIL-15 GET · MAIL-16 PATCH · MAIL-17 DELETE. Events: `email.alias_created/_deleted` (rebuilds Sieve).

**Sender identities** (`/email/sender-identities`): MAIL-18 POST {domain,email,localPart?,name?} · MAIL-19 GET · MAIL-20 DELETE `:id`. Events: `email.identity_created/_deleted`.

**API keys** (`/email/api-keys`): MAIL-21 POST {name,scopes?(['email.send']),dailyLimit?(1000),monthlyLimit?(30000)} → `{id,name,key:'ek_…',...}` (once) · MAIL-22 GET · MAIL-23 DELETE. Events: `email.api_key_created/_deleted`.

**Messages** (`/email`): MAIL-24 POST `/email/send` {from?,to,subject,text?,html?,replyTo?,attachments?,apiKeyId?,smtpPassword?} → `{messageId,accepted,status:SUBMITTED\|FAILED\|BOUNCED,error?}` · MAIL-25 GET `/email/messages` (?mailboxId,?folder,?unread,?limit,?offset) · MAIL-26 GET `:messageId` · MAIL-27 PATCH `/messages/read` {messageIds,isRead} · MAIL-28 PATCH `:messageId/star` ?starred · MAIL-29 DELETE `/messages` {messageIds}. Event: `email.sent`.

**Catch-all** (`/email/domains/:domainId/catch-all`): MAIL-30 POST {targetType:mailbox\|external,targetId?,targetAddress?} · MAIL-31 DELETE.

**Webhooks (PUBLIC, optional HMAC)**: MAIL-32 POST `/api/v1/email/inbound/webhook` · MAIL-33 POST `/api/v1/email/events/bounce` · MAIL-34 POST `/api/v1/email/events/complaint`. Events: `email.received/bounced/complained/webhook_triggered`.

## Capabilities
- **Storage**: multi-provider (internal MinIO / cloudinary / telegram), bucket `proj-<slug>-<name>`, presigned URLs with external-endpoint rewrite, per-project third-party creds.
- **Databases**: Postgres provision via admin pool (CREATE DATABASE+ROLE, NOSUPERUSER, CONNECTION LIMIT, statement_timeout 60s), PgBouncer pooling strings, encrypted `connectionInfo`, env injection (`DATABASE_URL`+`DB_*`), `pg_dump`→gzip→MinIO backups + `pg_restore`, `SELECT 1` health.
- **Email**: Stalwart v0.15.5 JMAP/SMTP (HTTP Basic admin token; SMTP 465 implicit TLS AUTH PLAIN), REST principal mgmt, DKIM/SPF/DMARC/MX verification, Sieve rebuild on alias change, suppression list (hard-bounce/complaint), per-key usage tracking + rate limit.

## Findings
- Email services lack explicit project-access checks (path-scoping only) — see `index.md`. · MAIL-24 `folder` filter only distinguishes inbox/drafts (sent/trash/spam accepted but not filtered). · CreateMailbox ignores submitted password, generates its own. · Stalwart v0.15.5: `deleteAccount`/`setAccountPassword`/`setAccountStatus` are no-ops (suspend = DB flag only). · STOR-08 skips access check. · Backups run async — UI must poll/stream.
