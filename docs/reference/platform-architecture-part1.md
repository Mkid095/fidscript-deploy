# FIDScript Deploy — Platform Architecture Documentation (Part 1)

## 1. Global Architecture & State Management

### Multi-Tenant Context

The entire platform operates on a strict multi-tenant, project-based architecture. No service exists globally; everything is scoped to an `Organization` and then a `Project`.

**Backend Wiring:**
Every database query, API request, and background job must include `projectId` and `organizationId`. The backend middleware extracts these from the JWT or API key and injects them into queries (`WHERE project_id = :projectId`).

**Frontend State Management:**
The frontend maintains a `ProjectContext` (React Context). When a user navigates to `/dashboard/projects/[projectId]/database`, `ProjectContext` provides the `projectId`. Every API call appends it to the request URL. If context is missing, the UI shows "Project context not found."

### Onboarding & Automatic Provisioning

When a project is created:

1. **Frontend:** User clicks "Create Project"
2. **API:** `POST /api/projects` is called
3. **Backend Orchestrator:**
   - Creates the Project record
   - Creates a PostgreSQL schema for the project
   - Creates a default `project-assets` bucket
   - Initializes `project:{projectId}` realtime namespace
   - Generates JWT configuration and API keys
4. **Frontend:** Polls or listens for `provisioning_complete` event, then redirects to project dashboard

---

## 2. Database Service

Must function like Supabase. Every project has an isolated PostgreSQL schema.

### Backend System

Exposes a REST API that translates UI actions into PostgreSQL queries using an internal connection pooler.

**API Endpoints:**
- `GET /api/projects/:id/tables` — metadata for all tables
- `GET /api/projects/:id/tables/:name/rows` — paginated rows
- `POST /api/projects/:id/sql` — execute raw SQL
- `PATCH /api/projects/:id/tables/:name/rows/:rowId` — update a row
- `POST /api/projects/:id/migrations` — run migrations

### Frontend Components

1. **Table Explorer (Data Grid)**
   - Fetches schema and data via `/tables/:name/rows`
   - Infinite-scroll or paginated data grid
   - Cell edit fires `PATCH` request → "Saving..." spinner → revert or error toast

2. **SQL Editor**
   - Monaco Editor with PostgreSQL syntax highlighting
   - `Ctrl+Enter` sends to `/sql` endpoint
   - Results rendered into temporary data grid

3. **Migration History**
   - Fetches `schema_migrations` table
   - List view: migration IDs and timestamps

4. **Connection Panel**
   - Shows connection string, pool usage
   - Rotate password button

---

## 3. Realtime Service

**Correct Architecture:**
```
Database Change → WAL → Event Bus → Realtime Gateway → Project Channels → Connected Clients
```

Realtime is **background infrastructure** — it must NOT connect only when a page is visited. It runs continuously.

### Backend System

- Persistent WebSocket server
- PostgreSQL Logical Replication (WAL) listens for INSERT/UPDATE/DELETE
- Event Bus pushes events to `project:{projectId}` channel
- All project-scoped events routed via `RealtimeBridgeService`

### Frontend Components

1. **Global Connection (Hidden)**
   - `useRealtimeConnection(projectId)` connects as soon as user logs in
   - Manages connection state (`connecting`, `connected`, `disconnected`) globally
   - Connection lives in a context provider above all pages

2. **Realtime Dashboard Page**
   - Subscribes to `project:{projectId}` channel
   - Displays live event stream (INSERT/UPDATE/DELETE)
   - Shows active connections and channel status
   - Live build output for deployments

---

## 4. Storage Service

Supports Internal (MinIO), AWS S3, Cloudinary, and Telegram.

### Backend System

Acts as a proxy or generates pre-signed URLs depending on provider:
- **Internal (MinIO):** Direct routing
- **External (S3/Cloudinary):** Pre-signed URLs — frontend uploads directly without routing through backend

**API Endpoints:**
- `GET /api/projects/:id/storage/buckets`
- `POST /api/projects/:id/storage/buckets`
- `GET /api/projects/:id/storage/files?bucket=:bucket`
- `POST /api/projects/:id/storage/upload-url` — returns pre-signed upload URL
- `DELETE /api/projects/:id/storage/files/:file`

### Frontend Components

1. **Provider Settings Page**
   - Select provider (Internal, S3, Cloudinary, Telegram)
   - Conditional fields: Access Key, Secret, Region for S3
   - "Test Connection" validates credentials before saving

2. **File Browser**
   - Grid or list view of files and folders
   - Upload via pre-signed URL (frontend → provider directly)
   - Generate download URLs, set permissions
