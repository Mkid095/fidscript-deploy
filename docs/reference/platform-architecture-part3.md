# FIDScript Deploy — Platform Architecture Documentation (Part 3)

## 10. Deployment Platform

Functions like Vercel/Render. CI/CD pipeline with instant rollback.

### Backend System

- **Trigger:** GitHub webhook → `push` event → new deployment job
- **Queue:** Job added to `deployment` queue
- **Worker:** Clone repo → detect framework → install deps → run build
- **Artifact:** Output stored in object storage
- **Routing:** API Gateway updated to route domain to new deployment
- **Rollback:** Update routing to previous artifact — no rebuild

**Environment Variables:**
- Encrypted at rest (AES-256-GCM)
- Decrypted via SDK/CLI for runtime
- `fid env pull` — decrypt and write `.env`
- `fid env push` — encrypt and store

### Frontend Components

1. **Deployments Dashboard**
   - Recent deployments: status (Building, Deploying, Ready, Error), commit, author
   - Actions: Promote to Production, Rollback

2. **Environment Variables Page**
   - List: Name, Value (masked), Target (Production/Preview/All)
   - Add / Edit / Delete
   - Import `.env` file, Export
   - Values encrypted — owner/ADMIN see decrypted, developer/viewer see masked

3. **Build Logs**
   - Live streaming build output via realtime
   - `deployments.deployment.log` event per build line

---

## 11. Functions Service

Serverless execution like AWS Lambda / Supabase Edge Functions.

### Backend System

- Isolation runtime: Deno or Firecracker microVMs
- User code uploaded, validated, deployed
- API request hits function endpoint → runtime executes → response

### Frontend Components

1. **Functions Dashboard**
   - List of deployed functions: name, endpoint, status
   - "Create Function" button

2. **Function Editor**
   - Monaco code editor
   - Console pane for execution logs
   - "Deploy" sends code to backend

---

## 12. Monitoring & Logs

### Backend System

- Aggregates logs from: Deployment, API, Database, Auth
- High-throughput log storage
- Log streams: System (default), Deployment (build), API (access), Database, Auth

### Frontend Components

1. **Logs Dashboard**
   - **Always project-scoped** — never "Create project first" when inside a project
   - Searchable, filterable log stream
   - Filters: Source (System/Deployment/API/Database/Auth), Level (Debug/Info/Warn/Error), Time range
   - Text search + JSON download
   - SSE live tail

2. **Monitoring Page**
   - Alert rules: metric threshold, duration, channel
   - Notification channels
   - Active alerts with severity
   - ACK / Resolve buttons wired to SDK

---

## 13. CLI and MCP Integration

### CLI Architecture

Thin wrapper around REST API:
- `fid auth login` → stores OAuth token
- Project context from `.fidscript/project.json`
- Commands: `fid project create`, `fid deploy`, `fid logs`, `fid env pull/push`
- `fid functions deploy`, `fid databases list`, `fid storage upload`, etc.

### MCP Integration

MCP server exposes tools for every service:
- `create_table`, `upload_file`, `send_email`, `env_var_list`, etc.
- AI agents connect via MCP and execute tools on behalf of user
- Authenticates via user's access token

---

## 14. Cross-Service Wiring (The Glue)

### Event Bus Architecture

Decouples services via internal event bus.

**Flow: New User Signup → Welcome Email**
```
Auth Service → user.created event
    → Email Service subscribes
    → Fetches user email from payload
    → Selects "Welcome" template
    → Queues email for delivery
```

**Flow: Database Update → Realtime Push**
```
Database → WAL → Event Bus → Realtime Service
    → project:{projectId} channel
    → All connected WebSocket clients receive row data
```

### Unified Developer Experience

1. Developer creates project
2. Deploys Next.js app
3. App uses Auth Service for login
4. App queries Database Service
5. Database updates → Realtime pushes to UI
6. Image uploaded → Queue Service processes → Email Service notifies
