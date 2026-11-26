# Security

Operational notes for the platform's own security surface: where the
secrets live and who reads them, how the signing secret rotates without
logging anyone out, the rate limits on the public edges, and how the
disaster-recovery runbook reads.

This is a runbook, not a threat model. The architecture itself is in
[ARCHITECTURE.md](./ARCHITECTURE.md); decisions and their reasons are in
[DECISIONS.md](./DECISIONS.md).

---

## 1. Secrets inventory

All platform secrets are files under `installer/docker/secrets/` (live:
`/opt/fidscript-deploy/installer/docker/secrets/`), mounted **read-only**
into the containers that need them. The wizard creates the files; the
permissions are set at install and are *verified* by
[`scripts/audit-secret-permissions.sh`](../scripts/audit-secret-permissions.sh)
rather than assumed.

| File | Purpose | Consumed by |
| --- | --- | --- |
| `jwt_secret` | JWT **signing** secret (HS256) | `api` |
| `jwt_secret_prev` | Retiring JWT secret, kept for the rotation window | `api` |
| `encryption_key` | AES-256 key for at-rest secret encryption | `api` |
| `postgres_password` | Postgres superuser / admin password | `postgres`, `api` (admin pool) |
| `redis_password` | Redis auth | `redis`, `api` |
| `minio_access_key` / `minio_secret_key` | MinIO credentials | `minio`, `api` |
| `cf_api_token` | Cloudflare API token (DNS, etc.) | `api` |
| `smtp_submission_user` / `smtp_submission_pass` | Stalwart SMTP submission | `stalwart`, `api` |
| `stalwart_admin_token` | Stalwart admin API | `api` |
| `stalwart_credentials` | Stalwart credential bootstrap | `stalwart` |
| `stalwart_webhook_secret` | Inbound-webhook HMAC | `api` |
| `instant_superuser_token` | InstantDB superuser | `api` |
| `evolution_api_key` | Evolution API (WhatsApp) | `api` |
| `app_runtime_registry_password` (+ `_htpasswd`) | Container runtime registry | `registry`, `api` |
| `system_mailbox_password` | Platform mail account | `api` |
| `fidscript_setup_token` | One-time setup wizard token | `installer` |
| `pgbouncer_userlist` | pgbouncer auth list (`0640` — group-readable, the pgbouncer user reads it) | `pgbouncer` |
| `api.env` | Aggregated env file the wizard writes | `api` |

**Permission contract.** Every secret file is `0600` owner-only, the
directory is `0700`, and `pgbouncer_userlist*` is the one exception at
`0640` (its group reader is the pgbouncer process, by design). The
symlinks without a `.txt` suffix are the Docker-secrets convention — the
link's own mode is meaningless on Linux; the target is what carries the
bytes and is what the audit checks.

```
scripts/audit-secret-permissions.sh /opt/fidscript-deploy/installer/docker/secrets
```

prints a PASS/FAIL line per file and exits non-zero on any drift. Run it
after any manual change to that directory.

---

## 2. Rotating the JWT signing secret

The platform signs HS256 with `JWT_SECRET`. To rotate it **without
invalidating in-flight sessions**, the API verifies against a two-entry
list — `[current, previous]` — and signs with the current one only.

**Procedure** — run from the install root:

```
installer/scripts/rotate-jwt-secret.sh
```

What it does:
1. Reads the current `secrets/jwt_secret.txt`.
2. Copies it to `secrets/jwt_secret_prev.txt` and symlinks
   `jwt_secret_prev -> jwt_secret_prev.txt` (the compose file's
   `JWT_SECRET_PREV_FILE` points at the symlink, so a missing file is a
   no-op, not a crash).
3. Generates a fresh 64-hex-byte secret into `jwt_secret.txt` (`0600`).
4. `docker compose restart api`.

**The window.** A token minted *before* the rotation keeps verifying
against the previous secret until it expires on its own. The refresh
token's 7-day lifetime is therefore the rotation window: **after 7 days,
delete `jwt_secret_prev.txt` and restart the API again.** Until you do,
the old key is still a valid verifier.

**What this touches.** Console sessions, MFA challenges, and app-level
access tokens all verify through the same list. There is no log-out:
existing tokens remain valid, new tokens sign under the new key.

**What is *not* automated.** The `ENCRYPTION_KEY` (AES at-rest for the
secret store and other encrypted fields) has no rotation path yet, and
this is a deliberate gap, not an oversight. Rotating it is riskier than
the JWT rotation above, because it is not just signing — it is the key
that can *read* every secret at rest, **and every encrypted backup**. A
naive rotation renders all of those permanently undecryptable. It is
therefore deferred until the migration strategy below exists. Until it
does: if a key leak is suspected, restore from a known-good backup and
re-issue rather than rotate in place.

**The migration strategy, when we build it.** It must preserve access to
data already encrypted, in two stages:

