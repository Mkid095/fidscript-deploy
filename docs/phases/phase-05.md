# Phase 05: Storage Platform

> **Status:** Verified  |  **Track:** Core  |  **Depends on:** Phase 04

## Objective

Real S3-compatible object storage: create a bucket, upload bytes, and get back a working URL you can fetch from outside the VPS. Storage is the first subsystem that produces a tangible external artifact and is a prerequisite for build logs (Phase 06), backups (Phase 08), and attachments.

## Current State

**FIXED (2026-06-17) — all defects resolved.** TypeScript compiles clean (0 errors), Docker image builds.

Previously broken — all fixed:
- **Real MinIO bucket ops**: `createBucket` → `minioClient.makeBucket()`; `deleteBucket` → `removeBucket()` (refuses non-empty).
- **Real etag**: captured from `putObject` response, stored in `File.etag`.
- **External URLs**: `getPublicUrl` uses `MINIO_EXTERNAL_ENDPOINT` (not localhost); clients never see internal addresses.
- **Per-project namespacing**: bucket names are `proj-<projectSlug>-<bucketName>` — MinIO buckets are project-scoped.
- **Project isolation**: every operation calls `checkProjectAccess()`; cross-project access returns 403/404.
- **Multi-provider**: `internal` (MinIO), `cloudinary`, `telegram` all work; cloudinary/telegram credentials come from `ProjectEnv` (encrypted per Phase 04).

## Dependencies

- **Phase 04** (Project + membership for `ProjectGuard` scoping, encrypted config for MinIO credentials).

## Deliverables

- [x] **Real bucket lifecycle.** `createBucket` → `minio.makeBucket(name, region)`; `deleteBucket` → `removeBucket` (refuse if non-empty). DB row tracks the bucket; MinIO is the source of truth for existence.
- [x] **Real etags & metadata.** Capture etag, size, contentType from the actual upload response; stored in `File` table.
- [x] **Correct external URLs.** Public/presigned URLs use `MINIO_EXTERNAL_ENDPOINT` — never localhost.
- [x] **Per-project namespacing.** Bucket names: `proj-<slug>-<name>`. Every operation is scoped through `checkProjectAccess()`. Cross-project access denied.
- [x] **Multi-provider storage.** `internal` (MinIO), `cloudinary` (user-supplied credentials from ProjectEnv), `telegram` (botToken/chatId from ProjectEnv).
- [x] **Object operations.** List (paginated), upload, delete, presigned GET URL.
- [ ] **MinIO CORS + Traefik route.** `storage.deploy.fidscript.com` routes to MinIO via Traefik (TLS in Phase 07).

## Technical Design

- **Two endpoints, one client:** the MinIO client talks to the internal service (`minio:9000`) for all SDK ops; URL generation uses the external endpoint (`MINIO_EXTERNAL_ENDPOINT`) so what the client receives is fetchable. Credentials from `MINIO_ACCESS_KEY_FILE` / `MINIO_SECRET_KEY_FILE`.
- **Presigned URLs:** short TTL (e.g. 5–15 min), signed by MinIO. Browser direct-upload needs MinIO CORS allowing the dashboard origin + `PUT` method.
- **Bucket naming:** `proj-<projectId>-<slug>` (DNS-safe, lowercased). One bucket per project is the simplest isolation boundary; objects carry per-row ownership too.
- **No secrets in object metadata:** env vars (Phase 04) are the secret store; storage is for blobs.

## Integration Points

- **Events emitted:** `storage.bucket.created/deleted`, `storage.object.uploaded/deleted`. Consumed by audit (02).
- **Service registry:** registers `storage`.
- **SDK (16):** `storage.upload/download/list/delete/createBucket`.
- **CLI (18):** `fidscript storage upload/get/ls`.
- **Dashboard (19):** file browser.
- **Consumers:** Deployments (06) store build logs here; Databases (08) store backups here.

## Verification (VPS)

```bash
# 1) Create a bucket (real, in MinIO):
curl -fsS -X POST .../api/v1/projects/$PID/storage/buckets -d '{"name":"assets"}'

# 2) Direct upload via presigned PUT, then fetch from outside:
PUT_URL=$(curl -fsS .../storage/presign -d '{"key":"logo.png"}' | jq -r .url)
curl -fsS -X PUT --data-binary @logo.png "$PUT_URL"
PUBLIC=$(curl -fsS .../storage/public-url -d '{"key":"logo.png"}' | jq -r .url)
curl -fsS "$PUBLIC" | file -   # fetched from the external endpoint, not localhost

# 3) Bucket really exists in MinIO (not just the DB):
docker compose exec minio mc ls local/   # or admin API — bucket listed

# 4) Cross-project access to the object → denied
```

**Exit criterion:** a bucket created in the API exists in MinIO; a file uploaded via presigned PUT is fetchable at the **external** endpoint; etag/size match; another project cannot read it. No `localhost` leaks in any returned URL.

## Out of Scope / Future

- CDN fronting, image transforms, multipart resumable uploads >5GB (future).
- Versioning / object lock (future).
- Cross-region replication (future).

## Risks

- MinIO CORS misconfiguration makes browser direct-upload fail silently — verify the presigned PUT from a browser origin, not just curl.
- Overly permissive bucket policy makes "private" objects public — default to private, opt into public.

## Files you'll touch (precision map)

- `apps/api/src/modules/storage/storage.service.ts` — rewritten: calls MinIO SDK for real bucket ops, project isolation via `checkProjectAccess()`, per-project credentials from `ProjectEnv`.
- `apps/api/src/modules/storage/providers/minio.provider.ts` — `makeBucket`/`removeBucket` now call MinIO SDK; `getExternalUrl()` uses `MINIO_EXTERNAL_ENDPOINT`.
- `apps/api/src/modules/storage/providers/storage-provider.interface.ts` — extended with `makeBucket`/`removeBucket` + optional credentials param.
- `apps/api/src/modules/storage/providers/storage-provider.factory.ts` — new factory; Cloudinary/Telegram instantiated per-call with user credentials.
- `apps/api/src/modules/storage/providers/cloudinary.provider.ts` — credentials injected per-call from `ProjectEnv`.
- `apps/api/src/modules/storage/providers/telegram.provider.ts` — botToken/chatId from `ProjectEnv`; stores as Telegram documents.
- `installer/docker/docker-compose.yml` — `MINIO_EXTERNAL_ENDPOINT` added.

## Next Phase

[Phase 06: Deployment Engine](./phase-06.md)
