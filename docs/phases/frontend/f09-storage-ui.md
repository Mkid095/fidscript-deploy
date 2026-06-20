# F09 — Storage UI (full spec)

> **Status:** ⏳ Spec complete — pending approval.
> **Connects to:** backend `STOR-*` inventory (`docs/phases/frontend/backend/data.md`). Cross-references
> F05 (shell). Renders the **`Bucket`** + **`File`** Prisma entities.

## 1. Purpose
The operator's console for S3-compatible object storage. The user creates buckets, uploads
files, browses them, generates presigned URLs for private access, and exposes public URLs for
public access. The principle: **storage is a file system, not a database.**

## 2. Business Goal
Match the storage console of Supabase Storage + Cloudflare R2: a bucket is a folder, a file is
a file, drag-and-drop upload is one motion, presigned URLs are one click. The principle:
**the user thinks in files; the UI never makes them think in HTTP.**

## 3. Personas
- **Solo dev** — uploads a hero image, copies the public URL, pastes it in the README.
- **Backend dev** — uploads a CSV, generates a presigned URL, shares it with a teammate.
- **Team lead** — checks the team's storage usage, sets a public/private boundary.

## 4. Complete User Journey
```
Open /dashboard/projects/:id/storage (F05) → Storage tab.
  → list of buckets: name, provider pill, isPublic badge, file count, total size, kebab menu.
  → empty state: "No buckets yet — create one to store files." CTA "Create bucket".
  → "Create bucket" modal: name (sanitized live, lowercase, dashes), isPublic toggle, provider
    (default 'internal', Advanced).
    → "Create" → POST STOR-01 → card animates in.
  → click a bucket card → /storage/buckets/:b (file browser):
      toolbar: search, view toggle (grid | list), sort (name | size | createdAt), upload button.
      drag-and-drop area covers the whole content area.
      file list: each row shows name, mimeType, sizeBytes (human), createdAt, kebab.
      file actions: "Copy public URL" (if isPublic), "Generate presigned URL" (STOR-07),
        "Download" (direct), "Delete" (STOR-06).
  → drag a file onto the dropzone → progress bar → POST STOR-05 → row appears.
  → upload large file (multipart) → chunked progress (P1 follow-up; for now single-shot).
  → realtime: storage.file.uploaded → row animates in; storage.file.deleted → row removes.
  → public bucket: "Copy public URL" is one click; the URL is the canonical public URL.
  → private bucket: "Generate presigned URL" opens a dialog (expires: 1h / 24h / 7d / custom)
    → POST STOR-07 → URL in a toast.
```

## 5. Information Architecture
- `/dashboard/projects/:id/storage` — the list. Tabs: All (default) / Public / Private.
- `/dashboard/projects/:id/storage/new` — the create-bucket modal (overlay).
- `/dashboard/projects/:id/storage/buckets/:b` — the file browser.
- The browser is the canonical file UI; the list is the bucket inventory.

## 6. Screen Specifications
- **`/dashboard/projects/:id/storage`** — the list.
  - **Per-bucket card**: name, provider pill, isPublic badge (Public/Private), file count
    (from a lightweight count field, not a full count(*) per render), total size (sum of
    `File.sizeBytes`), kebab menu.
  - **Empty state**: "No buckets yet — create one to store files." + CTA "Create bucket"
    + hint "Tip: keep public buckets for static assets, private buckets for user uploads."
  - **Tabs**: All (default) / Public / Private.
