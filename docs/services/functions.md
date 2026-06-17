# Functions Service

> **⚠ Aspirational target spec — not current reality.** Written before the hardening reset; describes the *intended* design. For what actually builds/runs today read [`START_HERE`](../START_HERE.md), [`AUDIT`](../AUDIT.md), and [`AGENT_STATUS`](../../AGENT_STATUS.md). Phase docs (`docs/phases/`) are the source of truth for current state and next work.

Serverless function execution environment.

---

## Purpose

Provides a serverless runtime for deploying and executing lightweight functions without managing servers.

---

## Responsibilities

- Function deployment and versioning
- Multiple runtime support (Node.js, Python, PHP)
- Environment variable management
- Memory and timeout configuration
- Invocation logging
- Error tracking
- Scaling management

---

## Dependencies

- Docker (isolated execution)
- PostgreSQL (functions schema)
- Storage Service (code storage)

---

## Database Tables

### functions.functions

```sql
CREATE TABLE functions.functions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects.projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  runtime VARCHAR(50) NOT NULL,
  code_path VARCHAR(1024),
  environment JSONB DEFAULT '{}',
  memory_mb INTEGER DEFAULT 256,
  timeout_seconds INTEGER DEFAULT 30,
  max_instances INTEGER DEFAULT 10,
  current_version VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### functions.versions

```sql
CREATE TABLE functions.versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_id UUID REFERENCES functions.functions(id) ON DELETE CASCADE,
  version VARCHAR(50) NOT NULL,
  code_digest VARCHAR(64) NOT NULL,
  environment JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### functions.invocation_logs

```sql
CREATE TABLE functions.invocation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_id UUID REFERENCES functions.functions(id) ON DELETE CASCADE,
  version VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  duration_ms INTEGER,
  memory_used_mb INTEGER,
  logs TEXT,
  error TEXT,
  invoked_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Supported Runtimes

| Runtime | Version |
|---------|---------|
| Node.js | 18, 20 |
| Python | 3.11, 3.12 |
| PHP | 8.2, 8.3 |

---

## Events Produced

| Event | Trigger |
|-------|---------|
| function.created | Function registered |
| function.deployed | New version deployed |
| function.invoked | Function executed |
| function.error | Execution failed |
| function.deleted | Function removed |

---

## API Endpoints

```
GET /api/v1/projects/:projectId/functions
  Headers: Authorization: Bearer <token>
  Response: { functions: [...] }
  Errors: 401, 404

POST /api/v1/projects/:projectId/functions
  Headers: Authorization: Bearer <token>
  Body: {
    name: string,
    runtime: string,
    description?: string
  }
  Response: { function }
  Errors: 401, 404

GET /api/v1/projects/:projectId/functions/:id
  Headers: Authorization: Bearer <token>
  Response: { function }
  Errors: 401, 404

PATCH /api/v1/projects/:projectId/functions/:id
  Headers: Authorization: Bearer <token>
  Body: {
    description?: string,
    memoryMb?: number,
    timeoutSeconds?: number,
    maxInstances?: number
  }
  Response: { function }
  Errors: 401, 404

DELETE /api/v1/projects/:projectId/functions/:id
  Headers: Authorization: Bearer <token>
  Response: { success: true }
  Errors: 401, 404

POST /api/v1/projects/:projectId/functions/:id/deploy
  Headers: Authorization: Bearer <token>
  Content-Type: multipart/form-data
  Body: code (zip), environment?: object
  Response: { function, version }
  Errors: 401, 404

GET /api/v1/projects/:projectId/functions/:id/versions
  Headers: Authorization: Bearer <token>
  Response: { versions: [...] }
  Errors: 401, 404

POST /api/v1/projects/:projectId/functions/:id/invoke
  Headers: Authorization: Bearer <token>
  Body: { payload: object }
  Response: { result, logs }
  Errors: 401, 404, 408 (timeout)

GET /api/v1/projects/:projectId/functions/:id/logs
  Headers: Authorization: Bearer <token>
  Query: ?limit=50
  Response: { logs: [...] }
  Errors: 401, 404
