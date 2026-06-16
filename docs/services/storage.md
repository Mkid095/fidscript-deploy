# Storage Service

File upload, management, and multi-provider storage abstraction.

---

## Purpose

Provides object storage capabilities with a unified API supporting multiple backend providers (MinIO, Cloudinary, Telegram).

---

## Responsibilities

- Bucket creation and management per project
- File upload, download, deletion
- Signed URL generation for private files
- Public file access
- File metadata management
- Provider abstraction and failover

---

## Dependencies

- PostgreSQL (storage schema)
- Integration Hub (provider configuration)

---

## Database Tables

### storage.buckets

```sql
CREATE TABLE storage.buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects.projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(50) DEFAULT 'internal',
  region VARCHAR(100),
  is_public BOOLEAN DEFAULT false,
  max_size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### storage.files

```sql
CREATE TABLE storage.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id UUID REFERENCES storage.buckets(id) ON DELETE CASCADE,
  key VARCHAR(1024) NOT NULL,
  original_name VARCHAR(255),
  mime_type VARCHAR(255),
  size_bytes BIGINT DEFAULT 0,
  etag VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Events Produced

| Event | Trigger |
|-------|---------|
| storage.bucket_created | New bucket created |
| storage.bucket_deleted | Bucket removed |
| storage.file_uploaded | File uploaded |
| storage.file_deleted | File removed |

---

## Events Consumed

None.

---

## API Endpoints

```
GET /api/v1/projects/:projectId/storage/buckets
  Headers: Authorization: Bearer <token>
  Response: { buckets: [...] }
  Errors: 401, 404

POST /api/v1/projects/:projectId/storage/buckets
  Headers: Authorization: Bearer <token>
  Body: { name: string, isPublic?: boolean }
  Response: { bucket }
  Errors: 401, 404, 409

DELETE /api/v1/projects/:projectId/storage/buckets/:bucketId
  Headers: Authorization: Bearer <token>
  Response: { success: true }
  Errors: 401, 404

GET /api/v1/projects/:projectId/storage/buckets/:bucketId/files
  Headers: Authorization: Bearer <token>
  Query: ?prefix=&page=1&limit=50
  Response: { files: [...], pagination }
  Errors: 401, 404

POST /api/v1/projects/:projectId/storage/buckets/:bucketId/files
  Headers: Authorization: Bearer <token>
  Content-Type: multipart/form-data
  Body: file (multipart)
  Response: { file }
  Errors: 401, 404

GET /api/v1/projects/:projectId/storage/buckets/:bucketId/files/:fileId
  Headers: Authorization: Bearer <token>
  Response: File download stream
  Errors: 401, 404

DELETE /api/v1/projects/:projectId/storage/buckets/:bucketId/files/:fileId
  Headers: Authorization: Bearer <token>
  Response: { success: true }
  Errors: 401, 404

POST /api/v1/projects/:projectId/storage/buckets/:bucketId/generate-url
  Headers: Authorization: Bearer <token>
  Body: { key: string, expiresIn?: number }
  Response: { url: string }
  Errors: 401, 404
```

---

## SDK Methods

```typescript
interface Bucket {
  id: string;
  projectId: string;
  name: string;
  provider: 'internal' | 'cloudinary' | 'telegram';
  isPublic: boolean;
  createdAt: string;
}

interface StorageFile {
  id: string;
  bucketId: string;
  key: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  etag: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

platform.storage.buckets.list(projectId: string): Promise<Bucket[]>

platform.storage.buckets.create(projectId: string, data: {
  name: string;
  isPublic?: boolean;
}): Promise<Bucket>

platform.storage.buckets.delete(projectId: string, bucketId: string): Promise<void>

platform.storage.files.list(projectId: string, bucketId: string, options?: {
  prefix?: string;
  page?: number;
  limit?: number;
}): Promise<{ files: StorageFile[], pagination }>

platform.storage.files.upload(projectId: string, bucketId: string, data: {
  file: Buffer | ReadableStream;
  key: string;
  originalName?: string;
  mimeType?: string;
}): Promise<StorageFile>

platform.storage.files.download(projectId: string, bucketId: string, fileId: string): Promise<Buffer>

platform.storage.files.delete(projectId: string, bucketId: string, fileId: string): Promise<void>

platform.storage.files.getSignedUrl(projectId: string, bucketId: string, key: string, options?: {
  expiresIn?: number;
}): Promise<string>

platform.storage.files.getPublicUrl(projectId: string, bucketId: string, key: string): string
```

---

## MCP Tools

```json
{
  "name": "create_bucket",
  "description": "Create a storage bucket",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "name": { "type": "string" },
      "isPublic": { "type": "boolean" }
    },
    "required": ["projectId", "name"]
  }
}

{
  "name": "delete_bucket",
  "description": "Delete a storage bucket",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "bucketId": { "type": "string" }
    },
    "required": ["projectId", "bucketId"]
  }
}

{
  "name": "upload_file",
  "description": "Upload a file to storage",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "bucketId": { "type": "string" },
      "key": { "type": "string" },
      "content": { "type": "string" },
      "mimeType": { "type": "string" }
    },
    "required": ["projectId", "bucketId", "key", "content"]
  }
}

{
  "name": "download_file",
  "description": "Download a file from storage",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "bucketId": { "type": "string" },
      "fileId": { "type": "string" }
    },
    "required": ["projectId", "bucketId", "fileId"]
  }
}

{
  "name": "delete_file",
  "description": "Delete a file from storage",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "bucketId": { "type": "string" },
      "fileId": { "type": "string" }
    },
    "required": ["projectId", "bucketId", "fileId"]
  }
}

{
  "name": "list_files",
  "description": "List files in a bucket",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "bucketId": { "type": "string" },
      "prefix": { "type": "string" }
    },
    "required": ["projectId", "bucketId"]
  }
}

{
  "name": "generate_signed_url",
  "description": "Generate a signed URL for private file access",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "bucketId": { "type": "string" },
      "key": { "type": "string" },
      "expiresIn": { "type": "number" }
    },
    "required": ["projectId", "bucketId", "key"]
  }
}
```

---

## Dashboard Screens

- `/projects/:id/storage` - Storage overview
- `/projects/:id/storage/buckets/:id` - Bucket file browser
- `/projects/:id/storage/upload` - File upload interface
- `/projects/:id/settings/storage` - Storage configuration

---

## Security Considerations

1. **Access control** - Bucket access restricted to project members
2. **Signed URLs** - Time-limited access for private files
3. **File validation** - Mime type verification
4. **Size limits** - Configurable per bucket
5. **Upload scanning** - Optional malware scanning

---

## Failure Recovery

| Scenario | Recovery |
|----------|----------|
| Provider outage | Automatic failover to backup provider |
| Corrupt file | Restore from backup |
| Accidental deletion | Restore from versioning (if enabled) |

---

## Future Extensions

- File versioning
- Image transformation (resize, crop)
- Automatic virus scanning
- CDN integration
- Replication across providers
