# Service: Storage

S3-compatible object storage per project — buckets, files, presigned URLs.

## 1. Purpose
Store and serve files (uploads, exports, backups) without setting up your own S3. The internal
provider uses MinIO; the URL that leaves the platform resolves on the platform's domain
(`storage.<domain>`) so it works for the browser, the API, and webhooks alike.

## 2. Screens
- **Storage** (sidebar §5): bucket list.
- **Bucket detail**: file browser — grid + list views, drag-and-drop upload, presign-a-URL action,
  per-file metadata (size, mime, etag, created).

## 3. Data model
- `StorageBucket` — id, projectId, name (sanitized to `[a-z0-9-]`, truncated; full bucket name is
  `proj-<slug>-<name>`), provider (`internal|cloudinary|telegram`), isPublic, createdAt.
- `StorageFile` — id, bucketId, key, originalName, mimeType, sizeBytes, etag, createdAt.

## 4. API mapping
- Buckets: `STOR-01..03`. Files: list/upload/delete: `STOR-04..06`. Presign: `STOR-07`. Public URL
  (resolve-only): `STOR-08`.

## 5. Realtime events
`storage.bucket.{created,deleted}`, `storage.file.{uploaded,deleted}` — the bucket detail's file
list subscribes so uploads + deletes appear live across sessions.

## 6. Settings
- **Bucket creation:** name (auto-sanitized), `isPublic` (default false), `provider` (default
  `internal` — only provider implemented per the audit; cloudinary/telegram are aspirational).
- **Public buckets:** expose `public-url`; non-public require `presign` URLs (time-limited).
- **File upload:** `data` (base64), optional `key`, `originalName`, `mimeType`.

## 7. Automation
- **Bucket naming** is auto-generated (`proj-<slug>-<name>`); the user-facing name is just a label.
- **Presign URLs** rewrite the internal endpoint (`minio:9000`) to the external
  (`MINIO_EXTERNAL_ENDPOINT=https://storage.<domain>`) so the URL works from outside Docker.
- **Per-project third-party creds** are resolved via `StorageCredentialsService` if `provider` is not
  `internal` — the UI exposes "Connect provider" when creating a non-internal bucket.

## 8. Dependencies
- **Hard:** MinIO container + creds (`MINIO_*`).
- **Backend gaps** (from the audit):
  - `STOR-08` (`public-url`) skips the per-user access check — currently any authenticated
    user can resolve a public URL for any bucket.
  - `cloudinary` and `telegram` providers are aspirational; UI must grey them.

## 9. Phase
**F09 (Storage UI)** — pending spec.
