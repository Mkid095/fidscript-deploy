# Storage Components

UI for buckets and files: list of buckets, bucket detail with file grid/table, upload, preview.

## Sub-areas

### Buckets (list)
| File | Purpose |
|------|---------|
| `storage-list.tsx` | Container — buckets grid + create modal. |
| `bucket-card.tsx` | One bucket card (provider + size + count). |
| `create-bucket-form.tsx` | New-bucket form. |
| `provider-badge.tsx` | Pill showing provider (s3 / minio / r2 / …). |
| `status-badge.tsx` | Active / creating / error. |
| `banner.tsx` | Success / error banner. |

### Bucket Detail
| File | Purpose |
|------|---------|
| `bucket-detail.tsx` | Container — header + body. |
| `bucket-header.tsx` | Title + actions (upload / new folder). |
| `bucket-body.tsx` | Grid or table based on view mode. |
| `bucket-content.tsx` | Switch between grid and table. |
| `bucket-empty-state.tsx` | "No files yet" empty state. |

### File UI
| File | Purpose |
|------|---------|
| `file-grid.tsx` | Card grid view. |
| `file-table.tsx` | Table view. |
| `file-preview-modal.tsx` | Inline preview (image / pdf / video / audio). |
| `upload-files-modal.tsx` | Upload flow with progress. |
| `upload-file-row.tsx` | One upload row. |
| `new-folder-modal.tsx` | New folder. |

### Hooks
| File | Purpose |
|------|---------|
| `use-storage-realtime.ts` | Project-wide subscribe: bucket / file create/delete. |
| `use-bucket-realtime.ts` | Per-bucket subscribe: file upload/delete only. |
| `use-bucket-file-actions.ts` | Rename / delete / move. |
| `use-upload-files.ts` | Orchestrates multi-file uploads. |
| `use-modal-upload.ts` | Modal-only upload flow. |
| `use-file-preview.ts` | Tracks preview state. |

### Types / utils
| File | Purpose |
|------|---------|
| `bucket.ts` | `Bucket` interface (sibling alias of SDK type). |
| `types.ts` | `BannerProps`. |
| `file-utils.ts` | `formatBytes`, `getFileTypeInfo`, `isPreviewable`, `fileIcon`. |

## Conventions
- Hooks own all SDK calls and realtime subscriptions.
- `file-utils.ts` is pure and reusable; keep it that way.
- Modals expose `onClose`.

## Files
- 28 files (all under `src/components/storage/`)