# Projects Service

> **⚠ Aspirational target spec — not current reality.** Written before the hardening reset; describes the *intended* design. For what actually builds/runs today read [`START_HERE`](../START_HERE.md), [`AUDIT`](../AUDIT.md), and [`AGENT_STATUS`](../../AGENT_STATUS.md). Phase docs (`docs/phases/`) are the source of truth for current state and next work.

Project lifecycle management and resource isolation.

---

## Purpose

Provides project creation, configuration, and lifecycle management. Projects are the primary isolation boundary in FIDScript Deploy.

---

## Responsibilities

- Project CRUD operations
- Project type management (frontend, backend, worker, cron, docker, static)
- Project suspension and archival
- Project cloning
- Project-level settings
- Team membership management
- Subdomain assignment

---

## Dependencies

- PostgreSQL (projects schema)
- Auth Service (owner verification)
- Domain Service (subdomain assignment)

---

## Database Tables

### projects.projects

```sql
CREATE TABLE projects.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'creating',
  owner_id UUID REFERENCES identity.users(id) ON DELETE CASCADE,
  region VARCHAR(100),
  subdomain VARCHAR(255),
  custom_domains JSONB DEFAULT '[]',
  env_vars JSONB DEFAULT '{}',
  build_settings JSONB DEFAULT '{}',
  deployment_strategy VARCHAR(50) DEFAULT 'buildpack',
  source_provider VARCHAR(50),
  source_repo VARCHAR(500),
  source_branch VARCHAR(255) DEFAULT 'main',
  last_deploy_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### projects.project_members

```sql
CREATE TABLE projects.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES identity.users(id) ON DELETE CASCADE,
  role VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);
```

### projects.project_settings

```sql
CREATE TABLE projects.project_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects.projects(id) ON DELETE CASCADE UNIQUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Project Types

| Type | Description | Example |
|------|-------------|---------|
| frontend | Single-page applications | React, Vue, Svelte |
| backend | API services | Express, Fastify, NestJS |
| worker | Background processors | Queue consumers |
| cron | Scheduled task runners | Periodic jobs |
| docker | Custom Docker apps | Any containerized app |
| static | Static site generators | Next.js, Astro, Hugo |

---

## Project Statuses

| Status | Description |
|--------|-------------|
| creating | Initial provisioning in progress |
| active | Running normally |
| suspended | Paused (billing/suspension) |
| archived | Read-only preservation |
| deleted | Soft-deleted, pending purge |

---

## Events Produced

| Event | Trigger |
|-------|---------|
| project.created | New project created |
| project.updated | Settings changed |
| project.deleted | Permanent removal |
| project.suspended | Project paused |
| project.archived | Project archived |
| project.cloned | Project duplicated |
| project.restored | Project reactivated |

---

## Events Consumed

None.

---

## API Endpoints

### Projects

```
GET /api/v1/projects
  Headers: Authorization: Bearer <token>
  Query: ?status=active&page=1&limit=20
  Response: { projects: [...], pagination }
  Errors: 401

POST /api/v1/projects
  Headers: Authorization: Bearer <token>
  Body: {
    name: string,
    type: enum,
    description?: string,
    region?: string
  }
  Response: { project }
  Errors: 401, 400, 409 (slug exists)

GET /api/v1/projects/:id
  Headers: Authorization: Bearer <token>
  Response: { project }
  Errors: 401, 404

PATCH /api/v1/projects/:id
  Headers: Authorization: Bearer <token>
  Body: {
    name?: string,
    description?: string,
    env_vars?: object,
    build_settings?: object
  }
  Response: { project }
  Errors: 401, 404

DELETE /api/v1/projects/:id
  Headers: Authorization: Bearer <token>
  Response: { success: true }
  Errors: 401, 404

POST /api/v1/projects/:id/suspend
  Headers: Authorization: Bearer <token>
  Response: { project }
  Errors: 401, 404

POST /api/v1/projects/:id/archive
  Headers: Authorization: Bearer <token>
  Response: { project }
  Errors: 401, 404

POST /api/v1/projects/:id/restore
  Headers: Authorization: Bearer <token>
  Response: { project }
  Errors: 401, 404

POST /api/v1/projects/:id/clone
  Headers: Authorization: Bearer <token>
  Body: { name: string }
  Response: { project }
  Errors: 401, 400, 409
```

### Project Members

```
GET /api/v1/projects/:id/members
  Headers: Authorization: Bearer <token>
  Response: { members: [...] }
  Errors: 401, 404

POST /api/v1/projects/:id/members
  Headers: Authorization: Bearer <token>
  Body: { email: string, role: string }
  Response: { member }
  Errors: 401, 404, 403

DELETE /api/v1/projects/:id/members/:userId
  Headers: Authorization: Bearer <token>
  Response: { success: true }
  Errors: 401, 404, 403
```

