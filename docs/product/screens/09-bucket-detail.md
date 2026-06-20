# Screen Spec — `BucketDetail` (file browser)

> Per-bucket file browser at `/dashboard/projects/:id/storage/buckets/:b` (F09). The
> operator's console for one storage bucket: list, upload, share, delete files.

## 1. Purpose
The user browses, uploads, and shares files in a single bucket. The principle: **a bucket
is a folder; the UI is a file manager.**

## 2. Route + access
- **Route:** `/dashboard/projects/:id/storage/buckets/:b`.
- **Permission:** any member (`O/A/D/V`); viewer sees no upload / delete actions.
- **Project scope:** the bucket belongs to the current project.

## 3. Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│ Project › my-app › Storage › assets                                  │
├──────────────────────────────────────────────────────────────────────┤
│ assets  [Public]  47 files · 12.3 MB                  [Upload] [kebab]│
├──────────────────────────────────────────────────────────────────────┤
│ [Search...]              View: [Grid] [List]   Sort: [Name ▼]       │
├──────────────────────────────────────────────────────────────────────┤
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                            │
│  │      │  │      │  │      │  │      │                            │
│  │ IMG  │  │ PDF  │  │ JSON │  │ MP4  │                            │
│  │      │  │      │  │      │  │      │                            │
│  │hero  │  │docs  │  │config│  │demo  │                            │
│  │1.2MB │  │234KB │  │1KB   │  │8.4MB │                            │
│  └──────┘  └──────┘  └──────┘  └──────┘                            │
│  ...                                                                 │
│                                                                      │
│  ────────────────────────────────────────────────────────────────    │
│  Upload queue:                                                       │
│  photo-2026.jpg ████████░░ 78% · 4.2MB / 5.4MB                       │
└──────────────────────────────────────────────────────────────────────┘
```

## 4. Sections + states
- **Header strip**: bucket name, isPublic badge, file count, total size, Upload button,
  kebab.
- **Toolbar**: search input, view toggle (Grid | List), sort dropdown, filter by mimeType
  (Advanced).
- **Dropzone**: covers the content area; drag a file → progress bar at the bottom.
- **File list (List view)**: per-row — file icon, key, size, createdAt, kebab.
- **File list (Grid view)**: per-tile — thumbnail, key, size, kebab.
- **Upload progress** (bottom bar): per-file progress, queue, errors.
- **Per-file actions** (kebab):
  - **Download** — direct fetch via canonical URL.
  - **Copy public URL** (if isPublic) — STOR-08.
  - **Generate presigned URL** (if private) — STOR-07 with expiry dialog.
  - **Delete** — STOR-06 with confirm.

## 5. Primary + secondary actions
- **Primary (top-right)**: "Upload" — opens the file picker dialog.
- **Per-file**:
  - **Download** (always).
  - **Copy URL** (public) / **Presign** (private).
  - **Delete** (with confirm).

## 6. API mapping
- **List files** — `GET /api/v1/storage/buckets/:bucketId/files?prefix=&page=&limit=`
  (`STOR-04`); paginated.
- **Upload** — `POST /api/v1/storage/buckets/:bucketId/files` (`STOR-05`) with
  `{data: base64, key?, originalName?, mimeType?}`.
- **Delete file** — `DELETE /api/v1/storage/buckets/:bucketId/files/:fileId` (`STOR-06`).
- **Presign** — `POST /api/v1/storage/buckets/:bucketId/presign` (`STOR-07`) with
  `{key, expiresIn?}`.
- **Public URL** — `GET /api/v1/storage/buckets/:bucketId/public-url?key=` (`STOR-08`).
- **Realtime** — `storage.file.uploaded` (other users' uploads), `storage.file.deleted`.

## 7. Forms + validation
- **Upload**: file picker; max 500MB; allowed types per the picker. (P1: multipart.)
- **Presign expiry**: select (1h | 24h | 7d | custom).
- **Delete confirm**: type-to-confirm with the file key.

## 8. Accessibility
- **Focus order**: header → toolbar → file list → upload queue.
- **Dropzone**: `role="button"`, `aria-label="Drop files here or click to upload"`.
- **Live region**: `aria-live="polite"` on the upload queue; announces progress.
- **Grid view**: tiles are `role="button"` with `aria-label="<filename>, <size>"`.
- **Keyboard**: Tab through tiles; Enter opens the kebab; arrow keys navigate the grid.

## 9. Cross-references
- **Phase**: F09 Storage UI §6.
- **Service spec**: `docs/product/services/storage.md`.
- **Journey**: every persona's "upload a file" + "share a file" flows.
- **Navigation**: Storage list → click a bucket.
- **Related screens**: Storage list (parent), New bucket modal (sibling).

## 10. Acceptance criteria
1. The browser opens at `/dashboard/projects/:id/storage/buckets/:b`; the toolbar is at
   the top; the dropzone covers the content area.
2. List view shows per-row: file icon, key, size, createdAt, kebab.
3. Grid view shows per-tile: thumbnail, key, size, kebab.
4. Dragging a file onto the dropzone starts the upload; progress is shown in a bottom-of-
   screen bar.
5. Multi-file upload shows individual progress per file.
6. Public bucket: "Copy public URL" copies the canonical URL.
7. Private bucket: "Generate presigned URL" opens a dialog with expiry; POSTs `STOR-07`;
   URL in a toast.
8. Delete on a file opens a ConfirmDialog with the file key; POSTs `STOR-06`.
9. Search + sort + view toggle work; filter by mimeType (Advanced) works.
10. The dropzone is keyboard-accessible (Tab to focus; Enter opens the file picker).