1. **Dual-key decrypt.** Add `ENCRYPTION_KEY_PREV`, and the decrypt path
   tries the current key first, then the previous — exactly the JWT
   model. Nothing re-encrypted yet is lost, because the old key still
   opens everything it ever sealed.
2. **Re-encrypt, then retire.** A one-off pass re-encrypts every at-rest
   row (`Secret.encrypted_value`, `DomainConnection.encryptedToken`,
   `SmtpCredential.encryptedPassword`, installation settings) and every
   stored backup (the PBKDF2-framed dumps and the CryptoService-format
   manifests) from the old key to the new one. Only when a full scan finds
   **zero** rows that still need the old key does `ENCRYPTION_KEY_PREV`
   get deleted. The window is bounded, like the JWT one.

The backups are the binding constraint: an old backup is only readable
by the key that encrypted it, so the old key must stay until every
retained backup has been re-encrypted or has aged out of retention.

---

## 3. Rate limits on the public edges

All limits are Redis fixed-window, **fail-open** (a Redis blip must not
take the platform down), and per-bucket.

| Edge | Bucket | Limit | Window |
| --- | --- | --- | --- |
| GitHub webhook, per source IP | `rl:webhook:ip:<ip>` | 120 | 1 h |
| GitHub webhook, per repo | `rl:webhook:repo:<repo>` | 30 | 1 h |
| Deployment trigger (create/stop/restart/rollback/destroy/apply-build-config), per project | `rl:deploy:<projectId>` | 30 | 1 h |
| Login, per IP | `rl:login:ip:<ip>` | 100 | 5 min |
| Login, per account (failures) | `rl:login:acct:<email>` | 20 | 5 min |
| Magic-code send, per IP | `rl:magic:ip:<ip>` | 30 | 15 min |
| Magic-code send, per email | `rl:magic:email:<email>` | 10 | 15 min |

The webhook and deployment-trigger buckets are the ones a customer can
reach from the public internet; the login/magic buckets protect the
console. The webhook IP bucket is checked **before** the signature, so an
attacker flooding the receiver cannot force a signature check per
request; the per-repo bucket is checked **after** the signature parses,
so only well-formed deliveries count against it. Exceeding a bucket
returns `429` with a `Retry-After`.

---

## 4. Disaster-recovery runbook

**What the platform backup covers.** The control-plane Postgres
database: `users`, `organizations`, `projects`, `deployments`,
`credentials`, `cron jobs` and `domains` — the data the platform itself
runs on. Every run records the row count of each of these in the backup
manifest.

**What it does *not* cover.** Customer application databases
(per-project Postgres, backed up separately on demand), the container
image registry, Traefik's dynamic config, the `docker/secrets/`
directory, and Redis (volatile, re-derivable). Treat those as
reconstructable from source control and config, not as backup targets.

**RPO / RTO.** The backup cron runs daily at 02:00 UTC
(`PLATFORM_BACKUP_CRON`); run it by hand after big changes to shorten
the RPO. A full control-plane restore is a manual step (below) and
realistically an hour of operator time — call that the RTO.

**The backup is encrypted at rest.** Postgres dumps and manifests are
AES-256-GCM with a per-file salt, in the `backups-platform` bucket. By
default that bucket is on the *same machine* as the data — which is not
the definition of a backup. Point it off-server in the console's
**System → Backups** card (any S3-compatible endpoint: Wasabi, Backblaze,
R2, another MinIO). The destination is only saved once it answers the
probe, and it is stored encrypted as a platform-level secret.

**Verification is scheduled, not assumed.** A backup that cannot be
restored is not a backup. `verify-restore` decrypts the newest dump into
a scratch database, restores it, and counts the rows of every table the
manifest promised — then drops the scratch database. This runs weekly
(`PLATFORM_BACKUP_VERIFY_CRON`, default 04:00 UTC Sundays) and is
triggered by hand from the same card. A failed check alerts Telegram the
way a failed backup does. The console's card shows the last check and its
verdict.

**Manual restore, step by step.**

1. Take the newest `postgres/*.dump.gz.enc` and its
   `manifests/*.json.enc` from the off-server destination.
2. On a clean cluster, drop in the `encryption_key` and create an empty
   database.
3. Decrypt the dump and the manifest with the helper, pointed at the
   platform's key:

   ```
   ENCRYPTION_KEY_FILE=/opt/fidscript-deploy/installer/docker/secrets/encryption_key \
     node scripts/decrypt-backup.mjs <in.dump.gz.enc> out.dump.gz
   ENCRYPTION_KEY_FILE=... node scripts/decrypt-backup.mjs <in.json.enc> manifest.json
   ```

   and `gunzip out.dump.gz`; `pg_restore --format=custom --clean
   --if-exists` into the new database.
4. Check the row counts against the manifest's `tableCounts`. If they
   match, the restore is complete and the control plane is whole.
5. Re-issue anything the backup does not carry (customer DBs, registry
   images, Traefik config) from source.
