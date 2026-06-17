# Deployments Service

> **⚠ Aspirational target spec — not current reality.** Written before the hardening reset; describes the *intended* design. For what actually builds/runs today read [`START_HERE`](../START_HERE.md), [`AUDIT`](../AUDIT.md), and [`AGENT_STATUS`](../../AGENT_STATUS.md). Phase docs (`docs/phases/`) are the source of truth for current state and next work.

Application build and release management.

---

## Purpose

Handles the complete deployment pipeline from source code to running containers, including build detection, containerization, and routing configuration.

---

## Responsibilities

- Git-based deployments (push-to-deploy)
- Buildpack auto-detection
- Dockerfile support
- Build log streaming
- Deployment versioning
- Rollback capabilities
- Environment variable injection
- Health check configuration
- Zero-downtime deployments

---

## Dependencies

- PostgreSQL (projects schema)
- Docker (build runtime)
- Traefik (routing)
- Storage Service (build artifacts)

---

## Database Tables

### projects.deployments

```sql
CREATE TABLE projects.deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects.projects(id) ON DELETE CASCADE,
  version VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  commit_sha VARCHAR(40),
  commit_message TEXT,
  build_logs TEXT,
  build_duration_ms INTEGER,
  deployment_url TEXT,
  rolled_back_to UUID REFERENCES projects.deployments(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### projects.build_logs

```sql
CREATE TABLE projects.build_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID REFERENCES projects.deployments(id) ON DELETE CASCADE,
  lines TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Deployment Statuses

| Status | Description |
|--------|-------------|
| pending | Queued for build |
| building | Docker image building |
| deploying | Container starting |
| success | Live and healthy |
| failed | Build or deploy error |
| rolled_back | Reverted to previous |

---

## Build Strategies

| Strategy | Description |
|----------|-------------|
| buildpack | Auto-detect runtime, no config needed |
| dockerfile | User-provided Dockerfile |

---

## Events Produced

| Event | Trigger |
|-------|---------|
| deployment.started | Deployment triggered |
| deployment.building | Build phase begins |
| deployment.deploying | Container start |
| deployment.succeeded | Successful deploy |
| deployment.failed | Deployment error |
| deployment.rolled_back | Rollback completed |

---

## Events Consumed

None.

---

## API Endpoints

### Deployments

```
GET /api/v1/projects/:projectId/deployments
  Headers: Authorization: Bearer <token>
  Query: ?page=1&limit=20
  Response: { deployments: [...] }
  Errors: 401, 404

POST /api/v1/projects/:projectId/deployments
  Headers: Authorization: Bearer <token>
  Body: {
    branch?: string,
    commitSha?: string,
    strategy?: 'buildpack' | 'dockerfile'
  }
  Response: { deployment }
  Errors: 401, 404

GET /api/v1/projects/:projectId/deployments/:id
  Headers: Authorization: Bearer <token>
  Response: { deployment }
  Errors: 401, 404

GET /api/v1/projects/:projectId/deployments/:id/logs
  Headers: Authorization: Bearer <token>
  Response: Stream of log lines (SSE)
  Errors: 401, 404

POST /api/v1/projects/:projectId/deployments/:id/rollback
  Headers: Authorization: Bearer <token>
  Response: { deployment }
  Errors: 401, 404
```

### Build Configuration

```
GET /api/v1/projects/:projectId/build-config
  Headers: Authorization: Bearer <token>
  Response: { buildConfig }
  Errors: 401, 404

PATCH /api/v1/projects/:projectId/build-config
  Headers: Authorization: Bearer <token>
  Body: {
    buildStrategy?: string,
    buildCommand?: string,
    outputDirectory?: string,
    healthCheckPath?: string
  }
  Response: { buildConfig }
  Errors: 401, 404
```

---

## SDK Methods

```typescript
interface Deployment {
  id: string;
  projectId: string;
  version: string;
  status: 'pending' | 'building' | 'deploying' | 'success' | 'failed' | 'rolled_back';
  commitSha: string | null;
  commitMessage: string | null;
  buildDurationMs: number | null;
  deploymentUrl: string | null;
  rolledBackTo: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface BuildConfig {
  strategy: 'buildpack' | 'dockerfile';
  buildCommand: string | null;
  outputDirectory: string | null;
  healthCheckPath: string | null;
  healthCheckPort: number;
}

platform.deployments.list(projectId: string, options?: {
  page?: number;
  limit?: number;
}): Promise<{ deployments: Deployment[], pagination }>

platform.deployments.create(projectId: string, data?: {
  branch?: string;
  commitSha?: string;
  strategy?: 'buildpack' | 'dockerfile';
}): Promise<Deployment>

platform.deployments.get(projectId: string, deploymentId: string): Promise<Deployment>

platform.deployments.logs(projectId: string, deploymentId: string): Promise<AsyncIterable<string>>

platform.deployments.rollback(projectId: string, deploymentId: string): Promise<Deployment>

platform.deployments.getBuildConfig(projectId: string): Promise<BuildConfig>

platform.deployments.updateBuildConfig(projectId: string, config: Partial<BuildConfig>): Promise<BuildConfig>
```

---

## MCP Tools

```json
{
  "name": "create_deployment",
  "description": "Trigger a new deployment",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "branch": { "type": "string" },
      "strategy": { "type": "string", "enum": ["buildpack", "dockerfile"] }
    },
    "required": ["projectId"]
  }
}

{
  "name": "get_deployment",
  "description": "Get deployment details",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "deploymentId": { "type": "string" }
    },
    "required": ["projectId", "deploymentId"]
  }
}

{
  "name": "list_deployments",
  "description": "List project deployments",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "page": { "type": "number" },
      "limit": { "type": "number" }
    },
    "required": ["projectId"]
  }
}

{
  "name": "get_deployment_logs",
  "description": "Stream deployment logs",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "deploymentId": { "type": "string" }
    },
    "required": ["projectId", "deploymentId"]
  }
}

{
  "name": "rollback_deployment",
  "description": "Rollback to previous deployment",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "deploymentId": { "type": "string" }
    },
    "required": ["projectId", "deploymentId"]
  }
}
```

---

## Dashboard Screens

- `/projects/:id/deployments` - Deployment list
- `/projects/:id/deployments/:id` - Deployment detail
- `/projects/:id/deployments/new` - Trigger deployment
- `/projects/:id/settings/build` - Build configuration

---

## Buildpack Detection

The deployment service auto-detects these runtimes:

| Runtime | Detected By |
|---------|-------------|
| Node.js | package.json, server.js |
| Python | requirements.txt, pyproject.toml |
| PHP | composer.json, index.php |
| Go | go.mod |
| Ruby | Gemfile |
| Static | index.html, static files |

---

## Security Considerations

1. **Source verification** - Verify commit authorship
2. **Build isolation** - Build in isolated containers
3. **No privileged builds** - Build containers run unprivileged
4. **Secret injection** - Env vars injected at deploy, not build
5. **Artifact storage** - Build artifacts stored securely

---

## Failure Recovery

| Scenario | Recovery |
|----------|----------|
| Build failure | View logs, fix code, redeploy |
| Deploy failure | Automatic rollback to previous |
| Timeout | Configurable timeout (default 10 min) |
| Health check fail | Automatic rollback |

---

## Future Extensions

- Preview deployments (PR environments)
- Build caching optimization
- Multi-region deployments
- Gradual rollout (canary)
- A/B testing