### Environment Variables

```
GET /api/v1/projects/:id/env-vars
  Headers: Authorization: Bearer <token>
  Response: { envVars: [...] }
  Errors: 401, 404

PUT /api/v1/projects/:id/env-vars
  Headers: Authorization: Bearer <token>
  Body: { envVars: [{ key: string, value: string }] }
  Response: { success: true }
  Errors: 401, 404

DELETE /api/v1/projects/:id/env-vars/:key
  Headers: Authorization: Bearer <token>
  Response: { success: true }
  Errors: 401, 404
```

---

## SDK Methods

```typescript
interface Project {
  id: string;
  name: string;
  slug: string;
  type: 'frontend' | 'backend' | 'worker' | 'cron' | 'docker' | 'static';
  status: 'creating' | 'active' | 'suspended' | 'archived';
  ownerId: string;
  subdomain: string;
  customDomains: string[];
  envVars: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

platform.projects.list(options?: {
  status?: Project['status'];
  page?: number;
  limit?: number;
}): Promise<{ projects: Project[], pagination }>

platform.projects.create(data: {
  name: string;
  type: Project['type'];
  description?: string;
  region?: string;
}): Promise<Project>

platform.projects.get(id: string): Promise<Project>

platform.projects.update(id: string, data: {
  name?: string;
  description?: string;
  env_vars?: Record<string, string>;
  build_settings?: Record<string, unknown>;
}): Promise<Project>

platform.projects.delete(id: string): Promise<void>

platform.projects.suspend(id: string): Promise<Project>

platform.projects.archive(id: string): Promise<Project>

platform.projects.restore(id: string): Promise<Project>

platform.projects.clone(id: string, name: string): Promise<Project>

platform.projects.members.list(projectId: string): Promise<ProjectMember[]>

platform.projects.members.add(projectId: string, email: string, role: string): Promise<ProjectMember>

platform.projects.members.remove(projectId: string, userId: string): Promise<void>

platform.projects.envVars.list(projectId: string): Promise<EnvVar[]>

platform.projects.envVars.update(projectId: string, envVars: EnvVar[]): Promise<void>

platform.projects.envVars.delete(projectId: string, key: string): Promise<void>
```

---

## MCP Tools

```json
{
  "name": "create_project",
  "description": "Create a new project",
  "inputSchema": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "type": { "type": "string", "enum": ["frontend", "backend", "worker", "cron", "docker", "static"] },
      "description": { "type": "string" }
    },
    "required": ["name", "type"]
  }
}

{
  "name": "get_project",
  "description": "Get project details",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" }
    },
    "required": ["projectId"]
  }
}

{
  "name": "update_project",
  "description": "Update project settings",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "name": { "type": "string" },
      "description": { "type": "string" },
      "envVars": { "type": "object" }
    },
    "required": ["projectId"]
  }
}

{
  "name": "delete_project",
  "description": "Delete a project",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" }
    },
    "required": ["projectId"]
  }
}

{
  "name": "suspend_project",
  "description": "Suspend a project",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" }
    },
    "required": ["projectId"]
  }
}

{
  "name": "list_projects",
  "description": "List all projects",
  "inputSchema": {
    "type": "object",
    "properties": {
      "status": { "type": "string" }
    }
  }
}

{
  "name": "clone_project",
  "description": "Clone an existing project",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "name": { "type": "string" }
    },
    "required": ["projectId", "name"]
  }
}
```

---

## Dashboard Screens

- `/projects` - Project list with status
- `/projects/new` - Create project wizard
- `/projects/:id` - Project detail view
- `/projects/:id/settings` - Project settings
- `/projects/:id/settings/general` - Name, description
- `/projects/:id/settings/environment` - Env vars editor
- `/projects/:id/settings/members` - Team management
- `/projects/:id/settings/domains` - Domain configuration
- `/projects/:id/settings/build` - Build configuration
- `/projects/:id/settings/danger` - Delete, archive

---

## Security Considerations

1. **Owner-only deletion** - Only project owner can delete
2. **Role-based access** - Admin, Developer, Viewer roles
3. **Audit logging** - All project changes logged
4. **Slug uniqueness** - Prevents confusion
5. **Resource quotas** - Prevent resource exhaustion

---

## Failure Recovery

| Scenario | Recovery |
|----------|----------|
| Accidental deletion | 30-day soft delete, restore available |
| Suspension | Owner can restore immediately |
| Archival | Read-only, can be restored |
| Slug collision | Auto-append number (my-app-2) |

---

## Future Extensions

- Project transfer ownership
- Project templates per organization
- Project-level resource quotas
- Project dependency graphs