```

---

## SDK Methods

```typescript
interface PlatformFunction {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  runtime: 'nodejs18' | 'nodejs20' | 'python311' | 'python312' | 'php82' | 'php83';
  memoryMb: number;
  timeoutSeconds: number;
  maxInstances: number;
  currentVersion: string | null;
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

interface FunctionVersion {
  id: string;
  functionId: string;
  version: string;
  codeDigest: string;
  createdAt: string;
}

interface InvocationLog {
  id: string;
  functionId: string;
  version: string;
  status: 'success' | 'error' | 'timeout';
  durationMs: number;
  memoryUsedMb: number;
  logs: string;
  error: string | null;
  invokedBy: string;
  createdAt: string;
}

platform.functions.list(projectId: string): Promise<PlatformFunction[]>

platform.functions.create(projectId: string, data: {
  name: string;
  runtime: PlatformFunction['runtime'];
  description?: string;
}): Promise<PlatformFunction>

platform.functions.get(projectId: string, functionId: string): Promise<PlatformFunction>

platform.functions.update(projectId: string, functionId: string, data: {
  description?: string;
  memoryMb?: number;
  timeoutSeconds?: number;
  maxInstances?: number;
}): Promise<PlatformFunction>

platform.functions.delete(projectId: string, functionId: string): Promise<void>

platform.functions.deploy(projectId: string, functionId: string, data: {
  code: Buffer | ReadableStream;
  environment?: Record<string, string>;
}): Promise<{ function: PlatformFunction; version: FunctionVersion }>

platform.functions.getVersions(projectId: string, functionId: string): Promise<FunctionVersion[]>

platform.functions.invoke(projectId: string, functionId: string, payload: unknown): Promise<{
  result: unknown;
  logs: InvocationLog;
}>

platform.functions.getLogs(projectId: string, functionId: string, options?: {
  limit?: number;
}): Promise<InvocationLog[]>
```

---

## MCP Tools

```json
{
  "name": "create_function",
  "description": "Create a serverless function",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "name": { "type": "string" },
      "runtime": { "type": "string" },
      "description": { "type": "string" }
    },
    "required": ["projectId", "name", "runtime"]
  }
}

{
  "name": "deploy_function",
  "description": "Deploy function code",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "functionId": { "type": "string" },
      "code": { "type": "string" },
      "environment": { "type": "object" }
    },
    "required": ["projectId", "functionId", "code"]
  }
}

{
  "name": "invoke_function",
  "description": "Invoke a function",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "functionId": { "type": "string" },
      "payload": { "type": "object" }
    },
    "required": ["projectId", "functionId"]
  }
}

{
  "name": "list_functions",
  "description": "List project functions",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" }
    },
    "required": ["projectId"]
  }
}

{
  "name": "get_function_logs",
  "description": "Get function invocation logs",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "functionId": { "type": "string" },
      "limit": { "type": "number" }
    },
    "required": ["projectId", "functionId"]
  }
}

{
  "name": "delete_function",
  "description": "Delete a function",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "functionId": { "type": "string" }
    },
    "required": ["projectId", "functionId"]
  }
}
```

---

## Dashboard Screens

- `/projects/:id/functions` - Function list
- `/projects/:id/functions/new` - Create function wizard
- `/projects/:id/functions/:id` - Function detail
- `/projects/:id/functions/:id/deploy` - Deploy code
- `/projects/:id/functions/:id/logs` - Invocation logs
- `/projects/:id/settings/functions` - Function settings

---

## Security Considerations

1. **Isolated execution** - Each function runs in Docker container
2. **No filesystem access** - Containerized with read-only filesystem
3. **Resource limits** - Memory and CPU limits enforced
4. **Timeout enforcement** - Functions killed after timeout
5. **Secret injection** - Environment vars injected securely

---

## Failure Recovery

| Scenario | Recovery |
|----------|----------|
| Timeout | Increase timeout, optimize code |
| Memory exceeded | Increase memory limit |
| Cold start | Provisioned concurrency (future) |

---

## Future Extensions

- Provisioned concurrency
- Function chaining
- Scheduled invocations
- Dead letter queues
- Multi-region deployment
