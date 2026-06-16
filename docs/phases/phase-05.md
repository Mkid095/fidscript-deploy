# Phase 05: Storage Platform

> **Status:** Planned  |  **Track:** Core  |  **Depends on:** Phase 04

## Objective

Real S3-compatible object storage: create a bucket, upload bytes, and get back a working URL you can fetch from outside the VPS. Storage is the first subsystem that produces a tangible external artifact and is a prerequisite for build logs (Phase 06), backups (Phase 08), and attachments.

## Current State

**PARTIAL — the one honest subsystem.** See `docs/AUDIT.md` §C (Storage). Specific defects:

- Real MinIO SDK usage, real uploads, real presigned URLs — the core path works.
- `createBucket`/`deleteBucket` only **write a database row** — they never call `makeBucket`/`removeBucket`. The bucket exists in Postgres, not in MinIO.
- **Fake etag** is synthesized instead of using the upload response's real etag.
- `getPublicUrl` hardcodes `http://localhost:9000` → URLs leak the internal address and are unreachable from clients.
- No per-project bucket namespacing; no public/private policy enforcement; no object metadata table.

## Dependencies

- **Phase 04** (Project + membership for `ProjectGuard` scoping, encrypted config for MinIO credentials).

## Deliverables

- [ ] **Real bucket lifecycle.** `createBucket` → `minio.makeBucket(name, region)`; `deleteBucket` → `removeBucket` (refuse if non-empty, or cascade with confirmation). DB row tracks the bucket; MinIO is the source of truth for existence.
- [ ] **Real etags & metadata.** Capture etag, size, contentType, owner, projectId from the actual upload response into an `objects` table.
- [ ] **Correct external URLs.** Public/presigned URLs use `MINIO_EXTERNAL_ENDPOINT` (e.g. `https://storage.deploy.fidscript.com`) — never localhost. Internal ops use the MinIO service address.
- [ ] **Per-project namespacing.** Buckets/objects are namespaced by project; every operation is scoped through `ProjectGuard`. Cross-project object access is denied.
- [ ] **Public vs private objects.** Per-object or per-bucket policy; private objects only reachable via short-lived presigned URLs; public objects via a public bucket policy.
- [ ] **Upload paths.** (a) presigned PUT for direct browser uploads (CORS configured on MinIO); (b) proxied `multipart/form-data` upload for CLI/SDK.
- [ ] **Object operations.** List (paginated), download (presigned GET), copy, delete, head/stat.
- [ ] **MinIO CORS + Traefik route.** `storage.deploy.fidscript.com` routes to MinIO via Traefik (TLS in Phase 07; HTTP reachable here).

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

## Next Phase

[Phase 06: Deployment Engine](./phase-06.md)