- **Create bucket modal** — focused modal. Fields:
  - **name** (text, live-slugified, lowercase, dashes; uniqueness check inline).
  - **isPublic** (toggle; default false; tooltip "Public buckets serve files without auth
    — use for static assets only.").
  - **provider** (select, Advanced; default `internal`). Implemented: `internal` (enabled).
    Per the audit, `cloudinary` and `telegram` are listed in the spec but **not implemented**
    — greyed with "not yet available" + tooltip.
  - "Create" → POST STOR-01.
- **`/dashboard/projects/:id/storage/buckets/:b`** — the file browser.
  - **Header strip**: bucket name, isPublic badge, file count, total size, "Take backup
    snapshot" (P1 follow-up; greyed with "coming soon").
  - **Toolbar**: search input, view toggle (Grid | List), sort dropdown, "Upload" button.
  - **Dropzone** — covers the whole content area below the toolbar; drag a file → progress
    bar appears at the bottom; click "Upload" → file picker dialog.
  - **File list (List view)**: per-row: file icon (by mimeType), key (mono), sizeBytes
    (human), createdAt (relative), kebab menu.
  - **File list (Grid view)**: per-tile: thumbnail (image preview for images, generic icon
    for others), key, sizeBytes, kebab.
  - **Sort**: by name (default) | size | createdAt. Toggle asc/desc.
  - **Filter by mimeType** (Advanced; type picker: image / video / audio / document / other).
  - **Pagination** — 50 per page; "Load more" button.
  - **File actions** (kebab):
    - **Download** — direct fetch via the canonical URL.
    - **Copy public URL** — if `isPublic`, shows the public URL (STOR-08).
    - **Generate presigned URL** — if private, opens a dialog (expires: 1h | 24h | 7d |
      custom) → POST STOR-07 → URL in a toast.
    - **Delete** — POST STOR-06 → confirm dialog with the file key.
  - **Empty state**: "No files yet — drag and drop to upload, or click Upload."
  - **Upload progress** — bottom-of-screen progress bar per file (when >1 concurrent, the
    bar shows a queue). Upload errors → red toast with retry.
  - **Multi-file upload** — drag a folder or multiple files → upload queue, parallel
    uploads (max 3 concurrent), individual progress.

## 7. Component Specifications
- `<DataTable>` ✅ — file list (List view).
- `<EntityCard>` ✅ — bucket card.
- `<FileIcon>` ✅ (_todo) — the per-mimeType thumbnail/icon.
- `<Dropzone>` ✅ (_todo) — drag-and-drop area; reused across Storage + future file-upload
  screens.
- `<UploadProgress>` ✅ (_todo) — bottom-of-screen progress bar.
- `<Modal>`, `<ConfirmDialog>`, `<Toast>`, `<EmptyState>`, `<Skeleton>`, `<ErrorState>`,
  `<Button>`, `<SearchInput>`, `<Select>`, `<Toggle>`.
- `<PresignedUrlDialog>` — spec'd here.
- `<NewBucketModal>` — spec'd here.

## 8. API Mapping
| Screen/Action | Endpoint | Inventory ID | Notes |
|---|---|---|---|
| List buckets | `GET /api/v1/projects/:id/storage/buckets` | `STOR-02` | first paint |
| Create bucket | `POST /api/v1/projects/:id/storage/buckets` | `STOR-01` | modal submit |
| Delete bucket | `DELETE /api/v1/storage/buckets/:bucketId` | `STOR-03` | **403 if not empty** |
| List files | `GET /api/v1/storage/buckets/:bucketId/files?prefix=&page=&limit=` | `STOR-04` | paginated |
| Upload file | `POST /api/v1/storage/buckets/:bucketId/files` | `STOR-05` | `{data: base64, key?, originalName?, mimeType?}` |
| Delete file | `DELETE /api/v1/storage/buckets/:bucketId/files/:fileId` | `STOR-06` | confirm |
| Presigned URL | `POST /api/v1/storage/buckets/:bucketId/presign` | `STOR-07` | `{key, expiresIn?}` → `{url}` |
| Public URL | `GET /api/v1/storage/buckets/:bucketId/public-url?key=` | `STOR-08` | **⚠ no access check (server gap — UI gates)** |

## 9. Backend Integration Map
```
Buckets list → sdk.storage.buckets.list(projectId)
  → realtime subscribe to project:<id> events
    → storage.bucket.created → card animates in
    → storage.bucket.deleted → card removes
    → storage.file.uploaded → row in the active bucket animates in
    → storage.file.deleted → row removes
File browser → sdk.storage.buckets.files.list(bucketId, {prefix, page, limit})
  → upload (drag or click) → STOR-05 with base64-encoded file
  → realtime storage.file.uploaded for OTHER users → their UI updates; local optimistic
    insert for the uploader
  → delete → STOR-06 → confirm + optimistic remove + realtime confirm
  → presigned URL → STOR-07 (the user must be a project member; the server should
    re-validate; the audit notes STOR-07 currently lacks the access check — UI greys for
    non-members but cannot fully prevent a determined request; document the gap)
```

## 10. User Experience Specification
- **Drag-and-drop is the primary upload motion.** The dropzone covers the whole content area;
  dragging a file shows an overlay; releasing starts the upload. Click-to-upload is the
  fallback.
- **Progress is always visible.** A bottom-of-screen bar shows every active upload; the user
  can see progress for files they're uploading, even if they navigate away.
- **Public vs Private is visible at every level.** The bucket card has a Public/Private badge;
  the file browser has a badge in the header; per-file actions differ (Public → "Copy public
  URL"; Private → "Generate presigned URL").
- **Presigned URLs are time-bounded.** The dialog asks for an expiry; the default is 1 hour.
  The URL in the toast is a one-time copy; the server does not re-display it.
- **Delete is loud.** ConfirmDialog with the file key; the user must consciously delete.
- **Multi-file upload is first-class.** Dragging a folder or multiple files → upload queue;
  individual progress per file; the user can cancel individual uploads (P1 follow-up).
- **Realtime is ambient.** The file list updates without page reload; the user sees
  teammates' uploads appear in the same browser.
- **Greying unimplemented providers** is the honest path. `cloudinary` and `telegram` are
  shown in the provider picker with "not yet available" + tooltip; the audit notes they're
  not implemented; the UI does not fake them.

## 11. Design Philosophy
- **Configure once.** The user does not configure the storage backend; the platform defaults
  to `internal` (S3-compatible local). The user can pick a provider in Advanced if they need
  to.
- **Beginner first.** The empty state is the dropzone. The "Tip: keep public buckets for
  static assets, private buckets for user uploads" is the one-sentence orientation. The user
  knows public vs private without reading docs.
- **Production-ready by default.** Presigned URLs are time-bounded (1h default); public
  buckets serve files via Traefik; private buckets require authentication; the user gets
  production-grade without thinking.
- **Everything observable.** The file count + the total size + the upload progress = the user
  can always answer "how much is in this bucket?".
- **One dashboard.** Create bucket, upload, browse, share — all in one section. The user
  doesn't leave to manage files.

## 12. Configuration Philosophy
- **User-tunable at create**: name, isPublic, provider (Advanced).
- **User-tunable after create**: nothing (the bucket is immutable after create — same model
  as S3; if you need different settings, create a new bucket).
- **User-tunable per file**: nothing (file metadata is set at upload; the user can delete +
  re-upload if they need to change).
- **User does not touch**: storage backend internals, the canonical URL host, the CDN
  configuration, the lifecycle policy.
- **Greying is honest** — `cloudinary` and `telegram` are shown in the provider picker with
  "not yet available" + tooltip. They are **not** hidden.

## 13. Automation Rules
- **Bucket name slugification** — auto-lowercase, replace non-alphanumeric with `-`, trim
  leading/trailing dashes. Uniqueness check inline (async after typing stops).
- **Default isPublic = false** — private is the safe default.
- **Upload progress** — the dropzone shows a queue; each file gets a row; progress is
  per-file.
- **Presigned URL default expiry = 1h** — the user can change in the dialog.
- **Delete bucket guard** — the server returns 403 if not empty; the UI surfaces this as
  "Bucket must be empty before deletion. Delete the files first, or move them."
- **Greying rule** — provider options loaded from a single constant
  (`SUPPORTED_STORAGE_PROVIDERS`); the picker greys anything not in that list.
- **Realtime reconciliation** — uploads by other users arrive via `storage.file.uploaded`;
  the local optimistic insert for the uploader is the only state the server must reconcile.

## 14. Endpoint Documentation
Full `STOR-*` inventory in `docs/phases/frontend/backend/data.md`. Notable specifics for F09:

- **`STOR-01 CreateBucketDto`** — `{ name, isPublic?, provider? }`. The audit notes the
  DTO is loose (no enum constraint on `provider`); the UI validates locally to
  `['internal']` (the only implemented provider).
- **`STOR-03 Delete bucket`** — returns 403 if the bucket is not empty. The UI surfaces
  this with a clear error message and a "Delete the files first" hint.
- **`STOR-05 Upload`** — accepts `data: base64`. The UI converts the file to base64
  client-side before upload. (A direct multipart endpoint is a P1 follow-up for large files.)
- **`STOR-08 Public URL`** — **no access check on the server** (per the audit). The UI
  must gate this for non-members (the bucket card disables the kebab's "Copy public URL"
  for non-members), but a determined request can bypass the UI. The audit note in F04 §14
  covers this; the storage UI repeats the warning.

Backend gaps the UI must work around:
- `cloudinary` and `telegram` providers are not implemented (audit note). The picker greys
  them with "not yet available" + tooltip.
- **`STOR-01` DTO is loose**; the UI validates locally to `['internal']`.
- **`STOR-08` lacks a server-side access check**. The UI greys the action for non-members,
  but the gap is documented. A backend hardening pass is needed.
- **Multipart upload** is not yet supported; single-shot base64 upload is the only path.
  The UI shows a "for large files, consider multipart (coming soon)" hint for files >50MB.

## 15. Feature Dependency Graph
- **Hard**: F00, F02, F05.
- **Hard backend**: `STOR-01..08`, the `storage.*` event family, the runtime's static-file
  serving via Traefik.
- **Gated by F09**: nothing.
- **Backend gaps that affect this screen**:
  - `cloudinary` / `telegram` providers are not implemented (UI greys them).
  - `STOR-01` DTO is loose; UI validates locally.
  - `STOR-08` lacks a server-side access check; UI greys for non-members but the gap is
    documented.
  - Multipart upload is a P1 follow-up; single-shot base64 is the only path today.

## 16. Acceptance Criteria
1. `/dashboard/projects/:id/storage` opens with the **All** tab preselected.
2. The empty state is "No buckets yet — create one to store files." + CTA "Create bucket"
   + the "Tip: keep public buckets for static assets" hint.
3. The create-bucket modal validates locally: `cloudinary` and `telegram` are greyed with
   "not yet available"; submitting POSTs `STOR-01`; the card animates in.
4. Each bucket card shows name, provider pill, isPublic badge, file count, total size,
   kebab menu.
5. Clicking a bucket card opens the file browser with the toolbar (search, view toggle,
   sort, upload button) and the dropzone covering the content area.
6. Dragging a file onto the dropzone starts the upload; progress is shown in a bottom-of-
   screen bar; on success the row appears in the list.
7. The List view shows: file icon (by mimeType), key, sizeBytes (human), createdAt, kebab.
8. The Grid view shows thumbnails (image preview for images) + key + size + kebab.
9. Public bucket: "Copy public URL" copies the canonical URL (STOR-08).
10. Private bucket: "Generate presigned URL" opens a dialog with expiry (1h default);
    POSTs `STOR-07`; URL in a toast.
11. Delete on a file opens a ConfirmDialog with the file key; POSTs `STOR-06`; the row
    removes optimistically.
12. Delete on a non-empty bucket returns 403; the UI surfaces "Bucket must be empty before
    deletion."
13. Multi-file upload shows individual progress per file; the user can see all active
    uploads in the bottom bar.
14. `cloudinary` and `telegram` are greyed in the provider picker with "not yet available"
    + tooltip.
15. `pnpm --filter @fidscript/dashboard build` clean; this spec updated to match shipped
    behavior.

## Change log
- 2026-06-20 — Initial full 16-section spec. Documents 4 backend gaps: (1) `cloudinary` /
  `telegram` providers not implemented (UI greys them); (2) `STOR-01` DTO is loose (UI
  validates locally to `internal`); (3) `STOR-08` lacks server-side access check (UI greys
  for non-members, gap documented); (4) multipart upload is a P1 follow-up (single-shot
  base64 is the only path).
